# 🛡️ SECURITY & ADMIN SETUP

## 1. How to Make Yourself "Admin" (The Database Way)
Since we removed the hardcoded email from the code, you must manually set your status in the database.

1.  **Login** to your website (SocialBoost) using Google.
2.  Go to the [Firebase Console](https://console.firebase.google.com/).
3.  Click **Firestore Database** > **Data**.
4.  Click the `users` collection.
5.  Find your user ID (look for the document that has your email).
6.  Change the field `role` from `"user"` to `"admin"`.
    *   *If the field doesn't exist, click "Add field", name it `role`, type `string`, value `admin`.*
7.  **Refresh your website.** You will now see the "Order Queue" and "Funds" menus.

## 2. Secure Your Database (Rules)

Copy this into **Firestore Database > Rules**. This ensures only people with `role: 'admin'` can touch money or approve orders.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 👑 CHECK ADMIN STATUS IN DATABASE
    // We look up the 'users' collection to see if the requester has role == 'admin'
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // 👤 USERS
    match /users/{userId} {
      // Users can read/write their own data. Admins can read/write all.
      allow read, write: if request.auth != null && (request.auth.uid == userId || isAdmin());
    }

    // 📦 ORDERS
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isAdmin());
      allow update: if isAdmin(); 
      allow delete: if isAdmin();
    }

    // 💰 TRANSACTIONS
    match /transactions/{txId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isAdmin());
      allow update: if isAdmin(); 
    }
    
    // 🏦 BANK DEPOSITS (For Android Auto-Verify)
    match /bank_deposits/{utr} {
        allow read, write: if true; 
    }

    // ⚙️ GLOBAL SETTINGS (The Secure Store)
    match /settings/public {
      allow read: if true; // Everyone needs UPI ID & Exchange Rate
      allow write: if isAdmin(); // Only you can change it
    }
    
    match /settings/private {
      allow read, write: if isAdmin(); // API Keys are hidden from everyone else
    }
  }
}
```
