"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConviteServices from "@/services/convite";
import { AppButton, AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { setFlashData, TOKEN_CONVITE } from "@/helpers/router";
import { ROLE_LABELS } from "@/types/user";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const CLASSE_LINK = "min-h-[48px] px-6 flex items-center justify-center rounded-full border-2 border-(--primary-color) text-(--primary-color) ff-default text-[16px]";

export default function AceitarConvite({ token }: { token: string }) {
    const router = useRouter();
    const { user, loading: carregandoSessao, logout } = useAuth();
    const [aceitando, setAceitando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    // ======================================================================
    const aceitar = async () => {
        setErro(null);
        setAceitando(true);
        const { success, pastaId, message } = await ConviteServices.aceitar(token);
        if (success && pastaId) {
            // Sem o nome do aluno: o flash fica num cookie, que vai ao servidor
            setFlashData('Você agora faz parte desta pasta');
            router.push(`/admin/pastas/${pastaId}`);
        } else {
            setErro(message ?? 'Não foi possível aceitar o convite');
            setAceitando(false);
        }
    };
    // ======================================================================
    if (!TOKEN_CONVITE.test(token))
        return (
            <div className="w-full max-w-[400px] flex flex-col gap-4">
                <h1 className="ff-default text-[26px] text-center">Convite</h1>
                <p role="alert" className="ff-default text-[16px] text-center">Este link de convite está incompleto. Peça um novo link à família.</p>
            </div>
        );

    if (carregandoSessao)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando...</p>
            </div>
        );

    return (
        <div className="w-full max-w-[400px] flex flex-col gap-4">
            <h1 className="ff-default text-[26px] text-center">Convite</h1>
            <p className="ff-default text-[16px] text-center">
                Você recebeu um convite para acompanhar um aluno no Conecta TDAH SUS.
            </p>

            {/* SEM CONTA/LOGIN: entra ou cria a conta e volta para cá */}
            {!user && <>
                <p className="ff-default text-[16px] text-center">Para aceitar, entre na sua conta ou crie uma.</p>
                <Link href={`/?convite=${token}`} className={`${CLASSE_LINK} bg-(--primary-color) text-white`}>Entrar</Link>
                <Link href={`/cadastro?convite=${token}`} className={CLASSE_LINK}>Criar conta</Link>
            </>}

            {/* LOGADO: confirma quem é e aceita */}
            {user && <>
                <p className="ff-default text-[16px] text-center">
                    Você entrou como <strong>{user.nome}</strong> ({ROLE_LABELS[user.role]}).
                </p>

                {erro && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center`}>Erro: {erro}</p>}

                <AppButton title={aceitando ? 'Aceitando...' : 'Aceitar convite'} icon="checkmark" onClick={aceitar} disabled={aceitando} form="round" />

                <button type="button" onClick={() => logout()} className={`${CLASSE_LINK} cursor-pointer`}>
                    Não sou eu — sair
                </button>
                <Link href="/admin/pastas" className="ff-default text-[16px] text-center text-(--primary-color) underline min-h-[48px] flex items-center justify-center">
                    Ir para as minhas pastas
                </Link>
            </>}
        </div>
    );
}
