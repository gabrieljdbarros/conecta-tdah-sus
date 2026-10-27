import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
    AudioPlayer, AudioQuality, AudioRecorder, createAudioPlayer, IOSOutputFormat, RecordingOptions,
    requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus,
    useAudioRecorder, useAudioRecorderState,
} from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import { anunciar, Aviso, Botao } from "~/componentes/basicos";
import MensagemServicos from "~/servicos/mensagem";
import { pararDeFalar } from "~/servicos/voz";
import { cores, medidas } from "~/tema/cores";
import { duracaoPorExtenso, formatarDuracao } from "@/helpers/linhas";
import { MAX_DURACAO_AUDIO_S, Mensagem } from "@/types/mensagem";

/**
 * MENSAGENS DE VOZ NO APP (RF16, decisão travada 10)
 *  - gravar: toque em "Gravar" para começar e em "Parar" para terminar; o
 *    cronômetro mostra o tempo e quanto falta; para sozinho em 2 minutos
 *  - antes de enviar, a pessoa OUVE a gravação e escolhe Enviar ou Descartar
 *    (depois de enviada, a mensagem não pode ser apagada: RN08)
 *  - ouvir: cada vez que alguém ouve, o banco registra (RN09)
 *
 * Baixo consumo de dados (RNF02): voz em mono, AAC a 32 kbps (2 minutos dão
 * uns 500 KB). O arquivo gravado fica só no cache do app e é apagado depois
 * de enviar ou descartar
 */
const OPCOES_GRAVACAO: RecordingOptions = {
    extension: '.m4a',
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 32000,
    android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
    ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
    // Exigido pelo tipo; o app não roda no navegador (a web tem o painel)
    web: { mimeType: 'audio/mp4', bitsPerSecond: 32000 },
};

/** Apaga a gravação do cache do celular (celular compartilhado: não deixa voz guardada) */
function apagarArquivoLocal(uri: string | null) {
    if (!uri) return;
    try {
        const arquivo = new File(uri);
        if (arquivo.exists) arquivo.delete();
    } catch {
        // O sistema também limpa o cache sozinho
    }
}

/**
 * Apaga gravações que sobraram no cache (ex.: o app foi fechado à força no
 * meio de uma gravação). Chamada ao abrir o app, quando nada está gravando.
 * Só mexe nos .m4a: o Android guarda em <cache>/Audio e o iPhone no próprio cache
 */
export function limparGravacoesEsquecidas() {
    for (const pasta of [new Directory(Paths.cache, 'Audio'), Paths.cache]) {
        try {
            if (!pasta.exists) continue;
            for (const item of pasta.list())
                if (item instanceof File && item.name.endsWith('.m4a')) item.delete();
        } catch {
            // O sistema também limpa o cache sozinho
        }
    }
}

// ---------------------------------------------------------------------------
// UM ÁUDIO POR VEZ NO APP (como a leitura em voz alta)
// ---------------------------------------------------------------------------
let tocando: { id: string; player: AudioPlayer } | null = null;
const ouvintes = new Set<(id: string | null) => void>();

/** Para o áudio que estiver tocando (de qualquer mensagem) */
export function pararAudio() {
    if (!tocando) return;
    tocando.player.remove();
    tocando = null;
    ouvintes.forEach((avisar) => avisar(null));
}

/** Toca o áudio do link. Devolve false se o celular não conseguiu tocar */
function tocar(id: string, url: string): boolean {
    pararAudio();
    pararDeFalar(); // não fala por cima do áudio
    try {
        const player = createAudioPlayer({ uri: url });
        player.addListener('playbackStatusUpdate', (status) => {
            if (status.didJustFinish && tocando?.player === player) pararAudio();
        });
        tocando = { id, player };
        ouvintes.forEach((avisar) => avisar(id));
        player.play();
        return true;
    } catch {
        pararAudio();
        return false;
    }
}

/** Para o gravador (se ainda estiver ativo) e só DEPOIS apaga o arquivo */
function encerrarGravador(gravador: AudioRecorder, arquivoConhecido: string | null) {
    let fim: Promise<void>;
    try { fim = gravador.stop(); } catch { fim = Promise.resolve(); }
    fim.catch(() => { }).finally(() => {
        let uri = arquivoConhecido;
        try { uri = uri ?? gravador.uri; } catch { /* gravador já liberado */ }
        apagarArquivoLocal(uri);
    });
}

/**
 * Botão para ouvir uma mensagem de voz do chat. Mostra a duração; se o
 * arquivo já foi apagado (90 dias), mostra o aviso no lugar do botão
 */
