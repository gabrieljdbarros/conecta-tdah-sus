import { Redirect } from "expo-router";
import { Tela, Carregando } from "~/componentes/basicos";
import { useAuth } from "~/contexto/AuthContext";

/** Porta de entrada: logado vai para o Início; senão, para o login */
export default function Index() {
    const { user, carregando } = useAuth();
    if (carregando) return <Tela centralizar semCabecalho><Carregando texto="Abrindo o aplicativo..." /></Tela>;
    return <Redirect href={user ? '/inicio' : '/entrar'} />;
}
