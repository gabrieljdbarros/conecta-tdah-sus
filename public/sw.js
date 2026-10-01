/**
 * SERVICE WORKER — Conecta TDAH SUS (PWA)
 *
 * Guarda no aparelho SÓ arquivos fixos do site (código, estilos, fontes e
 * ícones), para abrir mais rápido e gastar menos dados.
 *
 * NUNCA guarda dados das pastas, relatórios, conversas ou contas:
 *  - pedidos para outros endereços (Firebase) passam direto, sem cache;
 *  - as páginas sempre vêm da internet (sem internet: tela "offline").
 * Motivo (LGPD, segurança por padrão): são dados de saúde de crianças, e
 * muitas famílias dividem o celular. Nada fica salvo para quem pegar o
 * aparelho depois.
 */
const CACHE = "conecta-tdah-estaticos-v1";
const PAGINA_OFFLINE = "/offline.html";

// Arquivos fixos: os de /_next/static têm o conteúdo no nome (nunca mudam)
function ehArquivoFixo(url) {
    return url.pathname.startsWith("/_next/static/")
        || url.pathname.startsWith("/icon/")
        || url.pathname === "/apple-icon"
        || url.pathname.startsWith("/assets/img/");
}

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

self.addEventListener("fetch", (evento) => {
    const pedido = evento.request;
    if (pedido.method !== "GET") return;

    const url = new URL(pedido.url);
    // Firebase e qualquer outro endereço: não interfere
    if (url.origin !== self.location.origin) return;

    // Páginas: sempre da internet; sem conexão, a tela "você está sem internet"
    if (pedido.mode === "navigate") {
        evento.respondWith(fetch(pedido).catch(() => caches.match(PAGINA_OFFLINE)));
        return;
    }

    // Arquivos fixos: do aparelho, se já tiver; senão baixa e guarda
    if (ehArquivoFixo(url)) {
        evento.respondWith(
            caches.open(CACHE).then((cache) =>
                cache.match(pedido).then((guardado) => guardado || fetch(pedido).then((resposta) => {
                    if (resposta.ok) cache.put(pedido, resposta.clone());
                    return resposta;
                }))
            )
        );
    }
    // Todo o resto (inclusive dados das telas): direto da internet, sem guardar
});
