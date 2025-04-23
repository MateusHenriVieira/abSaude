import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAuth } from "firebase/auth"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyBz7utXMj14ex_HwIm5kM9X9RAhZjn0la0",
  authDomain: "saude-na-mao-25a73.firebaseapp.com",
  projectId: "saude-na-mao-25a73",
  storageBucket: "saude-na-mao-25a73.firebasestorage.app",
  messagingSenderId: "689829157339",
  appId: "1:689829157339:web:358c9ae1d20cf6c44c6ffe",
  measurementId: "G-DBQW458JVS",
}

// Initialize Firebase
let app
let analytics

if (!getApps().length) {
  app = initializeApp(firebaseConfig)
  if (typeof window !== "undefined") {
    analytics = getAnalytics(app)
  }
} else {
  app = getApp() // if already initialized, use that one
}

const db = getFirestore(app)
const storage = getStorage(app)
const auth = getAuth(app)

export { db, storage, auth, analytics }

