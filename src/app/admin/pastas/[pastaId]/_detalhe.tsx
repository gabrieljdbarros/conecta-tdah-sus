"use client";
import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PastaServices from "@/services/pasta";
import ConviteServices, { ConvitePendente, PapelConvidado } from "@/services/convite";
import { AppButton, AppLoader, AppOuvir } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData, setFlashData } from "@/helpers/router";
import { Participante, Pasta, SERIE_LABELS } from "@/types/pasta";
import { ROLE_LABELS } from "@/types/user";
import SecaoRelatorios from "./_relatorios";

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

/**
 * Atalho para uma parte da pasta: rola até o título E leva o foco até ele,
 * para o teclado e o leitor de tela continuarem dali
 */
function irParaTitulo(id: string) {
    const titulo = document.getElementById(id);
    if (!titulo) return;
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    titulo.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    titulo.focus({ preventScroll: true });
}

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

export default function DetalhePasta({ pastaId }: { pastaId: string }) {
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

    const participantes = Object.entries(pasta.participantes)
        .sort(([, a], [, b]) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel]);

    // Aviso na remoção: um convite pendente do mesmo papel ainda deixaria a
    // pessoa removida voltar, se o link tiver chegado até ela
    const avisoConvitePendente = (papel: Participante['papel']) =>
        papel !== 'mae' && convites.some((c) => c.papel === papel)
            ? `Há um convite para ${PARA_QUEM[papel]} esperando resposta. Se não quiser que essa pessoa volte, cancele esse convite também.`
            : undefined;

    return (
        <div className="flex flex-col gap-6 max-w-[640px]">
            {/* CABEÇALHO (design: "PASTA DO ESTUDANTE", nome e série) — o resto do sistema diz "aluno" */}
            <div className="border-b-2 border-(--cor-destaque) pb-3">
                <p className="ff-default text-[16px] font-bold tracking-wide uppercase text-(--cor-secundaria)">Pasta do aluno</p>
                <h2 className="ff-default text-[28px] font-extrabold leading-tight text-(--cor-texto) break-words">{pasta.nomeAluno}</h2>
                <p className="ff-default text-[16px] text-(--cor-texto-suave)">{SERIE_LABELS[pasta.serie] ?? '-'}</p>
            </div>

            {/* ATALHOS (design): levam às partes da pasta e ao chat (RN05) */}
            <nav aria-label="Atalhos da pasta">
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { href: '#relatorios', titulo: 'titulo-relatorios', icone: 'ion-clipboard', nome: 'Relatórios' },
                        { href: `/admin/pastas/${pasta.id}/conversas`, icone: 'ion-chatbubbles', nome: 'Conversas' },
                        { href: '#vinculos', titulo: 'titulo-participantes', icone: 'ion-ios-people', nome: 'Vínculos' },
                        ...(ehDona ? [{ href: '#convidar', titulo: 'titulo-convidar', icone: 'ion-person-add', nome: 'Convidar' }] : []),
                    ].map((a) => (
                        <li key={a.nome}>
                            <Link href={a.href} onClick={a.titulo ? (e) => { e.preventDefault(); irParaTitulo(a.titulo); } : undefined}
                                className="flex flex-col items-center justify-center gap-1 min-h-[88px] p-2 bg-white rounded-xl border border-gray-200 shadow-sm ff-default text-[16px] font-bold text-(--cor-texto)">
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
                    ? 'Esta é a pasta do aluno. Os botões de cima levam às partes da pasta. Em Relatórios, você lê os relatórios e pode contar como a criança está em casa. Em Conversas, você conversa com a escola e com o médico. Em Vínculos, você vê quem acompanha o aluno. Em Convidar, você chama a escola ou o médico e envia o link para a pessoa.'
                    : 'Esta é a pasta do aluno. Os botões de cima levam às partes da pasta. Em Relatórios, você lê e escreve relatórios. Em Conversas, você conversa com a família. Em Vínculos, você vê quem acompanha o aluno.'} />

            {/* MENSAGENS — anunciadas pelo leitor de tela */}
            <p ref={sucessoRef} tabIndex={-1} role="status" className={`${COR_SUCESSO} ff-default text-[16px] empty:hidden`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>
            {erro && <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: {erro}</p>}

            {/* PARTICIPANTES */}
            <section id="vinculos" aria-labelledby="titulo-participantes" className="scroll-mt-4">
                <h3 id="titulo-participantes" tabIndex={-1} className="font-bold text-[20px] mb-2">Vínculos: quem acompanha este aluno</h3>
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

            {/* RELATÓRIOS (cada um vê só os tipos que pode ler) */}
            <SecaoRelatorios pasta={pasta} />

            {/* CONVIDAR (só a dona) */}
            {ehDona && (
                <section id="convidar" aria-labelledby="titulo-convidar" className="scroll-mt-4">
                    <h3 id="titulo-convidar" tabIndex={-1} className="font-bold text-[20px] mb-2">Convidar</h3>
                    <p className="ff-default text-[16px] mb-3">
                        O convite é um link. Você envia o link para a escola ou para o médico
                        (por exemplo, pelo WhatsApp), e quem abrir o link passa a acompanhar este aluno.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <AppButton title={gerando === 'escola' ? 'Gerando...' : 'Convidar escola'} icon="university" onClick={() => convidar('escola')} disabled={!!gerando} form="round" />
                        <AppButton title={gerando === 'medico' ? 'Gerando...' : 'Convidar médico'} icon="medkit" onClick={() => convidar('medico')} disabled={!!gerando} form="round" />
                    </div>

                    {linkGerado && (
                        <div className="mt-4 p-4 rounded-xl border-2 border-(--cor-destaque) bg-white flex flex-col gap-3">
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
                </section>
            )}

        </div>
    );
}
