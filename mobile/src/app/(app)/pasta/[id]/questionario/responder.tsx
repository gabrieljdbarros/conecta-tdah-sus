import { useEffect, useRef, useState } from "react";
import { Alert, Animated, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams, useNavigation } from "expo-router";
import { anunciar, Aviso, Botao, Carregando, estilos as base, focarLeitor, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import { Ilustracao } from "~/componentes/ilustracoes";
import { BotaoInstrucoes } from "~/componentes/ouvir";
import { ItemPergunta, useReduzirAnimacoes } from "~/componentes/questionario";
import { useAuth } from "~/contexto/AuthContext";
import { usePasta } from "~/ganchos/usePasta";
import QuestionarioServicos from "~/servicos/questionario";
import { cores, medidas } from "~/tema/cores";
import { PERGUNTAS } from "@/helpers/questionario";
import { NotaItem, SecaoQuestionario } from "@/types/questionario";

/**
 * 5 partes curtas na mesma tela (itens 1–5, 6–9, 10–12, 13–15 e 16–18):
 * no máximo 5 perguntas por vez, para a rolagem e o leitor de tela não
 * ficarem longos num celular simples
 */
const PARTES = [PERGUNTAS.slice(0, 5), PERGUNTAS.slice(5, 9), PERGUNTAS.slice(9, 12), PERGUNTAS.slice(12, 15), PERGUNTAS.slice(15)];
const TITULO_SECAO: Record<SecaoQuestionario, string> = {
    desatencao: 'Desatenção',
    hiperatividade: 'Hiperatividade',
    impulsividade: 'Impulsividade',
};
const FADE_MS = 180;

/**
 * RESPONDER O QUESTIONÁRIO SNAP-IV (decisão travada 11), só a mãe dona.
 * As 18 perguntas em partes, trocadas com um fade (sem animação para quem
 * pediu "reduzir animações"). "Próximo" com pergunta faltando leva até ela;
 * "Voltar" mantém as respostas. Não há rascunho: as respostas ficam só na
 * memória da tela e vão ao banco ao concluir. Sair no meio pede confirmação
 */
export default function ResponderQuestionario() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { pasta, papel, carregando } = usePasta(id);
    const navigation = useNavigation();
    const reduzir = useReduzirAnimacoes();

    const [respostas, setRespostas] = useState<(NotaItem | null)[]>(() => PERGUNTAS.map(() => null));
    const [parte, setParte] = useState(0);
    const [falta, setFalta] = useState<number | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    // Sem resposta do servidor: o envio pode ter chegado. Sair não perde nada
    const [incerto, setIncerto] = useState(false);
    const [concluido, setConcluido] = useState(false);

    const [opacidade] = useState(() => new Animated.Value(1));
    const [escala] = useState(() => new Animated.Value(1));
    const rolagem = useRef<ScrollView>(null);
    const tituloParte = useRef<View>(null);
    const opcoes = useRef<Record<number, View | null>>({});
    const animando = useRef(false);

    // Sair no meio: as respostas se perdem (não há rascunho), então confirma
    const comecou = respostas.some((r) => r !== null);
    const podeSair = useRef(true);
    useEffect(() => { podeSair.current = !comecou || concluido || incerto; }, [comecou, concluido, incerto]);
    useEffect(() => navigation.addListener('beforeRemove', (e) => {
        if (podeSair.current) return;
        e.preventDefault();
        Alert.alert('Sair do questionário?', 'Se sair agora, você perde as respostas desta vez.', [
            { text: 'Continuar respondendo', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]);
    }), [navigation]);

    const titulo = <Stack.Screen options={{ title: 'Responder questionário' }} />;
    if (carregando) return <Tela>{titulo}<Carregando texto="Abrindo o questionário..." /></Tela>;
    if (!pasta || papel !== 'mae' || !user)
        return <Tela>{titulo}<Aviso tipo="erro" texto="só a família responde o questionário desta pasta." /></Tela>;

    const perguntas = PARTES[parte];
    const ultima = parte === PARTES.length - 1;
    const secoes = [...new Set(perguntas.map((p) => TITULO_SECAO[p.secao]))].join(' e ');
    const primeiraSemResposta = perguntas.find((p) => respostas[p.numero - 1] === null);

    const escolher = (numero: number, nota: NotaItem) => {
        setErro(null);
        setFalta(null);
        setRespostas((atual) => atual.map((r, i) => (i === numero - 1 ? nota : r)));
    };

    // Troca de parte: some, troca, volta ao topo e aparece; o leitor de tela
    // vai para o título da parte nova. Toques repetidos durante o fade são ignorados
    const irPara = (nova: number) => {
        if (animando.current) return;
        const trocar = () => {
            setParte(nova);
            setFalta(null);
            rolagem.current?.scrollTo({ y: 0, animated: false });
            focarLeitor(tituloParte.current);
        };
        if (reduzir) { trocar(); return; }
        animando.current = true;
        Animated.timing(opacidade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
            trocar();
            Animated.timing(opacidade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start(() => { animando.current = false; });
        });
    };

    /** Com pergunta faltando, avisa qual é e leva o foco até ela */
    const parteRespondida = () => {
        if (!primeiraSemResposta) return true;
        setFalta(primeiraSemResposta.numero);
        anunciar(`Falta responder a pergunta ${primeiraSemResposta.numero}`);
        focarLeitor(opcoes.current[primeiraSemResposta.numero] ?? null);
        return false;
    };

    const concluir = async () => {
        if (!parteRespondida() || enviando) return;
        setEnviando(true);
        setErro(null);
        const r = await QuestionarioServicos.enviar(pasta.id, user.uid, respostas as NotaItem[]);
        setEnviando(false);
        if (!r.success) {
            setIncerto(!!r.semConexao);
            setErro(r.semConexao
                ? 'não deu para saber se as respostas foram enviadas. Toque em Concluir de novo, ou volte e confira no resultado.'
                : 'não foi possível enviar as respostas. Tente novamente.');
            return;
        }
        setConcluido(true);
        anunciar('Questionário concluído. Obrigado por responder!');
        // Animação curta do girassol com a fita; quem reduz animações vê direto
        if (!reduzir) {
            escala.setValue(0.3);
            Animated.spring(escala, { toValue: 1, friction: 4, useNativeDriver: true }).start();
        }
    };

    if (concluido) {
        return (
            <Tela centralizar>
                {titulo}
                <View style={{ alignItems: 'center', gap: 12 }}>
                    {/* Girassol com a fita laranja (conscientização do TDAH): acolhe, sem comemorar resultado (decisão 11) */}
                    <Animated.View style={{ transform: [{ scale: escala }] }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                        <Ilustracao nome="girassolFita" altura={160} />
                    </Animated.View>
                    <Titulo>Questionário concluído</Titulo>
                    <Paragrafo>Obrigado por responder! O resultado já aparece para quem acompanha o aluno nesta pasta.</Paragrafo>
                </View>
                <Botao titulo="Ver o resultado" icone="bar-chart" aoTocar={() => router.back()} />
            </Tela>
        );
    }

    return (
        <SafeAreaView style={base.tela} edges={['bottom', 'left', 'right']}>
            {titulo}
            <ScrollView ref={rolagem} contentContainerStyle={base.conteudo} keyboardShouldPersistTaps="handled">
                <Animated.View style={{ opacity: opacidade, gap: 12 }}>
                    <View ref={tituloParte} accessible accessibilityRole="header"
                        accessibilityLabel={`Parte ${parte + 1} de ${PARTES.length}: ${secoes}`} style={{ gap: 2 }}>
                        <Text style={estilos.rotulo}>PARTE {parte + 1} DE {PARTES.length}</Text>
                        <Text style={estilos.tituloSecao}>{secoes}</Text>
                    </View>
                    {/* Progresso visual (o número já está no título) */}
                    <View style={{ flexDirection: 'row', gap: 6 }} importantForAccessibility="no-hide-descendants">
                        {PARTES.map((_, i) => (
                            <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i <= parte ? cores.secundaria : '#E5E7EB' }} />
                        ))}
                    </View>
                    {parte === 0 && (
                        <>
                            <Paragrafo>Para cada frase, escolha o quanto ela descreve o aluno.</Paragrafo>
                            <BotaoInstrucoes texto={
                                'Para cada frase, escolha o quanto ela descreve o aluno: nada, pouco, muito ou demais. '
                                + `São 18 frases, em ${PARTES.length} partes. Toque em Ouvir pergunta para escutar cada uma. `
                                + 'As respostas só são guardadas quando você toca em Concluir, no fim.'} />
                        </>
                    )}

                    {perguntas.map((p) => (
                        <ItemPergunta key={p.numero} pergunta={p} valor={respostas[p.numero - 1]} bloqueado={enviando}
                            ref={(v: View | null) => { opcoes.current[p.numero] = v; }}
                            aoEscolher={(n) => escolher(p.numero, n)} />
                    ))}

                    {falta !== null && <Aviso tipo="erro" texto={`falta responder a pergunta ${falta}.`} silencioso />}
                    {erro && <Aviso tipo="erro" texto={erro} />}

                    <View style={{ gap: medidas.espaco - 4 }}>
                        {ultima
                            ? <Botao titulo="Concluir" icone="checkmark-circle" aoTocar={concluir} carregando={enviando} />
                            : <Botao titulo="Próximo" icone="arrow-forward" aoTocar={() => { if (parteRespondida()) irPara(parte + 1); }} />}
                        {parte > 0 && <Botao titulo="Voltar" tipo="contorno" icone="arrow-back" aoTocar={() => irPara(parte - 1)} desabilitado={enviando} />}
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}
