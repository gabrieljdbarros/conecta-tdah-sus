/**
 * Marca da tela de boas-vindas ("Primeira vez no aplicativo?").
 */
const CHAVE = 'conecta-tdah:viu-introducao';

/**
 * Marca neste aparelho que a introdução já foi vista. Só uma marca "sim",
 * sem dado pessoal. Sem armazenamento (navegação privada), a introdução
 * apenas aparece de novo
 */
export function marcarIntroducaoVista() {
    try { localStorage.setItem(CHAVE, '1'); } catch { /* sem armazenamento: tudo bem */ }
}

export function introducaoJaVista(): boolean {
    try { return localStorage.getItem(CHAVE) === '1'; } catch { return false; }
}
