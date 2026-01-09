# 🛡️ CRITICAL SECURITY & SETUP GUIDE

For your SMM Panel to be secure and work on Vercel, you must configure the Firebase Console.

## 1. Authorize Your Domain (Fix "Website will not function good")
If you don't do this, Google Login will fail on the live site.

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Authentication** > **Settings** > **Authorized Domains**.
3. Click **Add Domain**.
4. Enter your Vercel domain (e.g., `socialboost-app.vercel.app`).
5. Also add `localhost` (it should be there by default).

---

## 2. Secure Your Database (Prevent Hackers)
This determines who is the REAL owner. Even if someone hacks the code, they cannot hack the database if you set this up.

1. Go to **Firestore Database** > **Rules**.
2. Delete everything there and paste the code below.
3. **REPLACE** `sandeep@gmail.com` with YOUR exact email address in the code below.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 👑 HELPER: Is the user the Real Owner?
    // This matches the email in your Google Login Token, which cannot be faked.
    function isOwner() {
      return request.auth != null && request.auth.token.email == 'sandeep@gmail.com'; 
    }

    // 👤 USERS: Can read/write their OWN balance and data.
    match /users/{userId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || isOwner());
    }

    // 📦 ORDERS: 
    // - Clients can CREATE orders.
    // - Clients can READ their own orders.
    // - ONLY OWNER can UPDATE orders (Approve/Reject).
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isOwner());
      allow update: if isOwner(); // <--- CRITICAL SECURITY LOCK
      allow delete: if isOwner();
    }

    // 💰 TRANSACTIONS (Funds):
    // - Clients can CREATE requests (Pending).
    // - Clients can READ their own.
    // - ONLY OWNER can UPDATE status (Approve Funds).
    match /transactions/{txId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isOwner());
      allow update: if isOwner(); // <--- CRITICAL SECURITY LOCK
    }
  }
}
```

## 3. Verify
Once these rules are published:
1. Try to "Approve" an order using a different Gmail account -> **It will fail (Access Denied).**
2. Try to "Approve" using your Owner Gmail -> **It will succeed.**
