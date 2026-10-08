import Image from "next/image";

/**
 * Logo "CONECTA TDAH | SUS" do design (imagem da equipe, fundo transparente).
 * - alt com o nome: o leitor de tela lê "Conecta TDAH SUS"
 * - o Next entrega a imagem otimizada e no tamanho certo (pouco consumo de dados)
 * - texto em imagem é permitido para logotipos (WCAG 1.4.5)
 * `prioridade`: carregar já (logo no topo da tela de entrada no celular)
 */
export default function AppLogo({ className = '', largura = 240, prioridade = false }: { className?: string, largura?: number, prioridade?: boolean }) {
    return (
        <Image src="/assets/img/logo.png" alt="Conecta TDAH SUS" width={largura} height={Math.round(largura * 134 / 500)}
            priority={prioridade} className={`mx-auto h-auto ${className}`} />
    );
}
