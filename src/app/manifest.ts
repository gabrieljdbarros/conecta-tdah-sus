import type { MetadataRoute } from "next";

/**
 * MANIFESTO DO PWA — o "cartão de identidade" do aplicativo instalável.
 * Com ele, o navegador oferece "Instalar aplicativo" (Android) e o site
 * abre em tela cheia, com ícone na tela inicial. Mesmo código e mesmo
 * backend do painel web (decisão do projeto: PWA agora, app nativo depois).
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Conecta TDAH SUS",
        short_name: "Conecta TDAH",
        description: "Escola, família e médicos do SUS acompanhando juntos estudantes com TDAH (projeto acadêmico).",
        lang: "pt-BR",
        // Quem não está logado é levado ao login pelo middleware
        start_url: "/admin/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ff5c00",
        icons: [
            { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
            // "maskable": o Android pode recortar em círculo; o desenho fica longe das bordas
            { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
