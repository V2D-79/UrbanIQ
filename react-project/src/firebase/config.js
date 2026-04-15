import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCsYfEOFnlEIyV6rsPETYfdmWbK5itoikQ",
  authDomain: "ghost-grid-9c3e8.firebaseapp.com",
  databaseURL: "https://ghost-grid-9c3e8-default-rtdb.firebaseio.com",
  projectId: "ghost-grid-9c3e8",
  storageBucket: "ghost-grid-9c3e8.firebasestorage.app",
  messagingSenderId: "71944577874",
  appId: "1:71944577874:web:16c80a078ad8815e62908b",
  measurementId: "G-Y3B3Z6KPN9",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth };
export default app;
