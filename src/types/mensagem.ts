/**
 * CHAT DA PASTA — CONECTA TDAH SUS (RN05, RN08, decisão travada 7)
 *
 * Um único chat em grupo por pasta (sem canal privado), para todos os
 * membros: tabela `mensagens` no Supabase; no Firestore (app, até a
 * migração), `pastas/{id}/canais/grupo/mensagens/{msg}`.
 *
 * Mensagens não são editadas nem apagadas. As permissões estão no banco
 * (RLS no Supabase, firestore.rules no Firebase); aqui ficam só os
 * formatos e nomes usados nas telas.
 */
import { PapelNaPasta } from "@/types/pasta";

/** Limite igual ao do banco (Supabase e Security Rules) */
export const MAX_TEXTO_MENSAGEM = 2000;

/** Só as mais recentes são carregadas (baixo consumo de dados) */
export const LIMITE_MENSAGENS = 100;

export const CANAL_GRUPO = 'grupo';

/**
 * `criadoEm` é a data do SERVIDOR (no Supabase, `criado_em`; no Firestore,
 * serverTimestamp). Na aplicação ela vira milissegundos
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
