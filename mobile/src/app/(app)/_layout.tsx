import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import { limparGravacoesEsquecidas } from "~/componentes/audio";
import { Cabecalho, Carregando, Tela } from "~/componentes/basicos";
import { useAuth } from "~/contexto/AuthContext";
import { cores } from "~/tema/cores";

/**
 * Área logada. Sem sessão, volta para o login. Isso é experiência de uso:
 * quem protege os dados é o RLS do banco (o mesmo da web).
 * As abas ficam em (abas); as telas que se abrem por cima delas (pasta,
 * criar pasta...) ficam aqui, com a seta de voltar na barra do topo
 */
/**
 * Cabeçalho das telas novas (girassol, sem a barra cinza), com a seta de
 * voltar. O chat continua com o topo próprio dele (nome do aluno e Pessoas)
 */
const cabecalhoNovo = {
    header: ({ options, navigation, back }: { options: { title?: string }; navigation: { goBack: () => void }; back?: object }) => (
        <Cabecalho titulo={options.title ?? ''} aoVoltar={back ? () => navigation.goBack() : undefined} />
    ),
};

export default function LayoutLogado() {
    const { user, carregando } = useAuth();
    // Celular compartilhado: não deixa gravação de voz esquecida no aparelho
    useEffect(() => { limparGravacoesEsquecidas(); }, []);
    if (carregando) return <Tela centralizar semCabecalho><Carregando /></Tela>;
    if (!user) return <Redirect href="/boas-vindas" />;

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: cores.barraTopo },
            headerTintColor: cores.texto,
            headerTitleStyle: { color: cores.tituloBarra, fontSize: 20, fontWeight: '600' },
            contentStyle: { backgroundColor: cores.fundo },
            headerBackButtonDisplayMode: 'minimal',
        }}>
            <Stack.Screen name="(abas)" options={{ headerShown: false }} />
            <Stack.Screen name="pasta/[id]/index" options={{ ...cabecalhoNovo, title: 'Pasta do aluno' }} />
            <Stack.Screen name="pasta/[id]/vinculos" options={{ ...cabecalhoNovo, title: 'Vínculos' }} />
            <Stack.Screen name="pasta/[id]/questionario/index" options={{ ...cabecalhoNovo, title: 'Questionário SNAP-IV' }} />
            <Stack.Screen name="pasta/[id]/questionario/responder" options={{ ...cabecalhoNovo, title: 'Responder questionário' }} />
            <Stack.Screen name="entrar-pasta" options={{ ...cabecalhoNovo, title: 'Entrar com convite' }} />
            <Stack.Screen name="sobre" options={{ ...cabecalhoNovo, title: 'Sobre o aplicativo' }} />
        </Stack>
    );
}
