"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PastaServices from "@/services/pasta";
import MensagemServices, { ControleConversa } from "@/services/mensagem";
import { papelNaPasta } from "@/helpers/pasta";
import { AppLoader, AppOuvir, AppOuvirAudio, useVozDisponivel } from "@/themes/components";
import { vozSuportada } from "@/helpers/voz";
import { useAuth } from "@/contexts/AuthContext";
import { Pasta } from "@/types/pasta";
import { MAX_TEXTO_MENSAGEM, Mensagem } from "@/types/mensagem";
import { ROLE_LABELS, UserRole } from "@/types/user";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';
const CLASSE_LINK_VOLTAR = "self-start min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px]";

function formatarHora(ms: number): string {
    return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarDia(ms: number): string {
    return new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Quem escreveu (decisão travada 7), IGUAL ao app: um ícone de cor por
 * papel, sempre com o nome e o papel escritos ao lado (a cor nunca é a única
 * pista). A cor fica só no FUNDO do ícone, com o desenho em escuro
 * (#242424 passa de 9:1 nas três)
 */
const VISUAL_PAPEL: Record<UserRole, { icone: string; fundo: string }> = {
    mae: { icone: 'ion-heart', fundo: 'bg-[#FFC067]' },
    escola: { icone: 'ion-university', fundo: 'bg-[#20BE36]' },
    medico: { icone: 'ion-medkit', fundo: 'bg-[#EAD0FC]' },
    admin: { icone: 'ion-person', fundo: 'bg-[#D1D5DB]' },
};

function IconePapel({ papel }: { papel: UserRole }) {
    const { icone, fundo } = VISUAL_PAPEL[papel] ?? VISUAL_PAPEL.admin;
    return (
        <span aria-hidden="true" className={`inline-flex items-center justify-center w-[30px] h-[30px] shrink-0 rounded-full ${fundo} text-(--cor-texto) text-[17px]`}>
            <i className={icone} />
        </span>
    );
}

export default function Conversas({ pastaId }: { pastaId: string }) {
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [carregandoPasta, setCarregandoPasta] = useState(true);
    const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
    const [erroCanal, setErroCanal] = useState(false);
    const [tentativa, setTentativa] = useState(0); // "Tentar de novo" reabre o canal
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erroEnvio, setErroEnvio] = useState(false);
    const [enviada, setEnviada] = useState(false);
    const listaRef = useRef<HTMLOListElement>(null);
    const textoRef = useRef<HTMLTextAreaElement>(null);
    const rolarParaOFim = useRef(true); // na abertura e depois de enviar
    // Histórico (RF12): mensagens anteriores às da tela, de 100 em 100
    const [temAnteriores, setTemAnteriores] = useState(false);
    const [buscandoAnteriores, setBuscandoAnteriores] = useState(false);
    const [erroAnteriores, setErroAnteriores] = useState(false);
    const [avisoAnteriores, setAvisoAnteriores] = useState('');
    // Enquanto as anteriores entram no topo, o log não as lê em voz alta
    const [logCalado, setLogCalado] = useState(false);
    const controle = useRef<ControleConversa | null>(null);
    const distanciaDoFim = useRef<number | null>(null); // para a tela não pular
    const religarLog = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (religarLog.current) clearTimeout(religarLog.current); }, []);
    // Mensagens são conteúdo: só voz que roda no aparelho (decisão travada 9)
    const vozLocal = useVozDisponivel(true);

    // ======================================================================
    useEffect(() => {
        if (carregandoSessao || !user) return;
        (async () => {
            const { pasta } = await PastaServices.buscar(pastaId);
            setPasta(pasta ?? null);
            setCarregandoPasta(false);
        })();
    }, [carregandoSessao, user, pastaId]);

    const papel = user && pasta ? papelNaPasta(user, pasta.donoUid) : null;
    const podeAbrir = !!pasta && !!papel;

    // Acompanha a conversa em tempo real; para de ouvir ao sair da tela
    // (economiza dados e bateria). Se o acesso for perdido (ex.: a pessoa
    // foi removida), as mensagens novas param de chegar
    useEffect(() => {
        if (!podeAbrir) return;
        setMensagens(null);
        setErroCanal(false);
        rolarParaOFim.current = true;
        setTemAnteriores(false);
        // No erro (ex.: acesso perdido), as mensagens somem da tela
        const conversa = MensagemServices.ouvir(pastaId, (lista, anteriores) => { setMensagens(lista); setTemAnteriores(anteriores); },
            () => { setMensagens(null); setErroCanal(true); });
        controle.current = conversa;
        return () => { conversa.parar(); controle.current = null; };
    }, [pastaId, podeAbrir, tentativa]);

    /** HISTÓRICO (RF12): mais 100 mensagens antes das que estão na tela */
    const verAnteriores = async () => {
        const lista = listaRef.current;
        if (!controle.current || buscandoAnteriores) return;
        setBuscandoAnteriores(true);
        setErroAnteriores(false);
        setAvisoAnteriores('');
        setLogCalado(true);
        if (lista) distanciaDoFim.current = lista.scrollHeight - lista.scrollTop;
        const ok = await controle.current.carregarAnteriores();
        setBuscandoAnteriores(false);
        if (!ok) { distanciaDoFim.current = null; setErroAnteriores(true); }
        else {
            setAvisoAnteriores('Mensagens anteriores carregadas.');
            // Sem mais anteriores, o botão some: o foco vai para a lista
            if (!controle.current?.temAnteriores()) listaRef.current?.focus();
        }
        // A lista já foi atualizada antes do fim da carga; a folga garante
        // que o leitor não leia as anteriores ao religar o aviso de mensagens novas
        religarLog.current = setTimeout(() => setLogCalado(false), 1500);
    };

    // Rola até a mensagem mais nova só na abertura, depois de enviar ou se a
    // pessoa já estava perto do fim — quem lê mensagens antigas não perde o lugar
    useEffect(() => {
        const lista = listaRef.current;
        if (!lista || !mensagens) return;
        // Entraram as anteriores no topo: a mensagem que estava na tela continua no lugar
        if (distanciaDoFim.current !== null) {
            lista.scrollTop = lista.scrollHeight - distanciaDoFim.current;
            distanciaDoFim.current = null;
            return;
        }
        const pertoDoFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 120;
        if (rolarParaOFim.current || pertoDoFim) lista.scrollTop = lista.scrollHeight;
        rolarParaOFim.current = false;
    }, [mensagens, vozLocal]);
    // ======================================================================
    // Só o botão envia. O Enter do campo quebra a linha: no celular não há
    // Shift, e uma mensagem enviada pela metade não pode ser apagada
    const enviar = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !papel || enviando || !texto.trim()) return;
        setEnviando(true);
        setErroEnvio(false);
        setEnviada(false);
        const { success } = await MensagemServices.enviar(pastaId, user, papel, texto.trim());
        setEnviando(false);
        if (success) {
            setTexto('');
            setEnviada(true);
            rolarParaOFim.current = true;
            textoRef.current?.focus(); // o foco volta para o campo, pronto para a próxima
        } else
            setErroEnvio(true);
    };

    // ======================================================================
    if (carregandoSessao || carregandoPasta)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Abrindo as conversas...</p>
            </div>
        );

    if (!pasta || !papel)
        return (
            <div className="flex flex-col gap-4">
                <p role="alert" className="ff-default text-[16px]">Não foi possível abrir as conversas desta pasta. Ela pode não existir, ou você não faz parte dela.</p>
                <Link href="/admin/pastas" className={CLASSE_LINK_VOLTAR}>Voltar para as pastas</Link>
            </div>
        );

    return (
        <div className="flex flex-col gap-4 max-w-[720px]">
            <h2 className="ff-default text-[24px] font-extrabold leading-tight text-(--cor-texto)">Conversas sobre {pasta.nomeAluno}</h2>
            <AppOuvir rotulo="Ouvir instruções" className="self-start"
                texto={`Aqui você conversa sobre o aluno com a família, a escola e os médicos da pasta. Todos veem todas as mensagens.${vozLocal ? ' Para ouvir uma mensagem, toque em Ouvir, embaixo dela.' : ''} Para mandar uma mensagem, escreva no campo de baixo e toque em Enviar. Para falar em vez de digitar, toque no microfone do teclado. Para ouvir uma mensagem de voz, toque em Ouvir áudio. As mensagens de voz são gravadas pelo app do celular.`} />
            {vozLocal === false && (
                <p className="ff-default text-[16px] text-(--cor-texto-suave)">
                    {vozSuportada()
                        ? 'Este aparelho não lê mensagens em voz alta. Isso protege os dados da criança. Para ouvir, instale a voz em português nas configurações do celular.'
                        : 'Este navegador não consegue ler em voz alta.'}
                </p>
            )}

            <div className="flex flex-col gap-3">
                {/* Quem vê a conversa é dito no "Ouvir instruções" (o aviso fixo saiu
                    em 08/11/2026, como no app em 07/11) */}

                {/* ESTADOS fora do log, para não serem lidos como mensagens */}
                {mensagens === null && !erroCanal && <p role="status" className="ff-default text-[16px]">Carregando as mensagens...</p>}
                {erroCanal && (
                    <div className="flex flex-col items-start gap-2">
                        <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não deu para carregar as mensagens.</p>
                        <button type="button" onClick={() => setTentativa((n) => n + 1)}
                            className="min-h-[48px] px-4 rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px] cursor-pointer">
                            Tentar de novo
                        </button>
                    </div>
                )}
                {mensagens?.length === 0 && <p className="ff-default text-[16px]">Ainda não há mensagens. Escreva a primeira!</p>}

                {/* MENSAGENS — role="log" (já é aria-live="polite"). Só aparece
                    depois de carregar, então o leitor de tela anuncia só as
                    mensagens NOVAS, não as 100 de uma vez.
                    tabIndex permite rolar a lista pelo teclado */}
                {mensagens && mensagens.length > 0 && <>
                    {/* Histórico (RF12): as anteriores vêm de 100 em 100, só quando a pessoa pede */}
                    {temAnteriores && (
                        // aria-disabled (e não disabled): o foco fica no botão enquanto carrega
                        <button type="button" onClick={verAnteriores} aria-disabled={buscandoAnteriores}
                            className="self-center min-h-[48px] px-5 rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px] cursor-pointer aria-disabled:cursor-wait">
                            {buscandoAnteriores ? 'Carregando...' : 'Ver mensagens anteriores'}
                        </button>
                    )}
                    {erroAnteriores && <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não deu para carregar as mensagens anteriores. Tente de novo.</p>}
                    <p role="status" className="sr-only">{avisoAnteriores}</p>
                    {!temAnteriores && <p className="self-center ff-default text-[16px] text-(--cor-texto-suave)">Início da conversa</p>}
                    <ol ref={listaRef} role="log" aria-live={logCalado ? 'off' : 'polite'} tabIndex={0} aria-label="Mensagens"
                        className="flex flex-col gap-3 min-h-[200px] max-h-[55dvh] overflow-y-auto p-3 rounded-xl bg-(--background-secondary) border border-gray-300">
                        {mensagens.map((m, i) => {
                            const minha = m.autorUid === user?.uid;
                            const dia = formatarDia(m.criadoEm);
                            const novoDia = i === 0 || formatarDia(mensagens[i - 1].criadoEm) !== dia;
                            return (
                                <li key={m.id} className="flex flex-col gap-3">
                                    {novoDia && <p className="self-center ff-default text-[16px] text-(--cor-texto-suave)">{dia}</p>}
                                    {/* Balões como no app: os meus lilás-claro à direita, os outros brancos à esquerda */}
                                    <div className={`max-w-[90%] ${minha ? 'self-end' : 'self-start'}`}>
                                        <div className={`rounded-2xl border p-3 ${minha ? 'rounded-tr-[4px] bg-[#F3E6FD] border-[#E2CBF5]' : 'rounded-tl-[4px] bg-white border-[#D1D5DB]'}`}>
                                            {/* "Você" identifica a autoria sem depender de cor ou posição */}
                                            <p className="flex flex-wrap items-center gap-x-2 ff-default text-[16px] font-extrabold text-(--cor-texto)">
                                                <IconePapel papel={m.autorPapel} />
                                                <span>{minha ? 'Você' : m.autorNome}<span className="font-normal text-(--cor-texto-suave)"> · {ROLE_LABELS[m.autorPapel]} · <time dateTime={new Date(m.criadoEm).toISOString()}>{formatarHora(m.criadoEm)}</time></span></span>
                                            </p>
                                            {m.tipo === 'audio' ? (
                                                <AppOuvirAudio mensagem={m} descricao={minha ? 'sua mensagem' : `mensagem de ${m.autorNome}`} className="mt-2" />
                                            ) : (
                                                <p className="ff-default text-[16px] leading-relaxed whitespace-pre-wrap break-words">{m.texto}</p>
                                            )}
                                            {/* Conteúdo: só com voz local no aparelho. Nas próprias
                                                mensagens não aparece (a pessoa acabou de escrever) */}
                                            {!minha && m.tipo === 'texto' && (
                                                <AppOuvir conteudo disponivel={vozLocal} className="mt-2"
                                                    texto={`${m.autorNome} escreveu: ${m.texto}`}
                                                    descricao={`mensagem de ${m.autorNome}`} />
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </>}

                {/* ENVIAR */}
                <form onSubmit={enviar} className="flex flex-col gap-2">
                    <label htmlFor="texto-mensagem" className="ff-default text-[16px] font-bold">Escreva sua mensagem:</label>
                    <p id="aviso-mensagem" className="ff-default text-[16px] text-gray-700">
                        Depois de enviada, a mensagem não pode ser apagada nem editada. Confira antes de tocar em Enviar.
                    </p>
                    {/* Ditado pelo teclado do celular: ajuda quem tem dificuldade para escrever */}
                    <p id="dica-microfone" className="ff-default text-[16px] text-gray-700">
                        <i className="ion-mic-a mr-1" aria-hidden="true" />Dica: no celular, toque no microfone do teclado para falar em vez de digitar.
                    </p>
                    <textarea id="texto-mensagem" ref={textoRef} value={texto}
                        onChange={(e) => { setTexto(e.target.value); setEnviada(false); }}
                        rows={3} maxLength={MAX_TEXTO_MENSAGEM} aria-describedby="aviso-mensagem dica-microfone"
                        className="w-full rounded-2xl border border-(--cor-borda) bg-white p-3 ff-default text-[16px] text-(--cor-texto) placeholder:text-(--cor-borda) focus:border-(--cor-link) focus:ring-2 focus:ring-(--cor-link) focus:outline-none" />
                    {erroEnvio && <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: a mensagem não foi enviada. Tente de novo.</p>}
                    <p role="status" className={`${COR_SUCESSO} ff-default text-[16px] empty:hidden`}>{enviada ? 'Mensagem enviada.' : ''}</p>
                    <button type="submit" disabled={enviando || !texto.trim()}
                        className="self-end min-h-[48px] px-6 rounded-full bg-(--cor-destaque) text-white ff-default text-[19px] font-bold cursor-pointer disabled:bg-gray-300 disabled:text-gray-700 disabled:cursor-not-allowed">
                        <i className="ion-paper-airplane mr-2" aria-hidden="true" />
                        {enviando ? 'Enviando...' : 'Enviar'}
                    </button>
                </form>
            </div>

            <Link href={`/admin/pastas/${pastaId}`} className={CLASSE_LINK_VOLTAR}>Voltar para a pasta</Link>
        </div>
    );
}
