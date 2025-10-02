// Import the functions you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Firestore DB
import { getAuth } from "firebase/auth"; // (optional, if you use login)
import { getStorage } from "firebase/storage"; // (optional, if you use file upload)

// Your web app's Firebase configuration (copy from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAvvIquaJOp...etc",
  authDomain: "inventorysystem-9b34a.firebaseapp.com",
  projectId: "inventorysystem-9b34a",
  storageBucket: "inventorysystem-9b34a.appspot.com",
  messagingSenderId: "870532124609",
  appId: "1:870532124609:web:7793708b5f21f1053de940",
  measurementId: "G-8QBX9ZZ04W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services so you can use them anywhere
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
