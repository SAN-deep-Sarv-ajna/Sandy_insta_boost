export default async function handler(req, res) {
  // Handle CORS for the frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const TARGET_URL = 'https://smmdevil.com/api/v2';

  try {
    // SMMDevil expects Form Data (application/x-www-form-urlencoded)
    // Req.body from Vercel is already parsed if content-type is set, 
    // or we might need to forward it.
    let bodyData;
    
    if (typeof req.body === 'object') {
        bodyData = new URLSearchParams(req.body).toString();
    } else {
        bodyData = req.body;
    }

    const response = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyData,
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Failed to connect to SMM Provider via Proxy', details: error.message });
  }
}