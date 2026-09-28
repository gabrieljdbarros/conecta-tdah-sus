import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * CONFIGURAÇÃO DO FIREBASE
 *
 * As chaves ficam em variáveis de ambiente NEXT_PUBLIC_* (expostas ao
 * navegador, como recomenda a documentação do Firebase — a proteção real
 * dos dados é feita pelas Firestore Security Rules, não pelo sigilo destas
 * chaves). Preencha o arquivo `.env.local` a partir de `.env.local.example`.
 */
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Evita reinicializar o app durante o hot-reload do Next.js
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
