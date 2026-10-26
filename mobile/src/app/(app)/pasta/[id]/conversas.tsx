import { useEffect, useRef, useState } from "react";
import { FlatList, Keyboard, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { anunciar, Aviso, Botao, Carregando, Tela } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import { BotaoOuvir, SemVozLocal, useVozDisponivel } from "~/componentes/ouvir";
import { GravadorDeVoz, Gravacao, OuvirMensagemDeVoz } from "~/componentes/audio";
import { useAuth } from "~/contexto/AuthContext";
import { usePasta } from "~/ganchos/usePasta";
import MensagemServicos from "~/servicos/mensagem";
import { cores, medidas } from "~/tema/cores";
import { LIMITE_MENSAGENS, MAX_TEXTO_MENSAGEM, Mensagem } from "@/types/mensagem";
import { ROLE_LABELS } from "@/types/user";

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dia = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const iniciais = (nome: string) => {
    const p = nome.trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

/**
 * CONVERSAS DA PASTA (RN05), em tempo real, como na web e no design:
 * balões (os dos outros em verde-claro com as iniciais; os meus em lilás),
 * a data como separador e "quem vê" sempre visível. Um só chat por pasta. Mensagens não são
 * editadas nem apagadas. Mensagens de texto e de voz (RF16)
 */
export default function Conversas() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { pasta, papel, carregando } = usePasta(id);
    const { fontScale } = useWindowDimensions();
    const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
    const [erroCanal, setErroCanal] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erroEnvio, setErroEnvio] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);
    const lista = useRef<FlatList<Mensagem>>(null);
    const conhecidas = useRef<Set<string> | null>(null);
    const pertoDoFim = useRef(true);
    const insets = useSafeAreaInsets();
    const [alturaTeclado, setAlturaTeclado] = useState(0);
    const tecladoAberto = alturaTeclado > 0;
    // Verificada uma vez para a lista inteira (não em cada mensagem)
    const vozLocal = useVozDisponivel(true);

    // TECLADO: no Android "de ponta a ponta" a janela não encolhe e o
    // KeyboardAvoidingView não basta. Esta tela vai até o fim da tela do
    // celular, então sobe o campo pela altura do teclado (que o Android informa
    // SEM a barra dos botões; essa margem já é somada abaixo)
    useEffect(() => {
        const abriu = Keyboard.addListener('keyboardDidShow', (e) => setAlturaTeclado(e.endCoordinates.height));
        const fechou = Keyboard.addListener('keyboardDidHide', () => setAlturaTeclado(0));
        return () => { abriu.remove(); fechou.remove(); };
    }, []);

    // Só abre a conversa de quem tem papel na pasta
    const pastaId = pasta && papel ? pasta.id : undefined;

    // Acompanha a conversa; para de acompanhar ao sair da tela.
    // Depende só do ID da pasta: a pasta é recarregada ao voltar à tela
    useEffect(() => {
        if (!pastaId) return;
        conhecidas.current = null;
        pertoDoFim.current = true;
        return MensagemServicos.ouvir(pastaId, (novas) => {
            // Mensagens novas dos OUTROS (depois da primeira carga) são anunciadas,
            // só com o nome de quem mandou (o texto não é falado sem pedir)
            if (conhecidas.current) {
                const chegaram = novas.filter((m) => !conhecidas.current!.has(m.id) && m.autorUid !== user?.uid);
                if (chegaram.length === 1) anunciar(`Nova mensagem${chegaram[0].tipo === 'audio' ? ' de voz' : ''} de ${chegaram[0].autorNome}.`);
                else if (chegaram.length > 1) anunciar(`${chegaram.length} mensagens novas.`);
            }
            conhecidas.current = new Set(novas.map((m) => m.id));
            setMensagens(novas);
            setErroCanal(false);
        }, () => setErroCanal(true));
    }, [pastaId, user?.uid]);

    if (carregando) return <Tela><Stack.Screen options={{ title: 'Conversas' }} /><Carregando texto="Abrindo as conversas..." /></Tela>;
    if (!pasta || !papel || !user) return <Tela><Stack.Screen options={{ title: 'Conversas' }} /><Aviso tipo="erro" texto="não foi possível abrir as conversas desta pasta." /></Tela>;

    const escrever = (t: string) => { setTexto(t); setErroEnvio(null); };

    const enviar = async () => {
        const limpo = texto.trim();
        if (!limpo || enviando) return;
        setEnviando(true);
        setErroEnvio(null);
        const { success, semConexao } = await MensagemServicos.enviar(pasta.id, user, papel, limpo);
        setEnviando(false);
        if (success) {
            setTexto('');
            pertoDoFim.current = true;
            anunciar('Mensagem enviada.');
        } else setErroEnvio(semConexao
            ? 'sem resposta da internet. Se a mensagem não aparecer na conversa, envie de novo.'
            : 'a mensagem não foi enviada. Tente de novo.');
    };

    /** Devolve o erro para o painel de gravação mostrar (ou null se enviou) */
    const enviarAudio = async (gravacao: Gravacao): Promise<string | null> => {
        const { success, semConexao } = await MensagemServicos.enviarAudio(pasta.id, user, papel, gravacao);
        if (!success) return semConexao
            ? 'sem resposta da internet. Se o áudio não aparecer na conversa, envie de novo.'
            : 'o áudio não foi enviado. Tente de novo.';
        pertoDoFim.current = true;
        anunciar('Áudio enviado.');
        return null;
    };

    const abrirGravador = () => { setErroEnvio(null); setGravando(true); };
    const fecharGravador = (aviso?: string) => { setGravando(false); setErroEnvio(aviso ?? null); };

    const fonteGrande = fontScale > 1.3;

    return (
        <View style={{
            flex: 1, backgroundColor: cores.fundo, paddingLeft: insets.left, paddingRight: insets.right,
            // Margem dos botões do Android + o teclado, quando aberto
            paddingBottom: insets.bottom + alturaTeclado,
        }}>
            <Stack.Screen options={{ title: 'Conversas' }} />
            <View style={{ flex: 1 }}>
                <View style={{ padding: medidas.espaco, paddingBottom: 8, gap: 10 }}>
                    {/* Com o teclado aberto o título e as instruções saem, para sobrar espaço para as mensagens */}
                    {!tecladoAberto && <>
                        <Text accessibilityRole="header" style={estilos.tituloSecao}>Conversas sobre {pasta.nomeAluno}</Text>
                        <BotaoOuvir rotulo="Ouvir instruções"
                            texto={`Aqui você conversa sobre o aluno com a família, a escola e os médicos da pasta. Todos veem todas as mensagens.${vozLocal ? ' Para ouvir uma mensagem, toque em Ouvir, dentro dela.' : ''} Para mandar uma mensagem, escreva no campo de baixo e toque em Enviar. Para mandar um áudio de até 2 minutos, toque em Gravar áudio, fale e toque em Parar. Ouça a gravação e toque em Enviar áudio. Para desistir, toque em Descartar. Depois de enviada, a mensagem não pode ser apagada.`} />
                    </>}

                    {/* QUEM VÊ esta conversa (privacidade: sempre visível) */}
                    <View accessible style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: cores.fundoInfo, borderRadius: medidas.raio, paddingHorizontal: 10, paddingVertical: 8 }}>
                        <Ionicons name="eye" size={20} color={cores.secundaria} importantForAccessibility="no" />
                        <Text style={[estilos.texto, { flexShrink: 1, fontSize: 16 }]}>Família, escola e médicos da pasta veem esta conversa.</Text>
                    </View>
                </View>

                {/* MENSAGENS */}
                {mensagens === null && !erroCanal && <Carregando texto="Carregando as mensagens..." />}
                {erroCanal && <View style={{ paddingHorizontal: medidas.espaco }}><Aviso tipo="erro" texto="não deu para carregar as mensagens. Confira a internet, volte e abra de novo." /></View>}
                {mensagens !== null && (
                    <FlatList ref={lista} data={mensagens} keyExtractor={(m) => m.id}
                        style={{ flex: 1 }} contentContainerStyle={{ padding: medidas.espaco, gap: 10 }}
                        // Só desce sozinho se a pessoa já estava no fim: quem relê
                        // mensagens antigas não é puxado para baixo
                        onScroll={({ nativeEvent: e }) => { pertoDoFim.current = e.contentOffset.y + e.layoutMeasurement.height >= e.contentSize.height - 80; }}
                        scrollEventThrottle={200}
                        onContentSizeChange={() => { if (pertoDoFim.current) lista.current?.scrollToEnd({ animated: false }); }}
                        // No começo da conversa (sobe junto com ela)
                        ListHeaderComponent={
                            <View style={{ gap: 8 }}>
                                {vozLocal === false && <SemVozLocal oQue="mensagens" />}
                                {mensagens.length >= LIMITE_MENSAGENS && <Text style={[estilos.suave, { textAlign: 'center' }]}>Mostrando as {LIMITE_MENSAGENS} mensagens mais recentes.</Text>}
                            </View>
                        }
                        ListEmptyComponent={<Text style={[estilos.texto, { textAlign: 'center' }]}>Ainda não há mensagens. Escreva a primeira!</Text>}
                        renderItem={({ item: m, index }) => {
                            const minha = m.autorUid === user.uid;
                            const novoDia = index === 0 || dia(mensagens[index - 1].criadoEm) !== dia(m.criadoEm);
                            const autor = minha ? 'Você' : `${m.autorNome} (${ROLE_LABELS[m.autorPapel]})`;
                            const voz = m.tipo === 'audio';
                            return (
                                <View style={{ gap: 10 }}>
                                    {novoDia && <Text accessibilityRole="header" style={[estilos.suave, { textAlign: 'center' }]}>{dia(m.criadoEm)}</Text>}
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: minha ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                                        {!minha && (
                                            <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
                                                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cores.secundaria, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text maxFontSizeMultiplier={1.2} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{iniciais(m.autorNome)}</Text>
                                            </View>
                                        )}
                                        <View style={{
                                            flexShrink: 1, borderRadius: 16, padding: 12, borderWidth: 1, gap: 8,
                                            backgroundColor: minha ? '#EEF0FF' : '#E3F5F2', borderColor: minha ? '#C7CCF5' : '#B8E2DC',
                                        }}>
                                            {/* Lida de uma vez: "Fulano (Médico), 10:30: texto" */}
                                            <View accessible accessibilityLabel={`${autor}, ${hora(m.criadoEm)}: ${voz ? (m.audioApagado ? 'mensagem de voz apagada' : 'mensagem de voz') : m.texto}`}>
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>
                                                    {autor}<Text style={{ fontWeight: '400', color: cores.textoSuave }}> · {hora(m.criadoEm)}</Text>
                                                </Text>
                                                {!voz && <Text style={{ fontSize: 17, lineHeight: 24, color: cores.texto }}>{m.texto}</Text>}
                                            </View>
                                            {voz && <OuvirMensagemDeVoz mensagem={m} descricao={minha ? 'você' : m.autorNome} />}
                                            {/* Conteúdo: só com voz do aparelho. Nas próprias mensagens
                                                não aparece (a pessoa acabou de escrever) */}
                                            {!minha && !voz && (
                                                <BotaoOuvir conteudo disponivel={vozLocal} pequeno
                                                    texto={`${m.autorNome} escreveu: ${m.texto}`} descricao={`mensagem de ${m.autorNome}`} />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        }} />
                )}

                {/* ENVIAR */}
                <View style={{ padding: medidas.espaco, paddingTop: 8, gap: 8, borderTopWidth: 1, borderTopColor: cores.bordaCartao, backgroundColor: '#FFFFFF' }}>
                    {erroEnvio && <Aviso tipo="erro" texto={erroEnvio} />}
                    {gravando ? <GravadorDeVoz aoEnviar={enviarAudio} aoFechar={fecharGravador} /> : <>
                        {/* Aparece antes de tocar no campo; com o teclado aberto sai para dar espaço */}
                        {!tecladoAberto && <Text style={estilos.suave}>Depois de enviada, a mensagem não pode ser apagada.</Text>}
                        <View style={{ flexDirection: fonteGrande ? 'column' : 'row', gap: 8, alignItems: fonteGrande ? 'stretch' : 'flex-end' }}>
                            {/* Corretor desligado: o teclado não aprende termos de saúde */}
                            <TextInput value={texto} onChangeText={escrever} multiline maxLength={MAX_TEXTO_MENSAGEM}
                                accessibilityLabel="Escreva sua mensagem" placeholder="Escreva sua mensagem" placeholderTextColor={cores.borda}
                                autoCorrect={false} spellCheck={false} autoComplete="off" importantForAutofill="no"
                                style={{
                                    flex: fonteGrande ? undefined : 1, minHeight: medidas.toque, maxHeight: 140, borderWidth: 1, borderColor: cores.borda, borderRadius: 24,
                                    paddingHorizontal: 16, paddingVertical: 12, fontSize: medidas.texto, color: cores.texto, backgroundColor: '#FFFFFF',
                                }} />
                            <View style={fonteGrande ? undefined : { minWidth: 120 }}>
                                <Botao titulo={enviando ? 'Enviando' : 'Enviar'} icone="paper-plane" carregando={enviando} desabilitado={!texto.trim()} aoTocar={enviar} />
                            </View>
                        </View>
                        {/* Quem está escrevendo (teclado aberto) não precisa do botão de gravar */}
                        {!tecladoAberto && <Botao titulo="Gravar áudio" tipo="contorno" icone="mic" desabilitado={enviando} aoTocar={abrirGravador} />}
                    </>}
                </View>
            </View>
        </View>
    );
}
