import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "~/contexto/AuthContext";
import { cores } from "~/tema/cores";

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
                    <Stack.Screen name="entrar" options={{ headerShown: false, title: 'Entrar' }} />
                    <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
                    <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
