import { useEffect, useRef, useState } from "react";
import { FlatList, Keyboard, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { anunciar, Aviso, Botao, Carregando, Tela } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import { usePasta } from "~/ganchos/usePasta";
import MensagemServicos from "~/servicos/mensagem";
import { cores, medidas } from "~/tema/cores";
import { CANAL_GRUPO, canalPrivado, LIMITE_MENSAGENS, MAX_TEXTO_MENSAGEM, Mensagem } from "@/types/mensagem";
import { Pasta } from "@/types/pasta";
import { PapelNaPasta } from "@/types/relatorio";
import { ROLE_LABELS } from "@/types/user";

interface Aba { canal: string; titulo: string; quemVe: string }

/**
 * Canais por papel (decisão travada 10), iguais aos da web:
 *  - mãe: conversa de todos + uma só com cada médico da pasta
 *  - médico: conversa de todos + só com a família
 *  - escola: só a conversa de todos
 */
function montarAbas(pasta: Pasta, papel: PapelNaPasta, uid: string): Aba[] {
    const todos: Aba = { canal: CANAL_GRUPO, titulo: 'Conversa de todos', quemVe: 'Família, escola e médicos veem esta conversa.' };
    if (papel === 'medico')
        return [todos, { canal: canalPrivado(uid), titulo: 'Só com a família', quemVe: 'Só você e a família veem esta conversa. A escola não vê.' }];
    if (papel === 'mae') {
        const medicos = Object.entries(pasta.participantes).filter(([, p]) => p.papel === 'medico');
        return [todos, ...medicos.map(([medicoUid, p]) => {
            const nome = p.nome || 'médico(a)';
            const repetido = medicos.filter(([, outro]) => outro.nome === p.nome).length > 1;
            return {
                canal: canalPrivado(medicoUid),
                titulo: `Só com ${nome}${repetido && p.detalhe ? ` (${p.detalhe})` : ''}`,
                quemVe: `Só você e ${nome} veem esta conversa. A escola não vê.`,
            };
        })];
    }
    return [todos];
}

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dia = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const iniciais = (nome: string) => {
    const p = nome.trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

/**
 * CONVERSAS DA PASTA (RN05), em tempo real, como na web e no design:
 * balões (os dos outros em verde-claro com as iniciais; os meus em lilás),
 * a data como separador e "quem vê" sempre visível. Mensagens não são
 * editadas nem apagadas
 */
export default function Conversas() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { pasta, papel, carregando } = usePasta(id);
    const { fontScale } = useWindowDimensions();
    // A conversa aberta é guardada pelo CANAL, não pela posição: se um médico
    // entrar ou sair, a mãe continua escrevendo para quem escolheu
    const [canalAtivo, setCanalAtivo] = useState(CANAL_GRUPO);
    // Guardadas junto com o canal: ao trocar de canal, as antigas somem na hora
    const [recebidas, setRecebidas] = useState<{ canal: string; lista: Mensagem[] } | null>(null);
    const [canalComErro, setCanalComErro] = useState<string | null>(null);
    // Um rascunho por conversa: o que foi escrito para o médico não "vaza"
    // para a conversa de todos ao trocar de aba
    const [rascunhos, setRascunhos] = useState<Record<string, string>>({});
    const [enviando, setEnviando] = useState(false);
    const [erroEnvio, setErroEnvio] = useState<string | null>(null);
    const lista = useRef<FlatList<Mensagem>>(null);
    const conhecidas = useRef<Set<string> | null>(null);
    const pertoDoFim = useRef(true);
    const insets = useSafeAreaInsets();
    const [alturaTeclado, setAlturaTeclado] = useState(0);
    const tecladoAberto = alturaTeclado > 0;

    // TECLADO: no Android "de ponta a ponta" a janela não encolhe e o
    // KeyboardAvoidingView não basta. Esta tela vai até o fim da tela do
    // celular, então sobe o campo pela altura do teclado (que o Android informa
    // SEM a barra dos botões; essa margem já é somada abaixo)
    useEffect(() => {
        const abriu = Keyboard.addListener('keyboardDidShow', (e) => setAlturaTeclado(e.endCoordinates.height));
        const fechou = Keyboard.addListener('keyboardDidHide', () => setAlturaTeclado(0));
        return () => { abriu.remove(); fechou.remove(); };
    }, []);

    const abas = pasta && papel && user ? montarAbas(pasta, papel, user.uid) : [];
    const aba = abas.find((a) => a.canal === canalAtivo) ?? abas[0];
    const canal = aba?.canal;
    const pastaId = pasta?.id;
    const mensagens = recebidas && recebidas.canal === canal ? recebidas.lista : null;
    const erroCanal = !!canal && canalComErro === canal;
    const texto = canal ? rascunhos[canal] ?? '' : '';

    // Acompanha o canal aberto; para de acompanhar ao trocar de canal ou sair.
    // Depende só do ID da pasta: a pasta é recarregada ao voltar à tela
    useEffect(() => {
        if (!canal || !pastaId) return;
        conhecidas.current = null;
        pertoDoFim.current = true;
        return MensagemServicos.ouvir(pastaId, canal, (novas) => {
            // Mensagens novas dos OUTROS (depois da primeira carga) são anunciadas,
            // só com o nome de quem mandou (o texto não é falado sem pedir)
            if (conhecidas.current) {
                const chegaram = novas.filter((m) => !conhecidas.current!.has(m.id) && m.autorUid !== user?.uid);
                if (chegaram.length === 1) anunciar(`Nova mensagem de ${chegaram[0].autorNome}.`);
                else if (chegaram.length > 1) anunciar(`${chegaram.length} mensagens novas.`);
            }
            conhecidas.current = new Set(novas.map((m) => m.id));
            setRecebidas({ canal, lista: novas });
            setCanalComErro((c) => (c === canal ? null : c));
        }, () => setCanalComErro(canal));
    }, [canal, pastaId, user?.uid]);

    if (carregando) return <Tela><Stack.Screen options={{ title: 'Conversas' }} /><Carregando texto="Abrindo as conversas..." /></Tela>;
    if (!pasta || !papel || !user || !aba) return <Tela><Stack.Screen options={{ title: 'Conversas' }} /><Aviso tipo="erro" texto="não foi possível abrir as conversas desta pasta." /></Tela>;

    const escrever = (t: string) => { setRascunhos((r) => ({ ...r, [aba.canal]: t })); setErroEnvio(null); };

    const enviar = async () => {
        const limpo = texto.trim();
        if (!limpo || enviando) return;
        const destino = aba.canal;
        setEnviando(true);
        setErroEnvio(null);
        const { success, semConexao } = await MensagemServicos.enviar(pasta.id, destino, user, papel, limpo);
        setEnviando(false);
        if (success) {
            setRascunhos((r) => ({ ...r, [destino]: '' }));
            pertoDoFim.current = true;
            anunciar('Mensagem enviada.');
        } else setErroEnvio(semConexao
            ? 'sem resposta da internet. Se a mensagem não aparecer na conversa, envie de novo.'
            : 'a mensagem não foi enviada. Tente de novo.');
    };

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
                    {/* Com o teclado aberto o título sai, para sobrar espaço para as mensagens */}
                    {!tecladoAberto && <Text accessibilityRole="header" style={estilos.tituloSecao}>Conversas sobre {pasta.nomeAluno}</Text>}

                    {/* CANAIS: um por vez, lado a lado (um embaixo do outro com fonte grande) */}
                    {abas.length > 1 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Escolha a conversa">
                            {abas.map((a) => {
                                const ativa = a.canal === aba.canal;
                                return (
                                    <Pressable key={a.canal} onPress={() => { setCanalAtivo(a.canal); setErroEnvio(null); anunciar(`${a.titulo}. ${a.quemVe}`); }}
                                        accessibilityRole="radio" accessibilityState={{ checked: ativa }} accessibilityLabel={`Conversa: ${a.titulo}`}
                                        style={{
                                            minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, borderWidth: 2, borderColor: cores.link,
                                            backgroundColor: ativa ? cores.link : '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
                                            flexGrow: 1, flexBasis: fonteGrande ? '100%' : abas.length === 2 ? '40%' : 'auto',
                                        }}>
                                        {ativa && <Ionicons name="checkmark" size={20} color="#FFFFFF" importantForAccessibility="no" />}
                                        <Text style={{ fontSize: 16, fontWeight: ativa ? '700' : '500', color: ativa ? '#FFFFFF' : cores.link, flexShrink: 1 }}>{a.titulo}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                    {papel === 'mae' && abas.length === 1 && (
                        <Text style={estilos.suave}>Ainda não há médico na pasta. A conversa só com o médico aparece quando ele entrar.</Text>
                    )}

                    {/* QUEM VÊ esta conversa (privacidade: sempre visível) */}
                    <View accessible style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: cores.fundoInfo, borderRadius: medidas.raio, paddingHorizontal: 10, paddingVertical: 8 }}>
                        <Ionicons name="eye" size={20} color={cores.secundaria} importantForAccessibility="no" />
                        <Text style={[estilos.texto, { flexShrink: 1, fontSize: 16 }]}>{aba.quemVe}</Text>
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
                        ListHeaderComponent={mensagens.length >= LIMITE_MENSAGENS
                            ? <Text style={[estilos.suave, { textAlign: 'center' }]}>Mostrando as {LIMITE_MENSAGENS} mensagens mais recentes.</Text> : null}
                        ListEmptyComponent={<Text style={[estilos.texto, { textAlign: 'center' }]}>Ainda não há mensagens. Escreva a primeira!</Text>}
                        renderItem={({ item: m, index }) => {
                            const minha = m.autorUid === user.uid;
                            const novoDia = index === 0 || dia(mensagens[index - 1].criadoEm) !== dia(m.criadoEm);
                            const autor = minha ? 'Você' : `${m.autorNome} (${ROLE_LABELS[m.autorPapel]})`;
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
                                        {/* Lida de uma vez: "Fulano (Médico), 10:30: texto" */}
                                        <View accessible accessibilityLabel={`${autor}, ${hora(m.criadoEm)}: ${m.texto}`}
                                            style={{
                                                flexShrink: 1, borderRadius: 16, padding: 12, borderWidth: 1,
                                                backgroundColor: minha ? '#EEF0FF' : '#E3F5F2', borderColor: minha ? '#C7CCF5' : '#B8E2DC',
                                            }}>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>
                                                {autor}<Text style={{ fontWeight: '400', color: cores.textoSuave }}> · {hora(m.criadoEm)}</Text>
                                            </Text>
                                            <Text style={{ fontSize: 17, lineHeight: 24, color: cores.texto }}>{m.texto}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        }} />
                )}

                {/* ENVIAR */}
                <View style={{ padding: medidas.espaco, paddingTop: 8, gap: 8, borderTopWidth: 1, borderTopColor: cores.bordaCartao, backgroundColor: '#FFFFFF' }}>
                    {erroEnvio && <Aviso tipo="erro" texto={erroEnvio} />}
                    {/* Aparece antes de tocar no campo; com o teclado aberto sai para dar espaço */}
                    {!tecladoAberto && <Text style={estilos.suave}>Depois de enviada, a mensagem não pode ser apagada.</Text>}
                    <View style={{ flexDirection: fonteGrande ? 'column' : 'row', gap: 8, alignItems: fonteGrande ? 'stretch' : 'flex-end' }}>
                        {/* Corretor desligado como no relatório: o teclado não aprende termos de saúde */}
                        <TextInput value={texto} onChangeText={escrever} multiline maxLength={MAX_TEXTO_MENSAGEM}
                            accessibilityLabel={`Mensagem para: ${aba.titulo}`} placeholder={`Escrever em: ${aba.titulo}`} placeholderTextColor={cores.borda}
                            autoCorrect={false} spellCheck={false} autoComplete="off" importantForAutofill="no"
                            style={{
                                flex: fonteGrande ? undefined : 1, minHeight: medidas.toque, maxHeight: 140, borderWidth: 1, borderColor: cores.borda, borderRadius: 24,
                                paddingHorizontal: 16, paddingVertical: 12, fontSize: medidas.texto, color: cores.texto, backgroundColor: '#FFFFFF',
                            }} />
                        <View style={fonteGrande ? undefined : { minWidth: 120 }}>
                            <Botao titulo={enviando ? 'Enviando' : 'Enviar'} icone="paper-plane" carregando={enviando} desabilitado={!texto.trim()} aoTocar={enviar} />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}
