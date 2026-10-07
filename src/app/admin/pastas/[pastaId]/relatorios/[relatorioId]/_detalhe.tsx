"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CategoriaServices from "@/services/categoria";
import PastaServices from "@/services/pasta";
import RelatorioServices from "@/services/relatorio";
import { AppButton, AppLoader, AppOuvir, useVozDisponivel } from "@/themes/components";
import { vozSuportada } from "@/helpers/voz";
import { useAuth } from "@/contexts/AuthContext";
import { Pasta } from "@/types/pasta";
import { QUEM_VE, Relatorio, TIPO_LABELS, TIPOS_QUE_LE } from "@/types/relatorio";
import { ROLE_LABELS } from "@/types/user";
import { formatarData, ICONE_TIPO } from "../_comum";

const COR_ERRO = 'text-[#B91C1C]';
const ORDEM_PAPEL = { mae: 0, escola: 1, medico: 2 } as const;

/**
 * Um relatório inteiro, com "Ouvir relatório" e "Quem vê este relatório"
 * (design: "Rede que vê este registro"). A leitura é protegida pelas regras
 * pelo TIPO do relatório (RN06): se o papel não pode ler, ele não abre
 */
export default function DetalheRelatorio({ pastaId, relatorioId }: { pastaId: string, relatorioId: string }) {
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
    const [assunto, setAssunto] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(true);
    // Relatório é conteúdo de saúde: só voz que roda no aparelho (decisão travada 11)
    const vozLocal = useVozDisponivel(true);

    const carregar = useCallback(async () => {
        setCarregando(true);
        const [resPasta, resRel] = await Promise.all([PastaServices.buscar(pastaId), RelatorioServices.buscar(pastaId, relatorioId)]);
        setPasta(resPasta.pasta ?? null);
        setRelatorio(resRel.relatorio ?? null);
        if (resRel.relatorio) {
            const cat = await CategoriaServices.buscar(resRel.relatorio.categoriaId);
            setAssunto(cat.categoria?.nome ?? null);
        }
        setCarregando(false);
    }, [pastaId, relatorioId]);

    useEffect(() => {
        if (carregandoSessao) return;
        if (!user) { setCarregando(false); return; }
        carregar();
    }, [carregandoSessao, user, carregar]);
    // ======================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Abrindo o relatório...</p>
            </div>
        );

    // Não existe, ou o papel não pode ler este tipo (as regras recusaram)
    if (!pasta || !relatorio)
        return (
            <div className="flex flex-col items-start gap-3">
                <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não foi possível abrir este relatório. Ele pode não existir, ou você não tem acesso a ele.</p>
                <AppButton title="Tentar de novo" icon="refresh" onClick={carregar} />
                <Link href={`/admin/pastas/${pastaId}/relatorios`} className="min-h-[48px] inline-flex items-center ff-default text-[16px] text-(--cor-link) underline">Voltar para os relatórios</Link>
            </div>
        );

    // Quem da pasta pode ler este TIPO de relatório (mesma matriz das regras)
    const quemVe = Object.entries(pasta.participantes)
        .filter(([, p]) => TIPOS_QUE_LE[p.papel].includes(relatorio.tipo))
        .sort(([, a], [, b]) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel]);
    const data = formatarData(relatorio.criadoEm);

    return (
        <article aria-labelledby="titulo-relatorio" className="flex flex-col gap-4 max-w-[640px]">
            {/* CABEÇALHO: tipo, data, autor */}
            <header className="border-b-2 border-(--cor-destaque) pb-3 flex flex-col gap-1">
                <h2 id="titulo-relatorio" className="ff-default text-[26px] font-extrabold leading-tight text-(--cor-texto) flex items-center gap-2">
                    <i className={`${ICONE_TIPO[relatorio.tipo]} text-(--cor-link)`} aria-hidden="true" />
                    {TIPO_LABELS[relatorio.tipo]}
                </h2>
                <p className="ff-default text-[16px] text-(--cor-texto-suave)">
                    <time dateTime={new Date(relatorio.criadoEm).toISOString()}>{data}</time>
                </p>
                <p className="ff-default text-[16px] text-(--cor-texto)">
                    Escrito por <strong>{relatorio.autorNome}</strong> ({ROLE_LABELS[relatorio.autorPapel]})
                </p>
                <p className="ff-default text-[16px] text-(--cor-texto)">
                    <strong>Assunto:</strong> {assunto ?? 'não encontrado'}
                </p>
            </header>

            {/* OUVIR: só com voz que roda no aparelho */}
            {/* Espaço reservado enquanto verifica a voz: o texto abaixo não "pula" */}
            <div className={vozLocal === null ? 'min-h-[48px]' : ''}>
                <AppOuvir conteudo disponivel={vozLocal} rotulo="Ouvir relatório"
                    texto={`${TIPO_LABELS[relatorio.tipo]}.${assunto ? ` Assunto: ${assunto}.` : ''} Escrito por ${relatorio.autorNome}, em ${data}. ${relatorio.texto}`} />
                {vozLocal === false && (
                    <p className="ff-default text-[16px] text-(--cor-texto-suave)">
                        {vozSuportada()
                            ? 'Este aparelho não lê relatórios em voz alta. Isso protege os dados da criança. Para ouvir, instale a voz em português nas configurações do celular.'
                            : 'Este navegador não consegue ler em voz alta.'}
                    </p>
                )}
            </div>

            {/* TEXTO */}
            <p className="ff-default text-[18px] leading-relaxed text-(--cor-texto) whitespace-pre-wrap break-words">{relatorio.texto}</p>

            <p className="ff-default text-[16px] text-(--cor-texto-suave)">
                Este relatório não pode ser alterado nem apagado. Para corrigir alguma coisa, escreva um relatório novo.
            </p>

            {/* QUEM VÊ (RN06): transparência sobre o acesso, pelo tipo */}
            <section aria-labelledby="titulo-quem-ve" className="flex flex-col gap-2 mt-2">
                <h3 id="titulo-quem-ve" className="ff-default text-[20px] font-bold text-(--cor-texto)">Quem vê este relatório</h3>
                <p className="ff-default text-[16px] text-(--cor-texto)">
                    Só as pessoas desta pasta que podem ver {TIPO_LABELS[relatorio.tipo].toLowerCase()}: {QUEM_VE[relatorio.tipo]}
                </p>
                {quemVe.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {quemVe.map(([uid, p]) => (
                            <li key={uid} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-gray-200">
                                <span className="ff-default text-[16px] font-bold text-(--cor-texto)">
                                    {uid === user?.uid ? `${p.nome} (você)` : p.nome}
                                    <span className="sr-only">, </span>
                                </span>
                                <span className="ff-default text-[16px] text-(--cor-secundaria) bg-[#E6F4F3] rounded-full px-3 py-1">
                                    {uid === pasta.donoUid ? 'Responsável pela pasta' : ROLE_LABELS[p.papel]}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </article>
    );
}
