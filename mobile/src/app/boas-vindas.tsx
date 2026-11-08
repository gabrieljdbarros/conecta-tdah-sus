import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { Botao, LinkTexto, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { Ilustracao } from "~/componentes/ilustracoes";
import { BotaoInstrucoes } from "~/componentes/ouvir";
import { useAuth } from "~/contexto/AuthContext";

/**
 * Boas-vindas (design da Daya): o logo, uma frase sobre o app e os dois
 * caminhos, criar conta ou entrar. É a porta de quem não está logado
 */
export default function BoasVindas() {
    const { user } = useAuth();
    if (user) return <Redirect href="/inicio" />;

    return (
        <Tela centralizar branco semCabecalho>
            <View style={{ alignItems: 'center', gap: 16 }}>
                <Ilustracao nome="logo" altura={200} rotulo="Conecta TDAH SUS" />
                {/* Título em escuro: o laranja só passa no AA em letra grande, e este título quebra a linha */}
                <Titulo>Sua jornada começa aqui!</Titulo>
                <View style={{ alignSelf: 'stretch' }}>
                    <Paragrafo>Família, escola e saúde juntas no cuidado com a criança.</Paragrafo>
                </View>
                <BotaoInstrucoes texto="Bem-vindo ao Conecta TDAH SUS. Aqui a família, a escola e a saúde conversam juntas sobre a criança. Para criar a sua conta, toque em Cadastrar. Se você já tem conta, toque em Já tenho conta, entrar." />
            </View>
            <View style={{ gap: 8, marginTop: 24 }}>
                <Botao titulo="Cadastrar" icone="person-add-outline" aoTocar={() => router.push('/cadastro')} />
                <LinkTexto titulo="Já tenho conta: entrar" aoTocar={() => router.push('/entrar')} />
            </View>
        </Tela>
    );
}
