/**
 * Logo "CONECTA TDAH | SUS", como no design, mas em TEXTO (e não imagem):
 * o leitor de tela lê o nome, não pesa na internet e fica nítido em
 * qualquer tamanho. Azul de link do design (7,1:1)
 */
export default function AppLogo({ className = '' }: { className?: string }) {
    return (
        <p className={`text-center leading-none font-extrabold text-(--cor-link) ${className}`}>
            <span className="block text-[34px] tracking-tight">CONECTA</span>
            <span className="block text-[22px]">TDAH | SUS</span>
        </p>
    );
}
