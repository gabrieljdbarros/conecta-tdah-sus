import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

/**
 * CONFIGURAÇÃO DO FIREBASE
 *
 * As chaves ficam em variáveis de ambiente NEXT_PUBLIC_* (expostas ao
 * navegador, como recomenda a documentação do Firebase — a proteção real
 * dos dados é feita pelas Firestore Security Rules, não pelo sigilo destas
 * chaves). Preencha o arquivo `.env.local` a partir de `.env.local.example`.
 *
 * Com NEXT_PUBLIC_USE_EMULATORS=true, o site usa os emuladores locais
 * (Auth, Firestore e Functions — `npm run emulators`) no projeto fictício
 * `demo-conecta-tdah`, em vez do projeto real. É o modo do protótipo
 * enquanto as Cloud Functions não são publicadas (exigem o plano Blaze).
 */
const usarEmuladores = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

// Trava: um build de produção com a flag ligada apontaria para 127.0.0.1 e
// pareceria um defeito estranho. Melhor falhar com uma mensagem clara
if (usarEmuladores && process.env.NODE_ENV === "production")
    throw new Error("NEXT_PUBLIC_USE_EMULATORS=true não pode ser usado em produção. Desligue no .env.local.");

const firebaseConfig = usarEmuladores
    ? { apiKey: "chave-ficticia", projectId: "demo-conecta-tdah" }
    : {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

// Evita reinicializar o app durante o hot-reload do Next.js
const jaIniciado = getApps().length > 0;
const app = jaIniciado ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
// Mesma região das Functions (São Paulo)
export const functions = getFunctions(app, "southamerica-east1");

// Conecta aos emuladores uma única vez (o hot-reload reexecuta este arquivo)
if (usarEmuladores && !jaIniciado) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export default app;
