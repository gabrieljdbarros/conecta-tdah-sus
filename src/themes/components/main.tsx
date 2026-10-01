import React from "react";

export interface AppMainContainerProps {
    title: string;
    children?: React.ReactNode;
}

/**
 * Área principal das telas do painel. O título da tela é o <h1> (as seções
 * dentro dela usam h2/h3). `id="conteudo"` é o destino do link "Pular para
 * o conteúdo" do layout
 */
export default function AppMainContainer({title, children}: AppMainContainerProps) {

    return (
         <main id="conteudo" tabIndex={-1} className="flex flex-col flex-1 min-w-0 outline-none">
            {/* HEADER */}
            <div className="min-h-[50px] bg-(--background-primary) mb-[5px] p-[10px] pl-4 md:pl-[50px] ff-default font-bold">
                Conecta TDAH SUS
            </div>
            <header className="min-h-[100px] bg-(--background-primary) pt-[10px] px-4 md:pl-[50px] rounded-es-xl mb-[30px]">
                <h1 className="font-bold text-[26px] md:text-[30px]">{title}</h1>
            </header>

            <section className="flex-1 bg-(--background-primary) p-4 md:p-[20px] rounded-ss-xl">
                {children}
            </section>

        </main>
    )

}
