import { View } from "react-native";
import { Aviso, Botao, Carregando, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { ListaAlunos } from "~/componentes/alunos";
import { useAuth } from "~/contexto/AuthContext";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";
import { ordenarPorConversa } from "@/helpers/recentes";

/**
 * Aba Conversas: um chat por aluno (RN05), da conversa mais nova para a
 * mais antiga, com um ponto discreto onde há mensagem nova (sem
 * notificação). Tocar no aluno abre as conversas dele
 */
export default function Conversas() {
    const { user } = useAuth();
    const { pastas, ultimas, vistas, carregando, erro, recarregar } = useMinhasPastas();
    const ehMae = user?.role === 'mae';

    const cabecalho = (
        <View style={{ gap: 12 }}>
            <Titulo nivel={2}>Uma conversa para cada aluno</Titulo>
            <BotaoOuvir rotulo="Ouvir instruções" texto={'Aqui fica uma conversa para cada aluno. A conversa com a mensagem mais nova fica em cima. '
                + 'A palavra nova mostra onde há mensagem nova. Toque no nome do aluno para abrir a conversa.'
                + (ehMae ? '' : ' Para achar um aluno, escreva o nome dele, da mãe ou da escola no campo de busca.')} />
            <Paragrafo>Toque no aluno para abrir as conversas sobre ele.</Paragrafo>
        </View>
    );

    if (carregando || erro || !user) {
        return (
            <Tela emAba>
                {cabecalho}
                {carregando && <Carregando texto="Carregando..." />}
                {!carregando && erro && <>
                    <Aviso tipo="erro" texto="não deu para carregar os alunos. Toque em Tentar de novo." />
                    <Botao titulo="Tentar de novo" tipo="contorno" icone="refresh" aoTocar={recarregar} />
                </>}
            </Tela>
        );
    }

    return (
        <ListaAlunos pastas={ordenarPorConversa(pastas, ultimas)} ultimas={ultimas} vistas={vistas} meuUid={user.uid}
            conversas mostrarQuem={!ehMae} buscar={!ehMae} cabecalho={cabecalho}
            vazio={<Paragrafo>Você ainda não acompanha nenhum aluno. As conversas aparecem aqui quando houver uma pasta.</Paragrafo>} />
    );
}
