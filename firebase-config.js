// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCoqnPMnB13cTNSfJWkPsvr4_RFUWEVoWI",
  authDomain: "sk-pvt-chat.firebaseapp.com",
  projectId: "sk-pvt-chat",
  storageBucket: "sk-pvt-chat.firebasestorage.app",
  messagingSenderId: "150923025247",
  appId: "1:150923025247:web:198bec74e3838c90e4b4ea",
  measurementId: "G-T21F504Y46"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);