import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import PastaServicos from "~/servicos/pasta";
import VistasServicos from "~/servicos/vistas";
import { useAuth } from "~/contexto/AuthContext";
import { Pasta, UltimaMensagem } from "@/types/pasta";

/**
 * Pastas de que a pessoa participa (usado no Início, em Pastas e em
 * Conversas), com a data da última mensagem de cada uma e até onde a pessoa
 * já viu neste aparelho. Recarrega toda vez que a tela volta a aparecer: ao
 * voltar de "Criar pasta" ou de uma conversa, a lista já está atualizada.
 * Se só as últimas mensagens falharem, a lista aparece sem as recentes
 */
export function useMinhasPastas() {
    const { user } = useAuth();
    const [pastas, setPastas] = useState<Pasta[]>([]);
    const [ultimas, setUltimas] = useState<Map<string, UltimaMensagem>>(() => new Map());
    const [vistas, setVistas] = useState<Record<string, number>>({});
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);

    const carregar = useCallback(async () => {
        if (!user) return;
        const [resultado, recentes, vistasAqui] = await Promise.all([
            PastaServicos.minhas(), PastaServicos.ultimasMensagens(), VistasServicos.ler(user.uid),
        ]);
        setPastas(resultado.pastas);
        if (resultado.success) VistasServicos.podar(user.uid, resultado.pastas.map((p) => p.id));
        setUltimas(recentes.ultimas);
        setVistas(vistasAqui);
        setErro(!resultado.success);
        setCarregando(false);
    }, [user]);

    useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

    return { pastas, ultimas, vistas, carregando, erro, recarregar: carregar };
}
