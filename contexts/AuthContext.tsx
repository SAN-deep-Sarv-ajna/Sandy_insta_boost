import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { isAdminUnlocked } from '../services/smmProvider';

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

  // Listen for local admin unlock changes
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
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to real-time user data (Balance updates instantly)
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              balance: docSnap.data().balance || 0,
              role: docSnap.data().role || 'user'
            });
          } else {
            // Create user doc if it doesn't exist
            const newUser = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              balance: 0,
              role: 'user',
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
