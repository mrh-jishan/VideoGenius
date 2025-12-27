"use server";

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

function getFirebaseServerApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export async function getServerFirestore() {
  const app = getFirebaseServerApp();
  return getFirestore(app);
}
