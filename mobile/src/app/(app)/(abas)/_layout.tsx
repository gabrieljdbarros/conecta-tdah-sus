import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Cabecalho } from "~/componentes/basicos";
import { cores, medidas } from "~/tema/cores";

type NomeIcone = keyof typeof Ionicons.glyphMap;

const aba = (titulo: string, icone: NomeIcone, iconeAberto: NomeIcone) => ({
    title: titulo,
    tabBarLabel: ({ focused }: { focused: boolean }) => (
        // Limite de ampliação SÓ aqui: a barra de abas tem altura fixa
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3}
            style={{ fontSize: 16, fontWeight: focused ? '700' : '500', color: focused ? cores.texto : cores.textoSuave }}>{titulo}</Text>
    ),
    tabBarAccessibilityLabel: titulo,
    // Aba aberta (telas novas): o ícone ganha uma "pílula" de fundo claro.
    // Azul sobre o fundo claro: 6,6:1. A pista não fica só na cor: o nome
    // embaixo fica em negrito, e o leitor de tela diz "selecionado"
    tabBarIcon: ({ focused }: { focused: boolean }) => (
        <View style={{ width: 64, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? cores.fundoInfo : 'transparent' }}>
            <Ionicons name={focused ? iconeAberto : icone} size={26} color={focused ? cores.link : cores.textoSuave} importantForAccessibility="no" />
        </View>
    ),
});

/**
 * Abas no rodapé (RF15): Início · Pastas · Perfil, com o NOME embaixo de
 * cada ícone (público com baixa alfabetização; o protótipo só tem ícones).
 * Três itens, decidido em 06/11/2026 com as telas novas: as conversas
 * recentes ficam na Início e a lista completa (com busca e a marca de
 * "nova") na aba Pastas.
 * A barra FLUTUA (telas novas): pílula branca arredondada, com sombra,
 * acima dos botões do Android. As telas das abas deixam espaço no fim para
 * o último item não ficar embaixo dela (useEspacoBarraAbas)
 */
export default function LayoutAbas() {
    const { bottom } = useSafeAreaInsets();
    return (
        <Tabs screenOptions={{
            // Sem a barra cinza: o cabeçalho das telas novas, com o girassol
            header: ({ options }) => <Cabecalho titulo={options.title ?? ''} />,
            sceneStyle: { backgroundColor: cores.fundo },
            // Com o teclado aberto (ex.: Perfil), a barra some e não cobre o campo em uso
            tabBarHideOnKeyboard: true,
            tabBarStyle: {
                position: 'absolute', bottom: bottom + medidas.margemBarraAbas, marginHorizontal: 20,
                height: medidas.barraAbas, paddingTop: 8, paddingBottom: 8,
                borderRadius: medidas.barraAbas / 2, borderTopWidth: 0, backgroundColor: '#FFFFFF',
                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
            },
            // A pílula desvia dos botões do Android pela posição (bottom), e a
            // altura e o espaço interno fixos acima substituem os da biblioteca
            tabBarItemStyle: { gap: 4, borderRadius: medidas.barraAbas / 2 },
        }}>
            <Tabs.Screen name="inicio" options={{ ...aba('Início', 'home-outline', 'home'), headerShown: false }} />
            <Tabs.Screen name="pastas" options={{ ...aba('Pastas', 'folder-outline', 'folder'), title: 'Minhas pastas', tabBarAccessibilityLabel: 'Pastas' }} />
            <Tabs.Screen name="perfil" options={{ ...aba('Perfil', 'person-outline', 'person'), title: 'Meu perfil', tabBarAccessibilityLabel: 'Perfil' }} />
        </Tabs>
    );
}
