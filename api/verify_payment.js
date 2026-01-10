import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin (Same config as other API routes)
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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!db) return res.status(500).json({ error: 'Database not connected.' });

  try {
    const { userId, utr, amount } = req.body;

    if (!userId || !utr) {
        return res.status(400).json({ error: 'Missing Data' });
    }

    const cleanUTR = utr.trim();
    
    // 1. FIND THE PENDING TRANSACTION
    // We strictly query for a PENDING transaction for this user and UTR.
    const txQuery = await db.collection('transactions')
        .where('userId', '==', userId)
        .where('utr', '==', cleanUTR)
        .where('status', '==', 'PENDING')
        .limit(1)
        .get();

    if (txQuery.empty) {
        return res.status(404).json({ success: false, message: 'No pending transaction found to verify.' });
    }

    const txDoc = txQuery.docs[0];
    const txData = txDoc.data();

    // 2. FIND THE BANK SMS (The Deposit)
    // We look for an "unused" deposit with the same UTR.
    const depositRef = db.collection('bank_deposits').doc(cleanUTR);
    const depositDoc = await depositRef.get();

    if (!depositDoc.exists) {
        return res.status(200).json({ success: false, message: 'Bank SMS not received yet. Please wait.' });
    }

    const depositData = depositDoc.data();

    if (depositData.isUsed) {
        // Edge Case: If it's already used, maybe the client UI isn't updated.
        if (depositData.usedBy === userId) {
             // It was used by THIS user. Auto-fix the transaction status if it got stuck.
             await txDoc.ref.update({ status: 'COMPLETED', method: 'AUTO_FIX' });
             return res.status(200).json({ success: true, message: 'Transaction already verified! Refreshing...' });
        }
        return res.status(400).json({ success: false, message: 'This UTR has already been used.' });
    }

    // 3. VERIFY AMOUNT
    // We allow a small difference (float math) or exact match
    const dbAmount = depositData.amount;
    const reqAmount = parseFloat(txData.amount);

    if (Math.abs(dbAmount - reqAmount) > 2.0) {
        return res.status(400).json({ 
            success: false, 
            message: `Amount mismatch! SMS says ₹${dbAmount}, you requested ₹${reqAmount}.` 
        });
    }

    // 4. EXECUTE TRANSFER (Atomic Transaction)
    await db.runTransaction(async (t) => {
        // Lock Deposit
        const currentDeposit = await t.get(depositRef);
        if (currentDeposit.data().isUsed) throw new Error("UTR just used by someone else.");

        // Mark Deposit Used
        t.update(depositRef, { 
            isUsed: true, 
            usedBy: userId, 
            usedAt: FieldValue.serverTimestamp(),
            verifiedVia: 'CLIENT_FORCE_CHECK'
        });

        // Mark Transaction Completed
        t.update(txDoc.ref, { 
            status: 'COMPLETED', 
            method: 'UPI_AUTO_VERIFY', 
            approvedAt: FieldValue.serverTimestamp() 
        });

        // Add Funds to User
        const userRef = db.collection('users').doc(userId);
        t.update(userRef, { balance: FieldValue.increment(dbAmount) });
    });

    return res.status(200).json({ success: true, message: 'Payment Verified! Funds Added.' });

  } catch (error) {
    console.error("Verification Error:", error);
    return res.status(500).json({ error: error.message });
  }
}