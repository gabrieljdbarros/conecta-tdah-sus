import { Redirect, Stack } from "expo-router";
import { Carregando, Tela } from "~/componentes/basicos";
import { useAuth } from "~/contexto/AuthContext";
import { cores } from "~/tema/cores";

/**
 * Área logada. Sem sessão, volta para o login. Isso é experiência de uso:
 * quem protege os dados são as Security Rules (iguais às da web).
 * TODO (dia 2): abas no rodapé (Início, Pastas, Conversas, Perfil)
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
        }} />
    );
}
