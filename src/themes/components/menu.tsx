"use client";
import AppMenuItem from "./menu-item";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/user";
import { AppSair, itensDoMenu } from "./navegacao";
import AppLogo from "./logo";

/**
 * Menu lateral (computador). No celular:
 *  - mãe, escola e médico usam a barra inferior (AppBarraInferior), então o
 *    menu lateral some;
 *  - o admin (pensado para o computador) continua com o menu só de ícones
 */
export default function AppMenu() {
    const { user } = useAuth();
    const ehAdmin = user?.role === 'admin';
    // ==============================================================================
    return (
         <div className={`${ehAdmin ? 'flex' : 'hidden md:flex'} w-[60px] md:w-[300px] bg-(--background-primary) flex-col pt-[40px] shadow-sm sticky top-0 h-screen self-start overflow-y-auto`}>
            <div className="hidden md:flex flex-col items-center gap-1 px-4">
                <AppLogo />
                <p className="mt-4 text-center font-bold break-all text-(--cor-texto)">{user?.nome}</p>
                {user && <p className="text-center text-[16px] text-(--cor-texto-suave)">{ROLE_LABELS[user.role]}</p>}

                <div className="bg-(--background-secondary) h-[6px] my-5 self-stretch"/>
            </div>

            {/* OPÇÕES */}
            <nav aria-label="Menu principal" className="pl-1 md:pl-[30px] mt-[10px] flex-1">
                {itensDoMenu(user).map((item) => <AppMenuItem key={item.url} {...item} />)}
            </nav>

            {/* No celular (só o admin vê este menu), o nome "Sair" fica para o leitor de tela */}
            <AppSair className="mb-[50px] w-full [&>span]:sr-only md:[&>span]:not-sr-only" />
        </div>
    )
}
