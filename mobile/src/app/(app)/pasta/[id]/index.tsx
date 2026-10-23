import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Aviso, Carregando, Tela } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { estilos } from "~/componentes/cartoes";
import { usePasta } from "~/ganchos/usePasta";
import { useAuth } from "~/contexto/AuthContext";
import { cores, medidas } from "~/tema/cores";

type NomeIcone = keyof typeof Ionicons.glyphMap;

/** Atalho em grade (design): ícone e nome, alvo grande */
function Atalho({ nome, icone, aoTocar }: { nome: string; icone: NomeIcone; aoTocar: () => void }) {
    // Com a fonte grande do celular, vira uma coluna só (o nome não quebra no meio)
    const { fontScale } = useWindowDimensions();
    return (
        <Pressable onPress={aoTocar} accessibilityRole="button" accessibilityLabel={nome} android_ripple={{ color: '#E5E7EB' }}
            style={({ pressed }) => [estilos.cartao, {
                flexBasis: fontScale > 1.3 ? '100%' : '47%', flexGrow: 1, minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 6,
            }, pressed && { opacity: 0.85 }]}>
            <Ionicons name={icone} size={30} color={cores.link} importantForAccessibility="no" />
            <Text style={[estilos.nome, { textAlign: 'center' }]}>{nome}</Text>
        </Pressable>
    );
}

/**
 * Pasta do aluno (design): cabeçalho e atalhos para cada parte.
 * Mesma estrutura da web
 */
export default function PastaDoAluno() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { pasta, papel, carregando } = usePasta(id);
    const { user } = useAuth();

    if (carregando) return <Tela><Carregando texto="Abrindo a pasta..." /></Tela>;
    if (!pasta || !papel) return <Tela><Aviso tipo="erro" texto="não foi possível abrir esta pasta. Ela pode não existir, ou você não faz parte dela." /></Tela>;

    const ir = (caminho: string) => router.push(caminho as never);

    return (
        <Tela>
            {/* Cabeçalho lido de uma vez: "Pasta do aluno: Pedro" */}
            <View accessible accessibilityRole="header" accessibilityLabel={`Pasta do aluno: ${pasta.nomeAluno}`}
                style={{ borderBottomWidth: 2, borderBottomColor: cores.destaque, paddingBottom: 12, gap: 2 }}>
                <Text style={estilos.rotulo}>PASTA DO ALUNO</Text>
                <Text style={[estilos.tituloCartao, { fontSize: 28 }]}>{pasta.nomeAluno}</Text>
            </View>
            <BotaoOuvir rotulo="Ouvir instruções" texto={pasta.donoUid === user?.uid
                ? 'Esta é a pasta do aluno. Em Conversas, você conversa com a escola e com o médico. Em Vínculos, você vê quem acompanha o aluno. Para chamar a escola ou o médico, toque em Convidar.'
                : 'Esta é a pasta do aluno. Em Conversas, você conversa com a família e com quem acompanha o aluno. Em Vínculos, você vê quem acompanha o aluno e pode sair da pasta.'} />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: medidas.espaco - 4 }}>
                <Atalho nome="Conversas" icone="chatbubbles" aoTocar={() => ir(`/pasta/${pasta.id}/conversas`)} />
                <Atalho nome="Vínculos" icone="people" aoTocar={() => ir(`/pasta/${pasta.id}/vinculos`)} />
                {/* "Cód. de convite" do design: aqui o convite é um link seguro, em Vínculos */}
                {pasta.donoUid === user?.uid && <Atalho nome="Convidar" icone="person-add" aoTocar={() => ir(`/pasta/${pasta.id}/vinculos?convidar=1`)} />}
            </View>
        </Tela>
    );
}
