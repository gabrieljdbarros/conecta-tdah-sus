"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PastaServices from "@/services/pasta";
import ConviteServices, { ConvitePendente, PapelConvidado } from "@/services/convite";
import { AppButton, AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData, setFlashData } from "@/helpers/router";
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

/**
 * Confirmação na própria tela (no lugar do window.confirm, que pode não
 * aparecer em navegadores dentro de apps, como o do WhatsApp). O foco vai
 * para "Não", a opção segura, e o leitor de tela lê a pergunta
 */
function Confirmacao({ pergunta, textoSim, onSim, onNao }: {
    pergunta: string; textoSim: string; onSim: () => void; onNao: () => void;
}) {
    const naoRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { naoRef.current?.focus(); }, []);

    return (
        <div role="alertdialog" aria-label={pergunta} className="w-full flex flex-col gap-2 mt-2 p-3 rounded-xl bg-[#FEF2F2] border-2 border-[#B91C1C]">
            <p className="ff-default text-[16px] font-bold">{pergunta}</p>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onSim} className="min-h-[48px] px-4 rounded-full bg-[#B91C1C] text-white ff-default text-[16px] cursor-pointer">
                    {textoSim}
                </button>
                <button ref={naoRef} type="button" onClick={onNao} className="min-h-[48px] px-4 rounded-full border-2 border-gray-700 text-gray-900 ff-default text-[16px] cursor-pointer">
                    Não, voltar
                </button>
            </div>
        </div>
    );
}

const CLASSE_BOTAO_PERIGO = "min-h-[48px] px-4 rounded-full border-2 border-[#B91C1C] text-[#B91C1C] ff-default text-[16px] cursor-pointer";

