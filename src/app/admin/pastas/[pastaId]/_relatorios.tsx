"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import CategoriaServices from "@/services/categoria";
import RelatorioServices, { papelNaPasta } from "@/services/relatorio";
import { AppButton, AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { Pasta } from "@/types/pasta";
import { Relatorio, TIPO_LABELS, TIPOS_QUE_ESCREVE } from "@/types/relatorio";
import { ROLE_LABELS } from "@/types/user";

const COR_ERRO = 'text-[#B91C1C]';

const ICONE_TIPO: Record<Relatorio['tipo'], string> = {
    orientacao_medica: 'ion-medkit',
    laudo: 'ion-clipboard',
    avaliacao_escolar: 'ion-university',
    relato_familia: 'ion-home',
};

// Por extenso ("30 de setembro de 2026 às 14:05"): o leitor de tela lê
// melhor do que "30/09/2026"
function formatarData(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

/**
 * Relatórios da pasta (decisão travada 9 / RN06). Cada pessoa vê só os
 * tipos que o seu papel pode ler — as Security Rules garantem isso
 */
export default function SecaoRelatorios({ pasta }: { pasta: Pasta }) {
    const { user } = useAuth();
    const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
    const [nomesCategorias, setNomesCategorias] = useState<Record<string, string>>({});
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const tituloRef = useRef<HTMLHeadingElement>(null);

    const papel = user ? papelNaPasta(user, pasta.donoUid) : null;
    const podeEscrever = !!papel && TIPOS_QUE_ESCREVE[papel].length > 0;

    const carregar = useCallback(async () => {
        if (!papel) return;
        setCarregando(true);
        const [lista, cats] = await Promise.all([RelatorioServices.listar(pasta.id, papel), CategoriaServices.listar()]);
        setRelatorios(lista.relatorios);
        // Inclui as desativadas: relatórios antigos continuam mostrando o nome
        setNomesCategorias(Object.fromEntries(cats.categorias.map((c) => [c.id, c.nome])));
        setErro(!lista.success);
        setCarregando(false);
    }, [pasta.id, papel]);

    useEffect(() => { carregar(); }, [carregar]);

    // Depois de "Tentar de novo" o botão some: o foco vai para o título da seção
    const tentarDeNovo = async () => {
        await carregar();
        tituloRef.current?.focus();
    };

    if (!papel) return null;

    return (
        <section aria-labelledby="titulo-relatorios">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
                <h3 id="titulo-relatorios" ref={tituloRef} tabIndex={-1} className="font-bold text-[18px]">Relatórios</h3>
                {podeEscrever && <AppButton title="Escrever relatório" icon="compose" href={`/admin/pastas/${pasta.id}/relatorios/novo`} form="round" />}
            </div>

            {/* Transparência: a escola sabe que não vê tudo */}
            {papel === 'escola' && (
                <p className="ff-default text-[16px] mb-3">
                    Você vê as orientações médicas e as avaliações escolares. Laudos e relatos da família ficam só entre a família e o médico.
                </p>
            )}

            {carregando && (
                <div role="status" className="flex flex-col items-center gap-3">
                    <AppLoader size={40} className="self-center" />
                    <p className="ff-default text-[16px]">Carregando os relatórios...</p>
                </div>
            )}

            {!carregando && erro && (
                <div className="flex flex-col items-start gap-3">
                    <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não deu para carregar os relatórios. Toque em &quot;Tentar de novo&quot;.</p>
                    <AppButton title="Tentar de novo" icon="refresh" onClick={tentarDeNovo} form="round" />
                </div>
            )}

            {!carregando && !erro && relatorios.length === 0 && (
                <p className="ff-default text-[16px]">Ainda não há relatórios nesta pasta.</p>
            )}

            {!carregando && relatorios.length > 0 && (
                <ul className="flex flex-col gap-3">
                    {relatorios.map((r) => (
                        <li key={r.id}>
                            <article aria-labelledby={`rel-${r.id}`} className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col gap-2">
                                {/* Título só com o tipo; o assunto vem rotulado logo abaixo */}
                                <h4 id={`rel-${r.id}`} className="ff-default text-[16px] font-bold flex items-center gap-2">
                                    <i className={`${ICONE_TIPO[r.tipo]} text-[20px] text-gray-700`} aria-hidden="true" />
                                    {TIPO_LABELS[r.tipo]}
                                </h4>
                                <p className="ff-default text-[16px]">
                                    <span className="font-bold">Assunto:</span> {nomesCategorias[r.categoriaId] ?? 'não encontrado'}
                                </p>
                                <p className="ff-default text-[16px] text-gray-700">
                                    Escrito por {r.autorNome} ({ROLE_LABELS[r.autorPapel]}) em{' '}
                                    <time dateTime={new Date(r.criadoEm).toISOString()}>{formatarData(r.criadoEm)}</time>
                                </p>
                                {/* TODO: "Ler mais" para relatórios muito longos */}
                                <p className="ff-default text-[16px] leading-relaxed max-w-prose whitespace-pre-wrap break-words">{r.texto}</p>
                            </article>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