export function OuvirMensagemDeVoz({ mensagem, descricao }: { mensagem: Mensagem; descricao: string }) {
    const [tocandoEsta, setTocandoEsta] = useState(tocando?.id === mensagem.id);
    const [abrindo, setAbrindo] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const duracao = mensagem.audioDuracaoS ?? 0;

    useEffect(() => {
        const avisar = (id: string | null) => setTocandoEsta(id === mensagem.id);
        ouvintes.add(avisar);
        return () => {
            ouvintes.delete(avisar);
            if (tocando?.id === mensagem.id) pararAudio();
        };
    }, [mensagem.id]);

    // Ao sair da tela (abrir outra ou trocar de aba), o áudio para
    useFocusEffect(useCallback(() => () => { if (tocando?.id === mensagem.id) pararAudio(); }, [mensagem.id]));

    if (mensagem.audioApagado || !mensagem.audioCaminho) {
        return (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="mic-off" size={22} color={cores.textoSuave} importantForAccessibility="no" />
                <Text style={{ fontSize: 16, color: cores.texto, flexShrink: 1 }}>
                    Mensagem de voz apagada depois de 90 dias (prazo de guarda).
                </Text>
            </View>
        );
    }

    const alternar = async () => {
        if (tocandoEsta) { pararAudio(); return; }
        if (abrindo) return;
        setErro(null);
        setAbrindo(true);
        const { url, erro: falha } = await MensagemServicos.linkAudio(mensagem.id);
        if (url) {
            // Toca pelo alto-falante mesmo com o celular no silencioso (iPhone)
            await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => { });
            if (!tocar(mensagem.id, url)) setErro('o celular não conseguiu tocar este áudio. Tente de novo.');
        } else setErro(falha ?? null);
        setAbrindo(false);
    };

    const titulo = tocandoEsta ? 'Parar' : `Ouvir áudio (${formatarDuracao(duracao)})`;
    return (
        <View style={{ gap: 8 }}>
            <Pressable onPress={alternar} disabled={abrindo}
                accessibilityRole="button" accessibilityState={{ busy: abrindo }}
                accessibilityLabel={tocandoEsta ? `Parar o áudio, ${descricao}` : `Ouvir áudio, ${descricao}, ${duracaoPorExtenso(duracao)}`}
                android_ripple={{ color: '#FFFFFF55' }}
                style={({ pressed }) => ({
                    minHeight: medidas.toque, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingHorizontal: 18, borderRadius: 24, backgroundColor: cores.secundaria, opacity: pressed ? 0.85 : 1,
                })}>
                {abrindo ? <ActivityIndicator color="#FFFFFF" />
                    : <Ionicons name={tocandoEsta ? 'stop' : 'play'} size={24} color="#FFFFFF" importantForAccessibility="no" />}
                <Text style={{ fontSize: medidas.textoBotao, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 }}>{abrindo ? 'Abrindo...' : titulo}</Text>
            </Pressable>
            {erro && <Aviso tipo="erro" texto={erro} />}
        </View>
    );
}

// ---------------------------------------------------------------------------
// GRAVAR
// ---------------------------------------------------------------------------
type Etapa = 'pedindo' | 'semPermissao' | 'gravando' | 'revisando' | 'enviando';

/** Uma gravação pronta: arquivo no celular, id do arquivo no servidor e duração */
export interface Gravacao { arquivoLocal: string; id: string; duracaoS: number }

/**
 * Painel de gravação, aberto pelo botão "Gravar" do chat. Começa a gravar
 * assim que abre (o toque em "Gravar" já foi o "começar").
 * `aoEnviar` devolve uma mensagem de erro, ou null se deu certo.
 * `aoFechar` pode trazer um aviso para o chat mostrar (o painel some)
 */
