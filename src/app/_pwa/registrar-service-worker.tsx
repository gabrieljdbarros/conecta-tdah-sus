"use client";
import { useEffect } from "react";

/**
 * Ativa o service worker (public/sw.js) — só na versão de produção: no
 * modo de desenvolvimento ele atrapalharia as atualizações automáticas da
 * tela. Não desenha nada.
 */
export default function RegistrarServiceWorker() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV !== "production") {
            // No desenvolvimento, desliga o service worker que tenha ficado de um
            // teste da versão de produção (npm run preview) no mesmo endereço:
            // no dev os arquivos de /_next/static não mudam de nome, e ele
            // continuaria entregando código e estilos antigos
            navigator.serviceWorker.getRegistrations()
                .then((registros) => registros.forEach((registro) => registro.unregister()))
                .catch(() => {});
            return;
        }
        navigator.serviceWorker.register("/sw.js").catch(() => {
            // Sem service worker o site continua funcionando normalmente
        });
    }, []);
    return null;
}
