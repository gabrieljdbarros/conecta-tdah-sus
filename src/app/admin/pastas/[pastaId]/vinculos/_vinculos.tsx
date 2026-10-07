"use client";
import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PastaServices from "@/services/pasta";
import ConviteServices, { ConvitePendente, PapelConvidado } from "@/services/convite";
import { AppButton, AppLoader, AppOuvir } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { setFlashData } from "@/helpers/router";
import { Participante, Pasta } from "@/types/pasta";
import { ROLE_LABELS } from "@/types/user";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';
const CLASSE_LINK_VOLTAR = "self-start mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px]";
const CLASSE_BOTAO_PERIGO = "min-h-[48px] px-4 rounded-full border-2 border-[#B91C1C] text-[#B91C1C] ff-default text-[16px] cursor-pointer";

const PARA_QUEM: Record<PapelConvidado, string> = { escola: 'a escola', medico: 'o médico' };

// Mãe primeiro, depois escola e médico
const ORDEM_PAPEL: Record<Participante['papel'], number> = { mae: 0, escola: 1, medico: 2 };

type Acao = 'remover' | 'sair' | 'cancelar';

// Id do botão que abre cada pergunta — para devolver o foco a ele no "Não"
const idBotao = (acao: Acao, id: string) => `botao-${acao}-${id}`;

function formatarValidade(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * Confirmação na própria tela (no lugar do window.confirm, que pode não
 * aparecer em navegadores dentro de apps, como o do WhatsApp).
 * - "Não" vem primeiro e recebe o foco: é a opção segura
 * - Fica aberta mostrando "Removendo..." etc. até terminar, e continua
 *   aberta se der erro, para tentar de novo
 * - Esc também responde "Não"
 */
function Confirmacao({ pergunta, aviso, textoSim, textoNao, textoProcessando, processando, onSim, onNao }: {
    pergunta: string; aviso?: string; textoSim: string; textoNao: string; textoProcessando: string;
    processando: boolean; onSim: () => void; onNao: () => void;
}) {
    const idPergunta = useId();
    const naoRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { naoRef.current?.focus(); }, []);

    const aoTeclar = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !processando) onNao();
    };

    return (
        <div role="group" aria-labelledby={idPergunta} onKeyDown={aoTeclar}
            className="w-full flex flex-col gap-3 mt-2 p-3 rounded-xl bg-[#FEF2F2] border-2 border-[#B91C1C]">
            <p id={idPergunta} className="ff-default text-[16px] font-bold">{pergunta}</p>
            {aviso && <p className="ff-default text-[16px]">{aviso}</p>}
            <div className="flex flex-col sm:flex-row gap-4">
                <button ref={naoRef} type="button" onClick={onNao} disabled={processando}
                    className="w-full sm:w-auto min-h-[48px] px-4 rounded-full border-2 border-gray-700 text-gray-900 bg-white ff-default text-[16px] cursor-pointer disabled:opacity-50">
                    {textoNao}
                </button>
                <button type="button" onClick={onSim} disabled={processando}
                    className="w-full sm:w-auto min-h-[48px] px-4 rounded-full bg-[#B91C1C] text-white ff-default text-[16px] cursor-pointer disabled:opacity-50">
                    {processando ? textoProcessando : textoSim}
                </button>
            </div>
            <p role="status" className="sr-only">{processando ? textoProcessando : ''}</p>
        </div>
    );
}

/**
 * VÍNCULOS da pasta (design): quem tem acesso, convidar e convites.
 * - a dona convida escola/médico por link (48 h, uso único — RN01, RN02),
 *   cancela convites e remove pessoas
 * - escola/médico podem sair da pasta
 * As regras do Firestore e as Cloud Functions garantem tudo isso; aqui é a tela
 */
