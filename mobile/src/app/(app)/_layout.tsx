import { Redirect, Stack } from "expo-router";
import { Carregando, Tela } from "~/componentes/basicos";
import { useAuth } from "~/contexto/AuthContext";
import { cores } from "~/tema/cores";

/**
 * Área logada. Sem sessão, volta para o login. Isso é experiência de uso:
 * quem protege os dados são as Security Rules (iguais às da web).
 * As abas ficam em (abas); as telas que se abrem por cima delas (pasta,
 * criar pasta...) ficam aqui, com a seta de voltar na barra do topo
 */
export default function LayoutLogado() {
    const { user, carregando } = useAuth();
    if (carregando) return <Tela centralizar semCabecalho><Carregando /></Tela>;
    if (!user) return <Redirect href="/entrar" />;

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: cores.barraTopo },
            headerTintColor: cores.texto,
            headerTitleStyle: { color: cores.tituloBarra, fontSize: 20, fontWeight: '600' },
            contentStyle: { backgroundColor: cores.fundo },
            headerBackButtonDisplayMode: 'minimal',
        }}>
            <Stack.Screen name="(abas)" options={{ headerShown: false }} />
            <Stack.Screen name="pasta/nova" options={{ title: 'Criar pasta' }} />
            <Stack.Screen name="pasta/[id]/index" options={{ title: 'Pasta do aluno' }} />
            {/* As telas de relatórios definem o próprio título (Stack.Screen dentro delas) */}
        </Stack>
    );
}
