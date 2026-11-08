import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Aviso, Botao, Carregando, Tela, Titulo } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import { BotaoInstrucoes, BotaoOuvir, SemVozLocal, useVozDisponivel } from "~/componentes/ouvir";
import { BarrasSintomas, resultadoPorExtenso } from "~/componentes/questionario";
import { usePasta } from "~/ganchos/usePasta";
import { cores } from "~/tema/cores";
import QuestionarioServicos from "~/servicos/questionario";
import { FONTE_QUESTIONARIO } from "@/helpers/questionario";
import { Questionario } from "@/types/questionario";

const TRIAGEM = 'Isto não é um diagnóstico. Só o médico interpreta o resultado.';

/**
 * RESULTADO DO QUESTIONÁRIO SNAP-IV (decisão travada 11), para todos os
 * membros da pasta: uma resposta por data, com as barras de sintomas de
 * cada grupo. Só as barras: sem interpretação nem linha de corte.
 * Só a mãe dona vê o botão de responder (o banco também só deixa ela)
 */
export default function ResultadoQuestionario() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { pasta, papel, carregando } = usePasta(id);
    const [questionarios, setQuestionarios] = useState<Questionario[] | null>(null);
    const [erro, setErro] = useState(false);
    const vozLocal = useVozDisponivel(true);

    // Recarrega ao voltar da tela de responder
    useFocusEffect(useCallback(() => {
        let ativo = true;
        QuestionarioServicos.listar(id).then((r) => {
            if (!ativo) return;
            setErro(!r.success);
            setQuestionarios(r.questionarios);
        });
        return () => { ativo = false; };
    }, [id]));

    const titulo = <Stack.Screen options={{ title: 'Questionário SNAP-IV' }} />;
    if (carregando || (questionarios === null && !erro)) return <Tela>{titulo}<Carregando texto="Abrindo o questionário..." /></Tela>;
    if (!pasta || !papel) return <Tela>{titulo}<Aviso tipo="erro" texto="não foi possível abrir o questionário desta pasta." /></Tela>;

    const ehMae = papel === 'mae';
    const lista = questionarios ?? [];

    return (
        <Tela>
            {/* O nome "Questionário SNAP-IV" fica só no cabeçalho do topo (telas novas) */}
            {titulo}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={[estilos.texto, { flex: 1 }]}>18 perguntas sobre atenção e agitação do aluno, respondidas pela família.</Text>
                <BotaoInstrucoes texto={
                    'São 18 perguntas sobre atenção, agitação e impulsividade do aluno, respondidas pela família. '
                    + 'Para cada data, o gráfico mostra quantas perguntas foram marcadas como Muito ou Demais, em dois grupos: '
                    + 'desatenção, e hiperatividade e impulsividade. ' + TRIAGEM
                    + (ehMae ? ' Para responder, toque em Responder o questionário.' : '')} />
            </View>
            {/* Triagem, não diagnóstico (decisão 11): continua visível, numa linha só */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible>
                <Ionicons name="information-circle-outline" size={22} color={cores.link} importantForAccessibility="no" />
                <Text style={[estilos.suave, { flex: 1 }]}>{TRIAGEM}</Text>
            </View>

            {ehMae && <Botao titulo="Responder o questionário" icone="create" aoTocar={() => router.push(`/pasta/${pasta.id}/questionario/responder` as never)} />}

            {erro && <Aviso tipo="erro" texto="não foi possível carregar as respostas. Confira a internet e tente de novo." />}
            {!erro && lista.length === 0 && (
                <Aviso tipo="info" texto={ehMae ? 'Ainda não há respostas. Quando você responder, o resultado aparece aqui.'
                    : 'Ainda não há respostas. Quando a família responder, o resultado aparece aqui.'} />
            )}

            {lista.length > 0 && (
                <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
                        <Titulo nivel={2}>Respostas</Titulo>
                        {/* O resultado é dado de saúde: só com voz que roda no aparelho (decisão 9) */}
                        <BotaoOuvir rotulo="Ouvir resultado" pequeno conteudo disponivel={vozLocal} texto={lista.map(resultadoPorExtenso).join(' ')} />
                    </View>
                    <Text style={estilos.suave}>Perguntas marcadas como “Muito” ou “Demais”, em cada data.</Text>
                    {vozLocal === false && <SemVozLocal oQue="o resultado" />}
                    {lista.map((q) => <BarrasSintomas key={q.id} questionario={q} />)}
                </>
            )}

            <Text style={[estilos.suave, { marginTop: 8 }]}>Fonte: {FONTE_QUESTIONARIO}.</Text>
        </Tela>
    );
}
