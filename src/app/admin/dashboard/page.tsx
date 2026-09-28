"use client";
import { AppMainContainer } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/user";

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <AppMainContainer title="Dashboard">
            {user && <p className="ff-default text-[18px]">
                Bem-vindo(a), {user.nome} — perfil: <strong>{ROLE_LABELS[user.role]}</strong>
            </p>}
        </AppMainContainer>
    )
}
