/**
 * CHAT DA PASTA — CONECTA TDAH SUS (RN05, RN08, decisão travada 7)
 *
 *   pastas/{id}/canais/grupo/mensagens/{msg} → todos os membros
 * Um único chat em grupo por pasta (sem canal privado).
 *
 * Mensagens não são editadas nem apagadas. As permissões estão em
 * firestore.rules; aqui ficam só os formatos e nomes usados nas telas.
 */
import { PapelNaPasta } from "@/types/pasta";

/** Limite igual ao das Security Rules */
export const MAX_TEXTO_MENSAGEM = 2000;

/** Só as mais recentes são carregadas (baixo consumo de dados) */
export const LIMITE_MENSAGENS = 100;

export const CANAL_GRUPO = 'grupo';

/**
 * No Firestore, `criadoEm` é um Timestamp gravado pelo servidor
 * (serverTimestamp). Na aplicação ele vira milissegundos
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
