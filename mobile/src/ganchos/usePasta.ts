import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import PastaServicos from "~/servicos/pasta";
import { papelNaPasta } from "~/servicos/relatorio";
import { useAuth } from "~/contexto/AuthContext";
import { Pasta } from "@/types/pasta";
import { PapelNaPasta } from "@/types/relatorio";

/**
 * Uma pasta e o PAPEL da pessoa nela (mãe = dona; escola/médico = membros).
 * Recarrega ao voltar para a tela. Sem acesso, `pasta` fica null (as regras
 * recusam a leitura de quem não é membro)
 */
export function usePasta(pastaId: string) {
    const { user } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [carregando, setCarregando] = useState(true);

    const carregar = useCallback(async () => {
        const resultado = await PastaServicos.buscar(pastaId);
        setPasta(resultado.pasta ?? null);
        setCarregando(false);
    }, [pastaId]);

    useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

    const papel: PapelNaPasta | null = user && pasta ? papelNaPasta(user, pasta.donoUid) : null;
    return { pasta, papel, carregando, recarregar: carregar };
}
