import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 1. Initialize Firebase Admin (Reuse existing config pattern)
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!db) return res.status(500).json({ error: 'Database configuration missing on server.' });

  try {
    const { userId, userEmail, userName, serviceId, serviceName, platform, link, quantity } = req.body;

    if (!userId || !serviceId || !link || !quantity) {
        return res.status(400).json({ error: 'Missing required order details.' });
    }

    // 1. FETCH SETTINGS (Parallel for speed)
    const [publicSettingsSnap, privateSettingsSnap] = await Promise.all([
        db.collection('settings').doc('public').get(),
        db.collection('settings').doc('private').get()
    ]);

    const publicSettings = publicSettingsSnap.data() || {};
    const privateSettings = privateSettingsSnap.data() || {};

    const API_KEY = privateSettings.apiKey;
    const EXCHANGE_RATE = publicSettings.exchangeRate || 1;
    const GLOBAL_DISCOUNT = publicSettings.globalDiscount || 0;
    const MARKUP_MULTIPLIER = 1.5; // Your Profit Margin

    if (!API_KEY) throw new Error("Server Error: Provider API Key is not configured.");

    // 2. GET REAL-TIME PROVIDER RATE (To calculate YOUR Selling Price)
    // We fetch the services list to find the rate.
    const servicesParams = new URLSearchParams();
    servicesParams.append('key', API_KEY);
    servicesParams.append('action', 'services');

    const servicesRes = await fetch('https://smmdevil.com/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: servicesParams
    });
    
    const servicesData = await servicesRes.json();
    const serviceItem = servicesData.find(s => s.service == serviceId);

    if (!serviceItem) throw new Error(`Service ID ${serviceId} unavailable from provider.`);

    // 3. CALCULATE SELLING PRICE (The "Client Price")
    const providerRate = parseFloat(serviceItem.rate); // Cost in USD
    const costInINR = providerRate * EXCHANGE_RATE;
    let sellingRate = costInINR * MARKUP_MULTIPLIER; // Apply 1.5x Margin
    
    // Apply Discount
    if (GLOBAL_DISCOUNT > 0) {
        sellingRate = sellingRate * (1 - GLOBAL_DISCOUNT / 100);
    }

    const pricePerItem = sellingRate / 1000;
    const totalCharge = pricePerItem * quantity;

    // 4. TRANSACTION: CHECK BALANCE & DEDUCT
    let finalBalance = 0;
    
    await db.runTransaction(async (t) => {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await t.get(userRef);

        if (!userDoc.exists) throw new Error("User account not found.");

        const currentBalance = userDoc.data().balance || 0;

        if (currentBalance < totalCharge) {
            throw new Error(`Insufficient Funds. Wallet: ₹${currentBalance.toFixed(2)}, Needed: ₹${totalCharge.toFixed(2)}`);
        }

        // Deduct Balance
        const newBalance = currentBalance - totalCharge;
        finalBalance = newBalance;
        t.update(userRef, { balance: newBalance });
    });

    // 5. PLACE ORDER WITH PROVIDER
    const orderParams = new URLSearchParams();
    orderParams.append('key', API_KEY);
    orderParams.append('action', 'add');
    orderParams.append('service', serviceId);
    orderParams.append('link', link);
    orderParams.append('quantity', quantity);

    const orderRes = await fetch('https://smmdevil.com/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: orderParams
    });

    const orderResult = await orderRes.json();

    if (orderResult.error) {
        // ⚠️ ROLLBACK: Refund if API fails
        await db.collection('users').doc(userId).update({
            balance: FieldValue.increment(totalCharge)
        });
        throw new Error(`Provider Error: ${orderResult.error}`);
    }

    const providerOrderId = orderResult.order;

    // 6. SAVE RECORDS
    const timestamp = FieldValue.serverTimestamp();

    // Create Order Record
    await db.collection('orders').add({
        userId,
        userEmail: userEmail || 'unknown',
        serviceId: parseInt(serviceId),
        serviceName: serviceName || serviceItem.name,
        platform: platform || 'Other',
        link,
        quantity: parseInt(quantity),
        charge: parseFloat(totalCharge.toFixed(2)),
        status: 'PROCESSING', // Instant Active
        providerOrderId: providerOrderId,
        createdAt: timestamp,
        via: 'API_DIRECT'
    });

    // Create Transaction Record
    await db.collection('transactions').add({
        userId,
        userName: userName || 'User',
        amount: parseFloat(totalCharge.toFixed(2)),
        type: 'DEBIT',
        reason: `Order #${providerOrderId} (${serviceName})`,
        createdAt: timestamp,
        status: 'COMPLETED'
    });

    return res.status(200).json({ 
        success: true, 
        orderId: providerOrderId,
        charge: totalCharge.toFixed(2),
        newBalance: finalBalance.toFixed(2)
    });

  } catch (error) {
    console.error("Order API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}