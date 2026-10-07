import { CSSProperties } from "react"
import Link from "next/link"
import { Ionicons } from "@/types/ionicos"

export interface AppButtonProps {
    title: string
    color?: string
    textColor?: string
    onClick?: () => void
    href?: string
    form?: 'square'|'round'
    type?: 'solid'|'outline'
    /** Botão de envio do formulário (type="submit") */
    submit?: boolean
    disabled?: boolean
    icon?: Ionicons;
    style?: CSSProperties;
    className?: string
}
// ==========================================================================
/**
 * Botão acessível:
 *  - com `href` vira um link (<Link>); sem `href`, um <button> de verdade
 *    (recebe foco, Enter/Espaço funcionam e o leitor de tela diz "botão")
 *  - `disabled` desabilita de fato
 *  - alvo de 48px; texto de 19px negrito no sólido e 16px no contorno
 */
export default function AppButton({title, onClick, color, textColor='white', form='square', type='solid', submit = false, disabled, icon, href, style = {}, className = ''}: AppButtonProps) {

    // Padrão: sólido em laranja (destaque); contorno em azul (link), porque
    // laranja como cor de texto não tem contraste suficiente (ver globals.css)
    const cor = color ?? (type == 'outline' ? '--cor-link' : '--cor-destaque');
    const corFundo = cor.startsWith('--') ? `var(${cor})` : cor;
    const corTexto = textColor.startsWith('--') ? `var(${textColor})` : textColor;

    // Desabilitado: cinza com texto escuro (9:1), e não laranja "apagado" —
    // o texto ("Entrando...", "Salvando...") avisa o que está acontecendo
    const desabilitadoSolido = disabled && type != 'outline';
    const dynamicStyle: CSSProperties = {
        ...style,
        background: type == 'outline' ? 'transparent' : desabilitadoSolido ? '#d1d5db' : corFundo,
        borderColor: desabilitadoSolido ? '#d1d5db' : corFundo,
        color: type == 'outline' ? corFundo : desabilitadoSolido ? '#374151' : corTexto,
    }

    const tailwind = [
        className,
        'inline-flex items-center justify-center gap-2 min-h-[48px] py-2 px-5 border-2 ff-default',
        // Texto branco sobre o laranja só passa no AA como "texto grande" (19px negrito)
        type == 'outline' ? 'text-[16px]' : 'text-[19px] font-bold',
        form == 'round' ? 'rounded-full' : 'rounded-md',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
    ].join(' ');

    const conteudo = <>
        {icon && <i className={`ion-${icon}`} aria-hidden="true" />}
        <span>{title}</span>
    </>;

    // ==========================================================================
    if (href && !disabled)
        return <Link href={href} className={tailwind} style={dynamicStyle}>{conteudo}</Link>;

    return (
        <button type={submit ? 'submit' : 'button'} onClick={onClick} disabled={disabled}
            className={tailwind} style={dynamicStyle}>
            {conteudo}
        </button>
    )
}
