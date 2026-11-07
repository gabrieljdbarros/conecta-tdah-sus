import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { anunciar, Aviso, Botao, Carregando, Tela } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import { Ilustracao } from "~/componentes/ilustracoes";
import { BotaoOuvir, SemVozLocal, useVozDisponivel } from "~/componentes/ouvir";
import { GravadorDeVoz, Gravacao, OuvirMensagemDeVoz } from "~/componentes/audio";
import { useAuth } from "~/contexto/AuthContext";
import { usePasta } from "~/ganchos/usePasta";
import MensagemServicos, { ControleConversa } from "~/servicos/mensagem";
import VistasServicos from "~/servicos/vistas";
import { cores, medidas } from "~/tema/cores";
import { MAX_TEXTO_MENSAGEM, Mensagem } from "@/types/mensagem";
import { ROLE_LABELS, UserRole } from "@/types/user";

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dia = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
type NomeIcone = keyof typeof Ionicons.glyphMap;

/**
 * Quem escreveu (decisão travada 7): um ÍCONE de cor por papel, sempre com
 * o nome e o papel escritos ao lado (a cor nunca é a única pista). As cores
 * da paleta ficam só no FUNDO do ícone, com o desenho em escuro (#242424
 * passa de 9:1 nas três); o nome é sempre escuro
 */
const VISUAL_PAPEL: Record<UserRole, { icone: NomeIcone; fundo: string }> = {
    mae: { icone: 'heart', fundo: '#FFC067' },
    escola: { icone: 'school', fundo: '#20BE36' },
    medico: { icone: 'medkit', fundo: '#EAD0FC' },
    admin: { icone: 'person', fundo: '#D1D5DB' },
};

function IconePapel({ papel }: { papel: UserRole }) {
    const { icone, fundo } = VISUAL_PAPEL[papel] ?? VISUAL_PAPEL.admin;
    return (
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: fundo, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icone} size={17} color={cores.texto} />
        </View>
    );
}

/**
 * CONVERSAS DA PASTA (RN05), em tempo real, com o design novo: o nome do
 * aluno no topo, balões brancos (os meus em lilás-claro, à direita), o
 * ícone do papel de quem escreveu e a data como separador. Quem vê a
 * conversa é dito no "Ouvir instruções" (o aviso fixo saiu em 07/11/2026,
 * para dar espaço às mensagens). Um só chat por pasta. Mensagens não são
 * editadas nem apagadas. Mensagens de texto e de voz (RF16)
 */