export default function Vinculos({ pastaId }: { pastaId: string }) {
    const router = useRouter();
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    // Pergunta aberta (remover/sair: uid; cancelar: id do convite) e se a ação está rodando
    const [confirmando, setConfirmando] = useState<{ acao: Acao; id: string } | null>(null);
    const [processando, setProcessando] = useState(false);
    const [focoVolta, setFocoVolta] = useState<string | null>(null);

    // Convites (só a dona)
    const [convites, setConvites] = useState<ConvitePendente[]>([]);
    const [gerando, setGerando] = useState<PapelConvidado | null>(null);
    const [linkGerado, setLinkGerado] = useState<{ papel: PapelConvidado; url: string; expiraEm: number } | null>(null);
    const [copiado, setCopiado] = useState(false);
    const [erroCopia, setErroCopia] = useState(false);
    const linkRef = useRef<HTMLParagraphElement>(null);
    // Erro ao gerar convite: o botão clicado fica desabilitado e perde o foco;
    // o foco vai para a mensagem de erro (que fica no alto da tela)
    const erroRef = useRef<HTMLParagraphElement>(null);
    const [focarErro, setFocarErro] = useState(false);
    const sucessoRef = useRef<HTMLParagraphElement>(null);

    const ehDona = !!user && !!pasta && pasta.donoUid === user.uid;

    // ======================================================================
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

    // Veio do botão "Convidar" da pasta (#convidar): leva o foco ao título dessa parte
    useEffect(() => {
        if (carregando || window.location.hash !== '#convidar') return;
        const titulo = document.getElementById('titulo-convidar');
        titulo?.scrollIntoView({ block: 'start' });
        titulo?.focus({ preventScroll: true });
    }, [carregando]);

    useEffect(() => {
        if (!focarErro) return;
        erroRef.current?.focus();
        setFocarErro(false);
    }, [focarErro]);

    // Leva o foco até a novidade (link gerado ou sucesso), para o leitor de tela ler
    useEffect(() => { if (linkGerado) linkRef.current?.focus(); }, [linkGerado]);
    useEffect(() => { if (sucesso && !carregando) sucessoRef.current?.focus(); }, [sucesso, carregando]);

    // Depois do "Não", o botão que abriu a pergunta volta a existir: o foco
    // volta para ele, e a pessoa não perde o lugar na página
    useEffect(() => {
        if (!focoVolta || confirmando) return;
        document.getElementById(focoVolta)?.focus();
        setFocoVolta(null);
    }, [focoVolta, confirmando]);

    const perguntar = (acao: Acao, id: string) => {
        setErro(null);
        setConfirmando({ acao, id });
    };
    const desistir = () => {
        if (!confirmando) return;
        setFocoVolta(idBotao(confirmando.acao, confirmando.id));
        setConfirmando(null);
    };
    // ======================================================================
    const convidar = async (papel: PapelConvidado, substituir?: ConvitePendente) => {
        if (!user) return;
        setErro(null);
        setSucesso(null);
        setCopiado(false);
        setErroCopia(false);
        setGerando(papel);
        const { success, token, expiraEm, message } = await ConviteServices.gerar(pastaId, papel);
        setGerando(null);
        if (success && token && expiraEm) {
            // O vencido não serve mais: sai da lista (se falhar, só continua aparecendo)
            if (substituir) await ConviteServices.cancelar(substituir.id);
            setLinkGerado({ papel, url: `${window.location.origin}/convite/${token}`, expiraEm });
            await carregarConvites(user.uid);
        } else {
            setErro(message ?? 'Não foi possível gerar o convite');
            setFocarErro(true);
        }
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

    // As três ações abaixo mantêm a pergunta aberta ("Cancelando..." etc.)
    // até terminar; em caso de erro ela continua aberta para tentar de novo
    const cancelarConvite = async (convite: ConvitePendente) => {
        if (!user) return;
        setErro(null);
        setSucesso(null);
        setProcessando(true);
        const { success } = await ConviteServices.cancelar(convite.id);
        setProcessando(false);
        if (success) {
            setConfirmando(null);
            setSucesso('Convite cancelado');
            await carregarConvites(user.uid);
        } else
            setErro('Não foi possível cancelar o convite. Tente novamente');
    };

    // A dona tira outra pessoa da pasta
    const removerParticipante = async (participanteUid: string, nome: string) => {
        setErro(null);
        setSucesso(null);
        setProcessando(true);
        const { success, message } = await PastaServices.removerParticipante(pastaId, participanteUid);
        if (success) {
            const { pasta: atualizada } = await PastaServices.buscar(pastaId);
            // Se não der para recarregar, tira da lista na própria tela
            setPasta((atual) => atualizada ?? (atual && {
                ...atual,
                membrosUids: atual.membrosUids.filter((u) => u !== participanteUid),
                participantes: Object.fromEntries(Object.entries(atual.participantes).filter(([u]) => u !== participanteUid)),
            }));
            setConfirmando(null);
            setSucesso(`${nome} não faz mais parte da pasta`);
        } else
            setErro(message ?? 'Não foi possível remover. Tente novamente');
        setProcessando(false);
    };

    // Escola/médico sai da pasta e volta para a lista (já não consegue lê-la)
    const sairDaPasta = async () => {
        if (!user) return;
        setErro(null);
        setSucesso(null);
        setProcessando(true);
        const { success, message } = await PastaServices.removerParticipante(pastaId, user.uid);
        if (success) {
            setFlashData('Você saiu da pasta');
            router.push('/admin/pastas');
            return; // a pergunta fica em "Saindo..." até a lista abrir
        }
        setErro(message ?? 'Não foi possível sair da pasta. Tente novamente');
        setProcessando(false);
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

    const agora = Date.now();
    const pendentes = convites.filter((c) => c.expiraEm > agora);
    const vencidos = convites.filter((c) => c.expiraEm <= agora);

    const participantes = Object.entries(pasta.participantes)
        .sort(([, a], [, b]) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel]);

    // Aviso na remoção: um convite pendente do mesmo papel ainda deixaria a
    // pessoa removida voltar, se o link tiver chegado até ela
    const avisoConvitePendente = (papel: Participante['papel']) =>
        papel !== 'mae' && convites.some((c) => c.papel === papel && c.expiraEm > Date.now())
            ? `Há um convite para ${PARA_QUEM[papel]} esperando resposta. Se não quiser que essa pessoa volte, cancele esse convite também.`
            : undefined;

    return (
        <div className="flex flex-col gap-6 max-w-[640px]">
            <p className="ff-default text-[16px] text-(--cor-texto-suave)">Pasta de <strong className="text-(--cor-texto)">{pasta.nomeAluno}</strong></p>

            {/* Instruções genéricas (sem o nome do aluno): podem usar qualquer voz */}
            <AppOuvir rotulo="Ouvir instruções" className="self-start"
                texto={ehDona
                    ? 'Aqui você vê quem acompanha o aluno. Para chamar a escola ou o médico, toque em Convidar escola ou Convidar médico, copie o link e envie para a pessoa. O link vale 48 horas e só funciona uma vez. Para tirar alguém da pasta, toque em Remover.'
                    : 'Aqui você vê quem acompanha o aluno. Se não quiser mais acompanhar, toque em Sair da pasta.'} />

            {/* MENSAGENS — anunciadas pelo leitor de tela */}
            <p ref={sucessoRef} tabIndex={-1} role="status" className={`${COR_SUCESSO} ff-default text-[16px] empty:hidden`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>
            {erro && <p ref={erroRef} tabIndex={-1} role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: {erro}</p>}

            {/* PARTICIPANTES */}
            <section aria-labelledby="titulo-participantes">
                <h2 id="titulo-participantes" className="font-bold text-[20px] mb-2">Com acesso à pasta</h2>
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

                                {/* A dona remove os outros; escola/médico só pode sair (a dona não sai).
                                    Com uma pergunta aberta, os outros botões somem (uma de cada vez) */}
                                {!confirmando && ehDona && uid !== pasta.donoUid && (
                                    <button id={idBotao('remover', uid)} type="button" onClick={() => perguntar('remover', uid)}
                                        aria-label={`Remover ${p.nome} da pasta`} className={CLASSE_BOTAO_PERIGO}>
                                        Remover
                                    </button>
                                )}
                                {!confirmando && !ehDona && uid === user?.uid && (
                                    <button id={idBotao('sair', uid)} type="button" onClick={() => perguntar('sair', uid)} className={CLASSE_BOTAO_PERIGO}>
                                        Sair da pasta
                                    </button>
                                )}

                                {confirmando?.acao === 'remover' && confirmando.id === uid && (
                                    <Confirmacao
                                        pergunta={`Remover ${p.nome} da pasta? Essa pessoa deixa de ver a pasta na hora.`}
                                        aviso={avisoConvitePendente(p.papel)}
                                        textoNao="Não, voltar"
                                        textoSim={`Sim, remover ${p.nome}`}
                                        textoProcessando="Removendo..."
                                        processando={processando}
                                        onSim={() => removerParticipante(uid, p.nome)}
                                        onNao={desistir}
                                    />
                                )}
                                {confirmando?.acao === 'sair' && confirmando.id === uid && (
                                    <Confirmacao
                                        pergunta="Sair da pasta? Você deixa de ver a pasta. Para voltar, a família precisa enviar um novo convite."
                                        textoNao="Não, voltar"
                                        textoSim="Sim, sair da pasta"
                                        textoProcessando="Saindo..."
                                        processando={processando}
                                        onSim={sairDaPasta}
                                        onNao={desistir}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>


            {/* CONVIDAR (só a dona) */}
            {ehDona && (
                <section id="convidar" aria-labelledby="titulo-convidar" className="scroll-mt-4">
                    <h2 id="titulo-convidar" tabIndex={-1} className="font-bold text-[20px] mb-2">Convidar</h2>
                    <p className="ff-default text-[16px] mb-3">
                        O convite é um link. Você envia o link para a escola ou para o médico
                        (por exemplo, pelo WhatsApp), e quem abrir o link passa a acompanhar este aluno.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <AppButton title={gerando === 'escola' ? 'Gerando...' : 'Convidar escola'} icon="university" onClick={() => convidar('escola')} disabled={!!gerando} form="round" />
                        <AppButton title={gerando === 'medico' ? 'Gerando...' : 'Convidar médico'} icon="medkit" onClick={() => convidar('medico')} disabled={!!gerando} form="round" />
                    </div>

                    {linkGerado && (
                        <div className="mt-4 p-4 rounded-2xl border-2 border-(--cor-destaque) bg-white flex flex-col gap-3">
                            {/* Anúncio curto (o leitor de tela não soletra a URL inteira) */}
                            <p ref={linkRef} tabIndex={-1} role="status" className="ff-default text-[22px] font-extrabold text-(--cor-texto)">
                                Convite para {PARA_QUEM[linkGerado.papel]} pronto
                            </p>
                            <p className="ff-default text-[16px] text-(--cor-texto) flex items-center gap-2">
                                <i className="ion-clock" aria-hidden="true" />Vale até {formatarValidade(linkGerado.expiraEm)}
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
                                O link só funciona para uma pessoa. Envie agora: por segurança, este link não aparece de novo.
                            </p>
                        </div>
                    )}

                    {pendentes.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-bold text-[18px] mb-2">Convites esperando resposta</h3>
                            <ul className="flex flex-col gap-2">
                                {pendentes.map((c) => (
                                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl p-3 border border-gray-200">
                                        <div>
                                            <p className="ff-default text-[16px] font-bold">Convite para {PARA_QUEM[c.papel]}</p>
                                            <p className="ff-default text-[16px] text-(--cor-texto-suave) flex items-center gap-2">
                                                <i className="ion-clock" aria-hidden="true" />Esperando resposta: vale até {formatarValidade(c.expiraEm)}
                                            </p>
                                        </div>
                                        {/* aria-label diferencia os botões quando há mais de um convite */}
                                        {!confirmando && (
                                            <button id={idBotao('cancelar', c.id)} type="button" onClick={() => perguntar('cancelar', c.id)}
                                                aria-label={`Cancelar convite para ${PARA_QUEM[c.papel]}, que vale até ${formatarValidade(c.expiraEm)}`}
                                                className={CLASSE_BOTAO_PERIGO}>
                                                Cancelar convite
                                            </button>
                                        )}
                                        {confirmando?.acao === 'cancelar' && confirmando.id === c.id && (
                                            <Confirmacao
                                                pergunta={`Cancelar o convite para ${PARA_QUEM[c.papel]}? O link vai parar de funcionar.`}
                                                textoNao="Não, manter convite"
                                                textoSim="Sim, cancelar convite"
                                                textoProcessando="Cancelando..."
                                                processando={processando}
                                                onSim={() => cancelarConvite(c)}
                                                onNao={desistir}
                                            />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Vencidos: o link já não funciona. "Gerar novo" faz outro e tira o vencido da lista */}
                    {vencidos.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-bold text-[18px] mb-2">Convites vencidos</h3>
                            <ul className="flex flex-col gap-2">
                                {vencidos.map((c) => (
                                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl p-3 border border-gray-200">
                                        <div>
                                            <p className="ff-default text-[16px] font-bold">Convite para {PARA_QUEM[c.papel]}</p>
                                            <p className={`ff-default text-[16px] ${COR_ERRO} flex items-center gap-2`}>
                                                <i className="ion-close-circled" aria-hidden="true" />Venceu em {formatarValidade(c.expiraEm)}
                                            </p>
                                        </div>
                                        {!confirmando && (
                                            <AppButton title={gerando === c.papel ? 'Gerando...' : 'Gerar novo convite'} icon="refresh"
                                                onClick={() => convidar(c.papel, c)} disabled={!!gerando} />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            )}

        </div>
    );
}
