/**
 * RELATÓRIOS DA PASTA — CONECTA TDAH SUS (decisão travada 9 / RN06)
 *
 * Ficam em `pastas/{pastaId}/relatorios/{id}`. Quem lê cada relatório é
 * decidido pelo TIPO (fixo no sistema), nunca pela categoria.
 *
 * As tabelas abaixo espelham as Security Rules (firestore.rules:
 * tiposQueLe / tiposQueEscreve) só para montar as telas. A proteção de
 * verdade está nas regras.
 *
 * Registro imutável: não se edita nem se apaga. Relatórios de quem saiu
 * da pasta ficam, com o nome do autor guardado no próprio relatório.
 * TODO: anexos (ex.: PDF de laudo) — exigem Firebase Storage e cuidado
 * extra de LGPD.
 */

export type TipoRelatorio = 'orientacao_medica' | 'laudo' | 'avaliacao_escolar' | 'relato_familia';
export type PapelNaPasta = 'mae' | 'escola' | 'medico';

/** Limite igual ao das Security Rules */
export const MAX_TEXTO_RELATORIO = 5000;

export const TIPO_LABELS: Record<TipoRelatorio, string> = {
    orientacao_medica: 'Orientação médica',
    laudo: 'Laudo diagnóstico',
    avaliacao_escolar: 'Avaliação escolar',
    relato_familia: 'Relato da família',
};

/** Explicação curta de cada tipo, mostrada ao escrever */
export const TIPO_DESCRICAO: Record<TipoRelatorio, string> = {
    orientacao_medica: 'Orientações práticas para a família e a escola.',
    laudo: 'Diagnóstico e informações clínicas.',
    avaliacao_escolar: 'Como o aluno está na escola.',
    relato_familia: 'Como a criança está em casa.',
};

/** Matriz de leitura (RN06) */
export const TIPOS_QUE_LE: Record<PapelNaPasta, TipoRelatorio[]> = {
    mae: ['orientacao_medica', 'laudo', 'avaliacao_escolar', 'relato_familia'],
    medico: ['orientacao_medica', 'laudo', 'avaliacao_escolar', 'relato_familia'],
    escola: ['orientacao_medica', 'avaliacao_escolar'],
};

export const TIPOS_QUE_ESCREVE: Record<PapelNaPasta, TipoRelatorio[]> = {
    mae: ['relato_familia'],
    medico: ['orientacao_medica', 'laudo'],
    escola: ['avaliacao_escolar'],
};

/** "Quem vai ver", em texto simples, para a tela de escrever */
export const QUEM_VE: Record<TipoRelatorio, string> = {
    orientacao_medica: 'a família, a escola e o médico.',
    laudo: 'a família e o médico. A escola não vê.',
    avaliacao_escolar: 'a família, a escola e o médico.',
    relato_familia: 'a família e o médico. A escola não vê.',
};

export interface RelatorioDocument {
    tipo: TipoRelatorio;
    categoriaId: string;
    texto: string;
    autorUid: string;
    autorNome: string;
    autorPapel: PapelNaPasta;
    criadoEm: number;
}

export interface Relatorio extends RelatorioDocument {
    id: string;
}
