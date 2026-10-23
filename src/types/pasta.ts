/**
 * MODELO DA PASTA DO ALUNO — CONECTA TDAH SUS (RF03)
 *
 * Cada aluno é uma "pasta" em `pastas/{pastaId}` (decisões travadas 6 e 8):
 *  - Criada pela mãe/responsável, que vira dona (`donoUid`)
 *  - `membrosUids` lista quem participa (mãe, e depois escola e médico
 *    vinculados por convite — RN01, RN02). É um array para permitir a
 *    consulta `array-contains` ("minhas pastas") validada pelas Rules
 *  - As permissões usam o `role` em `users`; `participantes` serve só para
 *    exibir quem está na pasta
 *  - Minimização (LGPD): só nome e série; nada de data de nascimento, CPF etc.
 */

// Códigos fixos (validados também em firestore.rules). O rótulo exibido
// fica separado para poder mudar o texto sem mexer nos dados salvos
export type Serie =
    | 'infantil'
    | 'ef1' | 'ef2' | 'ef3' | 'ef4' | 'ef5' | 'ef6' | 'ef7' | 'ef8' | 'ef9'
    | 'em1' | 'em2' | 'em3';

export const SERIE_LABELS: Record<Serie, string> = {
    infantil: 'Educação Infantil',
    ef1: '1º ano (Fundamental)',
    ef2: '2º ano (Fundamental)',
    ef3: '3º ano (Fundamental)',
    ef4: '4º ano (Fundamental)',
    ef5: '5º ano (Fundamental)',
    ef6: '6º ano (Fundamental)',
    ef7: '7º ano (Fundamental)',
    ef8: '8º ano (Fundamental)',
    ef9: '9º ano (Fundamental)',
    em1: '1ª série (Ensino Médio)',
    em2: '2ª série (Ensino Médio)',
    em3: '3ª série (Ensino Médio)',
};

/** Papel de cada pessoa NA PASTA (a mãe é a dona; escola e médico entram por convite) */
export type PapelNaPasta = 'mae' | 'escola' | 'medico';

/**
 * Resumo público de quem está na pasta, visível a todos os membros.
 * Minimização: só nome, papel e instituição (nome da escola ou unidade SUS).
 * A mãe grava o próprio ao criar a pasta; escola/médico entram pela Cloud
 * Function do convite (RN01, RN02)
 */
export interface Participante {
    nome: string;
    papel: PapelNaPasta;
    detalhe?: string;
}

/**
 * Formato salvo em `pastas/{pastaId}` no Firestore
 */
export interface PastaDocument {
    nomeAluno: string;
    serie: Serie;
    donoUid: string;
    membrosUids: string[];
    participantes: Record<string, Participante>;
    criadoEm: number;
}

/**
 * Pasta disponível na aplicação
 */
export interface Pasta extends PastaDocument {
    id: string;
}
