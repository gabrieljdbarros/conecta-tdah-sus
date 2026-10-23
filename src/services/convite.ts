import { supabase, mensagemErro } from "@/services/supabase";

/**
 * SERVICES DO CONVITE (RN01, RN02)
 *
 * Gerar e aceitar passam pelas funções do banco (`gerar_convite` e
 * `aceitar_convite`, em supabase/migrations). Ver e cancelar os próprios
 * convites é feito direto na tabela, liberado pelo RLS só para quem criou.
 */

export type PapelConvidado = 'escola' | 'medico';

export interface ConvitePendente {
    id: string;
    papel: PapelConvidado;
    expiraEm: number;
}

const ConviteServices = {
    /** A dona da pasta gera o link de convite (vale 48 horas, uso único) */
    gerar: async (
        pastaId: string,
        papel: PapelConvidado
    ): Promise<{ success: boolean; token?: string; expiraEm?: number; message?: string }> => {
        const { data, error } = await supabase.rpc("gerar_convite", { p_pasta_id: pastaId, p_papel: papel }).single<{ token: string; expira_em: string }>();
        if (error || !data) return { success: false, message: mensagemErro(error, "Não foi possível gerar o convite. Tente novamente") };
        return { success: true, token: data.token, expiraEm: new Date(data.expira_em).getTime() };
    },

    /** Escola ou médico aceita o convite e entra na pasta */
    aceitar: async (
        token: string
    ): Promise<{ success: boolean; pastaId?: string; nomeAluno?: string; message?: string }> => {
        const { data, error } = await supabase.rpc("aceitar_convite", { p_token: token }).single<{ pasta_id: string; nome_aluno: string }>();
        if (error || !data) return { success: false, message: mensagemErro(error, "Não foi possível aceitar o convite. Tente novamente") };
        return { success: true, pastaId: data.pasta_id, nomeAluno: data.nome_aluno };
    },

    /**
     * Convites da pasta que ainda não foram usados (válidos e vencidos: a
     * tela mostra os vencidos para gerar um novo). O RLS só devolve os
     * convites criados pela própria pessoa
     */
    pendentes: async (_uid: string, pastaId: string): Promise<{ success: boolean; convites: ConvitePendente[] }> => {
        const { data, error } = await supabase.from("convites")
            .select("id, papel, expira_em")
            .eq("pasta_id", pastaId)
            .is("usado_em", null)
            .order("expira_em");
        if (error) return { success: false, convites: [] };
        return {
            success: true,
            convites: data.map((c) => ({ id: c.id, papel: c.papel as PapelConvidado, expiraEm: new Date(c.expira_em).getTime() })),
        };
    },

    /** Cancela um convite: o link para de funcionar na hora */
    cancelar: async (conviteId: string): Promise<{ success: boolean }> => {
        const { data, error } = await supabase.from("convites").delete().eq("id", conviteId).select("id");
        return { success: !error && !!data?.length };
    },
};

export default ConviteServices;
