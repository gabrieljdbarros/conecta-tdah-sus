import { AccessibilityInfo, AppState, Platform } from "react-native";
import * as Speech from "expo-speech";
import { dividirEmTrechos, escolherVoz, VozDisponivel } from "@/helpers/voz";

/**
 * LEITURA EM VOZ ALTA (TTS), decisão travada 9, igual à da web
 * (src/helpers/voz.ts), mas com a voz do celular (expo-speech: o app não
 * tem a voz do navegador).
 *
 * LGPD: algumas vozes do Android NÃO rodam no aparelho: mandam o texto para
 * os servidores do Google gerarem o áudio. Por isso:
 *  - instruções da tela (sem dado pessoal): qualquer voz em português;
 *  - conteúdo (mensagens do chat): SÓ voz que roda no próprio celular.
 *    Sem ela, o conteúdo não é lido (o botão nem aparece).
 * A escolha da voz é a MESMA função da web (escolherVoz), sem duplicar a regra
 */

interface VozDoCelular extends VozDisponivel { identifier: string }

/**
 * A voz roda no aparelho? NA DÚVIDA, NÃO (falha fechada):
 *  - iPhone: as vozes do sistema rodam no aparelho.
 *  - Android: o expo-speech não informa se a voz precisa de internet. Só é
 *    aceita a voz que o Google marca como do aparelho ("-local" no fim, ex.:
 *    pt-br-x-afs-local). Vozes de outros fabricantes ou de nuvem não têm como
 *    ser comprovadas: nelas o conteúdo não é lido.
 * Limitação conhecida: uma voz "-local" do Google ainda não baixada pode
 * usar a internet; o expo-speech não deixa conferir isso
 */
export function rodaNoAparelho(identificador: string): boolean {
    if (Platform.OS === 'ios') return true;
    return /-local$/i.test(identificador);
}

function buscarVozes(): Promise<VozDoCelular[]> {
    return Speech.getAvailableVoicesAsync()
        .then((vozes) => vozes.map((v) => ({ identifier: v.identifier, name: v.name, lang: v.language, localService: rodaNoAparelho(v.identifier) })))
        .catch(() => [] as VozDoCelular[]);
}

// Para MOSTRAR os botões, as vozes são buscadas uma vez e compartilhadas
let vozesPromessa: Promise<VozDoCelular[]> | null = null;

export function carregarVozes(): Promise<VozDoCelular[]> {
    if (vozesPromessa) return vozesPromessa;
    vozesPromessa = buscarVozes().then((vozes) => {
        // O Android às vezes devolve a lista vazia na primeira vez: tenta de novo depois
        if (!vozes.length) vozesPromessa = null;
        return vozes;
    });
    return vozesPromessa;
}

/** Há voz em português (com `somenteLocal`, só a que roda no aparelho)? */
export async function temVoz(somenteLocal: boolean): Promise<boolean> {
    return !!escolherVoz(await carregarVozes(), somenteLocal);
}

// Qual botão está lendo agora (só um por vez no app inteiro). Os botões
// acompanham isso: o fim de uma leitura cancelada não para a seguinte
let leituraAtual: string | null = null;
const ouvintes = new Set<(id: string | null) => void>();

function avisar(id: string | null) {
    leituraAtual = id;
    ouvintes.forEach((ouvinte) => ouvinte(id));
}

export const qualLeituraAtual = () => leituraAtual;

/** Acompanha qual leitura está ativa; devolve a função para deixar de acompanhar */
export function acompanharLeitura(ouvinte: (id: string | null) => void): () => void {
    ouvintes.add(ouvinte);
    return () => { ouvintes.delete(ouvinte); };
}

/** Para qualquer leitura em andamento */
export function pararDeFalar() {
    Speech.stop();
    avisar(null);
}

// App em segundo plano ou celular bloqueado: para de falar. Ao voltar, a
// lista de vozes é buscada de novo (a pessoa pode ter instalado ou trocado a voz)
AppState.addEventListener('change', (estado) => {
    if (estado !== 'active') { if (leituraAtual) pararDeFalar(); }
    else vozesPromessa = null;
});

/**
 * Lê o texto em voz alta, identificado por `id` (o botão que pediu).
 * Começar outra leitura para a anterior.
 * Devolve false se não houver voz permitida (o texto NÃO é enviado a nada)
 */
export async function falar(texto: string, opcoes: { id: string; somenteLocal: boolean }): Promise<boolean> {
    // Conteúdo: confere as vozes AGORA, sem a lista guardada. Se a voz escolhida
    // tiver sumido, o Android falaria com a voz padrão (que pode ser online)
    // sem avisar: então não fala
    const voz = escolherVoz(opcoes.somenteLocal ? await buscarVozes() : await carregarVozes(), opcoes.somenteLocal);
    if (!voz) return false;
    // Foi para segundo plano enquanto conferia: não começa a falar
    if (AppState.currentState !== 'active') return false;

    pararDeFalar();
    avisar(opcoes.id);
    // Com TalkBack ligado, espera ele terminar de falar o botão ("Parar"),
    // para as duas vozes não se misturarem
    if (await AccessibilityInfo.isScreenReaderEnabled()) {
        await new Promise((r) => setTimeout(r, 800));
        if (leituraAtual !== opcoes.id) return true; // parou ou trocou durante a espera
    }
    // Em pedaços: o Android tem limite de tamanho por fala
    const trechos = dividirEmTrechos(texto);
    const terminar = () => { if (leituraAtual === opcoes.id) avisar(null); };
    // Erro em um pedaço: para tudo (não deixa o resto da fila falando)
    const falhou = () => { if (leituraAtual === opcoes.id) pararDeFalar(); };
    trechos.forEach((trecho, i) => {
        const ultimo = i === trechos.length - 1;
        Speech.speak(trecho, {
            voice: voz.identifier, // a voz escolhida, nunca a "padrão" do celular
            language: voz.lang.slice(0, 2), // "pt": o Android não entende "pt-BR" neste campo
            rate: 0.95, // um pouco mais devagar, para entender melhor
            onDone: ultimo ? terminar : undefined,
            onError: falhou,
        });
    });
    return true;
}
