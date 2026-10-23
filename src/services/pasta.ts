import { supabase, mensagemErro } from "@/services/supabase";
import { Participante, PapelNaPasta, Pasta } from "@/types/pasta";
import { AppUser } from "@/types/user";

/**
 * SERVICES DA PASTA DO ALUNO (RF03)
 *
 * As permissões de verdade estão nas políticas RLS do banco (tabelas
 * `pastas` e `membros_pasta`). Os dados são devolvidos no mesmo formato
 * usado pelas telas (`membrosUids`, `participantes`).
 */

interface LinhaPasta {
    id: string;
    nome_aluno: string;
    dono_id: string;
    criado_em: string;
    membros_pasta: { usuario_id: string; papel: PapelNaPasta; nome: string; detalhe: string | null }[];
}

// A pasta já vem com os membros (o RLS só deixa ler as pastas de que a
// pessoa participa, e os membros dessas pastas)
const COLUNAS = "id, nome_aluno, dono_id, criado_em, membros_pasta (usuario_id, papel, nome, detalhe)";

function paraPasta(linha: LinhaPasta): Pasta {
    const participantes: Record<string, Participante> = {};
    for (const m of linha.membros_pasta)
        participantes[m.usuario_id] = { nome: m.nome, papel: m.papel, ...(m.detalhe && { detalhe: m.detalhe }) };
    return {
        id: linha.id,
        nomeAluno: linha.nome_aluno,
        donoUid: linha.dono_id,
        membrosUids: linha.membros_pasta.map((m) => m.usuario_id),
        participantes,
        criadoEm: new Date(linha.criado_em).getTime(),
    };
}

const PastaServices = {
    /**
     * A mãe/responsável cria a pasta (função `criar_pasta` do banco) e vira
     * a dona e única membro inicial. Escola e médico entram depois, por
     * convite (RN01, RN02).
     */
    criar: async (
        _dona: AppUser,
        dados: { nomeAluno: string }
    ): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.rpc("criar_pasta", { p_nome_aluno: dados.nomeAluno });
        if (error) return { success: false, message: mensagemErro(error, "Não foi possível criar a pasta. Tente novamente") };
        return { success: true };
    },

    /**
     * Uma pasta específica (o RLS só deixa ler quem é membro)
     */
    buscar: async (pastaId: string): Promise<{ success: boolean; pasta?: Pasta }> => {
        const { data, error } = await supabase.from("pastas").select(COLUNAS).eq("id", pastaId).maybeSingle();
        if (error || !data) return { success: false };
        return { success: true, pasta: paraPasta(data as LinhaPasta) };
    },

    /**
     * Pastas das quais o usuário participa (como dona ou vinculado).
     * O RLS já devolve só essas
     */
    minhas: async (): Promise<{ success: boolean; pastas: Pasta[] }> => {
        const { data, error } = await supabase.from("pastas").select(COLUNAS);
        if (error) return { success: false, pastas: [] };
        const pastas = (data as LinhaPasta[]).map(paraPasta);
        pastas.sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno, "pt-BR"));
        return { success: true, pastas };
    },

    /**
     * Tira alguém da pasta (função `remover_participante` do banco):
     * a dona remove outra pessoa; escola/médico passa o próprio uid para sair.
     */
    removerParticipante: async (
        pastaId: string,
        participanteUid: string
    ): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.rpc("remover_participante", { p_pasta_id: pastaId, p_participante_id: participanteUid });
        if (error) return { success: false, message: mensagemErro(error, "Não foi possível concluir. Tente novamente") };
        return { success: true };
    },
};

export default PastaServices;
