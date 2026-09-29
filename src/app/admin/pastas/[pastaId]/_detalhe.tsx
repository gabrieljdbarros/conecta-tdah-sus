"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PastaServices from "@/services/pasta";
import ConviteServices, { ConvitePendente, PapelConvidado } from "@/services/convite";
import { AppButton, AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData } from "@/helpers/router";
import { Participante, Pasta, SERIE_LABELS } from "@/types/pasta";
import { ROLE_LABELS } from "@/types/user";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';
const CLASSE_LINK_VOLTAR = "self-start mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--primary-color) text-(--primary-color) ff-default text-[16px]";

const PARA_QUEM: Record<PapelConvidado, string> = { escola: 'a escola', medico: 'o médico' };

// Mãe primeiro, depois escola e médico
const ORDEM_PAPEL: Record<Participante['papel'], number> = { mae: 0, escola: 1, medico: 2 };

function formatarValidade(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function DetalhePasta({ pastaId }: { pastaId: string }) {
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    // Convites (só a dona)
    const [convites, setConvites] = useState<ConvitePendente[]>([]);
    const [gerando, setGerando] = useState<PapelConvidado | null>(null);
    const [linkGerado, setLinkGerado] = useState<{ papel: PapelConvidado; url: string; expiraEm: number } | null>(null);
    const [copiado, setCopiado] = useState(false);
    const linkRef = useRef<HTMLDivElement>(null);
    const sucessoRef = useRef<HTMLParagraphElement>(null);

    const ehDona = !!user && !!pasta && pasta.donoUid === user.uid;

    // ======================================================================
    useEffect(() => {
        // Mensagem deixada pela tela de aceitar convite
        const flash = getFlashData();
        if (flash) setSucesso(flash);
    }, []);

    const carregarConvites = useCallback(async (uid: string) => {
        const { convites } = await ConviteServices.pendentes(uid, pastaId);
        setConvites(convites);
    }, [pastaId]);

    useEffect(() => {
        if (carregandoSessao || !user) return;
        (async () => {
            const { success, pasta } = await PastaServices.buscar(pastaId);
            setPasta(success && pasta ? pasta : null);
            if (success && pasta?.donoUid === user.uid) await carregarConvites(user.uid);
            setCarregando(false);
        })();
    }, [carregandoSessao, user, pastaId, carregarConvites]);

    // Leva o foco até a novidade (link gerado ou sucesso), para o leitor de tela ler
    useEffect(() => { if (linkGerado) linkRef.current?.focus(); }, [linkGerado]);
    useEffect(() => { if (sucesso && !carregando) sucessoRef.current?.focus(); }, [sucesso, carregando]);
    // ======================================================================
    const convidar = async (papel: PapelConvidado) => {
        if (!user) return;
        setErro(null);
        setSucesso(null);
        setCopiado(false);
        setGerando(papel);
        const { success, token, expiraEm, message } = await ConviteServices.gerar(pastaId, papel);
        setGerando(null);
        if (success && token && expiraEm) {
            setLinkGerado({ papel, url: `${window.location.origin}/convite/${token}`, expiraEm });
            await carregarConvites(user.uid);
        } else
            setErro(message ?? 'Não foi possível gerar o convite');
    };

    const copiarLink = async () => {
        if (!linkGerado) return;
        try {
            await navigator.clipboard.writeText(linkGerado.url);
            setCopiado(true);
        } catch {
            setErro('Não deu para copiar. Toque e segure no link para copiar.');
        }
    };

    const cancelarConvite = async (convite: ConvitePendente) => {
        if (!user) return;
        if (!window.confirm(`Cancelar o convite para ${PARA_QUEM[convite.papel]}? O link vai parar de funcionar.`)) return;
        setErro(null);
        setSucesso(null);
        const { success } = await ConviteServices.cancelar(convite.id);
        if (success) {
            setSucesso('Convite cancelado');
            await carregarConvites(user.uid);
        } else
            setErro('Não foi possível cancelar o convite. Tente novamente');
    };
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

    const participantes = Object.entries(pasta.participantes)
        .sort(([, a], [, b]) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel]);

    return (
        <div className="flex flex-col gap-6 max-w-[640px]">
            {/* CABEÇALHO */}
            <div>
                <h2 className="font-bold text-[22px]">{pasta.nomeAluno}</h2>
                <p className="ff-default text-[16px]">{SERIE_LABELS[pasta.serie] ?? '-'}</p>
            </div>

            {/* MENSAGENS — anunciadas pelo leitor de tela */}
            <p ref={sucessoRef} tabIndex={-1} role="status" className={`${COR_SUCESSO} ff-default text-[16px] empty:hidden`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>
            {erro && <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: {erro}</p>}

            {/* PARTICIPANTES */}
            <section aria-labelledby="titulo-participantes">
                <h3 id="titulo-participantes" className="font-bold text-[18px] mb-2">Quem acompanha este aluno</h3>
                {participantes.length === 0 ? (
                    <p className="ff-default text-[16px]">
                        {pasta.membrosUids.length} {pasta.membrosUids.length === 1 ? 'participante' : 'participantes'}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {participantes.map(([uid, p]) => (
                            <li key={uid} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200">
                                <i className={`${p.papel === 'escola' ? 'ion-university' : p.papel === 'medico' ? 'ion-medkit' : 'ion-person'} text-[24px] text-gray-700`} aria-hidden="true" />
                                <div>
                                    <p className="ff-default text-[16px] font-bold">
                                        {uid === user?.uid ? `${p.nome} (você)` : p.nome}
                                    </p>
                                    <p className="ff-default text-[16px] text-gray-700">
                                        {ROLE_LABELS[p.papel]}
                                        {uid === pasta.donoUid && ' — responsável pela pasta'}
                                        {p.detalhe && ` — ${p.detalhe}`}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* CONVIDAR (só a dona) */}
            {ehDona && (
                <section aria-labelledby="titulo-convidar">
                    <h3 id="titulo-convidar" className="font-bold text-[18px] mb-2">Convidar</h3>
                    <p className="ff-default text-[16px] mb-3">
                        Gere um link e envie para a escola ou para o médico. Quem abrir o link entra na pasta.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <AppButton title={gerando === 'escola' ? 'Gerando...' : 'Convidar escola'} icon="university" onClick={() => convidar('escola')} disabled={!!gerando} form="round" />
                        <AppButton title={gerando === 'medico' ? 'Gerando...' : 'Convidar médico'} icon="medkit" onClick={() => convidar('medico')} disabled={!!gerando} form="round" />
                    </div>

                    {linkGerado && (
                        <div ref={linkRef} tabIndex={-1} role="status" className="mt-4 p-4 rounded-xl border-2 border-(--primary-color) bg-white flex flex-col gap-3">
                            <p className="ff-default text-[16px] font-bold">Link para {PARA_QUEM[linkGerado.papel]}:</p>
                            <p className="ff-default text-[16px] break-all select-all bg-[#f5f5f5] p-2 rounded">{linkGerado.url}</p>
                            <AppButton title={copiado ? 'Link copiado!' : 'Copiar link'} icon="ios-copy" onClick={copiarLink} form="round" />
                            <p className="ff-default text-[16px]">
                                Vale até {formatarValidade(linkGerado.expiraEm)} e só pode ser usado uma vez.
                                Envie agora: por segurança, este link não aparece de novo.
                            </p>
                        </div>
                    )}

                    {convites.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-bold text-[16px] mb-2">Convites esperando resposta</h4>
                            <ul className="flex flex-col gap-2">
                                {convites.map((c) => (
                                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl p-3 border border-gray-200">
                                        <p className="ff-default text-[16px]">
                                            Para {PARA_QUEM[c.papel]} — vale até {formatarValidade(c.expiraEm)}
                                        </p>
                                        <button type="button" onClick={() => cancelarConvite(c)} className="min-h-[48px] px-4 rounded-full border-2 border-[#B91C1C] text-[#B91C1C] ff-default text-[16px] cursor-pointer">
                                            Cancelar convite
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            )}

            <Link href="/admin/pastas" className={CLASSE_LINK_VOLTAR}>Voltar para as pastas</Link>
        </div>
    );
}
