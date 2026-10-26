/**
 * CHAT DA PASTA — CONECTA TDAH SUS (RN05, RN08, decisão travada 7)
 *
 * Um único chat em grupo por pasta (sem canal privado), para todos os
 * membros: tabela `mensagens`. Cada mensagem é de TEXTO ou de VOZ (RF16):
 * o áudio fica no Storage (bucket privado `audios`) e a mensagem guarda só o
 * caminho do arquivo e a duração.
 *
 * Mensagens não são editadas nem apagadas. As permissões estão no banco
 * (RLS, em supabase/migrations); aqui ficam só os formatos usados nas telas.
 */
import { PapelNaPasta } from "@/types/pasta";

/** Limite igual ao do banco */
export const MAX_TEXTO_MENSAGEM = 2000;

/** Duração máxima de uma mensagem de voz, igual à do banco (2 minutos) */
export const MAX_DURACAO_AUDIO_S = 120;

/** Só as mais recentes são carregadas (baixo consumo de dados) */
export const LIMITE_MENSAGENS = 100;

/**
 * `criadoEm` é a data do SERVIDOR (coluna `criado_em`). Na aplicação ela
 * vira milissegundos
 */
export type TipoMensagem = 'texto' | 'audio';

export interface MensagemDocument {
    tipo: TipoMensagem;
    /** Só na mensagem de texto (null no áudio) */
    texto: string | null;
    /** Só no áudio: caminho do arquivo no Storage; null depois de apagado (90 dias) */
    audioCaminho: string | null;
    /** Só no áudio: duração em segundos */
    audioDuracaoS: number | null;
    /** O arquivo já foi apagado pela política de retenção (a mensagem continua) */
    audioApagado: boolean;
    autorUid: string;
    autorNome: string;
    autorPapel: PapelNaPasta;
    criadoEm: number;
}

export interface Mensagem extends MensagemDocument {
    id: string;
}
