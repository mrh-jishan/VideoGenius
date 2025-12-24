'use client';

import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { getFirebase } from './provider';
import { initializeFirebase } from '.';
import { setDocumentNonBlocking } from './non-blocking-updates';


const { auth, firestore } = initializeFirebase();
const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Create user document in Firestore on first sign-in
    if (user) {
      const userRef = doc(firestore, 'users', user.uid);
      const userData = {
        id: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp(),
      };
      
      // Use non-blocking write and update creation timestamp only once.
      setDocumentNonBlocking(userRef, { ...userData, createdAt: serverTimestamp() }, { merge: true });
    }
  } catch (error) {
    console.error("Error signing in with Google: ", error);
  }
};

export const signOutWithGoogle = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};

export const onAuthUserStateChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
