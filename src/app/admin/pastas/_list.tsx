"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PastaServices from "@/services/pasta";
import { AppButton, AppLoader, AppOuvir } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData } from "@/helpers/router";
import { Pasta, SERIE_LABELS } from "@/types/pasta";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';

const CLASSE_TH = "py-2 px-4 border-b border-gray-200 text-left text-[16px] font-semibold text-gray-700";
const CLASSE_TD = "py-2 px-4 border-b border-gray-200 text-[16px]";

export default function PastaList() {
    const { user, loading: carregandoSessao } = useAuth();
    const [pastas, setPastas] = useState<Pasta[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const sucessoRef = useRef<HTMLParagraphElement>(null);

    // ======================================================================
    useEffect(() => {
        // Mensagem deixada pela tela de criação ("Pasta criada com sucesso")
        const flash = getFlashData();
        if (flash) setSucesso(flash);
    }, []);

    const carregar = useCallback(async (uid: string) => {
        setCarregando(true);
        const { success, pastas } = await PastaServices.minhas(uid);
        setPastas(pastas);
        setErro(!success);
        setCarregando(false);
    }, []);

    useEffect(() => {
        if (carregandoSessao) return;
        // Admin não acessa pastas (as regras também bloqueiam)
        if (!user || user.role === 'admin') {
            setCarregando(false);
            return;
        }
        carregar(user.uid);
    }, [carregandoSessao, user, carregar]);

    // A mensagem de sucesso chega junto com a página inteira, e muitos
    // leitores de tela não a anunciam; levar o foco até ela garante a leitura
    useEffect(() => {
        if (sucesso && !carregando) sucessoRef.current?.focus();
    }, [sucesso, carregando]);
    // ======================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando as pastas...</p>
            </div>
        );

    if (user?.role === 'admin')
        return (
            <div className="flex flex-col">
                <p className="ff-default text-[16px]">Administradores não acessam as pastas dos alunos, para proteger os dados de saúde das crianças.</p>
                <Link href="/admin/dashboard" className="self-start mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px]">
                    Voltar ao painel
                </Link>
            </div>
        );

    const ehMae = user?.role === 'mae';

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                <h2 className="font-bold text-[20px]">
                    {ehMae ? 'Pastas dos seus filhos' : 'Pastas que você pode ver'}
                </h2>
                {ehMae && <AppButton title="Nova pasta" icon="plus" href="/admin/pastas/nova" form="round" />}
            </div>

            <AppOuvir rotulo="Ouvir instruções" className="mb-3"
                texto={ehMae
                    ? 'Aqui ficam as pastas dos seus filhos. Toque no nome do aluno para abrir a pasta. Para criar uma pasta nova, toque em Nova pasta.'
                    : 'Aqui ficam as pastas dos alunos que você acompanha. Toque no nome do aluno para abrir a pasta. Para entrar numa pasta nova, peça o link de convite à família.'} />

            <p ref={sucessoRef} tabIndex={-1} role="status" className={`${COR_SUCESSO} ff-default text-[16px] mb-3`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>

            {erro && (
                <div className="flex flex-col items-start gap-3 mb-3">
                    <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não deu para carregar as pastas. Toque em &quot;Tentar de novo&quot;.</p>
                    {user && <AppButton title="Tentar de novo" icon="refresh" onClick={() => carregar(user.uid)} form="round" />}
                </div>
            )}

            {!erro && pastas.length === 0 && (
                <p className="ff-default text-[16px]">
                    {ehMae
                        ? 'Você ainda não criou nenhuma pasta. Toque em "Nova pasta" para começar.'
                        : 'Você ainda não tem nenhuma pasta. Peça à família o link de convite.'}
                </p>
            )}

            {/* O nome do aluno abre a pasta (participantes e convites) */}
            {pastas.length > 0 && <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <caption className="sr-only">Lista das pastas dos alunos</caption>
                    <thead>
                        <tr>
                            <th scope="col" className={CLASSE_TH}>Aluno</th>
                            <th scope="col" className={CLASSE_TH}>Série</th>
                        </tr>
                    </thead>

                    <tbody>
                        {pastas.map(pasta => (
                            <tr key={pasta.id}>
                                <th scope="row" className={`${CLASSE_TD} text-left font-normal`}>
                                    <Link href={`/admin/pastas/${pasta.id}`} className="min-h-[48px] flex items-center gap-2 text-(--cor-link) underline">
                                        <i className="ion-folder" aria-hidden="true" />
                                        {pasta.nomeAluno}
                                    </Link>
                                </th>
                                <td className={CLASSE_TD}>{SERIE_LABELS[pasta.serie] ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>}
        </>
    )
}