export default function Conversas() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { pasta, papel, carregando } = usePasta(id);
    const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
    const [erroCanal, setErroCanal] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erroEnvio, setErroEnvio] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);
    // Histórico (RF12): há mensagens anteriores às da tela?
    const [temAnteriores, setTemAnteriores] = useState(false);
    const [buscandoAnteriores, setBuscandoAnteriores] = useState(false);
    const [erroAnteriores, setErroAnteriores] = useState(false);
    const controle = useRef<ControleConversa | null>(null);
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
        const conversa = MensagemServicos.ouvir(pastaId, (novas, anteriores) => {
            // Mensagens novas dos OUTROS (depois da primeira carga) são anunciadas,
            // só com o nome de quem mandou (o texto não é falado sem pedir)
            if (conhecidas.current) {
                const chegaram = novas.filter((m) => !conhecidas.current!.has(m.id) && m.autorUid !== user?.uid);
                if (chegaram.length === 1) anunciar(`Nova mensagem${chegaram[0].tipo === 'audio' ? ' de voz' : ''} de ${chegaram[0].autorNome}.`);
                else if (chegaram.length > 1) anunciar(`${chegaram.length} mensagens novas.`);
            }
            conhecidas.current = new Set(novas.map((m) => m.id));
            // Conversa aberta = vista até a mensagem mais nova (a data é a do
            // servidor, não o relógio do celular). Só fica neste aparelho
            const maisNova = novas[novas.length - 1];
            if (maisNova && user?.uid) VistasServicos.marcar(user.uid, pastaId, maisNova.criadoEm);
            setMensagens(novas);
            setTemAnteriores(anteriores);
            setErroCanal(false);
        }, () => setErroCanal(true));
        controle.current = conversa;
        return () => { conversa.parar(); controle.current = null; };
    }, [pastaId, user?.uid]);

    /** HISTÓRICO (RF12): mais 100 mensagens antes das que estão na tela */
    const verAnteriores = async () => {
        if (!controle.current || buscandoAnteriores) return;
        setBuscandoAnteriores(true);
        setErroAnteriores(false);
        // A tela fica onde está (não desce para o fim)
        pertoDoFim.current = false;
        const ok = await controle.current.carregarAnteriores();
        setBuscandoAnteriores(false);
        if (!ok) { setErroAnteriores(true); return; }
        anunciar('Mensagens anteriores carregadas.');
    };

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

    const temTexto = !!texto.trim();

    return (
        <View style={{
            flex: 1, backgroundColor: cores.fundo, paddingLeft: insets.left, paddingRight: insets.right,
            // Margem dos botões do Android + o teclado, quando aberto
            paddingBottom: insets.bottom + alturaTeclado,
        }}>
            {/* Topo: girassol e o nome do aluno; à direita, as pessoas da pasta (convidar, ver quem está) */}
            <Stack.Screen options={{
                title: `Conversas sobre ${pasta.nomeAluno}`,
                headerTitle: () => (
                    <View accessible accessibilityRole="header" accessibilityLabel={`Conversas sobre ${pasta.nomeAluno}`}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                        <Ilustracao nome="girassol" altura={34} />
                        <View style={{ flexShrink: 1 }}>
                            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: 19, fontWeight: '800', color: cores.texto }}>{pasta.nomeAluno}</Text>
                            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: 14, color: cores.textoSuave }}>Pasta de acompanhamento</Text>
                        </View>
                    </View>
                ),
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerRight: () => (
                    <Pressable onPress={() => router.push({ pathname: '/pasta/[id]/vinculos', params: { id: pasta.id } })}
                        accessibilityRole="button" accessibilityLabel="Pessoas da pasta" accessibilityHint="Mostra quem está na pasta e os convites"
                        hitSlop={8} style={{ minWidth: medidas.toque, height: medidas.toque, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="people-outline" size={24} color={cores.link} />
                        {/* A palavra embaixo do ícone: nem todo mundo reconhece o desenho */}
                        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '700', color: cores.link }}>Pessoas</Text>
                    </Pressable>
                ),
            }} />
            <View style={{ flex: 1 }}>
                {/* Com o teclado aberto as instruções saem, para sobrar espaço para as mensagens */}
                {!tecladoAberto && (
                    <View style={{ padding: medidas.espaco, paddingBottom: 8 }}>
                        <BotaoOuvir rotulo="Ouvir instruções"
                            texto={`Aqui você conversa sobre o aluno com a família, a escola e os médicos da pasta. Todos veem todas as mensagens.${vozLocal ? ' Para ouvir uma mensagem, toque em Ouvir, dentro dela.' : ''} Para mandar uma mensagem, escreva no campo de baixo e toque em Enviar. Para mandar um áudio de até 2 minutos, deixe o campo vazio, toque em Gravar áudio, fale e toque em Parar. Ouça a gravação e toque em Enviar áudio. Para desistir, toque em Descartar. Depois de enviada, a mensagem não pode ser apagada.`} />
                    </View>
                )}

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
                        // Ao carregar as anteriores (no topo), a mensagem que estava na tela continua no lugar
                        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                        // No começo da conversa (sobe junto com ela)
                        ListHeaderComponent={
                            <View style={{ gap: 8 }}>
                                {vozLocal === false && <SemVozLocal oQue="mensagens" />}
                                {/* Histórico (RF12): as anteriores vêm de 100 em 100, só quando a pessoa pede (pouca internet) */}
                                {temAnteriores && (
                                    <Botao titulo="Ver mensagens anteriores" tipo="contorno" icone="time-outline"
                                        carregando={buscandoAnteriores} aoTocar={verAnteriores} />
                                )}
                                {erroAnteriores && <Aviso tipo="erro" texto="não deu para carregar as mensagens anteriores. Confira a internet e tente de novo." />}
                                {!temAnteriores && mensagens.length > 0 && <Text style={[estilos.suave, { textAlign: 'center' }]}>Início da conversa</Text>}
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
                                    {novoDia && (
                                        <Text accessibilityRole="header" style={[estilos.suave, {
                                            alignSelf: 'center', color: cores.texto, fontWeight: '600', fontSize: 15,
                                            backgroundColor: cores.fundoInfo, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2,
                                        }]}>{dia(m.criadoEm)}</Text>
                                    )}
                                    <View style={{
                                        alignSelf: minha ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 8, padding: 12, borderWidth: 1,
                                        borderRadius: 16, borderTopLeftRadius: minha ? 16 : 4, borderTopRightRadius: minha ? 4 : 16,
                                        backgroundColor: minha ? '#F3E6FD' : '#FFFFFF', borderColor: minha ? '#E2CBF5' : cores.bordaCartao,
                                    }}>
                                        {/* Lida de uma vez: "Fulano (Médico), 10:30: texto" */}
                                        <View accessible accessibilityLabel={`${autor}, ${hora(m.criadoEm)}: ${voz ? (m.audioApagado ? 'mensagem de voz apagada' : 'mensagem de voz') : m.texto}`}
                                            style={{ gap: 4 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <IconePapel papel={m.autorPapel} />
                                                <Text style={{ fontSize: 16, fontWeight: '800', color: cores.texto, flexShrink: 1 }}>
                                                    {minha ? 'Você' : m.autorNome}<Text style={{ fontWeight: '400', color: cores.textoSuave }}> · {ROLE_LABELS[m.autorPapel]}</Text>
                                                </Text>
                                            </View>
                                            {!voz && <Text style={{ fontSize: 17, lineHeight: 24, color: cores.texto }}>{m.texto}</Text>}
                                        </View>
                                        {voz && <OuvirMensagemDeVoz mensagem={m} descricao={minha ? 'sua mensagem' : `mensagem de ${m.autorNome}`} />}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            {/* Conteúdo: só com voz do aparelho. Nas próprias mensagens
                                                não aparece (a pessoa acabou de escrever) */}
                                            {!minha && !voz
                                                ? <BotaoOuvir conteudo disponivel={vozLocal} pequeno
                                                    texto={`${m.autorNome} escreveu: ${m.texto}`} descricao={`mensagem de ${m.autorNome}`} />
                                                : <View />}
                                            {/* A hora já está no que o leitor de tela fala */}
                                            <Text importantForAccessibility="no" accessibilityElementsHidden style={{ fontSize: 14, color: cores.textoSuave }}>{hora(m.criadoEm)}</Text>
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
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                            {/* Corretor desligado: o teclado não aprende termos de saúde */}
                            <TextInput value={texto} onChangeText={escrever} multiline maxLength={MAX_TEXTO_MENSAGEM}
                                accessibilityLabel="Escreva sua mensagem" placeholder="Escreva sua mensagem" placeholderTextColor={cores.borda}
                                autoCorrect={false} spellCheck={false} autoComplete="off" importantForAutofill="no"
                                style={{
                                    flex: 1, minHeight: 56, maxHeight: 140, borderWidth: 1, borderColor: cores.borda, borderRadius: 28,
                                    paddingHorizontal: 18, paddingVertical: 14, fontSize: medidas.texto, color: cores.texto, backgroundColor: '#FFFFFF',
                                }} />
                            {/* Um botão só, como nos apps de mensagem: campo vazio grava áudio; com texto, envia */}
                            <BotaoRedondo
                                rotulo={temTexto ? (enviando ? 'Enviando' : 'Enviar') : 'Gravar áudio'}
                                icone={temTexto ? 'paper-plane' : 'mic'} carregando={enviando}
                                aoTocar={temTexto ? enviar : abrirGravador} />
                        </View>
                    </>}
                </View>
            </View>
        </View>
    );
}

/**
 * Botão redondo do chat (enviar / gravar). Laranja com ícone branco (ícone
 * precisa de 3:1; o laranja dá 3,1:1) e o nome escrito embaixo, em escuro,
 * para quem não reconhece o ícone
 */
function BotaoRedondo({ rotulo, icone, aoTocar, carregando = false }: { rotulo: string; icone: NomeIcone; aoTocar: () => void; carregando?: boolean }) {
    return (
        <Pressable onPress={aoTocar} disabled={carregando} accessibilityRole="button" accessibilityLabel={rotulo}
            accessibilityState={{ busy: carregando, disabled: carregando }} style={{ alignItems: 'center', gap: 2, minWidth: 76 }}>
            {({ pressed }) => <>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: cores.destaque, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 }}>
                    {carregando ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name={icone} size={26} color="#FFFFFF" />}
                </View>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: '700', color: cores.texto, textAlign: 'center' }}>{rotulo}</Text>
            </>}
        </Pressable>
    );
}
