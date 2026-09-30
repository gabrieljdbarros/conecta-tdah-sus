import Cookies from "js-cookie";

/**
 * DADOS SALVOS TEMPORARIAMENTE
 * IDEAL PARA MANDAR UMA INFORMAÇÃO DE UMA TELA PARA OUTRA PARA CONFIRMAR AÇÃO 
 * @example
 *      /tela1
 *          setFlashData('Usuário cadastrado com sucesso');
 * 
 *      /tela2
 *          const response = getFlashData();
 */

//SALVA FLASH DATA (só mensagens curtas, sem dados sensíveis: fica num cookie)
export function setFlashData(data: string) {
    Cookies.set(`flash`, JSON.stringify(data));
}
//RECUPERA FLASH DATA
export function getFlashData(): string | null {
    const data = Cookies.get(`flash`);
    if (data) {
        Cookies.remove(`flash`);
        return JSON.parse(data);
    }
    return null;
}
//REMOVE QUALQUER FLASH DATA
export function clearFlashData() {
    Cookies.remove(`flash`);
}

/**
 * CONVITE PENDENTE (RN01, RN02)
 * Quem abre um link de convite sem estar logado vai para o login/cadastro
 * com `?convite=<token>` e, depois de entrar, volta para o convite.
 */
// Formato do token (32 bytes em base64url). Validar evita montar URLs com
// qualquer texto vindo da barra de endereço
export const TOKEN_CONVITE = /^[A-Za-z0-9_-]{43}$/;

export function conviteDaUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const token = new URLSearchParams(window.location.search).get('convite');
    return token && TOKEN_CONVITE.test(token) ? token : null;
}

export function destinoAposEntrar(): string {
    const token = conviteDaUrl();
    return token ? `/convite/${token}` : '/admin/dashboard';
}