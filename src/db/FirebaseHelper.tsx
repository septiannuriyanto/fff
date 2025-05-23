import { initializeApp } from "firebase/app";
import { getFirestore, } from "firebase/firestore";
import { collection } from "firebase/firestore";


const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain:import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDERID,
    appId: import.meta.env.VITE_APP_ID
  };
  
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  // Initialize Cloud Firestore and get a reference to the service
  const db = getFirestore(app);
  const tbFuelConsumption = collection(db, "fff-web")

  



export { db, tbFuelConsumption }