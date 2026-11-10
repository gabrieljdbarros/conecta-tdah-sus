import { createContext, ReactNode, Ref, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
    AccessibilityInfo, ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Pressable, ScrollView,
    StyleSheet, Text, TextInput, TextInputProps, View,
} from "react-native";
import { Edge, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Ilustracao } from "~/componentes/ilustracoes";
import { cores, medidas } from "~/tema/cores";

type NomeIcone = keyof typeof Ionicons.glyphMap;

/**
 * COMPONENTES BÁSICOS DO APP, equivalentes aos de src/themes/components da web,
 * com a acessibilidade do celular (TalkBack/VoiceOver):
 *  - accessibilityRole e accessibilityLabel em tudo que é tocável
 *  - alvo de toque de no mínimo 48 e texto de no mínimo 16
 *  - o texto acompanha o "tamanho da fonte" do celular (nada de tamanho travado)
 *  - avisos e erros são ANUNCIADOS pelo leitor de tela quando aparecem
 */

/**
 * Fala um aviso no TalkBack/VoiceOver (funciona nos dois sistemas). Espera um
 * pouco: assim não atropela o que o leitor fala ao tocar ("marcado", o nome
 * do botão) nem a troca de tela
 */
export function anunciar(texto: string, esperaMs = 450) {
    setTimeout(() => AccessibilityInfo.announceForAccessibility(texto), esperaMs);
}

/** Leva o foco do leitor de tela até um elemento (ex.: a primeira opção com erro) */
export function focarLeitor(elemento: View | null) {
    if (elemento) setTimeout(() => AccessibilityInfo.sendAccessibilityEvent(elemento, 'focus'), 450);
}

/**
 * Espaço livre no fim das telas das abas: a barra de abas FLUTUA por cima do
 * conteúdo, então o último item precisa poder rolar até acima dela
 */
export function useEspacoBarraAbas() {
    const { bottom } = useSafeAreaInsets();
    return medidas.barraAbas + medidas.margemBarraAbas + bottom + 24;
}

/**
 * Cabeçalho das telas (telas novas), no lugar da barra cinza: o nome do app
 * pequeno em azul, o título grande e o girassol, como na Início. Nas telas
 * que abrem por cima de outra, a seta de voltar (alvo de 48) à esquerda.
 * O leitor de tela lê "Conecta TDAH SUS, título" como cabeçalho
 */
export function Cabecalho({ titulo, aoVoltar }: { titulo: string; aoVoltar?: () => void }) {
    return (
        // Sem linha embaixo: separa só pelo branco sobre o fundo da tela, igual à Início
        <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: '#FFFFFF' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: aoVoltar ? 4 : medidas.espaco, paddingRight: medidas.espaco, paddingVertical: 10 }}>
                {aoVoltar && (
                    <Pressable onPress={aoVoltar} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={4}
                        android_ripple={{ color: '#E5E7EB', borderless: true }} style={estilos.olho}>
                        <Ionicons name="arrow-back" size={28} color={cores.texto} />
                    </Pressable>
                )}
                <View style={{ flex: 1 }} accessible accessibilityRole="header" accessibilityLabel={`Conecta TDAH SUS, ${titulo}`}>
                    <Text maxFontSizeMultiplier={1.3} style={estilos.marca}>CONECTA TDAH SUS</Text>
                    <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={{ fontSize: 24, fontWeight: '800', color: cores.texto }}>{titulo}</Text>
                </View>
                <Ilustracao nome="girassol" altura={44} />
            </View>
        </SafeAreaView>
    );
}

/**
 * Topo das ABAS (Início, Pastas, Perfil), decidido em 10/11/2026: sem a
 * faixa branca do cabeçalho, que nas abas não volta para lugar nenhum. O
 * título grande e o girassol ficam dentro da página e rolam com ela.
 * `marca`: o "CONECTA TDAH SUS" pequeno em cima (só na Início).
 * `titulo` pode ter partes em destaque; `falado` é o que o leitor de tela lê
 */
