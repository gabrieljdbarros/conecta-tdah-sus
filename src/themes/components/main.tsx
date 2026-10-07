import React from "react";
import Link from "next/link";

export interface AppMainContainerProps {
    title: string;
    /** Endereço da seta de voltar da barra superior (sem ele, a seta não aparece) */
    voltar?: string;
    /** Para onde a seta leva, lido pelo leitor de tela (ex.: "Voltar para as pastas") */
    voltarRotulo?: string;
    /** Linha menor abaixo do título (ex.: a data de hoje no Início) */
    subtitulo?: string;
    /**
     * Barra do Início (design): título grande em laranja ("Olá, Nome").
     * Nela o fundo é BRANCO, e não o cinza das outras barras: laranja sobre
     * o cinza #F5F5F5 dá 2,8:1 e reprova até como texto grande; sobre branco, 3,1:1
     */
    destaque?: boolean;
    children?: React.ReactNode;
}

/**
 * Área principal das telas do painel, com a barra superior do design:
 * fundo cinza-claro, seta de voltar à esquerda e o nome da tela à direita,
 * em letra normal. O nome é o <h1> (as seções dentro da tela usam h2/h3; o
 * título grande em negrito, quando há, fica dentro da tela, como no design).
 * `id="conteudo"` é o destino do link "Pular para o conteúdo" do layout
 */
export default function AppMainContainer({title, voltar, voltarRotulo = 'Voltar', subtitulo, destaque = false, children}: AppMainContainerProps) {

    return (
         <main id="conteudo" tabIndex={-1} className="flex flex-col flex-1 min-w-0 outline-none pb-[96px] md:pb-0">
            {/* No celular, o espaço no fim (pb) evita que a barra de abas cubra o conteúdo */}
            {/* BARRA SUPERIOR */}
            <header className={`flex items-center gap-2 min-h-[80px] shadow-md rounded-b-2xl px-3 md:px-[40px] mb-4 md:mb-[30px] ${destaque ? 'bg-(--background-primary)' : 'bg-[#F5F5F5]'}`}>
                {voltar &&
                    <Link href={voltar} className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[26px] text-(--cor-texto) rounded-full">
                        <i className="ion-arrow-left-c" aria-hidden="true" />
                        <span className="sr-only">{voltarRotulo}</span>
                    </Link>}
                {destaque ? (
                    <div className="py-3 pl-1">
                        <h1 className="ff-default text-[30px] leading-tight font-extrabold text-(--cor-destaque) break-words">{title}</h1>
                        {subtitulo && <p className="ff-default text-[16px] text-[#3B3B3B]">{subtitulo}</p>}
                    </div>
                ) : (
                    // Nome da tela à direita, em letra normal (#3B3B3B sobre #F5F5F5: cerca de 10:1)
                    <div className="ml-auto py-3 pl-2 text-right">
                        <h1 className="ff-default text-[20px] md:text-[22px] text-[#3B3B3B] break-words">{title}</h1>
                        {subtitulo && <p className="ff-default text-[16px] text-[#3B3B3B]">{subtitulo}</p>}
                    </div>
                )}
            </header>

            {/* Conteúdo sobre o fundo lilás claro do design; os cartões são brancos */}
            <section className="flex-1 px-4 pb-4 md:px-[40px]">
                {children}
            </section>

        </main>
    )

}
