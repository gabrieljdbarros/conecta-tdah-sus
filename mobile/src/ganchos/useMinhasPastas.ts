import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import PastaServicos from "~/servicos/pasta";
import { useAuth } from "~/contexto/AuthContext";
import { Pasta } from "@/types/pasta";

/**
 * Pastas de que a pessoa participa (usado no Início, em Pastas e em
 * Conversas). Recarrega toda vez que a tela volta a aparecer: ao voltar de
 * "Criar pasta", a pasta nova já está na lista
 */
export function useMinhasPastas() {
    const { user } = useAuth();
    const [pastas, setPastas] = useState<Pasta[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);

    const carregar = useCallback(async () => {
        if (!user) return;
        const resultado = await PastaServicos.minhas(user.uid);
        setPastas(resultado.pastas);
        setErro(!resultado.success);
        setCarregando(false);
    }, [user]);

    useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

    return { pastas, carregando, erro, recarregar: carregar };
}
