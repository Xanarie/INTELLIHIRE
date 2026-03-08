// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAkZql6w6fTwCZbLJ1FDBQv6QA_KyjyV7A",
  authDomain: "intellihire-system.firebaseapp.com",
  databaseURL: "https://intellihire-system-default-rtdb.firebaseio.com",
  projectId: "intellihire-system",
  storageBucket: "intellihire-system.firebasestorage.app",
  messagingSenderId: "856403154622",
  appId: "1:856403154622:web:48b4d4099a78256d9cb0ef",
  measurementId: "G-LH5GH1T14S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);