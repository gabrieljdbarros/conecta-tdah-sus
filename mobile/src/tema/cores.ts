/**
 * CORES DO APP: as mesmas da web (src/app/globals.css), com os mesmos
 * papéis que garantem o contraste WCAG AA. Tabela em docs/design-cores.md.
 *  - destaque (laranja): fundo de botão com texto branco GRANDE e negrito
 *    (19+ negrito = "texto grande"; 3,1:1), ou título grande sobre branco.
 *    Nunca texto pequeno
 *  - link (azul dos links do design): links, contorno, seleção e foco (7,1:1)
 *  - secundaria (verde-petróleo): "Ouvir" e rótulos pequenos (6,48:1)
 */
export const cores = {
    destaque: '#FF5C00',
    link: '#0155A0',
    secundaria: '#006A63',
    texto: '#242424',
    textoSuave: '#5A5A5A',
    borda: '#737686',
    bordaCartao: '#D1D5DB',
    fundo: '#FAF8FF',
    fundoCartao: '#FFFFFF',
    barraTopo: '#F5F5F5',
    tituloBarra: '#3B3B3B',
    erro: '#B91C1C',
    fundoErro: '#FEF2F2',
    sucesso: '#166534',
    fundoInfo: '#EEF2FF',
    desabilitado: '#D1D5DB',
    textoDesabilitado: '#374151',
} as const;

/** Tamanhos mínimos: toque de 48 e texto de 16 (público com baixa visão e alfabetização) */
export const medidas = {
    toque: 48,
    texto: 16,
    textoBotao: 19,
    raio: 12,
    espaco: 16,
} as const;