export function TopoDaAba({ titulo, falado, marca = false, children }: {
    titulo: ReactNode; falado: string; marca?: boolean; children?: ReactNode;
}) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }} accessible accessibilityRole="header" accessibilityLabel={marca ? `Conecta TDAH SUS, ${falado}` : falado}>
                {marca && <Text maxFontSizeMultiplier={1.3} style={estilos.marca}>CONECTA TDAH SUS</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: cores.texto, flexShrink: 1 }}>{titulo}</Text>
                    {children}
                </View>
            </View>
            <Ilustracao nome="girassol" altura={48} />
        </View>
    );
}

/**
 * Campo com foco: a Tela rola até ele ficar acima do teclado. Os campos
 * avisam quando recebem o foco (o teclado pode já estar aberto, ao passar
 * do e-mail para a senha)
 */
const TelaTeclado = createContext<() => void>(() => { });

/**
 * Tela com rolagem, área segura e teclado.
 * - `branco`: fundo branco, obrigatório quando há título laranja (sobre o
 *   lilás do fundo o laranja cai para 2,9:1 e reprova)
 * - `semCabecalho`: sem a barra do topo, a própria tela desvia da barra de
 *   status do celular (no Android atual o app ocupa a tela inteira)
 * - `emAba`: tela dentro das abas. A barra de abas já desvia dos botões do
 *   Android; sem isto, sobraria uma faixa vazia em cima dela
 *
 * TECLADO: em alguns Android (testado num Samsung com o Expo Go) o ajuste
 * automático do React Native não move nada e o teclado cobre os campos.
 * Por isso a própria tela cuida disso: com o teclado aberto, ganha um
 * espaço no fim do tamanho dele (para poder rolar) e rola até o campo em
 * uso ficar visível acima do teclado
 */
export function Tela({ children, centralizar = false, branco = false, semCabecalho = false, emAba = false }: {
    children: ReactNode; centralizar?: boolean; branco?: boolean; semCabecalho?: boolean; emAba?: boolean;
}) {
    const bordas: Edge[] = [...(semCabecalho ? ['top' as const] : []), ...(emAba ? [] : ['bottom' as const]), 'left', 'right'];
    const espacoBarra = useEspacoBarraAbas();
    const rolagem = useRef<ScrollView>(null);
    const deslocamento = useRef(0);
    // Topo do teclado na tela (null: fechado) e a altura dele
    const topoTeclado = useRef<number | null>(null);
    const [alturaTeclado, setAlturaTeclado] = useState(0);

    const mostrarCampo = useCallback(() => {
        // Espera o teclado e o espaço do fim aparecerem antes de medir
        setTimeout(() => {
            const campo = TextInput.State.currentlyFocusedInput();
            const topo = topoTeclado.current;
            if (!campo || topo === null) return;
            campo.measureInWindow((_x, y, _l, altura) => {
                const falta = y + altura + 24 - topo;
                if (falta > 0) rolagem.current?.scrollTo({ y: deslocamento.current + falta, animated: true });
            });
        }, 120);
    }, []);

    useEffect(() => {
        const abriu = Keyboard.addListener('keyboardDidShow', (e) => {
            topoTeclado.current = e.endCoordinates.screenY;
            setAlturaTeclado(e.endCoordinates.height);
            mostrarCampo();
        });
        const fechou = Keyboard.addListener('keyboardDidHide', () => {
            topoTeclado.current = null;
            setAlturaTeclado(0);
        });
        return () => { abriu.remove(); fechou.remove(); };
    }, [mostrarCampo]);

    return (
        <SafeAreaView style={[estilos.tela, branco && { backgroundColor: '#FFFFFF' }]} edges={bordas}>
            <TelaTeclado.Provider value={mostrarCampo}>
                <ScrollView ref={rolagem} contentContainerStyle={[estilos.conteudo, emAba && { paddingBottom: espacoBarra }, centralizar && { flexGrow: 1, justifyContent: 'center' }]}
                    keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
                    onScroll={(e) => { deslocamento.current = e.nativeEvent.contentOffset.y; }}>
                    {children}
                    {/* Espaço do tamanho do teclado: o último campo consegue subir acima dele */}
                    {alturaTeclado > 0 && <View style={{ height: alturaTeclado }} />}
                </ScrollView>
            </TelaTeclado.Provider>
        </SafeAreaView>
    );
}

