import { initializeApp, getApps, getApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { Auth, connectAuthEmulator, getAuth, initializeAuth, Persistence } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * CONEXÃO COM O FIREBASE (app nativo)
 *
 * O MESMO projeto, as MESMAS Security Rules e as MESMAS Cloud Functions da
 * versão web. Com EXPO_PUBLIC_USE_EMULATORS=true, o app usa os emuladores
 * rodando no computador (EXPO_PUBLIC_EMULADOR_HOST = IP do computador na rede)
 * no projeto fictício `demo-conecta-tdah`, igual ao modo protótipo da web.
 *
 * O que fica guardado no celular: só o LOGIN (AsyncStorage), como em qualquer
 * app. Pastas e mensagens não: no React Native o Firestore guarda o cache
 * só na memória, e ele some ao fechar o app (celular compartilhado)
 */
const usarEmuladores = process.env.EXPO_PUBLIC_USE_EMULATORS === "true";
const hostEmulador = process.env.EXPO_PUBLIC_EMULADOR_HOST ?? "127.0.0.1";

// No app, o pacote firebase/auth carrega a versão "react-native", que tem
// esta função; os tipos (feitos para a web) não a declaram
const { getReactNativePersistence } = FirebaseAuth as unknown as {
    getReactNativePersistence: (armazenamento: typeof AsyncStorage) => Persistence;
};

const firebaseConfig = usarEmuladores
    ? { apiKey: "chave-ficticia", projectId: "demo-conecta-tdah" }
    : {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

// O recarregamento rápido do Expo reexecuta este arquivo: não inicia duas vezes
const jaIniciado = getApps().length > 0;
const app = jaIniciado ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = jaIniciado
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
// Mesma região das Functions (São Paulo)
export const functions = getFunctions(app, "southamerica-east1");

if (usarEmuladores && !jaIniciado) {
    connectAuthEmulator(auth, `http://${hostEmulador}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, hostEmulador, 8080);
    connectFunctionsEmulator(functions, hostEmulador, 5001);
}

export default app;
