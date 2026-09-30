/**
 * CATEGORIAS DE ACOMPANHAMENTO — CONECTA TDAH SUS (RF14, CSU15, RN10)
 *
 * Gerenciadas pelo admin, em `categorias/{id}`. Servem só para classificar
 * o conteúdo dos relatórios: quem lê cada relatório é definido pelo TIPO do
 * relatório (decisão travada 9 / RN06), nunca pela categoria.
 *
 * Não são apagadas: o admin desativa (`ativa: false`). Assim relatórios
 * antigos continuam apontando para uma categoria que existe.
 */

/** Limite igual ao das Security Rules (nomeCategoriaValido) */
export const MAX_NOME_CATEGORIA = 60;

export interface CategoriaDocument {
    nome: string;
    ativa: boolean;
    criadoEm: number;
}

export interface Categoria extends CategoriaDocument {
    id: string;
}

/**
 * Sugestões para o admin começar (botão "Adicionar categorias sugeridas").
 * Genéricas, só para servir de guia — o admin pode renomear ou desativar
 */
export const CATEGORIAS_SUGERIDAS = [
    'Atenção e concentração',
    'Comportamento em sala de aula',
    'Relacionamento com colegas',
    'Humor e emoções',
    'Rotina e organização',
    'Sono',
    'Alimentação',
    'Medicação',
];
