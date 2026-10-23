import { mensagemErro, supabase } from "~/servicos/supabase";
import { COLUNAS_PASTA, LinhaPasta, ordenarPastas, paraPasta } from "@/helpers/linhas";
import { Pasta } from "@/types/pasta";

/**
 * SERVIÇOS DA PASTA DO ALUNO (RF03), iguais a src/services/pasta.ts da web.
 * As permissões de verdade estão nas políticas RLS (tabelas `pastas` e
 * `membros_pasta`)
 */
const PastaServicos = {
    /** A mãe cria a pasta, só com o nome da criança, e vira a dona (decisão travada 6) */
    criar: async (dados: { nomeAluno: string }): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.rpc("criar_pasta", { p_nome_aluno: dados.nomeAluno });
        if (error) return { success: false, message: mensagemErro(error, "Não foi possível criar a pasta. Tente novamente") };
        return { success: true };
    },

    /** Uma pasta (o RLS só deixa ler quem é membro) */
    buscar: async (pastaId: string): Promise<{ success: boolean; pasta?: Pasta }> => {
        const { data, error } = await supabase.from("pastas").select(COLUNAS_PASTA).eq("id", pastaId).maybeSingle();
        if (error || !data) return { success: false };
        return { success: true, pasta: paraPasta(data as LinhaPasta) };
    },

    /** Pastas de que a pessoa participa (o RLS já devolve só essas) */
    minhas: async (): Promise<{ success: boolean; pastas: Pasta[] }> => {
        const { data, error } = await supabase.from("pastas").select(COLUNAS_PASTA);
        if (error) return { success: false, pastas: [] };
        return { success: true, pastas: ordenarPastas((data as LinhaPasta[]).map(paraPasta)) };
    },
};

export default PastaServicos;
