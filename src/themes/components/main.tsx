import React from "react";
import Image from "next/image";
import Link from "next/link";

export interface AppMainContainerProps {
    title: string;
    /** Endereço da seta de voltar da barra superior (sem ele, a seta não aparece) */
    voltar?: string;
    /** Para onde a seta leva, lido pelo leitor de tela (ex.: "Voltar para as pastas") */
    voltarRotulo?: string;
    /** Linha menor abaixo do título (ex.: a data de hoje no Início) */
    subtitulo?: string;
    /** Barra do Início: título maior ("Olá, Nome!") */
    destaque?: boolean;
    /**
     * Parte do título em laranja (o nome em "Olá, Nome!", como no app).
     * Passa no AA porque é letra grande (30, negrito) sobre branco (3,1:1)
     */
    realce?: string;
    children?: React.ReactNode;
}

/** O título com a parte `realce` em laranja */
function TituloComRealce({ title, realce }: { title: string; realce?: string }) {
    const i = realce ? title.indexOf(realce) : -1;
    if (!realce || i < 0) return <>{title}</>;
    return <>{title.slice(0, i)}<span className="text-(--cor-destaque)">{realce}</span>{title.slice(i + realce.length)}</>;
}

/**
 * Área principal das telas do painel, com a barra superior das telas novas,
 * IGUAL à do app (08/11/2026): fundo branco, seta de voltar à esquerda,
 * "CONECTA TDAH SUS" pequeno em azul (7,1:1), o título grande e o girassol
 * à direita. O nome da tela é o <h1> (as seções dentro da tela usam h2/h3).
 * `id="conteudo"` é o destino do link "Pular para o conteúdo" do layout
 */
export default function AppMainContainer({title, voltar, voltarRotulo = 'Voltar', subtitulo, destaque = false, realce, children}: AppMainContainerProps) {

    return (
         <main id="conteudo" tabIndex={-1} className="flex flex-col flex-1 min-w-0 outline-none pb-[96px] md:pb-0">
            {/* No celular, o espaço no fim (pb) evita que a barra de abas cubra o conteúdo */}
            {/* BARRA SUPERIOR (sem linha nem sombra: separa pelo branco sobre o fundo lilás, como no app) */}
            <header className="flex items-center gap-2 min-h-[80px] bg-(--background-primary) px-3 md:px-[40px] mb-4 md:mb-[30px]">
                {voltar &&
                    <Link href={voltar} className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[26px] text-(--cor-texto) rounded-full">
                        <i className="ion-arrow-left-c" aria-hidden="true" />
                        <span className="sr-only">{voltarRotulo}</span>
                    </Link>}
                <div className="flex-1 min-w-0 py-3 pl-1">
                    {/* aria-hidden: o leitor de tela não repete o nome do app antes de cada título (já está no logo e no <title>) */}
                    <p aria-hidden="true" className="ff-default text-[16px] font-bold tracking-wide text-(--cor-link)">CONECTA TDAH SUS</p>
                    <h1 className={`ff-default leading-tight font-extrabold text-(--cor-texto) break-words ${destaque ? 'text-[30px]' : 'text-[24px] md:text-[26px]'}`}>
                        <TituloComRealce title={title} realce={realce} />
                    </h1>
                    {subtitulo && <p className="ff-default text-[16px] text-(--cor-texto-suave)">{subtitulo}</p>}
                </div>
                {/* Girassol decorativo (o nome do app já está escrito ao lado) */}
                <Image src="/assets/img/girassol.png" alt="" width={44} height={49} className="shrink-0" />
            </header>

            {/* Conteúdo sobre o fundo lilás claro do design; os cartões são brancos */}
            <section className="flex-1 px-4 pb-4 md:px-[40px]">
                {children}
            </section>

        </main>
    )

}
