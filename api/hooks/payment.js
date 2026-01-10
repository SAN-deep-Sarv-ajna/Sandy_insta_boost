import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 1. Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  };

  if (serviceAccount.clientEmail && serviceAccount.privateKey) {
      initializeApp({ credential: cert(serviceAccount) });
  }
}

const db = getApps().length ? getFirestore() : null;

// --- SMART SECURE PARSER ---
function parseBankSMS(text) {
    if (!text) return null;
    const cleanText = text.toString().toLowerCase(); 

    // 🛡️ SECURITY STEP 1: BLOCK DEBIT MESSAGES
    const debitKeywords = ['debited', 'deducted', 'sent to', 'paid to', 'transfer to', 'withdrawn', 'payment of'];
    // We strictly look for "Credited" indicators to avoid confusing "Payment of Rs X successful" (which is debit)
    if (debitKeywords.some(word => cleanText.includes(word))) {
        console.log("🛑 Blocked DEBIT/OUTGOING SMS");
        return null;
    }

    // 🛡️ SECURITY STEP 2: REQUIRE CREDIT KEYWORDS
    const creditKeywords = ['credited', 'received', 'deposited', 'added to', 'credit'];
    if (!creditKeywords.some(word => cleanText.includes(word))) {
        console.log("⚠️ Ignored SMS: Missing 'Credited' keyword");
        return null;
    }

    // 1. Extract Amount
    // Handles: Rs. 100, Rs 100, INR 100, INR.100, Amt 100, Credited with 100
    const amountRegex = /(?:Rs\.?|INR|Amt|Amount|with)[.\s:-]*([\d,]+(?:\.\d{1,2})?)/i;
    const amountMatch = text.match(amountRegex); 
    
    // 2. Extract UTR (12 Digits) - ENHANCED FOR ICICI / CENTRAL BANK
    let utr = null;

    // Priority A: Look for labeled UTRs (Common in ICICI/Central/HDFC)
    // Matches: "UPI-123...", "Ref 123...", "UTR: 123..."
    const strictUtrRegex = /(?:UPI|Ref|UTR|CMS|IMPS|No|Id)[\s:-]*(\d{12})\b/i;
    const strictMatch = text.match(strictUtrRegex);

    if (strictMatch) {
        utr = strictMatch[1];
    } else {
        // Priority B: Fallback to any 12-digit number (Standard UPI)
        const looseUtrRegex = /\b\d{12}\b/;
        const looseMatch = text.match(looseUtrRegex);
        if (looseMatch) utr = looseMatch[0];
    }

    if (amountMatch && utr) {
        return {
            amount: parseFloat(amountMatch[1].replace(/,/g, '')),
            utr: utr
        };
    }
    return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-android-secret');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!db) return res.status(500).json({ error: 'Database not connected.' });

  // ==========================================
  // MODE 1: WEBHOOK (SMS Received)
  // ==========================================
  if (req.method === 'POST') {
      let { utr, amount, message, sms, text, secret } = req.body;
      const headerSecret = req.headers['x-android-secret'];

      // 1. Security Check
      const SERVER_SECRET = process.env.ANDROID_SECRET;
      const isSecretValid = 
        (secret && secret === SERVER_SECRET) || 
        (headerSecret && headerSecret === SERVER_SECRET);

      if (!SERVER_SECRET || !isSecretValid) {
          console.error("⛔ Security Mismatch.");
          return res.status(401).json({ error: 'Unauthorized: Invalid Secret' });
      }

      // 2. Parse Data
      const rawText = text || message || sms;
      if (rawText && (!utr || !amount)) {
          const extracted = parseBankSMS(rawText);
          if (extracted) {
              utr = extracted.utr;
              amount = extracted.amount;
          } else {
              // Gracefully ignore irrelevant SMS (e.g. Debits, OTPs)
              return res.status(200).json({ success: false, message: 'SMS Ignored (Debit or Invalid)' });
          }
      }

      if (!utr || !amount) {
          return res.status(400).json({ error: 'Missing UTR or Amount data' });
      }

      const cleanUTR = utr.trim();
      const numAmount = parseFloat(amount);

      try {
          // 3. Save to Bank Deposits Collection
          // We use 'set' with merge. If it already exists and isUsed is true, we keep it true.
          await db.collection('bank_deposits').doc(cleanUTR).set({
              utr: cleanUTR,
              amount: numAmount,
              originalMessage: rawText || 'Direct Data',
              verifiedAt: FieldValue.serverTimestamp(),
              // Note: We don't overwrite 'isUsed' here if it exists. 
              // We only set it to false if the doc is NEW.
              // To do this safely, we use the fact that set w/ merge won't overwrite existing fields unless specified.
          }, { merge: true });

          // 4. TRIGGER MATCHING (The Key Step)
          const matchResult = await matchAndApprove(cleanUTR, numAmount);

          if(matchResult.matched) {
            console.log("✅ Auto-Matched Transaction:", cleanUTR);
          } else if (matchResult.reason) {
            console.log(`⚠️ Match Failed for ${cleanUTR}: ${matchResult.reason}`);
          }

          return res.status(200).json({ 
              success: true, 
              matched: matchResult.matched,
              extracted: { utr: cleanUTR, amount: numAmount } 
          });

      } catch (error) {
          console.error("Webhook Error:", error);
          return res.status(500).json({ error: error.message });
      }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// MATCHING LOGIC
async function matchAndApprove(utr, amount) {
    // 🛡️ SECURITY STEP: GLOBAL UTR CHECK
    // Ensure this UTR has not been used in ANY completed transaction before.
    const doubleSpendCheck = await db.collection('transactions')
        .where('utr', '==', utr)
        .where('status', '==', 'COMPLETED')
        .limit(1)
        .get();

    if (!doubleSpendCheck.empty) {
        return { matched: false, reason: "UTR Double Spend Prevented (Already Completed)" };
    }

    // Now find the Pending Request
    const txsRef = db.collection('transactions');
    const q = txsRef.where('utr', '==', utr).where('status', '==', 'PENDING').limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) return { matched: false, reason: "No Pending Request Found" };

    const txDoc = snapshot.docs[0];
    const txData = txDoc.data();

    // Allow small difference (float math)
    if (Math.abs(txData.amount - amount) > 2.0) {
        return { matched: false, message: `Amount Mismatch. Received: ${amount}, Expected: ${txData.amount}` };
    }

    await db.runTransaction(async (t) => {
        // Double check Deposit Status inside Transaction
        const depositRef = db.collection('bank_deposits').doc(utr);
        const depositDoc = await t.get(depositRef);
        
        if (depositDoc.exists && depositDoc.data().isUsed === true) {
             throw new Error("Bank Deposit SMS already marked as Used!");
        }

        t.update(depositRef, { isUsed: true, usedBy: txData.userId, usedAt: FieldValue.serverTimestamp() });

        t.update(txDoc.ref, { 
            status: 'COMPLETED', 
            method: 'AUTO_UPI_MATCH', 
            approvedAt: FieldValue.serverTimestamp() 
        });

        const userRef = db.collection('users').doc(txData.userId);
        t.update(userRef, { balance: FieldValue.increment(amount) });
    });

    return { matched: true, success: true };
}