
export interface AppLoaderProps {
    size?: number,
    color?: string,
    className?: string
}

/**
 * Animação de carregamento: arco fino com ponta arredondada, como no design.
 * É só visual (aria-hidden): as telas já anunciam "Carregando..." em texto,
 * dentro de role="status". Para de girar para quem pede menos movimento no
 * aparelho (ver .loader em globals.css)
 */
export default function AppLoader({size = 80, color = 'var(--cor-destaque)', className = ''}: AppLoaderProps) {
    // Círculo de raio 20 (perímetro ≈ 126): o traço cobre 3/4 dele
    return (
        <svg aria-hidden="true" className={`loader ${className}`} width={size} height={size} viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" style={{ stroke: color }} strokeWidth="5" strokeLinecap="round" strokeDasharray="94 126" />
        </svg>
    )
}
