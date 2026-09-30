"use client";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PastaServices from "@/services/pasta";
import MensagemServices from "@/services/mensagem";
import { papelNaPasta } from "@/services/relatorio";
import { AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { Pasta } from "@/types/pasta";
import { PapelNaPasta } from "@/types/relatorio";
import { CANAL_GRUPO, canalPrivado, MAX_TEXTO_MENSAGEM, Mensagem } from "@/types/mensagem";
import { ROLE_LABELS } from "@/types/user";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const CLASSE_LINK_VOLTAR = "self-start min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--primary-color) text-(--primary-color) ff-default text-[16px]";

interface Aba {
    canal: string;
    titulo: string;
    quemVe: string;
}

/**
 * Abas por papel (decisão travada 10):
 *  - mãe: Grupo + um privado com cada médico da pasta
 *  - médico: Grupo + o privado dele com a família
 *  - escola: só o Grupo
 */
function montarAbas(pasta: Pasta, papel: PapelNaPasta, uid: string): Aba[] {
    const grupo: Aba = { canal: CANAL_GRUPO, titulo: 'Grupo', quemVe: 'Todos que acompanham o aluno veem estas mensagens (família, escola e médicos).' };
    if (papel === 'medico')
        return [grupo, { canal: canalPrivado(uid), titulo: 'Privado com a família', quemVe: 'Só você e a família veem estas mensagens. A escola não vê.' }];
    if (papel === 'mae') {
        // TODO: mostrar também o histórico privado de médicos que saíram da pasta
        const medicos = Object.entries(pasta.participantes).filter(([, p]) => p.papel === 'medico');
        return [grupo, ...medicos.map(([medicoUid, p]) => ({
            canal: canalPrivado(medicoUid),
            titulo: `Privado: ${p.nome}`,
            quemVe: `Só você e ${p.nome} veem estas mensagens. A escola não vê.`,
        }))];
    }
    return [grupo];
}

function formatarHora(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export default function Conversas({ pastaId }: { pastaId: string }) {
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [carregandoPasta, setCarregandoPasta] = useState(true);
    const [abaAtiva, setAbaAtiva] = useState(0);
    const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
    const [erroCanal, setErroCanal] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erroEnvio, setErroEnvio] = useState(false);
    const listaRef = useRef<HTMLDivElement>(null);
    const abasRef = useRef<(HTMLButtonElement | null)[]>([]);

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
    const aba = abas[abaAtiva];
    const canal = aba?.canal;

    // Acompanha o canal da aba em tempo real; para de ouvir ao trocar de aba
    // ou sair da tela (economiza dados e bateria)
    useEffect(() => {
        if (!canal) return;
        setMensagens(null);
        setErroCanal(false);
        return MensagemServices.ouvir(pastaId, canal, setMensagens, () => setErroCanal(true));
    }, [pastaId, canal]);

    // Mostra sempre a mensagem mais nova (rola a lista até o fim)
    useEffect(() => {
        if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }, [mensagens]);
    // ======================================================================
    const enviar = async (e?: FormEvent) => {
        e?.preventDefault();
        if (!user || !papel || !canal || enviando || !texto.trim()) return;
        setEnviando(true);
        setErroEnvio(false);
        const { success } = await MensagemServices.enviar(pastaId, canal, user, papel, texto.trim());
        setEnviando(false);
        if (success) setTexto('');
        else setErroEnvio(true);
    };

    // Enter envia; Shift+Enter quebra a linha
    const aoTeclarTexto = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviar();
        }
    };

    // Setas esquerda/direita trocam de aba (padrão de abas acessíveis)
    const aoTeclarAba = (e: KeyboardEvent<HTMLButtonElement>, indice: number) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const proxima = (indice + (e.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length;
        setAbaAtiva(proxima);
        abasRef.current[proxima]?.focus();
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
            <p className="ff-default text-[16px]">Conversas sobre <strong>{pasta.nomeAluno}</strong>.</p>

            {/* ABAS */}
            {abas.length > 1 && (
                <div role="tablist" aria-label="Conversas" className="flex flex-wrap gap-2">
                    {abas.map((a, i) => (
                        <button key={a.canal} ref={(el) => { abasRef.current[i] = el; }}
                            id={`aba-${a.canal}`} type="button" role="tab"
                            aria-selected={i === abaAtiva} aria-controls="painel-conversa" tabIndex={i === abaAtiva ? 0 : -1}
                            onClick={() => setAbaAtiva(i)} onKeyDown={(e) => aoTeclarAba(e, i)}
                            className={`min-h-[48px] px-4 rounded-full border-2 ff-default text-[16px] cursor-pointer ${i === abaAtiva ? 'bg-(--primary-color) border-(--primary-color) text-white' : 'border-(--primary-color) text-(--primary-color) bg-white'}`}>
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

                {/* MENSAGENS — role="log": o leitor de tela anuncia as novas */}
                <div ref={listaRef} role="log" aria-live="polite" aria-label={`Mensagens: ${aba.titulo}`}
                    className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto p-2 rounded-xl bg-[#f5f5f5] border border-gray-300">
                    {mensagens === null && !erroCanal && <p className="ff-default text-[16px] p-2">Carregando as mensagens...</p>}
                    {erroCanal && <p className={`${COR_ERRO} ff-default text-[16px] p-2`}>Erro: não deu para carregar as mensagens. Volte para a pasta e abra de novo.</p>}
                    {mensagens?.length === 0 && <p className="ff-default text-[16px] p-2">Ainda não há mensagens. Escreva a primeira!</p>}
                    {mensagens?.map((m) => {
                        const minha = m.autorUid === user?.uid;
                        return (
                            <div key={m.id} className={`max-w-[85%] rounded-xl p-3 ${minha ? 'self-end bg-[#E0F2FE] border border-[#0369A1]' : 'self-start bg-white border border-gray-300'}`}>
                                <p className="ff-default text-[14px] font-bold">
                                    {minha ? 'Você' : `${m.autorNome} (${ROLE_LABELS[m.autorPapel]})`}
                                    <span className="font-normal text-gray-700"> · {formatarHora(m.criadoEm)}</span>
                                </p>
                                <p className="ff-default text-[16px] leading-relaxed whitespace-pre-wrap break-words">{m.texto}</p>
                            </div>
                        );
                    })}
                </div>

                {/* ENVIAR */}
                <form onSubmit={enviar} className="flex flex-col gap-2">
                    <label htmlFor="texto-mensagem" className="ff-default text-[16px] font-bold">Escreva sua mensagem:</label>
                    <p id="aviso-mensagem" className="ff-default text-[16px] text-gray-700">
                        As mensagens não podem ser apagadas nem editadas depois de enviadas. Enter envia; Shift+Enter pula linha.
                    </p>
                    <textarea id="texto-mensagem" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={aoTeclarTexto}
                        rows={3} maxLength={MAX_TEXTO_MENSAGEM} aria-describedby="aviso-mensagem"
                        className="w-full rounded-xl border-2 border-gray-600 bg-white p-3 ff-default text-[16px] focus:border-(--primary-color) focus:outline-none" />
                    {erroEnvio && <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: a mensagem não foi enviada. Tente de novo.</p>}
                    <button type="submit" disabled={enviando || !texto.trim()}
                        className="self-end min-h-[48px] px-6 rounded-full bg-(--primary-color) text-white ff-default text-[16px] cursor-pointer disabled:opacity-50">
                        <i className="ion-paper-airplane mr-2" aria-hidden="true" />
                        {enviando ? 'Enviando...' : 'Enviar'}
                    </button>
                </form>
            </div>

            <Link href={`/admin/pastas/${pastaId}`} className={CLASSE_LINK_VOLTAR}>Voltar para a pasta</Link>
        </div>
    );
}