/** Título grande (h1/h2). `destaque`: laranja, só em tamanho grande sobre branco */
export function Titulo({ children, destaque = false, nivel = 1 }: { children: ReactNode; destaque?: boolean; nivel?: 1 | 2 }) {
    return (
        <Text accessibilityRole="header"
            style={[estilos.titulo, nivel === 2 && estilos.titulo2, destaque && { color: cores.destaque }]}>
            {children}
        </Text>
    );
}

export function Paragrafo({ children, suave = false }: { children: ReactNode; suave?: boolean }) {
    return <Text style={[estilos.paragrafo, suave && { color: cores.textoSuave }]}>{children}</Text>;
}

/**
 * Botão. "solido": laranja com texto branco 19 negrito (texto grande);
 * "contorno": azul. Desabilitado fica cinza com texto escuro (legível)
 */
export function Botao({ titulo, aoTocar, tipo = 'solido', icone, desabilitado = false, carregando = false, dica }: {
    titulo: string; aoTocar: () => void; tipo?: 'solido' | 'contorno'; icone?: NomeIcone;
    desabilitado?: boolean; carregando?: boolean; dica?: string;
}) {
    const bloqueado = desabilitado || carregando;
    const solido = tipo === 'solido';
    const corTexto = bloqueado && solido ? cores.textoDesabilitado : solido ? '#FFFFFF' : cores.link;
    return (
        <Pressable onPress={aoTocar} disabled={bloqueado}
            accessibilityRole="button" accessibilityLabel={titulo} accessibilityHint={dica}
            accessibilityState={{ disabled: bloqueado, busy: carregando }}
            style={({ pressed }) => [
                estilos.botao,
                solido ? { backgroundColor: bloqueado ? cores.desabilitado : cores.destaque, borderColor: bloqueado ? cores.desabilitado : cores.destaque }
                    : { backgroundColor: '#FFFFFF', borderColor: cores.link },
                pressed && { opacity: 0.85 },
            ]}>
            {carregando ? <ActivityIndicator color={corTexto} /> : icone && <Ionicons name={icone} size={22} color={corTexto} />}
            <Text style={[solido ? estilos.textoBotaoSolido : estilos.textoBotaoContorno, { color: corTexto }]}>{titulo}</Text>
        </Pressable>
    );
}

/** Link de texto (azul e sublinhado, alvo de 48) */
export function LinkTexto({ titulo, aoTocar, dica }: { titulo: string; aoTocar: () => void; dica?: string }) {
    return (
        <Pressable onPress={aoTocar} accessibilityRole="link" accessibilityLabel={titulo} accessibilityHint={dica}
            style={estilos.link} hitSlop={8}>
            <Text style={estilos.textoLink}>{titulo}</Text>
        </Pressable>
    );
}

/**
 * Campo de texto com rótulo visível. O nome lido pelo leitor de tela é o
 * rótulo e, havendo erro, "rótulo. Erro: ..." (sempre lido, mesmo com as
 * dicas do TalkBack desligadas). `ref` permite levar o foco ao campo
 */
