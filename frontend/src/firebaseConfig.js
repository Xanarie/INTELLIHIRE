// frontend/src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAkZql6w6fTwCZbLJ1FDBQv6QA_KyjyV7A",
  authDomain: "intellihire-system.firebaseapp.com",
  databaseURL: "https://intellihire-system-default-rtdb.firebaseio.com",
  projectId: "intellihire-system",
  storageBucket: "intellihire-system.firebasestorage.app",
  messagingSenderId: "856403154622",
  appId: "1:856403154622:web:48b4d4099a78256d9cb0ef",
  measurementId: "G-LH5GH1T14S",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getDatabase(app);