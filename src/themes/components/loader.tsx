
export interface AppLoaderProps {
    size?: number,
    color?: string,
    className?: string
}

/**
 * Animação de carregamento. É só visual (aria-hidden): as telas já anunciam
 * "Carregando..." em texto, dentro de role="status". Para de girar para quem
 * pede menos movimento no aparelho (ver .loader em globals.css)
 */
export default function AppLoader({size = 80, color = undefined, className = ''}: AppLoaderProps) {
    return (
        <div aria-hidden="true" className={`loader ${className}`} style={{width: `${size}px`, height: `${size}px`, borderTopColor: color}}></div>
    )
}
