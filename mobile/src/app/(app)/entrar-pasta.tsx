import { useState } from "react";
import { View } from "react-native";
import { router, Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { anunciar, Aviso, Botao, Campo, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { useAuth } from "~/contexto/AuthContext";
import ConviteServicos, { codigoDoTexto } from "~/servicos/convite";

/**
 * ENTRAR NUMA PASTA (escola/médico): cola o link do convite que recebeu.
 * O app tira o código do link e chama a MESMA Function da web
 * (aceitarConvite: confere validade de 48 h, uso único e perfil, numa transação).
 * Abrir o app direto pelo link (deep link) exige o site publicado: fica para depois
 */
export default function EntrarPasta() {
    const { user } = useAuth();
    const [texto, setTexto] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [colado, setColado] = useState(false);

    if (user?.role !== 'escola' && user?.role !== 'medico')
        return <Tela><Stack.Screen options={{ title: 'Entrar numa pasta' }} /><Paragrafo>Só a escola e o médico entram em pastas por convite. A família cria a pasta.</Paragrafo></Tela>;

    // Facilita para quem não sabe colar: lê o que foi copiado no WhatsApp
    const colar = async () => {
        const copiado = await Clipboard.getStringAsync();
        setErro(null);
        // Só usa o que for um convite: outro texto copiado (até uma senha) não aparece na tela
        if (codigoDoTexto(copiado)) {
            setTexto(copiado.trim());
            setColado(true);
            anunciar('Link colado. Agora toque em Entrar na pasta.');
        } else {
            setErro('o que está copiado não é um link de convite. Copie o link que a família mandou e tente de novo.');
        }
    };

    const entrar = async () => {
        setErro(null);
        const codigo = codigoDoTexto(texto);
        if (!codigo) { setErro('isto não parece um link de convite. Cole o link inteiro que você recebeu.'); return; }
        setEnviando(true);
        const { success, pastaId, nomeAluno, message } = await ConviteServicos.aceitar(codigo);
        setEnviando(false);
        if (success && pastaId) {
            anunciar(`Pronto: agora você acompanha ${nomeAluno ?? 'o aluno'}.`);
            router.replace(`/pasta/${pastaId}` as never);
        } else setErro(message ?? 'não foi possível entrar na pasta.');
    };

    return (
        <Tela>
            <Stack.Screen options={{ title: 'Entrar numa pasta' }} />
            <View style={{ gap: 12 }}>
                <Titulo nivel={2}>Recebeu um convite?</Titulo>
                <BotaoOuvir rotulo="Ouvir instruções" texto="Para entrar na pasta de um aluno, copie o link que a família mandou. Depois toque em Colar o link copiado e em Entrar na pasta. O link vale 48 horas e só funciona uma vez." />
                <Paragrafo>A família manda um link, por exemplo, pelo WhatsApp. Ele vale 48 horas e só funciona uma vez.</Paragrafo>
                {/* Passo a passo: copiar é feito fora do app, e é onde as pessoas travam */}
                <Paragrafo>1. No WhatsApp, segure o dedo na mensagem com o link e toque em Copiar.</Paragrafo>
                <Paragrafo>2. Volte aqui e toque em Colar o link copiado.</Paragrafo>
                <Paragrafo>3. Toque em Entrar na pasta.</Paragrafo>
                <Botao titulo="Colar o link copiado" tipo="contorno" icone="clipboard-outline" aoTocar={colar} />
                {colado && <Aviso tipo="sucesso" texto="link colado." silencioso />}
                {/* Plano B: digitar ou colar à mão */}
                <Campo rotulo="Link do convite" value={texto} onChangeText={(t) => { setTexto(t); setErro(null); setColado(false); }}
                    keyboardType="url" autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no" placeholder="Ou cole o link aqui" />
                {erro && <Aviso tipo="erro" texto={erro} />}
                <Botao titulo={enviando ? 'Entrando...' : 'Entrar na pasta'} icone="enter-outline" carregando={enviando} aoTocar={entrar} />
            </View>
        </Tela>
    );
}
