"use client";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PastaServices from "@/services/pasta";
import MensagemServices from "@/services/mensagem";
import { papelNaPasta } from "@/services/relatorio";
import { AppLoader, AppOuvir, useVozDisponivel } from "@/themes/components";
import { vozSuportada } from "@/helpers/voz";
import { useAuth } from "@/contexts/AuthContext";
import { Pasta } from "@/types/pasta";
import { PapelNaPasta } from "@/types/relatorio";
import { CANAL_GRUPO, canalPrivado, LIMITE_MENSAGENS, MAX_TEXTO_MENSAGEM, Mensagem } from "@/types/mensagem";
import { ROLE_LABELS } from "@/types/user";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';
const CLASSE_LINK_VOLTAR = "self-start min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px]";

interface Aba {
    canal: string;
    titulo: string;
    quemVe: string;
}

/**
 * Abas por papel (decisão travada 10):
 *  - mãe: conversa de todos + uma conversa só com cada médico da pasta
 *  - médico: conversa de todos + conversa só com a família
 *  - escola: só a conversa de todos
 */
function montarAbas(pasta: Pasta, papel: PapelNaPasta, uid: string): Aba[] {
    const todos: Aba = { canal: CANAL_GRUPO, titulo: 'Conversa de todos', quemVe: 'Família, escola e médicos veem esta conversa.' };
    if (papel === 'medico')
        return [todos, { canal: canalPrivado(uid), titulo: 'Só com a família', quemVe: 'Só você e a família veem esta conversa. A escola não vê.' }];
    if (papel === 'mae') {
        // TODO: mostrar também o histórico privado de médicos que saíram da pasta
        const medicos = Object.entries(pasta.participantes).filter(([, p]) => p.papel === 'medico');
        return [todos, ...medicos.map(([medicoUid, p]) => {
            const nome = p.nome || 'médico(a)';
            // Com dois médicos de mesmo nome, a unidade diferencia as abas
            const repetido = medicos.filter(([, outro]) => outro.nome === p.nome).length > 1;
            return {
                canal: canalPrivado(medicoUid),
                titulo: `Só com ${nome}${repetido && p.detalhe ? ` (${p.detalhe})` : ''}`,
                quemVe: `Só você e ${nome} veem esta conversa. A escola não vê.`,
            };
        })];
    }
    return [todos];
}

