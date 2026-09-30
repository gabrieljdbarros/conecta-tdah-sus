"use client";
import { useCallback, useEffect, useState } from "react";
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

function formatarData(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

    if (!papel) return null;

    return (
        <section aria-labelledby="titulo-relatorios">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
                <h3 id="titulo-relatorios" className="font-bold text-[18px]">Relatórios</h3>
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
                    <AppButton title="Tentar de novo" icon="refresh" onClick={carregar} form="round" />
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
                                <h4 id={`rel-${r.id}`} className="ff-default text-[16px] font-bold flex items-center gap-2">
                                    <i className={`${ICONE_TIPO[r.tipo]} text-[20px] text-gray-700`} aria-hidden="true" />
                                    {TIPO_LABELS[r.tipo]}
                                    <span className="font-normal text-gray-700">— {nomesCategorias[r.categoriaId] ?? 'Assunto não encontrado'}</span>
                                </h4>
                                <p className="ff-default text-[14px] text-gray-700">
                                    Escrito por {r.autorNome} ({ROLE_LABELS[r.autorPapel]}) em {formatarData(r.criadoEm)}
                                </p>
                                <p className="ff-default text-[16px] whitespace-pre-wrap break-words">{r.texto}</p>
                            </article>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
