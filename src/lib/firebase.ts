import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCzQBix5PPRalq1EN9auK3eNr7H-NPOR3U",
  authDomain: "riksystem.firebaseapp.com",
  projectId: "riksystem",
  storageBucket: "riksystem.firebasestorage.app",
  messagingSenderId: "695311279155",
  appId: "1:695311279155:web:a16363723c0f4535306f46",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
