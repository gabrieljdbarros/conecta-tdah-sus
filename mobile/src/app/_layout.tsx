import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "~/contexto/AuthContext";
import { cores } from "~/tema/cores";

/** Barra do topo só com a seta de voltar (o título fica na própria tela) */
const SO_VOLTAR = { headerTitle: '', headerStyle: { backgroundColor: '#FFFFFF' }, headerShadowVisible: false } as const;

/**
 * Estrutura do app (Expo Router: cada arquivo em src/app é uma tela).
 * A barra do topo segue o design: fundo cinza-claro e título escuro
 */
export default function LayoutRaiz() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{
                    headerStyle: { backgroundColor: cores.barraTopo },
                    headerTintColor: cores.texto,
                    headerTitleStyle: { color: cores.tituloBarra, fontSize: 20, fontWeight: '600' },
                    contentStyle: { backgroundColor: cores.fundo },
                    headerBackButtonDisplayMode: 'minimal',
                }}>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="boas-vindas" options={{ headerShown: false, title: 'Boas-vindas' }} />
                    {/* Entrar e cadastro (design da Daya): só a seta de voltar, sobre o branco da tela */}
                    <Stack.Screen name="entrar" options={{ ...SO_VOLTAR, title: 'Entrar' }} />
                    <Stack.Screen name="cadastro/index" options={{ ...SO_VOLTAR, title: 'Escolher perfil' }} />
                    <Stack.Screen name="cadastro/dados" options={{ ...SO_VOLTAR, title: 'Criar conta' }} />
                    <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
