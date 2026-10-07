"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import RelatorioServices, { papelNaPasta } from "@/services/relatorio";
import { AppLoader } from "@/themes/components";
import { AppUser } from "@/types/user";
import { Pasta } from "@/types/pasta";
import { TIPO_LABELS, TipoRelatorio } from "@/types/relatorio";
import { rotuloSemana, semanaAtual } from "@/helpers/semana";

const COR_ERRO = 'text-[#B91C1C]';

// Ordem fixa dos tipos na lista (não a ordem em que os relatórios chegam)
const ORDEM_TIPOS: TipoRelatorio[] = ['orientacao_medica', 'laudo', 'avaliacao_escolar', 'relato_familia'];

interface Resumo {
    pasta: Pasta;
    total: number;
    porTipo: Partial<Record<TipoRelatorio, number>>;
    erro: boolean;
}

/**
 * RESUMO DA SEMANA (design: "Síntese da Semana", com palavra mais simples):
 * quantos relatórios cada aluno teve nesta semana, por tipo.
 * Conta só o que a pessoa JÁ pode ler: a consulta é a mesma da lista de
 * relatórios, filtrada pelos tipos do papel (as regras garantem — a escola
 * nunca conta laudos nem relatos da família). Mensagens do chat não entram:
 * contar exigiria baixar todas as conversas (gasto de dados).
 * TODO (se pesar): contar no servidor só a semana (getCountFromServer com
 * filtro de data), o que exige índice composto tipo + criadoEm
 */
export default function SinteseDaSemana({ user, pastas }: { user: AppUser; pastas: Pasta[] }) {
    const [resumos, setResumos] = useState<Resumo[] | null>(null);
    const [aviso, setAviso] = useState('');
    const semana = semanaAtual();
    const inicioMs = semana.inicio.getTime();
    const fimMs = semana.fim.getTime();
    // Chaves estáveis: só refaz as leituras se mudar a pessoa ou as pastas
    const chavePastas = pastas.map((p) => p.id).join(',');
    const { uid, role } = user;

    useEffect(() => {
        if (!chavePastas) return;
        let ativo = true;
        setResumos(null);
        setAviso('Preparando o resumo da semana...');
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
            if (!ativo) return;
            setResumos(lista);
            setAviso('Resumo da semana pronto.');
        })();
        return () => { ativo = false; };
        // `pastas` entra pela chave estável (ids), para não refazer as leituras à toa
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chavePastas, uid, role, inicioMs, fimMs]);

    return (
        <section aria-labelledby="titulo-sintese" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="titulo-sintese" className="ff-default text-[24px] font-extrabold leading-tight text-(--cor-texto)">Resumo da semana</h2>
                <p className="ff-default text-[16px] text-(--cor-texto-suave)">Semana de {rotuloSemana(semana)}</p>
            </div>

            {/* Sempre montado: o leitor de tela anuncia quando o texto muda */}
            <p role="status" className="sr-only">{aviso}</p>

            {/* Sem aluno: o cartão vazio do design (a ação de criar já está no cartão de cima) */}
            {pastas.length === 0 && (
                <div className="flex flex-col gap-2 p-5 bg-white rounded-xl border border-gray-300 shadow-sm">
                    <p className="ff-default text-[18px] font-bold text-(--cor-texto)">Sem informações disponíveis</p>
                    <p className="ff-default text-[16px] text-(--cor-texto)">
                        {user.role === 'mae'
                            ? 'Depois de criar a pasta do aluno, os relatórios da semana aparecem aqui.'
                            : 'Quando a família enviar o convite, os relatórios da semana aparecem aqui.'}
                    </p>
                </div>
            )}

            {pastas.length > 0 && resumos === null && (
                <div aria-hidden="true" className="flex items-center gap-3">
                    <AppLoader size={32} />
                    <p className="ff-default text-[16px]">Preparando o resumo...</p>
                </div>
            )}

            {resumos && resumos.length > 0 && (
                <ul className="flex flex-col gap-3">
                    {resumos.map(({ pasta, total, porTipo, erro }) => (
                        <li key={pasta.id} className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-gray-300 shadow-sm">
                            <h3 className="ff-default text-[18px] font-bold text-(--cor-texto)">{pasta.nomeAluno}</h3>
                            {erro ? (
                                <p role="alert" className={`ff-default text-[16px] ${COR_ERRO}`}>
                                    Erro: não deu para preparar o resumo deste aluno. Toque em Ver relatórios para ver por lá.
                                </p>
                            ) : total === 0 ? (
                                <p className="ff-default text-[16px] text-(--cor-texto)">Nenhum relatório nesta semana.</p>
                            ) : (
                                <>
                                    <p className="ff-default text-[16px] text-(--cor-texto)">
                                        <strong>{total} {total === 1 ? 'relatório' : 'relatórios'}</strong> nesta semana:
                                    </p>
                                    <ul className="flex flex-col gap-1 list-disc pl-6">
                                        {ORDEM_TIPOS.filter((t) => porTipo[t]).map((t) => (
                                            <li key={t} className="ff-default text-[16px] text-(--cor-texto)">
                                                {TIPO_LABELS[t]}: {porTipo[t]}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <Link href={`/admin/pastas/${pasta.id}/relatorios`} className="self-start min-h-[48px] inline-flex items-center ff-default text-[16px] text-(--cor-link) underline">
                                <span>Ver relatórios <span className="sr-only">de {pasta.nomeAluno}</span></span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
