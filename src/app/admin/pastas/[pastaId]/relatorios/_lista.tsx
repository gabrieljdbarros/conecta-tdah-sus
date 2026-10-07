"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CategoriaServices from "@/services/categoria";
import PastaServices from "@/services/pasta";
import RelatorioServices, { papelNaPasta } from "@/services/relatorio";
import { AppButton, AppLoader, AppOuvir } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData } from "@/helpers/router";
import { Pasta } from "@/types/pasta";
import { Relatorio, TEXTO_ESCREVER, TIPO_LABELS, TipoRelatorio, TIPOS_QUE_ESCREVE, TIPOS_QUE_LE } from "@/types/relatorio";
import { ROLE_LABELS } from "@/types/user";
import { formatarData, ICONE_TIPO } from "./_comum";

const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';

/**
 * Relatórios da pasta (decisão travada 9 / RN06), em cartões como no design.
 * Cada pessoa vê só os tipos que o seu papel pode ler — as Security Rules
 * garantem isso. `tipo` (vindo do endereço, ex.: atalho "Orientações")
 * mostra só aquele tipo
 */
export default function ListaRelatorios({ pastaId, tipo }: { pastaId: string, tipo?: TipoRelatorio }) {
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
    const [nomesCategorias, setNomesCategorias] = useState<Record<string, string>>({});
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const sucessoRef = useRef<HTMLParagraphElement>(null);
    // Anúncio do resultado do filtro (região viva que já existe antes do texto)
    const [anuncio, setAnuncio] = useState('');

    // Mensagem deixada pela tela de escrever ("Relatório enviado")
    useEffect(() => {
        const flash = getFlashData();
        if (flash) setSucesso(flash);
    }, []);

    const carregar = useCallback(async () => {
        if (!user) return;
        setCarregando(true);
        const resPasta = await PastaServices.buscar(pastaId);
        const papel = resPasta.pasta ? papelNaPasta(user, resPasta.pasta.donoUid) : null;
        if (!resPasta.pasta || !papel) {
            setPasta(null);
            setErro(true);
            setCarregando(false);
            return;
        }
        const [lista, cats] = await Promise.all([RelatorioServices.listar(pastaId, papel), CategoriaServices.listar()]);
        setPasta(resPasta.pasta);
        setRelatorios(lista.relatorios);
        // Inclui as desativadas: relatórios antigos continuam mostrando o nome
        setNomesCategorias(Object.fromEntries(cats.categorias.map((c) => [c.id, c.nome])));
        setErro(!lista.success);
        setCarregando(false);
    }, [pastaId, user]);

    useEffect(() => {
        if (carregandoSessao) return;
        if (!user) { setCarregando(false); return; }
        carregar();
    }, [carregandoSessao, user, carregar]);

    // A mensagem de sucesso chega junto com a página: levar o foco garante a leitura
    useEffect(() => {
        if (sucesso && !carregando) sucessoRef.current?.focus();
    }, [sucesso, carregando]);

    // Tipo pedido no endereço, aceito só se o papel pode ler (senão: todos)
    const papelAtual = pasta && user ? papelNaPasta(user, pasta.donoUid) : null;
    const filtro = tipo && papelAtual && TIPOS_QUE_LE[papelAtual].includes(tipo) ? tipo : undefined;
    const quantos = (filtro ? relatorios.filter((r) => r.tipo === filtro) : relatorios).length;
    useEffect(() => {
        if (carregando || erro) return;
        const nome = filtro ? TIPO_LABELS[filtro].toLowerCase() : 'relatórios';
        setAnuncio(quantos === 0 ? `Nenhum resultado: ${nome}.` : `Mostrando ${quantos}: ${nome}.`);
    }, [carregando, erro, filtro, quantos]);
    // ======================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando os relatórios...</p>
            </div>
        );

    const papel = papelAtual;
    if (!pasta || !papel)
        return (
            <div className="flex flex-col items-start gap-3">
                <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não foi possível abrir os relatórios desta pasta. Ela pode não existir, ou você não faz parte dela.</p>
                <AppButton title="Tentar de novo" icon="refresh" onClick={carregar} />
            </div>
        );

    const tiposQueLe = TIPOS_QUE_LE[papel];
    const podeEscrever = TIPOS_QUE_ESCREVE[papel].length > 0;
    const visiveis = filtro ? relatorios.filter((r) => r.tipo === filtro) : relatorios;
    const base = `/admin/pastas/${pastaId}/relatorios`;

    return (
        <div className="flex flex-col gap-4 max-w-[640px]">
            <div>
                <h2 className="ff-default text-[24px] font-extrabold leading-tight text-(--cor-texto)">
                    {filtro === 'orientacao_medica' ? 'Todas as orientações' : 'Relatórios do aluno'}
                </h2>
                <p className="ff-default text-[16px] text-(--cor-texto-suave)">Pasta de <strong className="text-(--cor-texto)">{pasta.nomeAluno}</strong></p>
            </div>

            {podeEscrever && (
                <div className="flex flex-col gap-2">
                    <p className="ff-default text-[16px] text-(--cor-texto)">{TEXTO_ESCREVER[papel]}</p>
                    <AppButton title="Escrever relatório" icon="compose" href={`${base}/novo`} className="self-start" />
                </div>
            )}

            <AppOuvir rotulo="Ouvir instruções" className="self-start"
                texto={`Aqui ficam os relatórios do aluno, do mais novo para o mais antigo. Para escolher que tipo de relatório ver, toque nos botões de filtro. Para ler um relatório inteiro, toque nele.${podeEscrever ? ' Para escrever um relatório novo, toque em Escrever relatório.' : ''}`} />

            <p ref={sucessoRef} tabIndex={-1} role="status" className={`${COR_SUCESSO} ff-default text-[16px] empty:hidden`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>

            {/* Transparência: a escola sabe que não vê tudo */}
            {papel === 'escola' && (
                <p className="ff-default text-[16px] text-(--cor-texto)">
                    Você vê as orientações médicas e as avaliações escolares. Laudos e relatos da família ficam só entre a família e o médico.
                </p>
            )}

            {/* FILTRO: links (o endereço guarda a escolha; o atalho "Orientações" usa o mesmo) */}
            <nav aria-label="Filtrar relatórios por tipo">
                <ul className="flex flex-wrap gap-2">
                    {[undefined, ...tiposQueLe].map((t) => {
                        const ativo = t === filtro;
                        return (
                            <li key={t ?? 'todos'}>
                                <Link href={t ? `${base}?tipo=${t}` : base} aria-current={ativo ? 'page' : undefined} scroll={false}
                                    className={`min-h-[48px] px-4 inline-flex items-center rounded-full border-2 ff-default text-[16px] ${ativo ? 'bg-(--cor-link) border-(--cor-link) text-white font-bold' : 'bg-white border-(--cor-link) text-(--cor-link)'}`}>
                                    {t ? TIPO_LABELS[t] : 'Todos'}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {filtro && <p className="ff-default text-[16px] text-(--cor-texto-suave)">Mostrando só: {TIPO_LABELS[filtro]}</p>}
            {/* O leitor de tela ouve o resultado ao trocar o filtro (o foco fica no botão) */}
            <p role="status" className="sr-only">{anuncio}</p>

            {erro && (
                <div className="flex flex-col items-start gap-3">
                    <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não deu para carregar os relatórios. Toque em &quot;Tentar de novo&quot;.</p>
                    <AppButton title="Tentar de novo" icon="refresh" onClick={carregar} />
                </div>
            )}

            {!erro && visiveis.length === 0 && (
                <p className="ff-default text-[16px]">
                    {filtro ? `Ainda não há ${TIPO_LABELS[filtro].toLowerCase()} nesta pasta.` : 'Ainda não há relatórios nesta pasta.'}
                </p>
            )}

            {visiveis.length > 0 && (
                <ul className="flex flex-col gap-3" aria-label="Relatórios">
                    {visiveis.map((r) => (
                        <li key={r.id}>
                            {/* O cartão inteiro abre o relatório. Nome do link: tipo e data;
                                descrição: autor e assunto. O começo do texto não é lido (o
                                relatório inteiro está no detalhe) */}
                            <Link href={`${base}/${r.id}`}
                                aria-labelledby={`rel-${r.id}-tipo rel-${r.id}-data`} aria-describedby={`rel-${r.id}-autor`}
                                className="flex gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm ff-default">
                                <i className={`${ICONE_TIPO[r.tipo]} text-[24px] text-(--cor-link) mt-1`} aria-hidden="true" />
                                <span className="flex flex-col gap-1 flex-1 min-w-0">
                                    <span id={`rel-${r.id}-tipo`} className="text-[18px] font-bold text-(--cor-texto)">{TIPO_LABELS[r.tipo]}</span>
                                    <span id={`rel-${r.id}-data`} className="text-[16px] text-(--cor-texto-suave)">
                                        <time dateTime={new Date(r.criadoEm).toISOString()}>{formatarData(r.criadoEm)}</time>
                                    </span>
                                    <span id={`rel-${r.id}-autor`} className="text-[16px] text-(--cor-texto)">
                                        {r.autorNome} ({ROLE_LABELS[r.autorPapel]}) · Assunto: {nomesCategorias[r.categoriaId] ?? 'não encontrado'}
                                    </span>
                                    {/* Começo do texto; o relatório inteiro fica na tela de detalhe */}
                                    <span aria-hidden="true" className="text-[16px] text-(--cor-texto) line-clamp-2 break-words">{r.texto}</span>
                                </span>
                                <i className="ion-chevron-right text-[20px] text-(--cor-texto-suave) self-center" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
