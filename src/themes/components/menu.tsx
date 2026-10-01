"use client";
import { useRouter } from "next/navigation";
import AppMenuItem from "./menu-item";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/user";

export default function AppMenu() {
    const router = useRouter();
    const { user, logout } = useAuth();
    // ==============================================================================
    const handleLogout = async () => {
        await logout();
        router.replace('/');
    }
    // ==============================================================================
    return (
         <div className="w-[60px] md:w-[300px] bg-(--background-primary) flex flex-col pt-[50px]">
            <div className="hidden md:flex flex-col items-center gap-1 px-2">
                <p className="text-[20px] font-bold text-center">Conecta TDAH SUS</p>
                <p className="text-center">Bem-vindo(a)!</p>
                <p className="text-center font-bold break-all">{user?.nome} ({user?.email})</p>
                {user && <p className="text-center text-[14px] text-gray-700">{ROLE_LABELS[user.role]}</p>}
                <Link href={`/admin/usuarios/editar/${user?.uid}`} className="min-h-[48px] flex items-center underline text-(--primary-color)">
                    Editar perfil
                </Link>

                <div className="bg-(--background-secondary) h-[6px] my-5 self-stretch"/>
            </div>

            {/* OPÇÕES */}
            <nav aria-label="Menu principal" className="pl-1 md:pl-[30px] mt-[30px] flex-1">
                <AppMenuItem title="Dashboard" icon="grid" url="/admin/dashboard"/>
                {/* No celular o cabeçalho do menu some: "Editar perfil" vira um item */}
                {user && <div className="md:hidden"><AppMenuItem title="Editar perfil" icon="person" url={`/admin/usuarios/editar/${user.uid}`}/></div>}
                {/* Só o admin gerencia usuários e categorias (as regras também bloqueiam) */}
                {user?.role === 'admin' && <AppMenuItem title="Usuários" icon="ios-people" url="/admin/usuarios" exato/>}
                {user?.role === 'admin' && <AppMenuItem title="Categorias" icon="pricetags" url="/admin/categorias"/>}
                {/* Admin não acessa pastas (LGPD) — as regras também bloqueiam */}
                {user && user.role !== 'admin' && <AppMenuItem title="Pastas" icon="folder" url="/admin/pastas"/>}
            </nav>

            {/* LOGOUT — botão de verdade; no celular, o nome fica para o leitor de tela */}
            <button type="button" onClick={handleLogout}
                className="mb-[50px] w-full min-h-[48px] flex items-center justify-center gap-1 text-[18px] text-[#B91C1C] font-bold cursor-pointer">
                <i className="ion-log-out" aria-hidden="true"/>
                <span className="sr-only md:not-sr-only">Sair</span>
            </button>
        </div>
    )
}
