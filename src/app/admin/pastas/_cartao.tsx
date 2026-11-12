"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppInput } from "@/themes/components";
import { buscarPastas, POUCAS_PASTAS, quemEstaNaPasta } from "@/helpers/recentes";
import { Pasta } from "@/types/pasta";

/**
 * Cartão de uma pasta (aluno), no estilo do design. O cartão inteiro é o
 * link (alvo grande), e o nome do aluno é o nome do link. Embaixo, a mãe e
 * a escola (12/11/2026), como no app: diferencia alunos com o mesmo nome.
 * `conversas`: o cartão abre a conversa em vez da pasta
 */
export function CartaoPasta({ pasta, conversas = false }: { pasta: Pasta; conversas?: boolean }) {
    const quem = quemEstaNaPasta(pasta);
    return (
        <Link href={conversas ? `/admin/pastas/${pasta.id}/conversas` : `/admin/pastas/${pasta.id}`}
            className="flex items-center gap-4 min-h-[80px] p-4 bg-white rounded-xl border border-gray-300 shadow-sm ff-default">
            <span aria-hidden="true" className="flex items-center justify-center w-[48px] h-[48px] shrink-0 rounded-full bg-(--background-secondary) text-(--cor-link) text-[24px]">
                <i className={conversas ? 'ion-chatbubbles' : 'ion-folder'} />
            </span>
            <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[18px] font-bold text-(--cor-texto) break-words">
                    {conversas && <span className="sr-only">Conversa sobre </span>}{pasta.nomeAluno}
                </span>
                {/* A vírgula escondida dá a pausa certa no leitor de tela */}
                {quem && <span className="text-[16px] text-(--cor-texto-suave) break-words"><span className="sr-only">, </span>{quem}</span>}
            </span>
            <i className="ion-chevron-right text-[20px] text-(--cor-texto-suave)" aria-hidden="true" />
        </Link>
    );
}

/** Lista de cartões de pastas */
export function ListaPastas({ pastas, conversas = false }: { pastas: Pasta[]; conversas?: boolean }) {
    return (
        <ul className="flex flex-col gap-3">
            {pastas.map((pasta) => <li key={pasta.id}><CartaoPasta pasta={pasta} conversas={conversas} /></li>)}
        </ul>
    );
}

/**
 * Busca pelo nome (12/11/2026), a mesma do app: feita no navegador, sem ir
 * ao servidor; procura no nome do aluno, da mãe e da escola. Só aparece com
 * mais de 2 pastas. Devolve as pastas achadas e o campo para mostrar
 */
export function useBuscaAlunos(pastas: Pasta[]) {
    const [busca, setBusca] = useState('');
    const achadas = useMemo(() => buscarPastas(pastas, busca), [pastas, busca]);
    // A contagem só muda quando a pessoa para de digitar: o leitor de tela
    // não fala "12 encontrados, 5, 2..." a cada letra (a lista filtra na hora)
    const [buscaContada, setBuscaContada] = useState('');
    useEffect(() => {
        const espera = setTimeout(() => setBuscaContada(busca), 600);
        return () => clearTimeout(espera);
    }, [busca]);
    const contadas = useMemo(() => buscarPastas(pastas, buscaContada).length, [pastas, buscaContada]);
    const comBusca = pastas.length > POUCAS_PASTAS;

    const campo = comBusca && (
        <>
            <AppInput type="search" label="Buscar aluno" placeholder="Nome do aluno, da mãe ou da escola" icon="search"
                value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" className="mb-1" />
            <p role="status" className="ff-default text-[16px] text-(--cor-texto-suave) mb-3">
                {buscaContada.trim()
                    ? contadas === 0
                        ? 'Nenhum aluno encontrado. Confira o nome digitado.'
                        : `${contadas} ${contadas === 1 ? 'aluno encontrado' : 'alunos encontrados'}`
                    : `${pastas.length} alunos`}
            </p>
        </>
    );
    return { achadas, campo, comBusca };
}

/** Frase do "Ouvir instruções" quando a busca aparece */
export const INSTRUCAO_BUSCA = ' Para achar um aluno, escreva o nome dele, da mãe ou da escola no campo Buscar aluno.';

/**
 * Convite para a mãe criar a primeira pasta (cartão "Cadastre o estudante"
 * do design). Rótulo pequeno em azul (cor secundária; 7,1:1), não em laranja
 */
export function CartaoCriarPasta() {
    return (
        <div className="flex flex-col gap-2 p-5 rounded-xl border border-gray-300 bg-linear-to-br from-white to-[#FFF1E0]">
            <p className="ff-default text-[16px] font-bold tracking-wide uppercase text-(--cor-secundaria)">Pasta do aluno</p>
            <h2 className="ff-default text-[26px] font-extrabold text-(--cor-texto) leading-tight">Cadastre o aluno</h2>
            <p className="ff-default text-[16px] text-(--cor-texto)">
                Com poucas informações você já pode começar a conectar a escola e os médicos. Sem burocracia.
            </p>
            <Link href="/admin/pastas/nova"
                className="mt-2 min-h-[48px] px-6 flex items-center justify-center gap-2 rounded-full bg-(--cor-destaque) text-white ff-default text-[19px] font-bold">
                <i className="ion-plus" aria-hidden="true" />Criar pasta do aluno
            </Link>
        </div>
    );
}
