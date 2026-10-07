"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import RelatorioServices, { papelNaPasta } from "@/services/relatorio";
import { AppLoader } from "@/themes/components";
import { AppUser } from "@/types/user";
import { Pasta } from "@/types/pasta";
import { TIPO_LABELS, TipoRelatorio } from "@/types/relatorio";
import { rotuloSemana, semanaAtual } from "@/helpers/semana";

interface Resumo {
    pasta: Pasta;
    total: number;
    porTipo: Partial<Record<TipoRelatorio, number>>;
    erro: boolean;
}

/**
 * SÍNTESE DA SEMANA (design: "Síntese da Semana"): quantos relatórios novos
 * cada aluno teve nesta semana, por tipo.
 * Conta só o que a pessoa JÁ pode ler: a consulta é a mesma da lista de
 * relatórios, filtrada pelos tipos do papel (as regras garantem — a escola
 * nunca conta laudos nem relatos da família). Mensagens do chat não entram:
 * contar exigiria baixar todas as conversas (gasto de dados)
 */
export default function SinteseDaSemana({ user, pastas }: { user: AppUser; pastas: Pasta[] }) {
    const [resumos, setResumos] = useState<Resumo[] | null>(null);
    const semana = semanaAtual();
    const inicioMs = semana.inicio.getTime();
    const fimMs = semana.fim.getTime();

    useEffect(() => {
        let ativo = true;
        (async () => {
            const lista = await Promise.all(pastas.map(async (pasta): Promise<Resumo> => {
                const papel = papelNaPasta(user, pasta.donoUid);
                if (!papel) return { pasta, total: 0, porTipo: {}, erro: true };
                const { success, relatorios } = await RelatorioServices.listar(pasta.id, papel);
                const daSemana = relatorios.filter((r) => r.criadoEm >= inicioMs && r.criadoEm < fimMs);
                const porTipo: Partial<Record<TipoRelatorio, number>> = {};
                daSemana.forEach((r) => { porTipo[r.tipo] = (porTipo[r.tipo] ?? 0) + 1; });
                return { pasta, total: daSemana.length, porTipo, erro: !success };
            }));
            if (ativo) setResumos(lista);
        })();
        return () => { ativo = false; };
    }, [pastas, user, inicioMs, fimMs]);

    return (
        <section aria-labelledby="titulo-sintese" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="titulo-sintese" className="ff-default text-[24px] font-extrabold leading-tight text-(--cor-texto)">Síntese da semana</h2>
                <p className="ff-default text-[16px] text-(--cor-texto-suave)">{rotuloSemana(semana)}</p>
            </div>

            {/* Sem aluno: o cartão vazio do design */}
            {pastas.length === 0 && (
                <div className="flex flex-col gap-2 p-5 bg-white rounded-xl border border-gray-300 shadow-sm">
                    <p className="ff-default text-[18px] font-bold text-(--cor-texto)">Sem informações disponíveis</p>
                    <p className="ff-default text-[16px] text-(--cor-texto)">
                        {user.role === 'mae'
                            ? 'Cadastre o aluno para acompanhar os relatórios da semana.'
                            : 'Quando a família enviar o convite, os relatórios da semana aparecem aqui.'}
                    </p>
                    {user.role === 'mae' && (
                        <Link href="/admin/pastas/nova" className="self-start min-h-[48px] inline-flex items-center ff-default text-[18px] font-bold text-(--cor-link) underline">
                            Cadastrar aluno
                        </Link>
                    )}
                </div>
            )}

            {pastas.length > 0 && resumos === null && (
                <div role="status" className="flex items-center gap-3">
                    <AppLoader size={32} />
                    <p className="ff-default text-[16px]">Preparando a síntese...</p>
                </div>
            )}

            {resumos && resumos.length > 0 && (
                <ul className="flex flex-col gap-3">
                    {resumos.map(({ pasta, total, porTipo, erro }) => (
                        <li key={pasta.id} className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-gray-300 shadow-sm">
                            <h3 className="ff-default text-[18px] font-bold text-(--cor-texto)">{pasta.nomeAluno}</h3>
                            {erro ? (
                                <p className="ff-default text-[16px] text-[#B91C1C]">Erro: não deu para preparar a síntese deste aluno.</p>
                            ) : total === 0 ? (
                                <p className="ff-default text-[16px] text-(--cor-texto)">Nenhum relatório novo nesta semana.</p>
                            ) : (
                                <>
                                    <p className="ff-default text-[16px] text-(--cor-texto)">
                                        <strong>{total} {total === 1 ? 'relatório novo' : 'relatórios novos'}</strong> nesta semana:
                                    </p>
                                    <ul className="flex flex-col gap-1 pl-1">
                                        {(Object.keys(porTipo) as TipoRelatorio[]).map((t) => (
                                            <li key={t} className="ff-default text-[16px] text-(--cor-texto) flex items-center gap-2">
                                                <i className="ion-checkmark-circled text-(--cor-secundaria)" aria-hidden="true" />
                                                {porTipo[t]} — {TIPO_LABELS[t]}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <Link href={`/admin/pastas/${pasta.id}/relatorios`} className="self-start min-h-[48px] inline-flex items-center ff-default text-[16px] text-(--cor-link) underline">
                                Ver relatórios<span className="sr-only"> de {pasta.nomeAluno}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
