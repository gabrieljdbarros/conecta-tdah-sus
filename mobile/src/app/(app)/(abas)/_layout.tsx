import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { cores } from "~/tema/cores";

type NomeIcone = keyof typeof Ionicons.glyphMap;

const aba = (titulo: string, icone: NomeIcone, iconeAberto: NomeIcone) => ({
    title: titulo,
    tabBarLabel: ({ focused }: { focused: boolean }) => (
        // Limite de ampliação SÓ aqui: a barra de abas tem altura fixa e "Conversas" seria cortado
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3}
            style={{ fontSize: 16, fontWeight: focused ? '700' : '500', color: focused ? cores.texto : cores.textoSuave }}>{titulo}</Text>
    ),
    tabBarAccessibilityLabel: titulo,
    tabBarIcon: ({ focused }: { focused: boolean }) =>
        <Ionicons name={focused ? iconeAberto : icone} size={26} color={focused ? cores.destaque : cores.textoSuave} importantForAccessibility="no" />,
});

/**
 * Abas no rodapé, como no design e na versão de celular da web:
 * Início · Pastas · Conversas · Perfil, com o NOME embaixo de cada ícone
 * (público com baixa alfabetização). Aba aberta: ícone laranja (não é
 * texto: 3,1:1 basta) e o nome em negrito escuro — o laranja nunca é texto
 */
export default function LayoutAbas() {
    // Espaço dos botões do Android (voltar, início...) ou da barra de gestos:
    // a barra de abas fica ACIMA deles, com a altura certa para ícone + nome
    const { bottom } = useSafeAreaInsets();
    return (
        <Tabs screenOptions={{
            headerStyle: { backgroundColor: cores.barraTopo },
            headerTitleStyle: { color: cores.tituloBarra, fontSize: 20, fontWeight: '600' },
            sceneStyle: { backgroundColor: cores.fundo },
            tabBarStyle: { height: 70 + bottom, paddingTop: 8, paddingBottom: bottom + 8 },
        }}>
            <Tabs.Screen name="inicio" options={{ ...aba('Início', 'home-outline', 'home'), headerShown: false }} />
            <Tabs.Screen name="pastas" options={aba('Pastas', 'folder-outline', 'folder')} />
            <Tabs.Screen name="conversas" options={aba('Conversas', 'chatbubbles-outline', 'chatbubbles')} />
            <Tabs.Screen name="perfil" options={{ ...aba('Perfil', 'person-outline', 'person'), title: 'Meu perfil' }} />
        </Tabs>
    );
}
