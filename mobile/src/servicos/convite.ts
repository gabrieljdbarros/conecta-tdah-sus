import { mensagemErro, SITE, supabase } from "~/servicos/supabase";

/**
 * CONVITES (RN01, RN02), iguais a src/services/convite.ts da web.
 * Gerar, aceitar e remover passam pelas MESMAS funções do banco; ver e
 * cancelar os próprios convites é direto na tabela (o RLS libera só para
 * quem criou)
 */

export type PapelConvidado = 'escola' | 'medico';
export interface ConvitePendente { id: string; papel: PapelConvidado; expiraEm: number }

/** Link do convite (quem recebe pode abrir no navegador OU colar no app) */
export const linkDoConvite = (token: string) => `${SITE}/convite/${token}`;

// Ler o código de um link colado: lógica pura, em src/helpers/convite.ts
export { codigoDoTexto } from "@/helpers/convite";

const ConviteServicos = {
    /** A dona gera o convite (vale 48 horas, uso único) */
    gerar: async (pastaId: string, papel: PapelConvidado): Promise<{ success: boolean; token?: string; expiraEm?: number; message?: string }> => {
        const { data, error } = await supabase.rpc("gerar_convite", { p_pasta_id: pastaId, p_papel: papel }).single<{ token: string; expira_em: string }>();
        if (error || !data) return { success: false, message: mensagemErro(error, "Não foi possível gerar o convite. Tente novamente") };
        return { success: true, token: data.token, expiraEm: new Date(data.expira_em).getTime() };
    },

    /** Escola ou médico aceita e entra na pasta */
    aceitar: async (token: string): Promise<{ success: boolean; pastaId?: string; nomeAluno?: string; message?: string }> => {
        const { data, error } = await supabase.rpc("aceitar_convite", { p_token: token }).single<{ pasta_id: string; nome_aluno: string }>();
        if (error || !data) return { success: false, message: mensagemErro(error, "Não foi possível aceitar o convite. Tente novamente") };
        return { success: true, pastaId: data.pasta_id, nomeAluno: data.nome_aluno };
    },

    /** Convites não usados da pasta (válidos e vencidos), criados pela própria pessoa */
    pendentes: async (pastaId: string): Promise<{ success: boolean; convites: ConvitePendente[] }> => {
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

    /** Cancela: o link para de funcionar na hora */
    cancelar: async (conviteId: string): Promise<{ success: boolean }> => {
        const { data, error } = await supabase.from("convites").delete().eq("id", conviteId).select("id");
        return { success: !error && !!data?.length };
    },

    /** A dona remove outra pessoa; escola/médico passa o próprio uid para sair */
    removerParticipante: async (pastaId: string, participanteUid: string): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.rpc("remover_participante", { p_pasta_id: pastaId, p_participante_id: participanteUid });
        if (error) return { success: false, message: mensagemErro(error, "Não foi possível concluir. Tente novamente") };
        return { success: true };
    },
};

export default ConviteServicos;
