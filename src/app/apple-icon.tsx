import { ImageResponse } from "next/og";

/**
 * Ícone da tela inicial do iPhone ("Adicionar à Tela de Início"), 180 px.
 * Mesmo desenho dos ícones do aplicativo (icon.tsx)
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div style={{
                width: "100%", height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", background: "#0069ad", color: "white",
                fontWeight: 700, fontFamily: "sans-serif",
            }}>
                {/* Mesmo desenho do icon.tsx (26% do tamanho) */}
                <div style={{ fontSize: 47, lineHeight: 1 }}>TDAH</div>
            </div>
        ),
        size
    );
}
