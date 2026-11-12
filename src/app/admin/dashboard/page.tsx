"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppButton, AppLoader, AppMainContainer, AppOuvir } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import PastaServices from "@/services/pasta";
import { Pasta } from "@/types/pasta";
import { CartaoCriarPasta } from "../pastas/_cartao";

const COR_ERRO = 'text-[#B91C1C]';
const AVISO_MENU = 'Para abrir as pastas e as conversas dos alunos, use Pastas ou Conversas, no menu.';

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
    const titulo = primeiroNome ? `Olá, ${primeiroNome}!` : 'Início';
    const ehMae = user?.role === 'mae';

    return (
        <AppMainContainer title={titulo} subtitulo={hoje} destaque realce={primeiroNome}>
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
                            : `Esta é a tela de início. ${AVISO_MENU}`} />

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

                    {/* Sem atalhos (12/11/2026): com dezenas de alunos (médico), a lista
                        enchia a tela. As pastas e as conversas ficam no menu, com busca */}
                    {!erro && pastas.length > 0 && (
                        <p className="ff-default text-[16px] text-(--cor-texto-suave)">{AVISO_MENU}</p>
                    )}
                </div>
            )}
        </AppMainContainer>
    );
}
