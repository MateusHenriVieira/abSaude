import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar o Firebase apenas se ainda não estiver inicializado
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportar objetos necessários
export const auth = getAuth(app); // Para autenticação
export const db = getFirestore(app); // Para Firestore

// Função para inicializar coleções (se necessário)
export const initializeFirebaseCollections = async () => {
  try {
    console.log("Firebase collections initialized successfully.");
    return true; // Indica sucesso
  } catch (error) {
    console.error("Failed to initialize Firebase collections:", error);
    return false; // Indica falha
  }
};

