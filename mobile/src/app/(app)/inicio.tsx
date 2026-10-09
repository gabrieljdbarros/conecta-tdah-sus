import { Stack } from "expo-router";
import { Botao, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { useAuth } from "~/contexto/AuthContext";
import { ROLE_LABELS } from "@/types/user";

/** Início (provisório no dia 1: confirma o login). O conteúdo entra no dia 2 */
export default function Inicio() {
    const { user, sair } = useAuth();
    const primeiroNome = user?.nome?.trim().split(/\s+/)[0];
    return (
        <Tela branco>
            <Stack.Screen options={{ title: 'Início' }} />
            <Titulo destaque>{primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}</Titulo>
            {user && <Paragrafo suave>{ROLE_LABELS[user.role]}</Paragrafo>}
            <Paragrafo>Você entrou no aplicativo. As pastas, os relatórios e as conversas chegam nas próximas etapas.</Paragrafo>
            <Botao titulo="Sair" tipo="contorno" icone="log-out-outline" aoTocar={sair} />
        </Tela>
    );
}
