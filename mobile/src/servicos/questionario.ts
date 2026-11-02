import { supabase } from "~/servicos/supabase";
import { comTempoLimite } from "~/servicos/mensagem";
import { COLUNAS_QUESTIONARIO, LinhaQuestionario, paraQuestionario } from "@/helpers/linhas";
import { respostasValidas, VERSAO_ATUAL } from "@/helpers/questionario";
import { NotaItem, Questionario } from "@/types/questionario";

/**
 * QUESTIONÁRIO SNAP-IV (decisão travada 11). As permissões estão nas
 * políticas RLS da tabela `questionarios`: só a mãe dona responde, todos os
 * membros da pasta leem, ninguém edita nem apaga.
 * Nada fica guardado no aparelho: as respostas vêm sempre do servidor
 */

/** Sem resposta do servidor nesse tempo, a tela avisa */
const ESPERA_MS = 15000;
/** Respostas carregadas por vez (as mais recentes) */
const LIMITE = 50;

const QuestionarioServicos = {
    /** Respostas da pasta, da mais recente para a mais antiga */
    listar: async (pastaId: string): Promise<{ success: boolean; questionarios: Questionario[] }> => {
        const cancelar = new AbortController();
        const espera = setTimeout(() => cancelar.abort(), ESPERA_MS);
        try {
            const { data, error } = await supabase.from("questionarios")
                .select(COLUNAS_QUESTIONARIO)
                .eq("pasta_id", pastaId)
                .order("criado_em", { ascending: false })
                .limit(LIMITE)
                .abortSignal(cancelar.signal);
            if (error) return { success: false, questionarios: [] };
            return { success: true, questionarios: (data as LinhaQuestionario[]).map(paraQuestionario) };
        } catch {
            return { success: false, questionarios: [] };
        } finally {
            clearTimeout(espera);
        }
    },

    /**
     * Envia as 18 respostas de uma vez, ao concluir (não há rascunho).
     * Data e id vêm do servidor.
     * TODO (RN07): pedir o consentimento quando houver o texto dos termos
     */
    enviar: (pastaId: string, uid: string, respostas: NotaItem[]) => {
        if (!respostasValidas(respostas)) return Promise.resolve({ success: false, semConexao: false });
        return comTempoLimite((async () => {
            const { error } = await supabase.from("questionarios")
                .insert({ pasta_id: pastaId, respondido_por: uid, versao: VERSAO_ATUAL, respostas });
            return !error;
        })(), ESPERA_MS);
    },
};

export default QuestionarioServicos;
