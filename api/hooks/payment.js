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

// --- SMART PARSER FOR INDIAN BANKS ---
function parseBankSMS(text) {
    if (!text) return null;
    const cleanText = text.toString();

    // 1. Extract Amount (Look for Rs, INR, or just numbers preceded by 'credited')
    // Matches: Rs 500, INR 500.00, Rs.500
    const amountRegex = /(?:Rs\.?|INR|Amt)[.\s]*([\d,]+(?:\.\d{1,2})?)/i;
    const amountMatch = cleanText.match(amountRegex);
    
    // 2. Extract UTR (12 Digits)
    // Most reliable way: Look for exactly 12 digits in a row
    const utrRegex = /\b\d{12}\b/;
    const utrMatch = cleanText.match(utrRegex);

    if (amountMatch && utrMatch) {
        return {
            amount: parseFloat(amountMatch[1].replace(/,/g, '')),
            utr: utrMatch[0]
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
  // MODE 1: ANDROID WEBHOOK (POST)
  // Accepts JSON: { message: "Raw SMS Text...", secret: "..." }
  // ==========================================
  if (req.method === 'POST') {
      // FIX: Added 'text' to destructuring because SmsForwarder uses %text%
      let { utr, amount, message, sms, text, secret } = req.body;
      const headerSecret = req.headers['x-android-secret'];

      // 1. Security Check
      const SERVER_SECRET = process.env.ANDROID_SECRET;
      
      // Strict check: One of the provided secrets must match the server secret
      const isSecretValid = 
        (secret && secret === SERVER_SECRET) || 
        (headerSecret && headerSecret === SERVER_SECRET);

      if (!SERVER_SECRET || !isSecretValid) {
          console.error("⛔ Security Mismatch. Server:", SERVER_SECRET, "Received Body:", secret, "Header:", headerSecret);
          return res.status(401).json({ error: 'Unauthorized: Invalid Secret' });
      }

      // 2. Smart Extraction (If raw message is provided)
      // FIX: Prioritize 'text' which comes from the app
      const rawText = text || message || sms;
      
      if (rawText && (!utr || !amount)) {
          console.log("Parsing Raw SMS:", rawText);
          const extracted = parseBankSMS(rawText);
          if (extracted) {
              utr = extracted.utr;
              amount = extracted.amount;
          } else {
              console.log("❌ Could not extract UTR/Amount");
              return res.status(400).json({ error: 'Could not extract UTR/Amount from SMS text' });
          }
      }

      if (!utr || !amount) {
          return res.status(400).json({ error: 'Missing UTR or Amount data' });
      }

      const cleanUTR = utr.trim();
      const numAmount = parseFloat(amount);

      try {
          // 3. Save Deposit Record
          await db.collection('bank_deposits').doc(cleanUTR).set({
              utr: cleanUTR,
              amount: numAmount,
              originalMessage: rawText || 'Direct Data',
              verifiedAt: FieldValue.serverTimestamp(),
              isUsed: false
          }, { merge: true });

          // 4. Try to Match
          const matchResult = await matchAndApprove(cleanUTR, numAmount);

          if(matchResult.matched) {
            console.log("✅ Auto-Matched Transaction:", cleanUTR);
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

  // ==========================================
  // MODE 2: CLIENT VERIFICATION (GET)
  // ==========================================
  if (req.method === 'GET') {
      const { utr } = req.query;
      if (!utr) return res.status(400).json({ error: 'UTR Required' });

      try {
          const depositSnap = await db.collection('bank_deposits').doc(utr).get();
          if (!depositSnap.exists) {
              return res.status(404).json({ success: false, message: 'Wait for Bank SMS to arrive.' });
          }

          const depositData = depositSnap.data();
          if (depositData.isUsed) {
              return res.status(400).json({ success: false, message: 'UTR already used.' });
          }

          const matchResult = await matchAndApprove(utr, depositData.amount);
          return res.status(200).json(matchResult);
      } catch (error) {
          return res.status(500).json({ error: error.message });
      }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// MATCHING LOGIC
async function matchAndApprove(utr, amount) {
    const txsRef = db.collection('transactions');
    const q = txsRef.where('utr', '==', utr).where('status', '==', 'PENDING').limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) return { matched: false };

    const txDoc = snapshot.docs[0];
    const txData = txDoc.data();

    // Allow small difference (float math)
    if (Math.abs(txData.amount - amount) > 2.0) {
        return { matched: false, message: `Amount Mismatch. Received: ${amount}, Expected: ${txData.amount}` };
    }

    await db.runTransaction(async (t) => {
        const depositRef = db.collection('bank_deposits').doc(utr);
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