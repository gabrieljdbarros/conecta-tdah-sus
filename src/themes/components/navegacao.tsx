"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppUser } from "@/types/user";
import { Ionicons } from "@/types/ionicos";

export interface ItemNavegacao {
    title: string
    icon: Ionicons
    url: string
    /** Só marca como aberto na URL exata */
    exato?: boolean
}

/**
 * Opções do menu de cada perfil. Uma lista só, usada pelo menu lateral
 * (computador) e pela barra inferior (celular), para os dois nunca
 * ficarem diferentes. Esconder uma opção é só conforto: quem protege os
 * dados é o RLS do banco
 */
export function itensDoMenu(user: AppUser | null): ItemNavegacao[] {
    if (!user) return [];
    const perfil: ItemNavegacao = { title: 'Perfil', icon: 'person', url: `/admin/usuarios/editar/${user.uid}` };

    // Admin gerencia o sistema, mas não acessa as pastas (LGPD)
    if (user.role === 'admin')
        return [
            { title: 'Início', icon: 'home', url: '/admin/dashboard' },
            { title: 'Usuários', icon: 'ios-people', url: '/admin/usuarios', exato: true },
            perfil,
        ];

    return [
        { title: 'Início', icon: 'home', url: '/admin/dashboard' },
        { title: 'Pastas', icon: 'folder', url: '/admin/pastas' },
        { title: 'Conversas', icon: 'chatbubbles', url: '/admin/conversas' },
        perfil,
    ];
}

/** Marca a opção da página aberta (aria-current) */
export function estaAberto(path: string, item: ItemNavegacao): boolean {
    const ehChatDaPasta = /^\/admin\/pastas\/[^/]+\/conversas/.test(path);
    if (item.url === '/admin/conversas') return path.startsWith(item.url) || ehChatDaPasta;
    if (item.url === '/admin/pastas' && ehChatDaPasta) return false;
    return item.exato ? path === item.url : path === item.url || path.startsWith(`${item.url}/`);
}

/** Botão "Sair": fica no menu lateral e, no celular, na tela de perfil */
export function AppSair({ className = '', semMenuLateral = false }: { className?: string, semMenuLateral?: boolean }) {
    const router = useRouter();
    const { user, logout } = useAuth();
    // O admin já tem o "Sair" no menu lateral, inclusive no celular
    if (semMenuLateral && user?.role === 'admin') return null;

    const sair = async () => {
        await logout();
        router.replace('/');
    };

    return (
        <button type="button" onClick={sair}
            className={`min-h-[48px] px-4 flex items-center justify-center gap-2 text-[18px] text-[#B91C1C] font-bold cursor-pointer ${className}`}>
            <i className="ion-log-out" aria-hidden="true" />
            <span>Sair</span>
        </button>
    );
}