export default function DetalhePasta({ pastaId }: { pastaId: string }) {
    const router = useRouter();
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    // Qual ação está esperando confirmação (remover/sair: uid; cancelar: id do convite)
    const [confirmando, setConfirmando] = useState<{ acao: 'remover' | 'sair' | 'cancelar'; id: string } | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    // Convites (só a dona)
    const [convites, setConvites] = useState<ConvitePendente[]>([]);
    const [gerando, setGerando] = useState<PapelConvidado | null>(null);
    const [linkGerado, setLinkGerado] = useState<{ papel: PapelConvidado; url: string; expiraEm: number } | null>(null);
    const [copiado, setCopiado] = useState(false);
    const [erroCopia, setErroCopia] = useState(false);
    const linkRef = useRef<HTMLParagraphElement>(null);
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
        setErroCopia(false);
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
            setErroCopia(false);
        } catch {
            // Mensagem fica dentro da caixa do link, perto de onde a pessoa está
            setErroCopia(true);
        }
    };

    const cancelarConvite = async (convite: ConvitePendente) => {
        if (!user) return;
        setConfirmando(null);
        setErro(null);
        setSucesso(null);
        const { success } = await ConviteServices.cancelar(convite.id);
        if (success) {
            setSucesso('Convite cancelado');
            await carregarConvites(user.uid);
        } else
            setErro('Não foi possível cancelar o convite. Tente novamente');
    };

    // A dona tira outra pessoa da pasta
    const removerParticipante = async (participanteUid: string, nome: string) => {
        setConfirmando(null);
        setErro(null);
        setSucesso(null);
        const { success, message } = await PastaServices.removerParticipante(pastaId, participanteUid);
        if (success) {
            const { pasta: atualizada } = await PastaServices.buscar(pastaId);
            if (atualizada) setPasta(atualizada);
            setSucesso(`${nome} não faz mais parte da pasta`);
        } else
            setErro(message ?? 'Não foi possível remover. Tente novamente');
    };

    // Escola/médico sai da pasta e volta para a lista (já não consegue lê-la)
    const sairDaPasta = async () => {
        if (!user) return;
        setConfirmando(null);
        setErro(null);
        const { success, message } = await PastaServices.removerParticipante(pastaId, user.uid);
        if (success) {
            setFlashData('Você saiu da pasta');
            router.push('/admin/pastas');
        } else
            setErro(message ?? 'Não foi possível sair da pasta. Tente novamente');
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
                            <li key={uid} className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 border border-gray-200">
                                <i className={`${p.papel === 'escola' ? 'ion-university' : p.papel === 'medico' ? 'ion-medkit' : 'ion-person'} text-[24px] text-gray-700`} aria-hidden="true" />
                                <div className="flex-1">
                                    <p className="ff-default text-[16px] font-bold">
                                        {uid === user?.uid ? `${p.nome} (você)` : p.nome}
                                    </p>
                                    <p className="ff-default text-[16px] text-gray-700">
                                        {ROLE_LABELS[p.papel]}
                                        {uid === pasta.donoUid && ' — responsável pela pasta'}
                                        {p.detalhe && ` — ${p.detalhe}`}
                                    </p>
                                </div>

                                {/* A dona remove os outros; escola/médico só pode sair (a dona não sai) */}
                                {!confirmando && ehDona && uid !== pasta.donoUid && (
                                    <button type="button" onClick={() => setConfirmando({ acao: 'remover', id: uid })}
                                        aria-label={`Remover ${p.nome} da pasta`} className={CLASSE_BOTAO_PERIGO}>
                                        Remover
                                    </button>
                                )}
                                {!confirmando && !ehDona && uid === user?.uid && (
                                    <button type="button" onClick={() => setConfirmando({ acao: 'sair', id: uid })} className={CLASSE_BOTAO_PERIGO}>
                                        Sair da pasta
                                    </button>
                                )}

                                {confirmando?.acao === 'remover' && confirmando.id === uid && (
                                    <Confirmacao
                                        pergunta={`Remover ${p.nome} da pasta? Essa pessoa deixa de ver a pasta na hora.`}
                                        textoSim="Sim, remover"
                                        onSim={() => removerParticipante(uid, p.nome)}
                                        onNao={() => setConfirmando(null)}
                                    />
                                )}
                                {confirmando?.acao === 'sair' && confirmando.id === uid && (
                                    <Confirmacao
                                        pergunta="Sair da pasta? Você deixa de ver a pasta. Para voltar, a família precisa enviar um novo convite."
                                        textoSim="Sim, sair"
                                        onSim={sairDaPasta}
                                        onNao={() => setConfirmando(null)}
                                    />
                                )}
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
                        O convite é um link. Você envia o link para a escola ou para o médico
                        (por exemplo, pelo WhatsApp), e quem abrir o link passa a acompanhar este aluno.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <AppButton title={gerando === 'escola' ? 'Gerando...' : 'Convidar escola'} icon="university" onClick={() => convidar('escola')} disabled={!!gerando} form="round" />
                        <AppButton title={gerando === 'medico' ? 'Gerando...' : 'Convidar médico'} icon="medkit" onClick={() => convidar('medico')} disabled={!!gerando} form="round" />
                    </div>

                    {linkGerado && (
                        <div className="mt-4 p-4 rounded-xl border-2 border-(--primary-color) bg-white flex flex-col gap-3">
                            {/* Anúncio curto (o leitor de tela não soletra a URL inteira) */}
                            <p ref={linkRef} tabIndex={-1} role="status" className="ff-default text-[16px] font-bold">
                                Link para {PARA_QUEM[linkGerado.papel]} pronto.
                            </p>
                            <ol className="ff-default text-[16px] list-decimal pl-6 flex flex-col gap-1">
                                <li>Toque em &quot;Copiar link&quot;.</li>
                                <li>Abra a conversa com {PARA_QUEM[linkGerado.papel]} (por exemplo, no WhatsApp), cole o link e envie.</li>
                            </ol>
                            <p className="ff-default text-[16px] break-all select-all bg-[#f5f5f5] p-2 rounded" aria-label="Link do convite">{linkGerado.url}</p>
                            <AppButton title={copiado ? 'Link copiado!' : 'Copiar link'} icon="ios-copy" onClick={copiarLink} form="round" />
                            <p role="status" className={`ff-default text-[16px] empty:hidden ${erroCopia ? COR_ERRO : COR_SUCESSO}`}>
                                {erroCopia
                                    ? 'Erro: não deu para copiar. Toque e segure no link acima para copiar.'
                                    : copiado ? 'Link copiado. Agora cole na conversa e envie.' : ''}
                            </p>
                            <p className="ff-default text-[16px]">
                                O link vale até {formatarValidade(linkGerado.expiraEm)} e só funciona para uma pessoa.
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
                                        <div>
                                            <p className="ff-default text-[16px] font-bold">Convite para {PARA_QUEM[c.papel]}</p>
                                            <p className="ff-default text-[16px] text-gray-700">Vale até {formatarValidade(c.expiraEm)}</p>
                                        </div>
                                        {/* aria-label diferencia os botões quando há mais de um convite */}
                                        {!confirmando && (
                                            <button type="button" onClick={() => setConfirmando({ acao: 'cancelar', id: c.id })}
                                                aria-label={`Cancelar convite para ${PARA_QUEM[c.papel]}, que vale até ${formatarValidade(c.expiraEm)}`}
                                                className={CLASSE_BOTAO_PERIGO}>
                                                Cancelar convite
                                            </button>
                                        )}
                                        {confirmando?.acao === 'cancelar' && confirmando.id === c.id && (
                                            <Confirmacao
                                                pergunta={`Cancelar o convite para ${PARA_QUEM[c.papel]}? O link vai parar de funcionar.`}
                                                textoSim="Sim, cancelar"
                                                onSim={() => cancelarConvite(c)}
                                                onNao={() => setConfirmando(null)}
                                            />
                                        )}
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
