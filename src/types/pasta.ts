/**
 * MODELO DA PASTA DO ALUNO — CONECTA TDAH SUS (RF03)
 *
 * Cada aluno é uma "pasta" (decisões travadas 6 e 8), nas tabelas `pastas` e
 * `membros_pasta`. As telas usam o formato abaixo (a conversão das linhas
 * do banco fica em src/helpers/linhas.ts):
 *  - Criada pela mãe/responsável, que vira dona (`donoUid`)
 *  - `membrosUids` lista quem participa (mãe, e depois escola e médico
 *    vinculados por convite — RN01, RN02)
 *  - As permissões usam o `role` em `perfis`; `participantes` serve só para
 *    exibir quem está na pasta
 *  - Minimização (LGPD): só o nome da criança, a pedido da cliente; nada de
 *    série, data de nascimento, cartão SUS, CPF etc.
 */

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
 * Formato da pasta nas telas
 */
export interface PastaDocument {
    nomeAluno: string;
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
