"use client"
import Link from "next/link"
import { Ionicons } from "../../types/ionicos"
import { usePathname } from "next/navigation";


export interface AppMenuItemProps {
    title: string,
    icon: Ionicons
    url: string
    /** Só marca como aberto na URL exata (ex.: "Usuários" não fica ativo ao editar o próprio perfil) */
    exato?: boolean
}

/**
 * Item do menu. No celular o menu mostra só o ícone, mas o nome continua
 * disponível para o leitor de tela (sr-only). A página aberta é marcada
 * com aria-current
 */
export default function AppMenuItem ({title, icon, url, exato = false}: AppMenuItemProps) {

    const path = usePathname();
    const ativado = exato ? path === url : path.startsWith(url);

    return (
        <Link href={url} aria-current={ativado ? 'page' : undefined}
            className={`flex items-center min-h-[48px] md:pl-[10px] cursor-pointer mb-[5px] rounded-s-full text-[17px] ${ativado ?  'text-white bg-(--primary-color)' : 'text-black'}`}>
            <i className={`ion-${icon} mx-2`} aria-hidden="true" />
            <span className="sr-only md:not-sr-only">{title}</span>
        </Link>
    )
}
