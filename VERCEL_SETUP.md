# 🚀 Vercel Deployment & API Key Guide

To securely connect your SMM Panel to **SMMDevil** (so the 'Track Order' feature works publicly), you must add your API Key in Vercel.

**Note:** We use Vercel Environment Variables to keep your key hidden from hackers. It is never exposed to the frontend browser code.

---

## Step 1: Get Your SMMDevil API Key

1.  Login to [SMMDevil](https://smmdevil.com).
2.  Go to **Account** > **Settings** (or look for the **API** tab).
3.  Click "Generate New API Key" if you haven't already.
4.  **Copy** the long string of characters.

---

## Step 2: Add Key to Vercel

1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Select your project (**SocialBoost**).
3.  Click on **Settings** (Top Tab).
4.  Click on **Environment Variables** (Left Sidebar).
5.  Add the new variable:

    *   **Key:** `SMM_API_KEY`
    *   **Value:** `(Paste your SMMDevil Key here)`
    *   **Environments:** Select All (Production, Preview, Development)

6.  Click **Save**.

---

## Step 3: Redeploy (Crucial!)

Changes to variables do not happen instantly. You must rebuild the site.

1.  Go to the **Deployments** tab in Vercel.
2.  Find your latest deployment (the top one).
3.  Click the **three dots (...)** button next to it.
4.  Select **Redeploy**.
5.  Wait for the build to finish.

---

## ✅ How to Test

1.  Open your live website URL.
2.  Go to the **Track Order** page.
3.  Enter a valid Order ID from SMMDevil.
4.  If it shows the status (e.g., "Pending", "Processing"), the connection is successful!
