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
 *  - alvo de 48px e texto de 16px
 */
export default function AppButton({title, onClick, color='--primary-color', textColor='white', form='square', type='solid', submit = false, disabled, icon, href, style = {}, className = ''}: AppButtonProps) {

    const corFundo = color.startsWith('--') ? `var(${color})` : color;
    const corTexto = textColor.startsWith('--') ? `var(${textColor})` : textColor;

    const dynamicStyle: CSSProperties = {
        ...style,
        background: type == 'outline' ? 'transparent' : corFundo,
        borderColor: corFundo,
        color: type == 'outline' ? corFundo : corTexto,
    }

    const tailwind = [
        className,
        'inline-flex items-center justify-center gap-2 min-h-[48px] py-2 px-5 border-2 ff-default text-[16px]',
        form == 'round' ? 'rounded-full' : 'rounded-md',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
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
