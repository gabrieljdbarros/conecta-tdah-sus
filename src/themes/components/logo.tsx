import Image from "next/image";

/**
 * Logo do Conecta TDAH SUS: o girassol com o nome embaixo, o MESMO do app
 * (ilustração da designer, fundo transparente; trocou o logo só de letras em
 * 08/11/2026, para web e app ficarem iguais).
 * - alt com o nome: o leitor de tela lê "Conecta TDAH SUS"
 * - o Next entrega a imagem otimizada e no tamanho certo (pouco consumo de dados)
 * - texto em imagem é permitido para logotipos (WCAG 1.4.5)
 * - é vertical: `largura` pequena já dá um logo alto
 * `prioridade`: carregar já (logo no topo da tela de entrada no celular)
 */
export default function AppLogo({ className = '', largura = 120, prioridade = false }: { className?: string, largura?: number, prioridade?: boolean }) {
    return (
        <Image src="/assets/img/logo.png" alt="Conecta TDAH SUS" width={largura} height={Math.round(largura * 622 / 540)}
            priority={prioridade} className={`mx-auto h-auto ${className}`} />
    );
}
