import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBxc6D8eZyDgRhClZXeaYJuzvruy7S-nrI",
  authDomain: "sk-shop-admin.firebaseapp.com",
  databaseURL: "https://sk-shop-admin-default-rtdb.firebaseio.com",
  projectId: "sk-shop-admin",
  storageBucket: "sk-shop-admin.firebasestorage.app",
  messagingSenderId: "269505526934",
  appId: "1:269505526934:web:a54e6cee2027f387e8d6b7",
  measurementId: "G-WS41J20G12",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
