"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppButton, AppLoader, AppMainContainer, AppOuvir } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import PastaServices from "@/services/pasta";
import { Pasta } from "@/types/pasta";
import { CartaoCriarPasta, ListaPastas } from "../pastas/_cartao";

const COR_ERRO = 'text-[#B91C1C]';

// "Quarta-feira, 7 de outubro"
function dataDeHoje(): string {
    const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Início: saudação, data e os alunos da pessoa (ou os atalhos do admin) */
export default function InicioPage() {
    const { user, loading: carregandoSessao } = useAuth();
    const [pastas, setPastas] = useState<Pasta[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    // A data é calculada no aparelho (fuso de quem usa), depois de abrir a tela
    const [hoje, setHoje] = useState<string | undefined>();
    useEffect(() => setHoje(dataDeHoje()), []);

    const carregar = useCallback(async () => {
        setCarregando(true);
        const { success, pastas } = await PastaServices.minhas();
        setPastas(pastas);
        setErro(!success);
        setCarregando(false);
    }, []);

    useEffect(() => {
        if (carregandoSessao) return;
        // Admin não acessa as pastas (LGPD)
        if (!user || user.role === 'admin') {
            setCarregando(false);
            return;
        }
        carregar();
    }, [carregandoSessao, user, carregar]);

    const primeiroNome = user?.nome?.trim().split(/\s+/)[0];
    const titulo = primeiroNome ? `Olá, ${primeiroNome}` : 'Início';
    const ehMae = user?.role === 'mae';

    return (
        <AppMainContainer title={titulo} subtitulo={hoje} destaque>
            {(carregandoSessao || carregando) && (
                <div role="status" className="flex flex-col items-center gap-3">
                    <AppLoader size={50} className="self-center" />
                    <p className="ff-default text-[16px]">Carregando...</p>
                </div>
            )}

            {/* ADMIN: gestão do sistema */}
            {!carregandoSessao && user?.role === 'admin' && (
                <div className="flex flex-col gap-3 max-w-[640px]">
                    <p className="ff-default text-[18px] text-(--cor-texto)">O que você quer fazer?</p>
                    <Link href="/admin/usuarios" className="flex items-center gap-4 min-h-[72px] p-4 bg-white rounded-xl border border-gray-300 shadow-sm ff-default text-[18px] font-bold text-(--cor-texto)">
                        <i className="ion-ios-people text-[28px] text-(--cor-link)" aria-hidden="true" />Gerenciar usuários
                    </Link>
                </div>
            )}

            {/* MÃE, ESCOLA, MÉDICO: os alunos */}
            {!carregandoSessao && !carregando && user && user.role !== 'admin' && (
                <div className="flex flex-col gap-4 max-w-[640px]">
                    <AppOuvir rotulo="Ouvir instruções" className="self-start"
                        texto={pastas.length === 0
                            ? ehMae
                                ? 'Esta é a tela de início. Você ainda não tem pasta. Para começar, toque em Criar pasta do aluno.'
                                : 'Esta é a tela de início. Você ainda não acompanha nenhum aluno. Peça à família o link de convite.'
                            : ehMae
                                ? 'Esta é a tela de início. Para falar com a escola e o médico, toque em Abrir conversa. Embaixo ficam as pastas: toque no nome do aluno para abrir. Para criar outra pasta, vá em Pastas, no menu.'
                                : 'Esta é a tela de início. Para falar com a família e quem acompanha o aluno, toque em Abrir conversa. Embaixo ficam os alunos: toque no nome para abrir a pasta.'} />

                    {erro && (
                        <div className="flex flex-col items-start gap-3">
                            <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não deu para carregar os alunos. Toque em &quot;Tentar de novo&quot;.</p>
                            <AppButton title="Tentar de novo" icon="refresh" onClick={() => carregar()} />
                        </div>
                    )}

                    {ehMae && !erro && pastas.length === 0 && <CartaoCriarPasta />}

                    {!ehMae && !erro && pastas.length === 0 && (
                        <p className="ff-default text-[16px]">Você ainda não acompanha nenhum aluno. Peça à família o link de convite.</p>
                    )}

                    {/* O chat é a função principal (RF08): atalho direto para a conversa.
                        Sem aluno não aparece: só repetiria o aviso acima */}
                    {!erro && pastas.length > 0 && (
                        <section aria-labelledby="titulo-conversar" className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-gray-300 shadow-sm">
                            <h2 id="titulo-conversar" className="ff-default text-[24px] font-extrabold leading-tight text-(--cor-texto)">Conversar sobre o aluno</h2>
                            <p className="ff-default text-[16px] text-(--cor-texto)">A família, a escola e os médicos da pasta veem todas as mensagens.</p>
                            {pastas.length === 1 ? (
                                <AppButton title="Abrir conversa" icon="chatbubbles" href={`/admin/pastas/${pastas[0].id}/conversas`} className="self-start" />
                            ) : (
                                // Mais de um aluno: a pessoa escolhe sobre quem vai conversar
                                <ul className="flex flex-col gap-2">
                                    {pastas.map((p) => (
                                        <li key={p.id}>
                                            <Link href={`/admin/pastas/${p.id}/conversas`}
                                                className="min-h-[48px] px-4 inline-flex items-center gap-2 rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px]">
                                                <i className="ion-chatbubbles" aria-hidden="true" />Conversa sobre {p.nomeAluno}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {pastas.length > 0 && (
                        <section aria-labelledby="titulo-alunos" className="flex flex-col gap-3">
                            <h2 id="titulo-alunos" className="ff-default text-[24px] font-extrabold leading-tight text-(--cor-texto)">
                                {ehMae ? 'Pastas dos seus filhos' : 'Alunos que você acompanha'}
                            </h2>
                            <ListaPastas pastas={pastas} />
                        </section>
                    )}
                </div>
            )}
        </AppMainContainer>
    );
}
