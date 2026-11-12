"use client";
import { useCallback, useEffect, useState } from "react";
import PastaServices from "@/services/pasta";
import { AppButton, AppLoader, AppOuvir } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { Pasta } from "@/types/pasta";
import { INSTRUCAO_BUSCA, ListaPastas, useBuscaAlunos } from "../pastas/_cartao";

// Cor com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';

/**
 * Aba "Conversas": um chat por aluno (RN05), como a lista "Chat" do design.
 * Usa as mesmas pastas da aba "Pastas" — quem não participa da pasta não
 * a vê aqui, e o RLS do banco bloqueia as mensagens de qualquer forma.
 */
export default function ConversasList() {
    const { user, loading: carregandoSessao } = useAuth();
    const [pastas, setPastas] = useState<Pasta[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const { achadas, campo, comBusca } = useBuscaAlunos(pastas);

    const carregar = useCallback(async () => {
        setCarregando(true);
        const { success, pastas } = await PastaServices.minhas();
        setPastas(pastas);
        setErro(!success);
        setCarregando(false);
    }, []);

    useEffect(() => {
        if (carregandoSessao) return;
        // Admin não acessa as pastas nem as conversas (LGPD)
        if (!user || user.role === 'admin') {
            setCarregando(false);
            return;
        }
        carregar();
    }, [carregandoSessao, user, carregar]);
    // ======================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando as conversas...</p>
            </div>
        );

    if (user?.role === 'admin')
        return <p className="ff-default text-[16px]">Administradores não acessam as conversas dos alunos, para proteger os dados de saúde das crianças.</p>;

    return (
        <>
            <h2 className="ff-default text-[24px] font-extrabold leading-tight text-(--cor-texto) mb-3">Uma conversa para cada aluno</h2>
            <AppOuvir rotulo="Ouvir instruções" className="mb-3"
                texto={`Aqui fica uma conversa para cada aluno. Toque no nome do aluno para abrir a conversa.${comBusca ? INSTRUCAO_BUSCA : ''}`} />

            {erro && (
                <div className="flex flex-col items-start gap-3 mb-3">
                    <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: não deu para carregar as conversas. Toque em &quot;Tentar de novo&quot;.</p>
                    {user && <AppButton title="Tentar de novo" icon="refresh" onClick={() => carregar()} />}
                </div>
            )}

            {!erro && pastas.length === 0 && (
                <p className="ff-default text-[16px]">
                    {user?.role === 'mae'
                        ? 'Ainda não há conversas. Crie a pasta do seu filho na aba "Pastas" para começar.'
                        : 'Ainda não há conversas. Peça à família o link de convite da pasta do aluno.'}
                </p>
            )}

            {campo}

            {/* Mesmos cartões da aba Pastas (com a mãe e a escola), abrindo a conversa */}
            {achadas.length > 0 && <ListaPastas pastas={achadas} conversas />}
        </>
    );
}
