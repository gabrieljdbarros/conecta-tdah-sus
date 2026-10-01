import { ImageResponse } from "next/og";

/**
 * ÍCONES DO APLICATIVO (192 e 512 px), desenhados em código pelo próprio
 * Next.js (next/og) — sem programa de imagem nem dependência nova.
 * Gerados no build, servidos em /icon/192 e /icon/512.
 */
export function generateImageMetadata() {
    return [
        { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
        { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
    ];
}

export default function Icon({ id }: { id: string }) {
    const tamanho = Number(id);
    return new ImageResponse(
        (
            // Fundo inteiro na cor do tema; as letras ficam no centro, longe
            // das bordas, para o Android poder recortar em círculo (maskable)
            <div style={{
                width: "100%", height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", background: "#0069ad", color: "white",
                fontWeight: 700, fontFamily: "sans-serif",
            }}>
                <div style={{ fontSize: tamanho * 0.24, lineHeight: 1 }}>TDAH</div>
                <div style={{ fontSize: tamanho * 0.11, lineHeight: 1, marginTop: tamanho * 0.03 }}>Conecta</div>
            </div>
        ),
        { width: tamanho, height: tamanho }
    );
}
