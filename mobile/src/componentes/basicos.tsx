import { ReactNode, Ref, useEffect, useState } from "react";
import {
    AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView,
    StyleSheet, Text, TextInput, TextInputProps, View,
} from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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

/** Fala um aviso no TalkBack/VoiceOver (funciona nos dois sistemas) */
export function anunciar(texto: string) {
    AccessibilityInfo.announceForAccessibility(texto);
}

/**
 * Tela com rolagem, área segura e teclado.
 * - `branco`: fundo branco, obrigatório quando há título laranja (sobre o
 *   lilás do fundo o laranja cai para 2,9:1 e reprova)
 * - `semCabecalho`: sem a barra do topo, a própria tela desvia da barra de
 *   status do celular (no Android atual o app ocupa a tela inteira)
 */
export function Tela({ children, centralizar = false, branco = false, semCabecalho = false }: {
    children: ReactNode; centralizar?: boolean; branco?: boolean; semCabecalho?: boolean;
}) {
    const bordas: Edge[] = semCabecalho ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right'];
    return (
        <SafeAreaView style={[estilos.tela, branco && { backgroundColor: '#FFFFFF' }]} edges={bordas}>
            {/* "padding" nos dois sistemas: o teclado não cobre o campo em uso */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <ScrollView contentContainerStyle={[estilos.conteudo, centralizar && { flexGrow: 1, justifyContent: 'center' }]}
                    keyboardShouldPersistTaps="handled">
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
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
    return (
        <View style={estilos.grupoCampo}>
            <Text style={estilos.rotulo} accessibilityElementsHidden importantForAccessibility="no">{rotulo}</Text>
            <View style={[estilos.caixaCampo, focado && estilos.caixaFocada, !!erro && estilos.caixaErro]}>
                <TextInput {...props} ref={ref}
                    accessibilityLabel={erro ? `${rotulo}. Erro: ${erro}` : rotulo}
                    secureTextEntry={senha && !mostrar}
                    placeholderTextColor={cores.borda}
                    onFocus={(e) => { setFocado(true); props.onFocus?.(e); }}
                    onBlur={(e) => { setFocado(false); props.onBlur?.(e); }}
                    style={estilos.entrada} />
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
export function Opcoes<T extends string>({ rotulo, opcoes, valor, aoEscolher, erro }: {
    rotulo: string; opcoes: { valor: T; titulo: string }[]; valor: T | ''; aoEscolher: (v: T) => void; erro?: string;
}) {
    return (
        <View style={estilos.grupoCampo} accessibilityRole="radiogroup">
            <Text style={estilos.rotulo} accessibilityElementsHidden importantForAccessibility="no">{rotulo}</Text>
            {opcoes.map((o, i) => {
                const marcado = o.valor === valor;
                return (
                    <Pressable key={o.valor} onPress={() => aoEscolher(o.valor)}
                        accessibilityRole="radio" accessibilityState={{ checked: marcado }}
                        accessibilityLabel={`${rotulo}: ${o.titulo}${i === 0 && erro ? `. Erro: ${erro}` : ''}`}
                        style={[estilos.opcao, marcado && estilos.opcaoMarcada]}>
                        <Ionicons name={marcado ? 'radio-button-on' : 'radio-button-off'} size={24} color={marcado ? cores.link : cores.textoSuave} />
                        <Text style={[estilos.textoOpcao, marcado && { fontWeight: '700' }]}>{o.titulo}</Text>
                    </Pressable>
                );
            })}
            {!!erro && <Text style={estilos.textoErro} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>Erro: {erro}</Text>}
        </View>
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
        minHeight: medidas.toque, borderRadius: 999, borderWidth: 2, paddingHorizontal: 20, paddingVertical: 10,
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
        minHeight: medidas.toque, borderWidth: 1, borderColor: cores.borda, borderRadius: 8,
        backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    },
    caixaFocada: { borderColor: cores.link, borderWidth: 2 },
    caixaErro: { borderColor: cores.erro, borderWidth: 2 },
    entrada: { flex: 1, fontSize: medidas.texto, color: cores.texto, paddingHorizontal: 12, paddingVertical: 10, minHeight: medidas.toque },
    olho: { width: medidas.toque, height: medidas.toque, alignItems: 'center', justifyContent: 'center' },
    textoErro: { fontSize: medidas.texto, color: cores.erro },
    opcao: {
        minHeight: medidas.toque, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: cores.borda, borderRadius: 8, backgroundColor: '#FFFFFF',
    },
    opcaoMarcada: { borderColor: cores.link, borderWidth: 2 },
    textoOpcao: { fontSize: 17, color: cores.texto, flexShrink: 1 },
    aviso: { borderWidth: 1, borderRadius: medidas.raio, padding: 12 },
    carregando: { alignItems: 'center', gap: 12, padding: 24 },
});
