import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Aviso, Botao, Carregando, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { EstadoVazio, estilos } from "~/componentes/cartoes";
import { ListaAlunos } from "~/componentes/alunos";
import { JanelaNovaPasta } from "~/componentes/novaPasta";
import { useAuth } from "~/contexto/AuthContext";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";

/**
 * Minhas pastas (telas novas): todos os alunos, em ordem alfabética, com
 * busca para quem acompanha muitos. A mãe cadastra o estudante numa janela
 * sem sair da lista; escola e médico entram com o link de convite
 */
export default function Pastas() {
    const { user } = useAuth();
    const { pastas, ultimas, vistas, carregando, erro, recarregar } = useMinhasPastas();
    const [novaPasta, setNovaPasta] = useState(false);
    const ehMae = user?.role === 'mae';

    const titulo = <>
        <Titulo nivel={2}>Minhas pastas</Titulo>
        <Paragrafo suave>Acesse as pastas dos estudantes que você acompanha.</Paragrafo>
    </>;
    const instrucoes = (
        <BotaoOuvir rotulo="Ouvir instruções" texto={ehMae
            ? 'Aqui ficam as pastas dos seus filhos. Toque no nome do aluno para abrir a pasta. Para criar uma pasta nova, toque em Cadastrar estudante e escreva o nome da criança.'
            : 'Aqui ficam as pastas dos alunos que você acompanha, em ordem alfabética. Para achar um aluno, escreva o nome dele, da mãe ou da escola no campo de busca. Toque no nome do aluno para abrir a pasta. A palavra nova mostra onde há mensagem nova. Para entrar numa pasta nova, peça o link de convite à família e toque em Entrar com convite.'} />
    );
    const acao = ehMae
        ? <Botao titulo="Cadastrar estudante" icone="add" aoTocar={() => setNovaPasta(true)} />
        : <Botao titulo="Entrar com convite" icone="enter-outline" aoTocar={() => router.push('/entrar-pasta' as never)} />;
    const janela = ehMae && <JanelaNovaPasta visivel={novaPasta} aoFechar={() => setNovaPasta(false)} aoCriar={recarregar} />;

    if (carregando || erro || !user) {
        return (
            <Tela emAba>
                {titulo}
                {instrucoes}
                {carregando && <Carregando texto="Carregando as pastas..." />}
                {!carregando && erro && <>
                    <Aviso tipo="erro" texto="não deu para carregar as pastas. Toque em Tentar de novo." />
                    <Botao titulo="Tentar de novo" tipo="contorno" icone="refresh" aoTocar={recarregar} />
                </>}
            </Tela>
        );
    }

    return (
        <>
            <ListaAlunos pastas={pastas} ultimas={ultimas} vistas={vistas} meuUid={user.uid} mostrarQuem={!ehMae}
                // A mãe tem poucas pastas: sem busca
                buscar={!ehMae}
                cabecalho={
                    <View style={{ gap: 12 }}>
                        {titulo}
                        {instrucoes}
                        {pastas.length > 0 && <>
                            {acao}
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                                <Text accessibilityRole="header" style={estilos.tituloSecao}>Estudantes</Text>
                                <Text style={estilos.suave}>{pastas.length === 1 ? '1 pasta' : `${pastas.length} pastas`}</Text>
                            </View>
                        </>}
                    </View>
                }
                vazio={
                    <EstadoVazio titulo="Você ainda não tem pastas" texto={ehMae
                        ? 'Cadastre o estudante para criar a primeira pasta de acompanhamento.'
                        : 'Use o link de convite enviado pela família para entrar na pasta do estudante.'}>
                        {acao}
                    </EstadoVazio>
                } />
            {janela}
        </>
    );
}
