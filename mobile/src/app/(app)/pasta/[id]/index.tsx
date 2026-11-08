import { ReactNode, useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Aviso, Botao, Carregando, LinkTexto, Tela } from "~/componentes/basicos";
import { BotaoInstrucoes } from "~/componentes/ouvir";
import { estilos, IconePapel, InfoConversa } from "~/componentes/cartoes";
import { infoConversa } from "~/componentes/alunos";
import { usePasta } from "~/ganchos/usePasta";
import { useAuth } from "~/contexto/AuthContext";
import PastaServicos from "~/servicos/pasta";
import QuestionarioServicos from "~/servicos/questionario";
import VistasServicos from "~/servicos/vistas";
import { cores } from "~/tema/cores";
import { PapelNaPasta } from "@/types/pasta";
import { ROLE_LABELS } from "@/types/user";

type NomeIcone = keyof typeof Ionicons.glyphMap;

const ORDEM_PAPEL: Record<PapelNaPasta, number> = { mae: 0, escola: 1, medico: 2 };
// Mês por extenso ("3 de novembro"): abreviação pesa para quem lê com dificuldade
const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

/** Cartão largo que abre uma parte da pasta: ícone, nome e uma linha de situação */
function CartaoParte({ nome, icone, falado, aoTocar, destaque = false, children }: {
    nome: string; icone: NomeIcone; falado: string; aoTocar: () => void; destaque?: boolean; children?: ReactNode;
}) {
    return (
        <Pressable onPress={aoTocar} accessibilityRole="button" accessibilityLabel={falado} android_ripple={{ color: '#E5E7EB' }}
            style={({ pressed }) => [estilos.cartao, estilos.linha, { borderRadius: 16 }, pressed && { opacity: 0.85 }]}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: cores.fundoInfo, alignItems: 'center', justifyContent: 'center' }}
                importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Ionicons name={icone} size={30} color={cores.link} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={[estilos.nome, { fontSize: destaque ? 22 : 20, fontWeight: '800' }]}>{nome}</Text>
                {children}
            </View>
            <Ionicons name="chevron-forward" size={22} color={cores.textoSuave} importantForAccessibility="no" />
        </Pressable>
    );
}

/**
 * Pasta do aluno (telas novas, mockup aprovado em 08/11/2026). O nome do
 * aluno vai no cabeçalho do topo e a tela mostra, com dados que já existem:
 *  - Conversas em destaque (RF08, a função principal): hora da última
 *    mensagem e o ponto discreto de "nova" (decisão 12; sem o texto);
 *  - Questionário: só a DATA da última resposta (o resultado fica na tela
 *    do questionário, decisão 11);
 *  - Quem acompanha: nome, papel e escola/unidade (o mesmo da tela de
 *    Vínculos), com o ícone de papel do chat. Para a mãe, o que ainda falta
 *    vem com o botão de convidar (RF04)
 */
