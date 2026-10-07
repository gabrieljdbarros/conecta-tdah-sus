"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { estaAberto, itensDoMenu } from "./navegacao";

/**
 * Barra de abas no rodapé, como no design (celular). Só para mãe, escola e
 * médico; no computador, quem aparece é o menu lateral.
 * Cada aba tem o NOME escrito embaixo do ícone (público com baixa
 * alfabetização). Aba aberta: traço e ícone laranja (ícone não é texto:
 * 3,1:1 basta) e o nome em negrito escuro — o laranja nunca é cor de texto
 */
export default function AppBarraInferior() {
    const path = usePathname();
    const { user } = useAuth();
    if (!user || user.role === 'admin') return null;

    const itens = itensDoMenu(user);
    return (
        <nav aria-label="Menu principal" data-barra-inferior
            className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200">
            <ul className="grid" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
                {itens.map((item) => {
                    const aberto = estaAberto(path, item);
                    return (
                        <li key={item.url}>
                            <Link href={item.url} aria-current={aberto ? 'page' : undefined}
                                className={`flex flex-col items-center justify-center gap-1 min-h-[64px] px-1 border-t-4 ff-default text-[16px] focus-visible:outline-offset-[-3px] ${aberto ? 'border-(--cor-destaque) font-bold text-(--cor-texto)' : 'border-transparent text-(--cor-texto-suave)'}`}>
                                <i className={`ion-${item.icon} text-[24px] ${aberto ? 'text-(--cor-destaque)' : ''}`} aria-hidden="true" />
                                <span>{item.title}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
