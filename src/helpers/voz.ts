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

// As vozes carregam depois da página. A busca é feita UMA vez e
// compartilhada por todos os botões (sem um "ouvinte" por mensagem)
let vozesPromessa: Promise<SpeechSynthesisVoice[]> | null = null;

export function carregarVozes(): Promise<SpeechSynthesisVoice[]> {
    if (!vozSuportada()) return Promise.resolve([]);
    if (vozesPromessa) return vozesPromessa;
    const ja = window.speechSynthesis.getVoices();
    if (ja.length) return (vozesPromessa = Promise.resolve(ja));
    vozesPromessa = new Promise((resolve) => {
        const pronto = () => resolve(window.speechSynthesis.getVoices());
        window.speechSynthesis.addEventListener('voiceschanged', pronto, { once: true });
        setTimeout(pronto, 1500);
    }).then((vozes) => {
        // Se ainda vieram vazias, deixa tentar de novo na próxima vez
        if (!(vozes as SpeechSynthesisVoice[]).length) vozesPromessa = null;
        return vozes as SpeechSynthesisVoice[];
    });
    return vozesPromessa;
}

// Qual botão está lendo agora (só um por vez em toda a tela). Os botões
// acompanham isso, em vez de cada um adivinhar pelo fim da própria fala —
// assim o fim de uma leitura cancelada não para a leitura seguinte
let leituraAtual: string | null = null;
const ouvintes = new Set<(id: string | null) => void>();

function avisar(id: string | null): void {
    leituraAtual = id;
    ouvintes.forEach((ouvinte) => ouvinte(id));
}

export function qualLeituraAtual(): string | null {
    return leituraAtual;
}

/** Acompanha qual leitura está ativa; devolve a função para deixar de acompanhar */
export function acompanharLeitura(ouvinte: (id: string | null) => void): () => void {
    ouvintes.add(ouvinte);
    return () => { ouvintes.delete(ouvinte); };
}

/** Para qualquer leitura em andamento */
export function pararDeFalar(): void {
    if (vozSuportada()) window.speechSynthesis.cancel();
    avisar(null);
}

// Celular bloqueado, app em segundo plano ou página fechada: para de falar
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (document.hidden) pararDeFalar(); });
    window.addEventListener('pagehide', () => pararDeFalar());
}

/**
 * Lê o texto em voz alta, identificado por `id` (o botão que pediu).
 * Começar outra leitura para a anterior.
 * Devolve false se não houver voz permitida (o texto NÃO é enviado a nada)
 */
export async function falar(texto: string, opcoes: { id: string; somenteLocal: boolean }): Promise<boolean> {
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
            // Só encerra se esta ainda for a leitura ativa
            const terminar = () => { if (leituraAtual === opcoes.id) avisar(null); };
            fala.onend = terminar;
            fala.onerror = terminar;
        }
        window.speechSynthesis.speak(fala);
    });
    avisar(opcoes.id);
    return true;
}
