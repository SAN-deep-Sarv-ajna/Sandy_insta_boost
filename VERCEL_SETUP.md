# 🚀 Vercel Deployment & Keys Guide

## 1. SMMDevil API Key (For Orders)
*   **Key:** `SMM_API_KEY`
*   **Value:** (Your SMMDevil Key)

## 2. Android Bridge Secret (For Auto-Payments)
*   **Key:** `ANDROID_SECRET`
*   **Value:** (A password you created, e.g., `my_secret_pass_123`)

---

## 3. Firebase Admin Keys (CRITICAL for Database Access)

To allow the server to "Approve" payments securely, you need a Service Account.

1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Project Settings (Gear Icon) > **Service accounts**.
3.  Click **Generate new private key**.
4.  Open the downloaded JSON file. You will see fields like `client_email`, `private_key`, `project_id`.

**Add these to Vercel Environment Variables:**

*   **Key:** `FIREBASE_CLIENT_EMAIL`
    *   **Value:** (e.g., `firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com`)

*   **Key:** `FIREBASE_PRIVATE_KEY`
    *   **Value:** (The long string starting with `-----BEGIN PRIVATE KEY-----...`)
    *   *Note: Copy the entire string including newlines.*

*   **Key:** `FIREBASE_PROJECT_ID`
    *   **Value:** (Your project ID, e.g., `socialboost-123`)

---

## 4. Redeploy
After adding these keys, go to **Deployments** and click **Redeploy**.