export default function PastaDoAluno() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { pasta, papel, carregando } = usePasta(id);
    const { user } = useAuth();
    const [conversa, setConversa] = useState<InfoConversa>({});
    const [ultimaResposta, setUltimaResposta] = useState<number | null | undefined>(undefined);

    // Recarrega ao voltar do chat ou do questionário (o ponto de "nova" some)
    useFocusEffect(useCallback(() => {
        if (!user || !pasta) return;
        let ativo = true;
        Promise.all([PastaServicos.ultimasMensagens(), VistasServicos.ler(user.uid), QuestionarioServicos.listar(pasta.id)])
            .then(([recentes, vistas, questionarios]) => {
                if (!ativo) return;
                setConversa(infoConversa(pasta, recentes.ultimas, vistas, user.uid));
                setUltimaResposta(questionarios.success
                    ? questionarios.questionarios.reduce<number | null>((max, q) => (max === null || q.criadoEm > max ? q.criadoEm : max), null)
                    : undefined);
            });
        return () => { ativo = false; };
    }, [user, pasta]));

    if (carregando) return <Tela><Carregando texto="Abrindo a pasta..." /></Tela>;
    if (!pasta || !papel) return <Tela><Aviso tipo="erro" texto="esta pasta não está disponível para você." /></Tela>;

    const ir = (caminho: string) => router.push(caminho as never);
    const ehDona = pasta.donoUid === user?.uid;
    const primeiroNome = pasta.nomeAluno.trim().split(/\s+/)[0];
    const pessoas = Object.entries(pasta.participantes).sort(([, a], [, b]) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel]);
    const falta = (['escola', 'medico'] as const).filter((p) => !pessoas.some(([, x]) => x.papel === p));
    const convidar = () => ir(`/pasta/${pasta.id}/vinculos?convidar=1`);

    const textoQuestionario = ultimaResposta === undefined ? null
        : ultimaResposta === null ? 'Ainda sem respostas'
            : ehDona ? `Última resposta: ${data(ultimaResposta)}` : `Respondido pela família em ${data(ultimaResposta)}`;
    // O leitor de tela fala o mesmo que está escrito no cartão
    const faladoQuestionario = textoQuestionario ? `Questionário, ${textoQuestionario}` : 'Questionário';

    return (
        <Tela>
            {/* O nome do aluno no cabeçalho do topo (com o girassol) */}
            <Stack.Screen options={{ title: pasta.nomeAluno }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={[estilos.suave, { fontSize: 18, flexShrink: 1 }]}>Pasta de acompanhamento</Text>
                <BotaoInstrucoes texto={ehDona
                    ? `Esta é a pasta de ${primeiroNome}. Toque em Conversas para conversar com a escola e com o médico. A palavra nova mostra que há mensagem nova. Em Questionário, você responde as perguntas sobre ${primeiroNome} e vê o resultado. Embaixo estão as pessoas que acompanham ${primeiroNome}. Se faltar alguém, toque em Convidar.`
                    : `Esta é a pasta de ${primeiroNome}. Toque em Conversas para conversar com a família e com quem acompanha ${primeiroNome}. A palavra nova mostra que há mensagem nova. Em Questionário, você vê as respostas da família. Embaixo estão as pessoas que acompanham ${primeiroNome}.`} />
            </View>

            <CartaoParte nome="Conversas" icone="chatbubble-outline" destaque aoTocar={() => ir(`/pasta/${pasta.id}/conversas`)}
                falado={['Conversas', conversa.nova && 'mensagem nova', conversa.quandoFalado && `última mensagem ${conversa.quandoFalado}`].filter(Boolean).join(', ')}>
                {conversa.quando
                    ? <Text style={[estilos.suave, conversa.nova && { color: cores.texto, fontWeight: '700' }]}>Última mensagem: {conversa.quando}</Text>
                    : <Text style={estilos.suave}>Ainda não há mensagens</Text>}
                {conversa.nova && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={estilos.pontoNova} />
                        <Text style={[estilos.suave, { color: cores.link, fontWeight: '700' }]}>nova</Text>
                    </View>
                )}
            </CartaoParte>

            <CartaoParte nome="Questionário" icone="clipboard-outline" falado={faladoQuestionario} aoTocar={() => ir(`/pasta/${pasta.id}/questionario`)}>
                {textoQuestionario && <Text style={estilos.suave}>{textoQuestionario}</Text>}
            </CartaoParte>

            <View style={{ gap: 10, marginTop: 6 }}>
                <Text accessibilityRole="header" style={estilos.tituloSecao}>Quem acompanha {primeiroNome}</Text>
                <View style={[estilos.cartao, { borderRadius: 16, paddingVertical: 6 }]}>
                    {pessoas.map(([uid, p], i) => {
                        const nome = uid === user?.uid ? `${p.nome} (você)` : p.nome;
                        const sobre = `${ROLE_LABELS[p.papel]}${uid === pasta.donoUid ? ', responsável pela pasta' : ''}`;
                        return (
                            <View key={uid} accessible accessibilityLabel={[nome, sobre, p.detalhe].filter(Boolean).join(', ')}
                                style={[estilos.linha, { gap: 12, paddingVertical: 10 }, (i < pessoas.length - 1 || falta.length > 0) && { borderBottomWidth: 1, borderBottomColor: '#EEF0F3' }]}>
                                <IconePapel papel={p.papel} tamanho={40} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[estilos.nome, { fontSize: 17 }]}>{nome}</Text>
                                    <Text style={[estilos.suave, { fontSize: 15 }]}>{sobre}</Text>
                                    {/* Escola ou unidade numa linha própria: com letra grande, não embola */}
                                    {!!p.detalhe && <Text style={[estilos.suave, { fontSize: 15 }]}>{p.detalhe}</Text>}
                                </View>
                            </View>
                        );
                    })}
                    {falta.map((p, i) => (
                        <View key={p} accessible style={[estilos.linha, { gap: 12, paddingVertical: 10 }, i < falta.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#EEF0F3' }]}>
                            {/* Lugar vazio: contorno tracejado, sem a cor do papel */}
                            <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: cores.borda, alignItems: 'center', justifyContent: 'center' }}
                                importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                                <Ionicons name={p === 'escola' ? 'school-outline' : 'medkit-outline'} size={20} color={cores.textoSuave} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[estilos.nome, { fontSize: 17, color: cores.textoSuave }]}>{p === 'escola' ? 'Ainda sem escola' : 'Ainda sem médico'}</Text>
                                {ehDona && <Text style={[estilos.suave, { fontSize: 15 }]}>{p === 'escola' ? `Convide a escola de ${primeiroNome}` : `Convide o médico do SUS que acompanha ${primeiroNome}`}</Text>}
                            </View>
                        </View>
                    ))}
                </View>
                {ehDona && falta.length > 0 && (
                    <Botao titulo={falta.length === 2 ? 'Convidar escola ou médico' : falta[0] === 'escola' ? 'Convidar escola' : 'Convidar médico'}
                        icone="add" aoTocar={convidar} />
                )}
                <LinkTexto titulo="Ver todos os vínculos" aoTocar={() => ir(`/pasta/${pasta.id}/vinculos`)}
                    dica={ehDona ? 'Convidar, cancelar convites e remover pessoas' : 'Ver quem acompanha e sair da pasta'} />
            </View>
        </Tela>
    );
}
