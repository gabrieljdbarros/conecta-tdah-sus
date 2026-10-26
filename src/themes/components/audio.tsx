"use client";
import { useEffect, useRef, useState } from "react";
import MensagemServices from "@/services/mensagem";
import { acompanharLeitura, pararDeFalar } from "@/helpers/voz";
import { duracaoPorExtenso, formatarDuracao } from "@/helpers/linhas";
import { Mensagem } from "@/types/mensagem";

/**
 * OUVIR MENSAGEM DE VOZ NA WEB (RF16, decisão travada 10), igual ao app.
 * Na web só se ouve: gravar é pelo app ("na web, o foco é o texto").
 *
 * Privacidade (LGPD): o áudio é baixado SEM guardar no cache do navegador
 * (`no-store`) e tocado da memória da página, que é liberada ao terminar ou
 * sair da tela. Assim a voz não fica salva num computador compartilhado
 * (ex.: o da escola). Cada vez que alguém ouve, o banco registra (RN09)
 */

// ---------------------------------------------------------------------------
// UM ÁUDIO POR VEZ NA TELA (como a leitura em voz alta)
// ---------------------------------------------------------------------------
let tocando: { id: string; elemento: HTMLAudioElement; endereco: string } | null = null;
const ouvintes = new Set<(id: string | null) => void>();
/** Botões avisados quando o áudio deles falha no meio (por id da mensagem) */
const aoFalhar = new Map<string, () => void>();

/** Para o áudio que estiver tocando e libera a memória */
function pararAudio() {
    if (!tocando) return;
    tocando.elemento.pause();
    tocando.elemento.removeAttribute('src');
    URL.revokeObjectURL(tocando.endereco);
    tocando = null;
    ouvintes.forEach((avisar) => avisar(null));
}

// Começou uma leitura em voz alta: o áudio para (não toca um por cima do outro)
if (typeof window !== 'undefined') acompanharLeitura((atual) => { if (atual) pararAudio(); });

/**
 * Baixa o áudio sem guardar e toca no `elemento` (criado no clique: alguns
 * navegadores, como o Safari, só deixam tocar o que nasceu do toque da pessoa).
 * `sinal`: cancelado quando o botão sai da tela, para não tocar depois
 */
async function tocar(id: string, url: string, elemento: HTMLAudioElement, sinal: AbortSignal): Promise<'ok' | 'baixar' | 'tocar' | 'cancelado'> {
    let endereco: string;
    try {
        const resposta = await fetch(url, { cache: 'no-store', signal: sinal });
        if (!resposta.ok) return 'baixar';
        const dados = await resposta.blob();
        if (sinal.aborted) return 'cancelado';
        endereco = URL.createObjectURL(dados);
    } catch {
        return sinal.aborted ? 'cancelado' : 'baixar';
    }
    try {
        pararAudio();
        pararDeFalar();
        elemento.src = endereco;
        elemento.addEventListener('ended', () => { if (tocando?.elemento === elemento) pararAudio(); });
        elemento.addEventListener('error', () => {
            if (tocando?.elemento !== elemento) return;
            pararAudio();
            aoFalhar.get(id)?.();
        });
        tocando = { id, elemento, endereco };
        ouvintes.forEach((avisar) => avisar(id));
        await elemento.play();
        return 'ok';
    } catch {
        if (tocando?.elemento === elemento) pararAudio();
        else URL.revokeObjectURL(endereco);
        return 'tocar';
    }
}

/**
 * Botão para ouvir uma mensagem de voz do chat. Mostra a duração; se o
 * arquivo já foi apagado (90 dias), mostra o aviso no lugar do botão.
 * `descricao`: de quem é, para o leitor de tela (ex.: "mensagem de Ana", "sua mensagem")
 */
export default function AppOuvirAudio({ mensagem, descricao, className = '' }: {
    mensagem: Mensagem; descricao: string; className?: string;
}) {
    const [tocandoEsta, setTocandoEsta] = useState(false);
    const [abrindo, setAbrindo] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const duracao = mensagem.audioDuracaoS ?? 0;
    // Pedido em andamento: cancelado se o botão sair da tela
    const pedido = useRef<AbortController | null>(null);

    // Acompanha qual áudio está tocando; para este se o botão sair da tela
    useEffect(() => {
        const avisar = (id: string | null) => setTocandoEsta(id === mensagem.id);
        ouvintes.add(avisar);
        aoFalhar.set(mensagem.id, () => setErro('o áudio parou no meio. Confira a internet e tente de novo.'));
        return () => {
            ouvintes.delete(avisar);
            aoFalhar.delete(mensagem.id);
            pedido.current?.abort();
            if (tocando?.id === mensagem.id) pararAudio();
        };
    }, [mensagem.id]);

    if (mensagem.audioApagado || !mensagem.audioCaminho)
        return (
            <p className="ff-default text-[16px] leading-relaxed">
                <i className="ion-mic-a mr-1" aria-hidden="true" />
                Mensagem de voz apagada depois de 90 dias (prazo de guarda).
            </p>
        );

    const alternar = async () => {
        if (tocandoEsta) { pararAudio(); return; }
        if (abrindo) return;
        // Criado ainda no clique (antes de esperar a internet)
        const elemento = new Audio();
        elemento.load();
        const controle = new AbortController();
        pedido.current = controle;
        setErro(null);
        setAbrindo(true);
        const { url, erro: falha } = await MensagemServices.linkAudio(mensagem.id);
        if (controle.signal.aborted) return; // saiu da tela
        const resultado = url ? await tocar(mensagem.id, url, elemento, controle.signal) : null;
        if (resultado === 'cancelado') return;
        if (!url) setErro(falha ?? null);
        else if (resultado === 'baixar') setErro('não foi possível baixar o áudio. Confira a internet e tente de novo.');
        else if (resultado === 'tocar') setErro('este navegador não conseguiu tocar o áudio. Tente de novo.');
        setAbrindo(false);
        pedido.current = null;
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {/* aria-disabled (e não disabled): o foco do teclado e do leitor de tela
                fica no botão enquanto o áudio abre */}
            <button type="button" onClick={alternar} aria-disabled={abrindo} aria-busy={abrindo}
                className="self-start inline-flex items-center gap-2 min-h-[48px] px-5 rounded-full border-2 border-(--cor-secundaria) text-white bg-(--cor-secundaria) ff-default text-[17px] font-bold cursor-pointer aria-disabled:cursor-wait">
                <i className={tocandoEsta ? 'ion-stop' : 'ion-play'} aria-hidden="true" />
                {/* O rótulo troca entre "Ouvir" e "Parar": o leitor de tela fala o que o botão faz agora */}
                <span aria-hidden="true">{abrindo ? 'Abrindo...' : tocandoEsta ? 'Parar' : `Ouvir áudio (${formatarDuracao(duracao)})`}</span>
                <span className="sr-only">
                    {abrindo ? 'Abrindo o áudio' : tocandoEsta ? `Parar o áudio, ${descricao}` : `Ouvir áudio, ${descricao}, ${duracaoPorExtenso(duracao)}`}
                </span>
            </button>
            {erro && <p role="alert" className="text-[#B91C1C] ff-default text-[16px]">Erro: {erro}</p>}
        </div>
    );
}
