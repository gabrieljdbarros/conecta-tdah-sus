import { Ref, useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, useWindowDimensions, View } from "react-native";
import { BotaoOuvir } from "~/componentes/ouvir";
import { estilos } from "~/componentes/cartoes";
import { cores, medidas } from "~/tema/cores";
import { contarSintomas, ESCALA, ESCALA_CURTA, ITENS_POR_GRUPO, TITULO_GRUPO } from "@/helpers/questionario";
import { GrupoSintomas, NotaItem, PerguntaQuestionario, Questionario } from "@/types/questionario";

/**
 * QUESTIONÁRIO SNAP-IV (decisão travada 11): a pergunta com as 4 opções e o
 * gráfico de barras do resultado. Sem biblioteca de gráfico: as barras são
 * caixas com largura proporcional, e o número vem sempre escrito ao lado
 * (quem não enxerga a barra ouve "6 de 9")
 */

/** "Reduzir animações" ligado no celular: o app não anima */
export function useReduzirAnimacoes(): boolean {
    const [reduzir, setReduzir] = useState(false);
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduzir).catch(() => {});
        const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzir);
        return () => assinatura.remove();
    }, []);
    return reduzir;
}

/** Quanto o círculo da opção fica cheio: nada, pouco, muito, demais */
const NIVEL = [0, 0.35, 0.65, 1];

/** Círculo que "enche" conforme a nota: mostra a intensidade sem depender só da palavra */
function Nivel({ nota, cor }: { nota: number; cor: string }) {
    return (
        <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: cor, overflow: 'hidden', justifyContent: 'flex-end' }}>
            <View style={{ height: `${NIVEL[nota] * 100}%`, backgroundColor: cor }} />
        </View>
    );
}

/**
 * Uma pergunta: o texto, o botão de ouvir e as 4 opções lado a lado (radio),
 * compactas, com rótulo curto e um círculo que enche conforme a nota. Com a
 * fonte grande do celular, as opções viram duas linhas de duas.
 * O texto das perguntas é fixo e não é dado pessoal: pode ser lido com
 * qualquer voz. Cada opção diz o número da pergunta e os dois rótulos
 * ("Pergunta 3: Muito, bastante"): o TalkBack nem sempre anuncia o grupo, e
 * o nome falado precisa conter a palavra que aparece no botão
 */
export function ItemPergunta({ pergunta, valor, aoEscolher, bloqueado = false, ref }: {
    pergunta: PerguntaQuestionario; valor: NotaItem | null; aoEscolher: (nota: NotaItem) => void;
    /** Durante o envio, as respostas não mudam */
    bloqueado?: boolean;
    /** Primeira opção (para levar o foco até a pergunta que falta) */
    ref?: Ref<View>;
}) {
    const { fontScale } = useWindowDimensions();
    const duasLinhas = fontScale > 1.3;
    return (
        <View style={{ gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: cores.bordaCartao }}
            accessibilityRole="radiogroup" accessibilityLabel={`Pergunta ${pergunta.numero}: ${pergunta.texto}`}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Text style={[estilos.texto, { flex: 1 }]}>{pergunta.numero}. {pergunta.texto}</Text>
                <BotaoOuvir pequeno rotulo="Ouvir" descricao={`pergunta ${pergunta.numero}`}
                    texto={`Pergunta ${pergunta.numero}. ${pergunta.texto}. As respostas são: ${ESCALA_CURTA.join(', ')}.`} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ESCALA_CURTA.map((curto, nota) => {
                    const marcado = valor === nota;
                    const cor = marcado ? '#FFFFFF' : cores.secundaria;
                    return (
                        <Pressable key={curto} onPress={() => aoEscolher(nota as NotaItem)} ref={nota === 0 ? ref : undefined}
                            disabled={bloqueado}
                            accessibilityRole="radio" accessibilityState={{ checked: marcado, disabled: bloqueado }}
                            accessibilityLabel={`Pergunta ${pergunta.numero}: ${curto}${curto === ESCALA[nota] ? '' : `, ${ESCALA[nota].toLowerCase()}`}`}
                            style={({ pressed }) => [{
                                flexBasis: duasLinhas ? '48%' : 0, flexGrow: 1, minHeight: medidas.toque,
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                                paddingHorizontal: 4, borderRadius: 14, borderWidth: 2, borderColor: cores.secundaria,
                                backgroundColor: marcado ? cores.secundaria : '#FFFFFF',
                            }, pressed && { opacity: 0.85 }]}>
                            <Nivel nota={nota} cor={cor} />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: cor, flexShrink: 1 }}>{curto}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

/** Cor de cada grupo: as duas passam de 3:1 contra o trilho cinza (WCAG 1.4.11) */
const COR_GRUPO: Record<GrupoSintomas, string> = {
    desatencao: cores.link,
    hiperatividadeImpulsividade: cores.secundaria,
};
const GRUPOS: GrupoSintomas[] = ['desatencao', 'hiperatividadeImpulsividade'];

/** Data e hora (a mãe pode responder mais de uma vez no mesmo dia) */
export const dataPorExtenso = (ms: number) => {
    const d = new Date(ms);
    return `${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}, às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

/** "6 de 9 perguntas": o número sempre com a unidade */
const deNove = (n: number) => `${n} de ${ITENS_POR_GRUPO} perguntas`;

/** Resultado para ler em voz alta (dado de saúde: só com voz do aparelho) */
export function resultadoPorExtenso(q: Questionario): string {
    const c = contarSintomas(q.respostas);
    return `Respondido em ${dataPorExtenso(q.criadoEm)}. Marcadas como Muito ou Demais: `
        + GRUPOS.map((g) => `${TITULO_GRUPO[g]}, ${deNove(c[g])}`).join('. ') + '.';
}

/** Uma resposta: a data e uma barra por grupo, com o número escrito */
export function BarrasSintomas({ questionario }: { questionario: Questionario }) {
    const contagem = contarSintomas(questionario.respostas);
    return (
        <View style={[estilos.cartao, { gap: 12 }]}>
            <Text accessibilityRole="header" style={estilos.nome}>{dataPorExtenso(questionario.criadoEm)}</Text>
            {GRUPOS.map((grupo) => (
                <View key={grupo} accessible accessibilityRole="text"
                    accessibilityLabel={`${TITULO_GRUPO[grupo]}: ${deNove(contagem[grupo])} marcadas como Muito ou Demais`} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={estilos.texto}>{TITULO_GRUPO[grupo]}</Text>
                        <Text style={[estilos.texto, { fontWeight: '700' }]}>{deNove(contagem[grupo])}</Text>
                    </View>
                    {/* Trilho com borda: mostra o tamanho total mesmo com 0 */}
                    <View style={{ height: 22, borderRadius: 11, backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: cores.borda, overflow: 'hidden' }}>
                        <View style={{
                            height: '100%', borderRadius: 11, backgroundColor: COR_GRUPO[grupo],
                            width: `${(contagem[grupo] / ITENS_POR_GRUPO) * 100}%`,
                        }} />
                    </View>
                </View>
            ))}
        </View>
    );
}
