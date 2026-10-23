/**
 * CÓDIGO DO CONVITE (RN01, RN02)
 *
 * Tira o código do convite de um link colado (ou do próprio código).
 * O código tem 43 letras/números (base64url de 32 bytes, gerado pela função
 * `gerar_convite` do banco); nada é enviado se o texto não tiver esse formato.
 * Lógica pura, sem dependências (testada em tests/unit)
 */
export function codigoDoTexto(texto: string): string | null {
    // O código precisa estar "sozinho": nem antes nem depois dele pode haver
    // outra letra do mesmo tipo (senão um texto maior viraria um código)
    const achado = texto.match(/(?:^|[^A-Za-z0-9_-])([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/);
    return achado ? achado[1] : null;
}