export function GravadorDeVoz({ aoEnviar, aoFechar }: {
    aoEnviar: (gravacao: Gravacao) => Promise<string | null>;
    aoFechar: (aviso?: string) => void;
}) {
    // O gravador parou por conta própria (2 minutos, ligação recebida...): fecha a gravação
    const pararRef = useRef<() => void>(() => { });
    const gravador = useAudioRecorder(OPCOES_GRAVACAO, (status) => { if (status.isFinished) pararRef.current(); });
    const estado = useAudioRecorderState(gravador, 250);
    const [etapa, setEtapa] = useState<Etapa>('pedindo');
    const [gravacao, setGravacao] = useState<Gravacao | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const parando = useRef(false);
    // Arquivo ainda no celular, para apagar se a pessoa sair no meio
    const arquivo = useRef<string | null>(null);
    // Última duração vista: depois que o gravador para sozinho, o status pode voltar zerado
    const ultimaDuracaoMs = useRef(0);
    useEffect(() => { if (estado.durationMillis > 0) ultimaDuracaoMs.current = estado.durationMillis; }, [estado.durationMillis]);

    const parar = useCallback(async () => {
        if (parando.current) return;
        parando.current = true;
        const duracaoMs = Math.max(gravador.getStatus().durationMillis, ultimaDuracaoMs.current);
        try { await gravador.stop(); } catch { /* já parou */ }
        await setAudioModeAsync({ allowsRecording: false }).catch(() => { });
        const uri = gravador.uri;
        arquivo.current = uri;
        const duracaoS = Math.min(MAX_DURACAO_AUDIO_S, Math.round(duracaoMs / 1000));
        if (!uri || duracaoS < 1) {
            apagarArquivoLocal(uri);
            arquivo.current = null;
            aoFechar('o áudio ficou curto demais. Toque em Gravar áudio e fale por pelo menos 1 segundo.');
            return;
        }
        // O id do arquivo nasce aqui, uma vez: um reenvio usa o mesmo
        setGravacao({ arquivoLocal: uri, id: MensagemServicos.novoIdAudio(), duracaoS });
        setEtapa('revisando');
        anunciar(`Gravação pronta, com ${duracaoPorExtenso(duracaoS)}. Ouça antes de enviar.`);
    }, [gravador, aoFechar]);
    useEffect(() => { pararRef.current = parar; }, [parar]);

    // Ao abrir: pede o microfone e começa a gravar
    useEffect(() => {
        let ativo = true;
        let limite: ReturnType<typeof setTimeout> | undefined;
        (async () => {
            pararAudio();
            pararDeFalar();
            const { granted } = await requestRecordingPermissionsAsync();
            if (!ativo) return;
            if (!granted) { setEtapa('semPermissao'); return; }
            try {
                await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
                await gravador.prepareToRecordAsync();
                // Saiu da tela enquanto o microfone era preparado
                if (!ativo) { encerrarGravador(gravador, null); return; }
                gravador.record({ forDuration: MAX_DURACAO_AUDIO_S });
                // Garantia do limite de 2 minutos, caso o aviso do gravador não chegue
                limite = setTimeout(() => pararRef.current(), MAX_DURACAO_AUDIO_S * 1000 + 300);
                setEtapa('gravando');
                anunciar('Gravando. Toque em Parar quando terminar.', 0);
            } catch {
                if (ativo) setErro('não foi possível usar o microfone. Feche outros apps que estejam gravando e tente de novo.');
            }
        })();
        return () => {
            ativo = false;
            clearTimeout(limite);
            // Saiu no meio (voltou de tela, por exemplo): para e apaga a gravação
            encerrarGravador(gravador, arquivo.current);
        };
    }, [gravador]);

    // O app foi para segundo plano: para de gravar (nunca grava sem a pessoa ver).
    // Ao voltar, ela ouve o que gravou e decide
    useEffect(() => {
        const assinatura = AppState.addEventListener('change', (estadoApp) => {
            if (estadoApp !== 'active' && gravador.isRecording) pararRef.current();
        });
        return () => assinatura.remove();
    }, [gravador]);

    const descartar = () => {
        apagarArquivoLocal(gravacao?.arquivoLocal ?? null);
        arquivo.current = null;
        anunciar('Gravação descartada.');
        aoFechar();
    };

    const enviar = async () => {
        if (!gravacao) return;
        setEtapa('enviando');
        setErro(null);
        const falha = await aoEnviar(gravacao);
        if (falha) {
            setErro(falha);
            setEtapa('revisando');
            return;
        }
        apagarArquivoLocal(gravacao.arquivoLocal);
        arquivo.current = null;
        aoFechar();
    };

    const segundos = Math.min(MAX_DURACAO_AUDIO_S, Math.floor(estado.durationMillis / 1000));
    const faltam = MAX_DURACAO_AUDIO_S - segundos;

    // Leitor de tela: avisa perto do fim (só nesses marcos, não a cada segundo)
    const ultimoMarco = useRef<number | null>(null);
    useEffect(() => {
        if (etapa !== 'gravando') return;
        const marco = [30, 10].find((m) => faltam <= m && (ultimoMarco.current === null || ultimoMarco.current > m));
        if (marco === undefined) return;
        ultimoMarco.current = marco;
        anunciar(`Faltam ${marco} segundos.`, 0);
    }, [etapa, faltam]);

    return (
        <View style={{ gap: 10 }}>
            {erro && <Aviso tipo="erro" texto={erro} />}

            {etapa === 'pedindo' && !erro && <Text style={{ fontSize: 17, color: cores.texto }}>Preparando o microfone...</Text>}
            {etapa === 'pedindo' && erro && <Botao titulo="Fechar" tipo="contorno" icone="close" aoTocar={() => aoFechar()} />}

            {etapa === 'semPermissao' && <>
                <Aviso tipo="erro" texto="o app não tem permissão para usar o microfone. Para gravar, libere o microfone nas configurações do celular." />
                <Botao titulo="Abrir configurações" icone="settings" aoTocar={() => Linking.openSettings()} />
                <Botao titulo="Fechar" tipo="contorno" icone="close" aoTocar={() => aoFechar()} />
            </>}

            {etapa === 'gravando' && <>
                {/* Tempo lido pelo leitor de tela só quando a pessoa toca nele (não fala a cada segundo) */}
                <View accessible accessibilityLabel={`Gravando: ${duracaoPorExtenso(segundos)}. Faltam ${duracaoPorExtenso(faltam)}.`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: cores.erro }} />
                    <Text style={{ fontSize: 22, fontWeight: '700', color: cores.texto }}>{formatarDuracao(segundos)}</Text>
                    <Text style={{ fontSize: 16, color: cores.textoSuave, flexShrink: 1 }}>faltam {formatarDuracao(faltam)} (máximo de 2 minutos)</Text>
                </View>
                <Pressable onPress={parar} accessibilityRole="button" accessibilityLabel="Parar a gravação"
                    style={({ pressed }) => ({
                        minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                        borderRadius: 28, backgroundColor: cores.erro, opacity: pressed ? 0.85 : 1,
                    })}>
                    <Ionicons name="stop" size={26} color="#FFFFFF" importantForAccessibility="no" />
                    <Text style={{ fontSize: medidas.textoBotao, fontWeight: '700', color: '#FFFFFF' }}>Parar</Text>
                </Pressable>
            </>}

            {(etapa === 'revisando' || etapa === 'enviando') && gravacao && <>
                <Text style={{ fontSize: 17, color: cores.texto }}>
                    Ouça antes de enviar. Depois de enviado, o áudio não pode ser apagado.
                </Text>
                <OuvirGravacao uri={gravacao.arquivoLocal}duracaoS={gravacao.duracaoS} desabilitado={etapa === 'enviando'} />
                <Botao titulo={etapa === 'enviando' ? 'Enviando' : 'Enviar áudio'} icone="paper-plane"
                    carregando={etapa === 'enviando'} aoTocar={enviar} />
                <Botao titulo="Descartar" tipo="contorno" icone="trash" desabilitado={etapa === 'enviando'} aoTocar={descartar} />
            </>}
        </View>
    );
}