function formatarHora(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export default function Conversas({ pastaId }: { pastaId: string }) {
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [carregandoPasta, setCarregandoPasta] = useState(true);
    const [abaAtiva, setAbaAtiva] = useState(0);
    const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
    const [erroCanal, setErroCanal] = useState(false);
    const [tentativa, setTentativa] = useState(0); // "Tentar de novo" reabre o canal
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erroEnvio, setErroEnvio] = useState(false);
    const [enviada, setEnviada] = useState(false);
    const listaRef = useRef<HTMLOListElement>(null);
    const textoRef = useRef<HTMLTextAreaElement>(null);
    const abasRef = useRef<(HTMLButtonElement | null)[]>([]);
    const rolarParaOFim = useRef(true); // na abertura e depois de enviar
    // Mensagens são conteúdo: só voz que roda no aparelho (decisão travada 11)
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
    const abas = user && pasta && papel ? montarAbas(pasta, papel, user.uid) : [];
    // Se a aba atual sumir (ex.: o médico saiu da pasta), volta para a primeira
    const aba = abas[abaAtiva] ?? abas[0];
    const canal = aba?.canal;

    // Acompanha o canal da aba em tempo real; para de ouvir ao trocar de aba
    // ou sair da tela (economiza dados e bateria). Se o acesso for perdido
    // (ex.: a pessoa foi removida), o Firestore encerra e cai em aoFalhar
    useEffect(() => {
        if (!canal) return;
        setMensagens(null);
        setErroCanal(false);
        rolarParaOFim.current = true;
        // No erro (ex.: acesso perdido), as mensagens somem da tela
        return MensagemServices.ouvir(pastaId, canal, setMensagens, () => { setMensagens(null); setErroCanal(true); });
    }, [pastaId, canal, tentativa]);

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
        if (!user || !papel || !canal || enviando || !texto.trim()) return;
        setEnviando(true);
        setErroEnvio(false);
        setEnviada(false);
        const { success } = await MensagemServices.enviar(pastaId, canal, user, papel, texto.trim());
        setEnviando(false);
        if (success) {
            setTexto('');
            setEnviada(true);
            rolarParaOFim.current = true;
            textoRef.current?.focus(); // o foco volta para o campo, pronto para a próxima
        } else
            setErroEnvio(true);
    };

    // Setas trocam de aba; Home/End vão para a primeira/última (padrão de abas)
    const aoTeclarAba = (e: KeyboardEvent<HTMLButtonElement>, indice: number) => {
        const destinos: Record<string, number> = {
            ArrowRight: (indice + 1) % abas.length,
            ArrowLeft: (indice - 1 + abas.length) % abas.length,
            Home: 0,
            End: abas.length - 1,
        };
        if (!(e.key in destinos)) return;
        e.preventDefault();
        setAbaAtiva(destinos[e.key]);
        abasRef.current[destinos[e.key]]?.focus();
    };
    // ======================================================================
    if (carregandoSessao || carregandoPasta)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Abrindo as conversas...</p>
            </div>
        );

    if (!pasta || !papel || !aba)
        return (
            <div className="flex flex-col gap-4">
                <p role="alert" className="ff-default text-[16px]">Não foi possível abrir as conversas desta pasta. Ela pode não existir, ou você não faz parte dela.</p>
                <Link href="/admin/pastas" className={CLASSE_LINK_VOLTAR}>Voltar para as pastas</Link>
            </div>
        );

    return (
        <div className="flex flex-col gap-4 max-w-[720px]">
            <h2 className="font-bold text-[20px]">Conversas sobre {pasta.nomeAluno}</h2>
            <AppOuvir rotulo="Ouvir instruções" className="self-start"
                texto={`Aqui você conversa sobre o aluno. No alto, toque no nome da conversa para escolher com quem falar. A tela diz quem vê cada conversa.${vozLocal ? ' Para ouvir uma mensagem, toque em Ouvir, embaixo dela.' : ''} Para mandar uma mensagem, escreva no campo de baixo e toque em Enviar. Para falar em vez de digitar, toque no microfone do teclado.`} />
            {vozLocal === false && (
                <p role="status" className="ff-default text-[16px] text-gray-700">
                    {vozSuportada()
                        ? 'Este aparelho não tem uma voz em português que funcione sem internet. Por segurança, este conteúdo não é lido em voz alta aqui: seus dados não saem do aparelho. Para ouvir, instale a voz em português nas configurações do celular.'
                        : 'Este navegador não consegue ler em voz alta.'}
                </p>
            )}

            {papel === 'mae' && abas.length === 1 && (
                <p className="ff-default text-[16px]">
                    Ainda não há médico na pasta. A conversa só com o médico aparece quando ele entrar.
                </p>
            )}

            {/* ABAS */}
            {abas.length > 1 && (
                <div role="tablist" aria-label="Conversas" className="flex flex-wrap gap-2">
                    {abas.map((a, i) => (
                        <button key={a.canal} ref={(el) => { abasRef.current[i] = el; }}
                            id={`aba-${a.canal}`} type="button" role="tab"
                            aria-selected={i === abaAtiva} aria-controls="painel-conversa" tabIndex={i === abaAtiva ? 0 : -1}
                            onClick={() => setAbaAtiva(i)} onKeyDown={(e) => aoTeclarAba(e, i)}
                            className={`min-h-[48px] px-4 rounded-full border-2 ff-default text-[16px] cursor-pointer ${i === abaAtiva ? 'bg-(--cor-link) border-(--cor-link) text-white' : 'border-(--cor-link) text-(--cor-link) bg-white'}`}>
                            {a.titulo}
                        </button>
                    ))}
                </div>
            )}

            <div id="painel-conversa" role={abas.length > 1 ? 'tabpanel' : undefined}
                aria-labelledby={abas.length > 1 ? `aba-${aba.canal}` : undefined} className="flex flex-col gap-3">
                {/* QUEM VÊ esta conversa */}
                <p className="ff-default text-[16px] p-3 rounded-xl bg-white border border-gray-500">
                    <i className="ion-eye mr-2" aria-hidden="true" />{aba.quemVe}
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
                    depois de carregar e é recriado a cada aba (key), então o
                    leitor de tela anuncia só as mensagens NOVAS, não as 100 de uma vez.
                    tabIndex permite rolar a lista pelo teclado */}
                {mensagens && mensagens.length > 0 && <>
                    {mensagens.length >= LIMITE_MENSAGENS && (
                        <p className="ff-default text-[16px] text-gray-700">Mostrando as {LIMITE_MENSAGENS} mensagens mais recentes.</p>
                    )}
                    <ol key={canal} ref={listaRef} role="log" tabIndex={0} aria-label={`Mensagens: ${aba.titulo}`}
                        className="flex flex-col gap-2 min-h-[200px] max-h-[50dvh] overflow-y-auto p-2 rounded-xl bg-[#f5f5f5] border border-gray-500">
                        {mensagens.map((m) => {
                            const minha = m.autorUid === user?.uid;
                            return (
                                <li key={m.id} className={`max-w-[85%] rounded-xl p-3 ${minha ? 'self-end bg-[#E0F2FE] border border-[#0369A1]' : 'self-start bg-white border border-gray-500'}`}>
                                    {/* "Você" identifica a autoria sem depender de cor ou posição */}
                                    <p className="ff-default text-[16px] font-bold">
                                        {minha ? 'Você' : `${m.autorNome} (${ROLE_LABELS[m.autorPapel]})`}
                                        <span className="font-normal text-gray-700"> · <time dateTime={new Date(m.criadoEm).toISOString()}>{formatarHora(m.criadoEm)}</time></span>
                                    </p>
                                    <p className="ff-default text-[16px] leading-relaxed whitespace-pre-wrap break-words">{m.texto}</p>
                                    {/* Conteúdo: só com voz local no aparelho. Nas próprias
                                        mensagens não aparece (a pessoa acabou de escrever) */}
                                    {!minha && (
                                        <AppOuvir conteudo disponivel={vozLocal} className="mt-2"
                                            texto={`${m.autorNome} escreveu: ${m.texto}`}
                                            descricao={`mensagem de ${m.autorNome}`} />
                                    )}
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
                        className="w-full rounded-lg border border-(--cor-borda) bg-white p-3 ff-default text-[16px] text-(--cor-texto) placeholder:text-(--cor-borda) focus:border-(--cor-link) focus:ring-2 focus:ring-(--cor-link) focus:outline-none" />
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
