import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { isAdminUnlocked, setAdminUnlocked } from '../services/smmProvider';
import { APP_CONFIG } from '../constants';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  balance: number;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(isAdminUnlocked());

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAdmin(isAdminUnlocked());
    };
    window.addEventListener('smm_settings_updated', handleStorageChange);
    return () => window.removeEventListener('smm_settings_updated', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        
        // 🔒 SECURITY: Check if this is the Hardcoded Owner Email
        const isOwnerEmail = firebaseUser.email === APP_CONFIG.ADMIN_EMAIL;

        if (isOwnerEmail) {
            console.log("👑 Owner Logged In: Granting Admin Access");
            setAdminUnlocked(true);
            setIsAdmin(true);
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            
            // 🛡️ DOUBLE CHECK: If email matches Owner but DB role is 'user', fix it.
            // This ensures the database knows you are the admin for Security Rules logic.
            if (isOwnerEmail && userData.role !== 'admin') {
                updateDoc(userRef, { role: 'admin' }).catch(console.error);
            }

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              balance: userData.balance || 0,
              role: userData.role || (isOwnerEmail ? 'admin' : 'user')
            });
          } else {
            // Create New User
            const newUser = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              balance: 0,
              role: isOwnerEmail ? 'admin' : 'user', // Set role immediately if matches
              createdAt: new Date().toISOString()
            };
            setDoc(userRef, newUser);
            setUser({ ...newUser, uid: firebaseUser.uid } as UserData);
          }
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
        alert("Firebase is not configured. Please add keys to .env");
        return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    if(auth) await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};