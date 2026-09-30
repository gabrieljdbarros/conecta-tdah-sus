/**
 * CHAT DA PASTA — CONECTA TDAH SUS (RN05, decisão travada 10)
 *
 *   pastas/{id}/canais/grupo/mensagens/{msg}            → todos os membros
 *   pastas/{id}/canais/privado-{medicoUid}/mensagens/{msg} → só a mãe e aquele médico
 *
 * Mensagens não são editadas nem apagadas. As permissões estão em
 * firestore.rules; aqui ficam só os formatos e nomes usados nas telas.
 */
import { PapelNaPasta } from "@/types/relatorio";

/** Limite igual ao das Security Rules */
export const MAX_TEXTO_MENSAGEM = 2000;

/** Só as mais recentes são carregadas (baixo consumo de dados) */
export const LIMITE_MENSAGENS = 100;

export const CANAL_GRUPO = 'grupo';
export const canalPrivado = (medicoUid: string) => `privado-${medicoUid}`;

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
