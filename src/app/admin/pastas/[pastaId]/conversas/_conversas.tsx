"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PastaServices from "@/services/pasta";
import MensagemServices from "@/services/mensagem";
import { papelNaPasta } from "@/helpers/pasta";
import { AppLoader, AppOuvir, useVozDisponivel } from "@/themes/components";
import { vozSuportada } from "@/helpers/voz";
import { useAuth } from "@/contexts/AuthContext";
import { Pasta } from "@/types/pasta";
import { LIMITE_MENSAGENS, MAX_TEXTO_MENSAGEM, Mensagem } from "@/types/mensagem";
import { ROLE_LABELS } from "@/types/user";
import { duracaoPorExtenso } from "@/helpers/linhas";

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

/** Iniciais do nome no círculo do autor (o design usa foto; aqui não guardamos foto) */
function iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
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
        // No erro (ex.: acesso perdido), as mensagens somem da tela
        return MensagemServices.ouvir(pastaId, setMensagens, () => { setMensagens(null); setErroCanal(true); });
    }, [pastaId, podeAbrir, tentativa]);

    // Rola até a mensagem mais nova só na abertura, depois de enviar ou se a
    // pessoa já estava perto do fim — quem lê mensagens antigas não perde o lugar
    useEffect(() => {
        const lista = listaRef.current;
        if (!lista || !mensagens) return;
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
                texto={`Aqui você conversa sobre o aluno com a família, a escola e os médicos da pasta. Todos veem todas as mensagens.${vozLocal ? ' Para ouvir uma mensagem, toque em Ouvir, embaixo dela.' : ''} Para mandar uma mensagem, escreva no campo de baixo e toque em Enviar. Para falar em vez de digitar, toque no microfone do teclado. As mensagens de voz, por enquanto, só podem ser ouvidas pelo app.`} />
            {vozLocal === false && (
                <p className="ff-default text-[16px] text-(--cor-texto-suave)">
                    {vozSuportada()
                        ? 'Este aparelho não lê mensagens em voz alta. Isso protege os dados da criança. Para ouvir, instale a voz em português nas configurações do celular.'
                        : 'Este navegador não consegue ler em voz alta.'}
                </p>
            )}

            <div className="flex flex-col gap-3">
                {/* QUEM VÊ esta conversa */}
                <p className="ff-default text-[16px] text-(--cor-texto) p-3 rounded-xl bg-[#EEF2FF] flex items-center gap-2">
                    <i className="ion-eye text-(--cor-secundaria)" aria-hidden="true" />Família, escola e médicos da pasta veem esta conversa.
                </p>

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
                    {mensagens.length >= LIMITE_MENSAGENS && (
                        <p className="ff-default text-[16px] text-gray-700">Mostrando as {LIMITE_MENSAGENS} mensagens mais recentes.</p>
                    )}
                    <ol ref={listaRef} role="log" tabIndex={0} aria-label="Mensagens"
                        className="flex flex-col gap-3 min-h-[200px] max-h-[55dvh] overflow-y-auto p-3 rounded-xl bg-white border border-gray-300">
                        {mensagens.map((m, i) => {
                            const minha = m.autorUid === user?.uid;
                            const dia = formatarDia(m.criadoEm);
                            const novoDia = i === 0 || formatarDia(mensagens[i - 1].criadoEm) !== dia;
                            return (
                                <li key={m.id} className="flex flex-col gap-3">
                                    {novoDia && <p className="self-center ff-default text-[16px] text-(--cor-texto-suave)">{dia}</p>}
                                    <div className={`flex items-end gap-2 max-w-[90%] ${minha ? 'self-end' : 'self-start'}`}>
                                        {!minha && (
                                            <span aria-hidden="true" className="flex items-center justify-center w-[40px] h-[40px] shrink-0 rounded-full bg-(--cor-secundaria) text-white ff-default text-[15px] font-bold">
                                                {iniciais(m.autorNome)}
                                            </span>
                                        )}
                                        <div className={`rounded-2xl p-3 ${minha ? 'bg-[#EEF0FF] border border-[#C7CCF5]' : 'bg-[#E3F5F2] border border-[#B8E2DC]'}`}>
                                            {/* "Você" identifica a autoria sem depender de cor ou posição */}
                                            <p className="ff-default text-[16px] font-bold text-(--cor-texto)">
                                                {minha ? 'Você' : `${m.autorNome} (${ROLE_LABELS[m.autorPapel]})`}
                                                <span className="font-normal text-(--cor-texto-suave)"> · <time dateTime={new Date(m.criadoEm).toISOString()}>{formatarHora(m.criadoEm)}</time></span>
                                            </p>
                                            {m.tipo === 'audio' ? (
                                                // TODO (etapa 4c): ouvir o áudio na web. Por enquanto, só pelo app
                                                <p className="ff-default text-[16px] leading-relaxed">
                                                    <i className="ion-mic-a mr-1" aria-hidden="true" />
                                                    {m.audioApagado
                                                        ? 'Mensagem de voz apagada depois de 90 dias (prazo de guarda).'
                                                        : `Mensagem de voz de ${duracaoPorExtenso(m.audioDuracaoS ?? 0)}. Por enquanto, ouça pelo app.`}
                                                </p>
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
