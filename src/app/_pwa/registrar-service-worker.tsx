"use client";
import { useEffect } from "react";

/**
 * Ativa o service worker (public/sw.js) — só na versão de produção: no
 * modo de desenvolvimento ele atrapalharia as atualizações automáticas da
 * tela. Não desenha nada.
 */
export default function RegistrarServiceWorker() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
        navigator.serviceWorker.register("/sw.js").catch(() => {
            // Sem service worker o site continua funcionando normalmente
        });
    }, []);
    return null;
}
