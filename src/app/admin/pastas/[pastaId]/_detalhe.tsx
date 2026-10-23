"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PastaServices from "@/services/pasta";
import { AppButton, AppLoader, AppOuvir } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData } from "@/helpers/router";
import { Pasta, SERIE_LABELS } from "@/types/pasta";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_SUCESSO = 'text-[#166534]';
const CLASSE_LINK_VOLTAR = "self-start mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px]";

/**
 * Pasta do aluno (design): cabeçalho e atalhos para cada parte, cada uma
 * com a sua tela: Conversas (RN05) e Vínculos (quem acompanha e convites —
 * RN01, RN02)
 */
export default function DetalhePasta({ pastaId }: { pastaId: string }) {
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const sucessoRef = useRef<HTMLParagraphElement>(null);

    // Mensagem deixada pela tela de aceitar convite
    useEffect(() => {
        const flash = getFlashData();
        if (flash) setSucesso(flash);
    }, []);

    useEffect(() => {
        if (carregandoSessao || !user) return;
        (async () => {
            const { success, pasta } = await PastaServices.buscar(pastaId);
            setPasta(success && pasta ? pasta : null);
            setCarregando(false);
        })();
    }, [carregandoSessao, user, pastaId]);

    // A mensagem de sucesso chega junto com a página: levar o foco garante a leitura
    useEffect(() => { if (sucesso && !carregando) sucessoRef.current?.focus(); }, [sucesso, carregando]);
    // ======================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Abrindo a pasta...</p>
            </div>
        );

    if (!pasta)
        return (
            <div className="flex flex-col">
                <p role="alert" className="ff-default text-[16px]">Não foi possível abrir esta pasta. Ela pode não existir, ou você não faz parte dela.</p>
                <Link href="/admin/pastas" className={CLASSE_LINK_VOLTAR}>Voltar para as pastas</Link>
            </div>
        );

    const ehDona = !!user && pasta.donoUid === user.uid;
    const base = `/admin/pastas/${pasta.id}`;

    return (
        <div className="flex flex-col gap-6 max-w-[640px]">
            {/* CABEÇALHO (design: "PASTA DO ESTUDANTE", nome e série) — o resto do sistema diz "aluno" */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-(--cor-destaque) pb-3">
                <div>
                    <p className="ff-default text-[16px] font-bold tracking-wide uppercase text-(--cor-secundaria)">Pasta do aluno</p>
                    <h2 className="ff-default text-[28px] font-extrabold leading-tight text-(--cor-texto) break-words">{pasta.nomeAluno}</h2>
                    <p className="ff-default text-[16px] text-(--cor-texto-suave)">{SERIE_LABELS[pasta.serie] ?? '-'}</p>
                </div>
                {/* "Cód. de convite" do design: aqui o convite é um link seguro, na tela de Vínculos */}
                {ehDona && <AppButton title="Convidar" icon="person-add" type="outline" href={`${base}/vinculos#convidar`} />}
            </div>

            <p ref={sucessoRef} tabIndex={-1} role="status" className={`${COR_SUCESSO} ff-default text-[16px] empty:hidden`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>

            {/* ATALHOS (design): cada parte da pasta tem a sua tela */}
            <nav aria-label="Atalhos da pasta">
                <ul className="grid grid-cols-2 gap-3">
                    {[
                        { href: `${base}/conversas`, icone: 'ion-chatbubbles', nome: 'Conversas' },
                        { href: `${base}/vinculos`, icone: 'ion-ios-people', nome: 'Vínculos' },
                    ].map((a) => (
                        <li key={a.nome}>
                            <Link href={a.href}
                                className="flex flex-col items-center justify-center gap-1 min-h-[88px] p-2 bg-white rounded-xl border border-gray-300 shadow-sm ff-default text-[16px] font-bold text-(--cor-texto)">
                                <i className={`${a.icone} text-[28px] text-(--cor-link)`} aria-hidden="true" />
                                {a.nome}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Instruções genéricas (sem o nome do aluno): podem usar qualquer voz */}
            <AppOuvir rotulo="Ouvir instruções" className="self-start"
                texto={ehDona
                    ? 'Esta é a pasta do aluno. Em Conversas, você conversa com a escola e com o médico. Em Vínculos, você vê quem acompanha o aluno. Para chamar a escola ou o médico, toque em Convidar.'
                    : 'Esta é a pasta do aluno. Em Conversas, você conversa com a família e com quem acompanha o aluno. Em Vínculos, você vê quem acompanha o aluno e pode sair da pasta.'} />
        </div>
    );
}