export function Campo({ rotulo, erro, senha = false, ref, ...props }: TextInputProps & {
    rotulo: string; erro?: string; senha?: boolean; ref?: Ref<TextInput>;
}) {
    const [mostrar, setMostrar] = useState(false);
    const [focado, setFocado] = useState(false);
    const mostrarCampo = useContext(TelaTeclado);
    // editable={false}: campo travado (ex.: e-mail no perfil), cinza com texto escuro (AA)
    const travado = props.editable === false;
    return (
        <View style={estilos.grupoCampo}>
            <Text style={estilos.rotulo} accessibilityElementsHidden importantForAccessibility="no">{rotulo}</Text>
            <View style={[estilos.caixaCampo, travado && estilos.caixaTravada, focado && estilos.caixaFocada, !!erro && estilos.caixaErro]}>
                {/* Senha: sem maiúscula automática nem corretor (o teclado não muda nem
                    aprende o que a pessoa digita). Vem antes de {...props}: a tela pode trocar */}
                <TextInput {...(senha && { autoCapitalize: 'none' as const, autoCorrect: false, spellCheck: false })} {...props} ref={ref}
                    accessibilityLabel={erro ? `${rotulo}. Erro: ${erro}` : rotulo}
                    accessibilityState={travado ? { disabled: true } : undefined}
                    secureTextEntry={senha && !mostrar}
                    placeholderTextColor={cores.borda}
                    onFocus={(e) => { setFocado(true); mostrarCampo(); props.onFocus?.(e); }}
                    onBlur={(e) => { setFocado(false); props.onBlur?.(e); }}
                    style={[estilos.entrada, travado && { color: cores.textoDesabilitado }, props.multiline && { minHeight: 160, textAlignVertical: 'top' }]} />
                {senha && (
                    <Pressable onPress={() => setMostrar(!mostrar)} accessibilityRole="switch"
                        accessibilityLabel="Mostrar senha" accessibilityState={{ checked: mostrar }} style={estilos.olho}>
                        <Ionicons name={mostrar ? 'eye-off' : 'eye'} size={24} color={cores.textoSuave} />
                    </Pressable>
                )}
            </View>
            {/* O erro já faz parte do nome do campo: aqui é só para quem enxerga */}
            {!!erro && <Text style={estilos.textoErro} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>Erro: {erro}</Text>}
        </View>
    );
}

/**
 * Escolha de uma opção (no lugar do <select> da web, que não existe no
 * celular): botões grandes, o escolhido marcado (radio). Cada opção diz o
 * nome do grupo ("Tipo de perfil: Escola"), porque o TalkBack nem sempre
 * anuncia o grupo
 */
export function Opcoes<T extends string>({ rotulo, opcoes, valor, aoEscolher, erro, refPrimeira }: {
    rotulo: string; opcoes: { valor: T; titulo: string; descricao?: string }[]; valor: T | ''; aoEscolher: (v: T) => void; erro?: string;
    /** Primeira opção (para levar o foco até ela quando o grupo tem erro) */
    refPrimeira?: Ref<View>;
}) {
    return (
        <View style={estilos.grupoCampo} accessibilityRole="radiogroup">
            <Text style={estilos.rotulo} accessibilityElementsHidden importantForAccessibility="no">{rotulo}</Text>
            {opcoes.map((o, i) => {
                const marcado = o.valor === valor;
                return (
                    <Pressable key={o.valor} onPress={() => aoEscolher(o.valor)} ref={i === 0 ? refPrimeira : undefined}
                        accessibilityRole="radio" accessibilityState={{ checked: marcado }}
                        accessibilityLabel={`${rotulo}: ${o.titulo}${o.descricao ? `. ${o.descricao}` : ''}${i === 0 && erro ? `. Erro: ${erro}` : ''}`}
                        style={[estilos.opcao, marcado && estilos.opcaoMarcada]}>
                        <Ionicons name={marcado ? 'radio-button-on' : 'radio-button-off'} size={24} color={marcado ? cores.link : cores.textoSuave} />
                        <View style={{ flexShrink: 1 }}>
                            <Text style={[estilos.textoOpcao, marcado && { fontWeight: '700' }]}>{o.titulo}</Text>
                            {o.descricao && <Text style={{ fontSize: 16, color: cores.textoSuave }}>{o.descricao}</Text>}
                        </View>
                    </Pressable>
                );
            })}
            {!!erro && <Text style={estilos.textoErro} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>Erro: {erro}</Text>}
        </View>
    );
}

/**
 * Abas de escolha lado a lado (ex.: Responsável / Escola / Médico no
 * cadastro, design da Daya). Para o leitor de tela é um grupo de opções
 * (radio): cada uma diz o nome do grupo e se está marcada. A marcada fica
 * azul com texto branco (7,1:1) e em negrito (não depende só da cor)
 */
