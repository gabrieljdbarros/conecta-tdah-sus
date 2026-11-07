import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { cores } from "~/tema/cores";

type NomeIcone = keyof typeof Ionicons.glyphMap;

const aba = (titulo: string, icone: NomeIcone, iconeAberto: NomeIcone) => ({
    title: titulo,
    tabBarLabel: ({ focused }: { focused: boolean }) => (
        // Limite de ampliação SÓ aqui: a barra de abas tem altura fixa
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3}
            style={{ fontSize: 16, fontWeight: focused ? '700' : '500', color: focused ? cores.texto : cores.textoSuave }}>{titulo}</Text>
    ),
    tabBarAccessibilityLabel: titulo,
    // Aba aberta (design da Daya): o ícone ganha uma "pílula" de fundo claro.
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
 * cada ícone (público com baixa alfabetização). Três itens, decidido em
 * 06/11/2026 com as telas da Daya: as conversas recentes ficam na Início
 * e a lista completa (com busca e a marca de "nova") na aba Pastas
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
            tabBarStyle: { height: 76 + bottom, paddingTop: 8, paddingBottom: bottom + 8, borderTopColor: cores.bordaCartao },
            tabBarItemStyle: { gap: 4 },
        }}>
            <Tabs.Screen name="inicio" options={{ ...aba('Início', 'home-outline', 'home'), headerShown: false }} />
            <Tabs.Screen name="pastas" options={aba('Pastas', 'folder-outline', 'folder')} />
            <Tabs.Screen name="perfil" options={{ ...aba('Perfil', 'person-outline', 'person'), title: 'Meu perfil' }} />
        </Tabs>
    );
}