/** Ouvir a própria gravação antes de enviar (arquivo do celular, sem internet) */
function OuvirGravacao({ uri, duracaoS, desabilitado }: { uri: string; duracaoS: number; desabilitado: boolean }) {
    const player = useAudioPlayer(uri);
    const status = useAudioPlayerStatus(player);

    // Ao enviar, a gravação para de tocar
    useEffect(() => { if (desabilitado) player.pause(); }, [desabilitado, player]);

    // Terminou: volta para o começo, pronto para ouvir de novo
    useEffect(() => {
        if (status.didJustFinish) player.seekTo(0).catch(() => { });
    }, [status.didJustFinish, player]);

    const alternar = () => {
        if (status.playing) { player.pause(); return; }
        pararAudio();
        pararDeFalar();
        player.play();
    };

    return (
        <Pressable onPress={alternar} disabled={desabilitado} accessibilityRole="button" accessibilityState={{ disabled: desabilitado }}
            accessibilityLabel={status.playing ? 'Parar' : `Ouvir a gravação, ${duracaoPorExtenso(duracaoS)}`}
            style={({ pressed }) => ({
                minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                borderRadius: 28, borderWidth: 2, borderColor: cores.secundaria, backgroundColor: '#FFFFFF', opacity: pressed ? 0.85 : 1,
            })}>
            <Ionicons name={status.playing ? 'stop' : 'play'} size={26} color={cores.secundaria} importantForAccessibility="no" />
            <Text style={{ fontSize: medidas.textoBotao, fontWeight: '700', color: cores.secundaria }}>
                {status.playing ? 'Parar' : `Ouvir a gravação (${formatarDuracao(duracaoS)})`}
            </Text>
        </Pressable>
    );
}
