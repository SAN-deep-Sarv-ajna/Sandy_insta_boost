export default async function handler(req, res) {
  // 1. Setup CORS so your website can talk to this server function
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Get the Order ID from the client
  // We accept it from query (?order=123) or body
  const orderId = req.query.order || req.body.order;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  // 3. Get the Secret Key from Vercel Environment Variables
  // 🛡️ SECURITY: We use 'SMM_API_KEY' which is HIDDEN from the frontend.
  const API_KEY = process.env.SMM_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server Config Error: SMM_API_KEY is missing in Vercel.' });
  }

  try {
    // 4. THE SECURITY LOCK: 
    // We HARDCODE 'action=status'. 
    // Even if a hacker sends "action=add", we ignore it and send "status".
    const targetUrl = 'https://smmdevil.com/api/v2';
    const params = new URLSearchParams();
    params.append('key', API_KEY);
    params.append('action', 'status'); // <--- LOCKED HERE
    params.append('order', orderId);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Tracking Error:', error);
    res.status(500).json({ error: 'Failed to fetch status from provider' });
  }
}