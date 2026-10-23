/**
 * SERVICE WORKER — Conecta TDAH SUS (PWA)
 *
 * Guarda no aparelho SÓ arquivos fixos do site (código, estilos, fontes e
 * ícones), para abrir mais rápido e gastar menos dados.
 *
 * NUNCA guarda dados das pastas, relatórios, conversas ou contas:
 *  - pedidos para outros endereços (o Supabase) passam direto, sem cache;
 *  - as páginas sempre vêm da internet (sem internet: tela "offline").
 * Motivo (LGPD, segurança por padrão): são dados de saúde de crianças, e
 * muitas famílias dividem o celular. Nada fica salvo para quem pegar o
 * aparelho depois.
 */
const CACHE = "conecta-tdah-estaticos-v1";
const PAGINA_OFFLINE = "/offline.html";

// Arquivos de /_next/static têm o conteúdo no nome: nunca mudam
const ehImutavel = (url) => url.pathname.startsWith("/_next/static/");

// Ícones e imagens têm nome fixo: podem mudar entre versões do site
const ehImagemFixa = (url) =>
    url.pathname.startsWith("/icon/") || url.pathname === "/apple-icon" || url.pathname.startsWith("/assets/img/");

// Só guarda resposta válida do próprio site (nada de erro ou redirecionamento)
const podeGuardar = (resposta) => resposta.ok && resposta.type === "basic";

self.addEventListener("install", (evento) => {
    evento.waitUntil(caches.open(CACHE).then((cache) => cache.add(PAGINA_OFFLINE)));
    self.skipWaiting();
});

// Ao atualizar o service worker, apaga caches de versões antigas
self.addEventListener("activate", (evento) => {
    evento.waitUntil(
        caches.keys()
            .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome))))
            .then(() => self.clients.claim())
    );
});

// Reserva, caso a página offline não esteja guardada
const respostaOffline = () =>
    caches.match(PAGINA_OFFLINE).then((pagina) => pagina || new Response(
        "Você está sem internet. Conecte-se e tente de novo.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    ));

self.addEventListener("fetch", (evento) => {
    const pedido = evento.request;
    if (pedido.method !== "GET") return;

    const url = new URL(pedido.url);
    // Supabase e qualquer outro endereço: não interfere
    if (url.origin !== self.location.origin) return;

    // Páginas: sempre da internet; sem conexão, a tela "você está sem internet"
    if (pedido.mode === "navigate") {
        evento.respondWith(fetch(pedido).catch(respostaOffline));
        return;
    }

    // Código e estilos com o conteúdo no nome: do aparelho, se já tiver
    if (ehImutavel(url)) {
        evento.respondWith(
            caches.open(CACHE).then((cache) =>
                cache.match(pedido).then((guardado) => guardado || fetch(pedido).then((resposta) => {
                    if (podeGuardar(resposta)) cache.put(pedido, resposta.clone());
                    return resposta;
                }))
            )
        );
        return;
    }

    // Ícones e imagens: mostra o guardado na hora e atualiza em segundo plano
    // (se o logo mudar, o aparelho recebe o novo na próxima vez)
    if (ehImagemFixa(url)) {
        evento.respondWith(
            caches.open(CACHE).then((cache) =>
                cache.match(pedido).then((guardado) => {
                    const daRede = fetch(pedido).then((resposta) => {
                        if (podeGuardar(resposta)) cache.put(pedido, resposta.clone());
                        return resposta;
                    });
                    if (guardado) {
                        evento.waitUntil(daRede.catch(() => undefined));
                        return guardado;
                    }
                    return daRede;
                })
            )
        );
    }
    // Todo o resto (inclusive dados das telas): direto da internet, sem guardar
});
