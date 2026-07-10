/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration (provided by user)
const firebaseConfig = {
  apiKey: "AIzaSyD9aowDuikorcbioTpvR4-5pNGbtvVe0QA",
  authDomain: "diemdanh-56430.firebaseapp.com",
  projectId: "diemdanh-56430",
  storageBucket: "diemdanh-56430.firebasestorage.app",
  messagingSenderId: "735680893276",
  appId: "1:735680893276:web:c893a3e12e005992fab199"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
