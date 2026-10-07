import React from "react";
import Link from "next/link";

export interface AppMainContainerProps {
    title: string;
    /** Endereço da seta de voltar da barra superior (sem ele, a seta não aparece) */
    voltar?: string;
    children?: React.ReactNode;
}

/**
 * Área principal das telas do painel, com a barra superior do design (seta
 * de voltar + título). O título da tela é o <h1> (as seções dentro dela usam
 * h2/h3). `id="conteudo"` é o destino do link "Pular para o conteúdo" do layout
 */
export default function AppMainContainer({title, voltar, children}: AppMainContainerProps) {

    return (
         <main id="conteudo" tabIndex={-1} className="flex flex-col flex-1 min-w-0 outline-none pb-[96px] md:pb-0">
            {/* No celular, o espaço no fim (pb) evita que a barra de abas cubra o conteúdo */}
            {/* BARRA SUPERIOR */}
            <header className="flex items-center gap-2 min-h-[72px] bg-(--background-primary) shadow-sm px-2 md:pl-[40px] mb-4 md:mb-[30px] md:rounded-es-xl">
                {voltar &&
                    <Link href={voltar} className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[26px] text-(--cor-texto) rounded-full">
                        <i className="ion-arrow-left-c" aria-hidden="true" />
                        <span className="sr-only">Voltar</span>
                    </Link>}
                <h1 className={`font-bold text-[24px] md:text-[30px] text-(--cor-texto) ${voltar ? '' : 'pl-2'}`}>{title}</h1>
            </header>

            <section className="flex-1 bg-(--background-primary) p-4 md:p-[20px] md:rounded-ss-xl">
                {children}
            </section>

        </main>
    )

}
