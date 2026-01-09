# 📱 Android Auto-Payment Setup (SmsForwarder)

This guide is for the app **"SmsForwarder"** (by Yasoo) or similar Webhook-capable apps.

## 1. Vercel Setup (Server)
1. Go to Vercel Dashboard > Settings > Environment Variables.
2. Add:
   * **Key:** `ANDROID_SECRET`
   * **Value:** `socialboost_secure_123` (Or your own password)
3. **Redeploy** your app.

## 2. App Setup (Phone)

### Step A: Sender Rule (The Trigger)
1. Open App > **Senders**.
2. Click **+** (Plus).
3. **Match Type:** `StartWith` (or Contains).
4. **Match Value:** `HDFC` (or your bank name).
5. **Sender ID:** (Optional, leave blank to catch all).

### Step B: Action Rule (The Webhook)
1. Open App > **Forwarding**.
2. Click **+** (Plus) > Select **Webhook**.
3. **Target URL:** `https://YOUR-APP-URL.vercel.app/api/hooks/payment`
4. **Method:** `POST`
5. **Headers:**
   * Key: `x-android-secret`
   * Value: `socialboost_secure_123` (Must match Vercel).
6. **Body / Template:** Select **Custom Template** or **JSON**.
   * Paste this EXACTLY:
     ```json
     {
       "message": "{{msg_content}}",
       "secret": "socialboost_secure_123"
     }
     ```
   *(Note: If `{{msg_content}}` doesn't work, try `%body%` or check the app's help section for variables).*

## 3. How to Test
1. Go to your website > **Add Funds**.
2. Submit a request (e.g., ₹10, UTR: 123456789012).
3. Open Phone App > **Test**.
4. Enter Body: `Rs 10.00 credited to account XX123 linked to UPI Ref No 123456789012 - HDFC Bank`.
5. Send.
6. Check your website balance (click "Check Status" in history).
