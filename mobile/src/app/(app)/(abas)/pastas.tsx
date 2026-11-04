import { router } from "expo-router";
import { View } from "react-native";
import { Aviso, Botao, Carregando, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { CartaoCriarPasta } from "~/componentes/cartoes";
import { ListaAlunos } from "~/componentes/alunos";
import { useAuth } from "~/contexto/AuthContext";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";

/**
 * Aba Pastas: todos os alunos, em ordem alfabética, com busca (quem
 * acompanha muitos alunos acha pelo nome). A mãe cria pastas novas
 */
export default function Pastas() {
    const { user } = useAuth();
    const { pastas, ultimas, vistas, carregando, erro, recarregar } = useMinhasPastas();
    const ehMae = user?.role === 'mae';

    const titulo = <Titulo nivel={2}>{ehMae ? 'Pastas dos seus filhos' : 'Alunos que você acompanha'}</Titulo>;
    const instrucoes = (
        <BotaoOuvir rotulo="Ouvir instruções" texto={ehMae
            ? 'Aqui ficam as pastas dos seus filhos. Toque no nome do aluno para abrir a pasta. Para criar uma pasta nova, toque em Nova pasta ou em Criar pasta do aluno.'
            : 'Aqui ficam as pastas dos alunos que você acompanha, em ordem alfabética. Para achar um aluno, escreva o nome dele, da mãe ou da escola no campo de busca. Toque no nome do aluno para abrir a pasta. A palavra nova mostra onde há mensagem nova. Para entrar numa pasta nova, peça o link de convite à família e toque em Entrar numa pasta.'} />
    );

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
        <ListaAlunos pastas={pastas} ultimas={ultimas} vistas={vistas} meuUid={user.uid} mostrarQuem={!ehMae}
            // A mãe tem poucas pastas: sem busca
            buscar={!ehMae}
            cabecalho={
                <View style={{ gap: 12 }}>
                    {titulo}
                    {instrucoes}
                    {ehMae && pastas.length > 0 && <Botao titulo="Nova pasta" icone="add" aoTocar={() => router.push('/pasta/nova')} />}
                    {!ehMae && <Botao titulo="Entrar numa pasta (colar convite)" icone="enter-outline" tipo={pastas.length === 0 ? 'solido' : 'contorno'}
                        aoTocar={() => router.push('/entrar-pasta' as never)} />}
                </View>
            }
            vazio={ehMae ? <CartaoCriarPasta /> : <Paragrafo>Você ainda não tem nenhuma pasta. Peça à família o link de convite.</Paragrafo>} />
    );
}