export function Segmentado<T extends string>({ rotulo, opcoes, valor, aoEscolher }: {
    rotulo: string; valor: T; aoEscolher: (v: T) => void;
    /** `falado`: nome completo para o leitor de tela (na tela vai o curto) */
    opcoes: { valor: T; titulo: string; falado?: string }[];
}) {
    return (
        <View style={estilos.grupoCampo}>
            <Text style={estilos.rotulo} accessibilityElementsHidden importantForAccessibility="no">{rotulo}</Text>
            <View style={estilos.segmentado} accessibilityRole="radiogroup">
                {opcoes.map((o, i) => {
                    const marcado = o.valor === valor;
                    return (
                        <Pressable key={o.valor} onPress={() => aoEscolher(o.valor)}
                            accessibilityRole="radio" accessibilityState={{ checked: marcado }} accessibilityLabel={`${rotulo}: ${o.falado ?? o.titulo}, ${i + 1} de ${opcoes.length}`}
                            style={[estilos.segmento, marcado && { backgroundColor: cores.link }]}>
                            {/* Com a fonte grande do celular, quebra a linha em vez de encolher */}
                            <Text style={{ fontSize: 16, textAlign: 'center', fontWeight: marcado ? '800' : '600', color: marcado ? '#FFFFFF' : cores.texto }}>{o.titulo}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

/**
 * Janela que sobe da parte de baixo da tela (design da Daya: "Esqueceu sua
 * senha?", convite, cadastrar estudante). Acessível:
 *  - o leitor de tela fica preso dentro dela (accessibilityViewIsModal) e
 *    anuncia o título ao abrir;
 *  - fecha pelo X ("Fechar"), tocando fora ou com o "voltar" do Android
 */
export function Janela({ visivel, titulo, descricao, icone, aoFechar, children }: {
    visivel: boolean; titulo: string; descricao?: string; icone?: NomeIcone; aoFechar: () => void; children: ReactNode;
}) {
    useEffect(() => { if (visivel) anunciar(descricao ? `${titulo}. ${descricao}` : titulo, 600); }, [visivel, titulo, descricao]);
    return (
        <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar} statusBarTranslucent navigationBarTranslucent>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                {/* Fundo escurecido: tocar fora fecha (o leitor de tela usa o X) */}
                <Pressable style={estilos.fundoJanela} onPress={aoFechar} importantForAccessibility="no" accessibilityElementsHidden />
                <SafeAreaView edges={['bottom']} style={estilos.janela} accessibilityViewIsModal>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        {icone && (
                            <View style={estilos.iconeJanela} importantForAccessibility="no">
                                <Ionicons name={icone} size={26} color={cores.link} />
                            </View>
                        )}
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text accessibilityRole="header" style={estilos.tituloJanela}>{titulo}</Text>
                            {descricao && <Text style={{ fontSize: 17, lineHeight: 24, color: cores.textoSuave }}>{descricao}</Text>}
                        </View>
                        <Pressable onPress={aoFechar} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} style={estilos.olho}>
                            <Ionicons name="close" size={28} color={cores.texto} />
                        </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={{ gap: 12, paddingTop: 16 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/**
 * Mensagem de erro, sucesso ou informação. É FALADA pelo leitor de tela
 * quando aparece ou muda (announceForAccessibility funciona no Android e no
 * iOS). O texto começa com "Erro:" ou "Pronto:" (não depende só da cor)
 */
export function Aviso({ tipo, texto, silencioso = false }: {
    tipo: 'erro' | 'sucesso' | 'info'; texto: string;
    /** A tela já falou a mensagem (ex.: ao tocar em enviar): não repete */
    silencioso?: boolean;
}) {
    const cor = tipo === 'erro' ? cores.erro : tipo === 'sucesso' ? cores.sucesso : cores.texto;
    const fundo = tipo === 'erro' ? cores.fundoErro : tipo === 'sucesso' ? '#F0FDF4' : cores.fundoInfo;
    const prefixo = tipo === 'erro' ? 'Erro: ' : tipo === 'sucesso' ? 'Pronto: ' : '';
    useEffect(() => { if (!silencioso) anunciar(prefixo + texto); }, [prefixo, texto, silencioso]);
    return (
        <View accessible accessibilityRole={tipo === 'erro' ? 'alert' : 'text'}
            style={[estilos.aviso, { backgroundColor: fundo, borderColor: cor }]}>
            <Text style={[estilos.paragrafo, { color: cor }]}>{prefixo}{texto}</Text>
        </View>
    );
}

/** Carregando: o círculo é só visual; o texto é falado ao aparecer */
export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
    useEffect(() => { anunciar(texto); }, [texto]);
    return (
        <View style={estilos.carregando} accessible>
            <ActivityIndicator size="large" color={cores.destaque} importantForAccessibility="no" />
            <Text style={estilos.paragrafo}>{texto}</Text>
        </View>
    );
}

export const estilos = StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { padding: medidas.espaco, gap: 12, paddingBottom: 32 },
    titulo: { fontSize: 30, fontWeight: '800', color: cores.texto, lineHeight: 36 },
    titulo2: { fontSize: 24, lineHeight: 30 },
    paragrafo: { fontSize: 18, lineHeight: 26, color: cores.texto },
    botao: {
        minHeight: medidas.toque, borderRadius: medidas.raio, borderWidth: 2, paddingHorizontal: 20, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    // flexShrink: com a fonte grande do celular, o texto quebra a linha em vez de sair do botão
    textoBotaoSolido: { fontSize: medidas.textoBotao, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
    textoBotaoContorno: { fontSize: 17, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
    link: { minHeight: medidas.toque, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 8 },
    textoLink: { fontSize: 18, color: cores.link, textDecorationLine: 'underline', textAlign: 'center' },
    grupoCampo: { gap: 4 },
    rotulo: { fontSize: medidas.texto, color: cores.texto, fontWeight: '600' },
    caixaCampo: {
        minHeight: medidas.toque, borderWidth: 1, borderColor: cores.borda, borderRadius: medidas.raio,
        backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    },
    // Travado: fundo cinza-claro, borda clara; o texto #374151 fica em 9,6:1
    caixaTravada: { backgroundColor: '#F3F4F6', borderColor: cores.bordaCartao },
    caixaFocada: { borderColor: cores.link, borderWidth: 2 },
    // "CONECTA TDAH SUS" no topo das telas: azul dos links (7,1:1 sobre branco)
    marca: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5, color: cores.link },
    caixaErro: { borderColor: cores.erro, borderWidth: 2 },
    entrada: { flex: 1, fontSize: medidas.texto, color: cores.texto, paddingHorizontal: 12, paddingVertical: 10, minHeight: medidas.toque },
    olho: { width: medidas.toque, height: medidas.toque, alignItems: 'center', justifyContent: 'center' },
    textoErro: { fontSize: medidas.texto, color: cores.erro },
    opcao: {
        minHeight: medidas.toque, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: cores.borda, borderRadius: medidas.raio, backgroundColor: '#FFFFFF',
    },
    opcaoMarcada: { borderColor: cores.link, borderWidth: 2 },
    textoOpcao: { fontSize: 17, color: cores.texto, flexShrink: 1 },
    aviso: { borderWidth: 1, borderRadius: medidas.raio, padding: 12 },
    carregando: { alignItems: 'center', gap: 12, padding: 24 },
    segmentado: {
        flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#FFFFFF',
        borderWidth: 1, borderColor: cores.borda, borderRadius: medidas.raio + 2,
    },
    segmento: { flex: 1, minHeight: medidas.toque, borderRadius: medidas.raio - 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    fundoJanela: { flex: 1, backgroundColor: 'rgba(36,36,36,0.55)' },
    janela: {
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: medidas.espaco, paddingTop: 20, paddingBottom: 16, maxHeight: '90%',
    },
    iconeJanela: { width: 48, height: 48, borderRadius: medidas.raio, backgroundColor: cores.fundoInfo, alignItems: 'center', justifyContent: 'center' },
    tituloJanela: { fontSize: 24, fontWeight: '800', color: cores.texto },
});
