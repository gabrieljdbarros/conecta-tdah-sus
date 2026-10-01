/**
 * LEITURA EM VOZ ALTA (TTS) — decisão travada 11
 *
 * Usa a Web Speech API (a voz que já vem no navegador/celular): sem
 * dependência nova nem serviço pago.
 *
 * LGPD: algumas vozes NÃO rodam no aparelho — mandam o texto para
 * servidores externos (Google, Microsoft) gerarem o áudio. Por isso:
 *  - instruções da tela (sem dado pessoal): qualquer voz em português;
 *  - conteúdo (relatórios, mensagens): SÓ voz que roda no próprio
 *    aparelho (`localService`). Sem ela, o conteúdo não é lido.
 *
 * Só usa sintaxe de TypeScript que o Node consegue rodar direto (para os
 * testes em tests/unit).
 */

/** O que importa de uma voz (subconjunto de SpeechSynthesisVoice) */
export interface VozDisponivel {
    lang: string;
    localService: boolean;
    name: string;
}

/**
 * Escolhe a voz em português (de preferência pt-BR).
 * Com `somenteLocal`, só aceita voz que roda no aparelho; senão, prefere a
 * local e aceita a online como reserva. Devolve null se não houver
 */
export function escolherVoz<T extends VozDisponivel>(vozes: T[], somenteLocal: boolean): T | null {
    const portugues = vozes.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('pt'));
    const candidatas = somenteLocal ? portugues.filter((v) => v.localService) : portugues;
    const ordenadas = [...candidatas].sort((a, b) => pontuar(b) - pontuar(a));
    return ordenadas[0] ?? null;
}

// pt-BR antes de pt-PT; local antes de online
function pontuar(v: VozDisponivel): number {
    return (v.lang.toLowerCase().replace('_', '-') === 'pt-br' ? 2 : 0) + (v.localService ? 1 : 0);
}

/**
 * Quebra textos longos em pedaços de até ~200 caracteres, nas frases.
 * Alguns navegadores param de falar no meio de um texto muito longo
 */
export function dividirEmTrechos(texto: string, limite = 200): string[] {
    const frases = texto.replace(/\s+/g, ' ').trim().match(/[^.!?;:\n]+[.!?;:]*/g) ?? [];
    const trechos: string[] = [];
    let atual = '';
    for (const frase of frases.map((f) => f.trim()).filter(Boolean)) {
        if ((atual + ' ' + frase).trim().length > limite && atual) {
            trechos.push(atual);
            atual = frase;
        } else
            atual = (atual + ' ' + frase).trim();
    }
    if (atual) trechos.push(atual);
    // Frase sozinha maior que o limite: corta nos espaços
    return trechos.flatMap((t) => t.length <= limite ? [t] : (t.match(new RegExp(`.{1,${limite}}(\\s|$)`, 'g')) ?? [t]).map((p) => p.trim()));
}

// ---------------------------------------------------------------------------
// Parte do navegador
// ---------------------------------------------------------------------------

export function vozSuportada(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** As vozes carregam depois da página: espera um pouco por elas */
export function carregarVozes(): Promise<SpeechSynthesisVoice[]> {
    if (!vozSuportada()) return Promise.resolve([]);
    const ja = window.speechSynthesis.getVoices();
    if (ja.length) return Promise.resolve(ja);
    return new Promise((resolve) => {
        const pronto = () => resolve(window.speechSynthesis.getVoices());
        window.speechSynthesis.addEventListener('voiceschanged', pronto, { once: true });
        setTimeout(pronto, 1500);
    });
}

/** Para qualquer leitura em andamento */
export function pararDeFalar(): void {
    if (vozSuportada()) window.speechSynthesis.cancel();
}

/**
 * Lê o texto em voz alta. Só uma leitura por vez: começar outra para a
 * anterior. `aoTerminar` é chamado no fim, ao parar ou em erro.
 * Devolve false se não houver voz permitida (o texto NÃO é enviado a nada)
 */
export async function falar(texto: string, opcoes: { somenteLocal: boolean; aoTerminar?: () => void }): Promise<boolean> {
    if (!vozSuportada()) return false;
    const voz = escolherVoz(await carregarVozes(), opcoes.somenteLocal);
    if (!voz) return false;

    pararDeFalar();
    const trechos = dividirEmTrechos(texto);
    trechos.forEach((trecho, i) => {
        const fala = new SpeechSynthesisUtterance(trecho);
        fala.voice = voz;
        fala.lang = voz.lang;
        fala.rate = 0.95; // um pouco mais devagar, para entender melhor
        if (i === trechos.length - 1) {
            fala.onend = () => opcoes.aoTerminar?.();
            fala.onerror = () => opcoes.aoTerminar?.();
        }
        window.speechSynthesis.speak(fala);
    });
    return true;
}
