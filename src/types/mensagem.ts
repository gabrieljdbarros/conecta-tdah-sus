/**
 * CHAT DA PASTA — CONECTA TDAH SUS (RN05, RN08, decisão travada 7)
 *
 * Um único chat em grupo por pasta (sem canal privado), para todos os
 * membros: tabela `mensagens`.
 *
 * Mensagens não são editadas nem apagadas. As permissões estão no banco
 * (RLS, em supabase/migrations); aqui ficam só os formatos usados nas telas.
 */
import { PapelNaPasta } from "@/types/pasta";

/** Limite igual ao do banco */
export const MAX_TEXTO_MENSAGEM = 2000;

/** Só as mais recentes são carregadas (baixo consumo de dados) */
export const LIMITE_MENSAGENS = 100;

/**
 * `criadoEm` é a data do SERVIDOR (coluna `criado_em`). Na aplicação ela
 * vira milissegundos
 */
export interface MensagemDocument {
    texto: string;
    autorUid: string;
    autorNome: string;
    autorPapel: PapelNaPasta;
    criadoEm: number;
}

export interface Mensagem extends MensagemDocument {
    id: string;
}
