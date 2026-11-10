import { ReactElement, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Aviso, Botao, Carregando, Paragrafo, Tela, TopoDaAba } from "~/componentes/basicos";
import { BotaoInstrucoes } from "~/componentes/ouvir";
import { CampoBusca, infoConversa, ResultadoBusca } from "~/componentes/alunos";
import { CartaoPasta, EstadoVazio, estilos, Secao } from "~/componentes/cartoes";
import { Ilustracao } from "~/componentes/ilustracoes";
import { JanelaNovaPasta } from "~/componentes/novaPasta";
import { useAuth } from "~/contexto/AuthContext";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";
import { cores } from "~/tema/cores";
import { buscarPastas, pastasRecentes, POUCAS_PASTAS, quemEstaNaPasta } from "@/helpers/recentes";
import { Pasta } from "@/types/pasta";

/** Na Home, a busca mostra no máximo estes; o resto fica na aba Pastas */
const MAX_NA_HOME = 20;

/**
 * Início (telas novas): "Olá, Nome!" com o girassol, o aviso "Cuidar é uma
 * tarefa compartilhada" com a abelha e, conforme a quantidade de alunos:
 *  - nenhum: "Comece seu acompanhamento" (a mãe cadastra o estudante;
 *    escola e médico entram com o convite);
 *  - até 2 (a mãe, quase sempre): conversas recentes e acesso rápido às pastas;
 *  - mais (a psiquiatra pode ter mais de 50): busca pelo nome e conversas
 *    recentes, com um ponto discreto onde há mensagem nova (decisão 12)
 */
export default function Inicio() {
    const { user } = useAuth();
    const { pastas, ultimas, vistas, carregando, erro, recarregar } = useMinhasPastas();
    const [busca, setBusca] = useState('');
    const [novaPasta, setNovaPasta] = useState(false);
    const muitas = pastas.length > POUCAS_PASTAS;
    const recentes = pastasRecentes(pastas, ultimas);
    const primeiroNome = user?.nome?.trim().split(/\s+/)[0];
    const ehMae = user?.role === 'mae';
    const cartao = (p: Pasta, conversas = false) => (
        <CartaoPasta key={p.id} pasta={p} conversas={conversas} quem={ehMae ? undefined : quemEstaNaPasta(p)}
            conversa={user ? infoConversa(p, ultimas, vistas, user.uid) : undefined} />
    );

    return (
        <View style={{ flex: 1, backgroundColor: cores.fundo }}>
            <Tela emAba semCabecalho>
                {/* Topo sem faixa branca (aba sem cabeçalho): marca, "Olá, Nome!" e o girassol.
                    O nome deixou de ser laranja: sobre o fundo lilás o laranja cai para
                    2,9:1 e reprova no AA (no branco da faixa antiga passava) */}
                <TopoDaAba marca falado={primeiroNome ? `Olá, ${primeiroNome}!` : 'Início'}
                    titulo={primeiroNome ? `Olá, ${primeiroNome}!` : 'Início'}>
                    <Ilustracao nome="brilho" altura={24} />
                </TopoDaAba>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: cores.fundoInfo }}>
                    <Ilustracao nome="abelha" altura={52} />
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: cores.texto }}>Cuidar é uma tarefa compartilhada.</Text>
                        <Text style={{ fontSize: 16, color: cores.texto }}>Família, escola e profissionais de saúde conectados em um só lugar.</Text>
                    </View>
                </View>

                {carregando && <Carregando texto="Carregando os alunos..." />}

                {!carregando && erro && <>
                    <Aviso tipo="erro" texto="não deu para carregar os alunos. Toque em Tentar de novo." />
                    <Botao titulo="Tentar de novo" tipo="contorno" icone="refresh" aoTocar={recarregar} />
                </>}

                {!carregando && !erro && user && <>
                    <BotaoInstrucoes texto={pastas.length === 0
                        ? ehMae
                            ? 'Esta é a tela de início. Você ainda não tem pasta. Para começar, toque em Cadastrar estudante e escreva o nome da criança.'
                            : 'Esta é a tela de início. Você ainda não acompanha nenhum aluno. Peça à família o link de convite e toque em Entrar com convite.'
                        : muitas
                            ? `Esta é a tela de início. Para achar um aluno, escreva o nome ${ehMae ? 'dele' : 'dele, da mãe ou da escola'} no campo de busca. Embaixo estão as últimas conversas. A palavra nova mostra onde há mensagem nova. Toque no aluno para abrir a conversa. Para ver todos, toque em Ver todos os alunos. Na barra de baixo você muda de tela: Início, Pastas e Perfil.`
                            : `Esta é a tela de início. Em Conversas recentes, toque no aluno para abrir a conversa. A palavra nova mostra onde há mensagem nova. Em Acesso rápido, toque no aluno para abrir a pasta.${ehMae ? ' Para cadastrar outro estudante, vá em Pastas.' : ''} Na barra de baixo você muda de tela: Início, Pastas e Perfil.`} />

                    {pastas.length === 0 && (ehMae
                        ? <EstadoVazio titulo="Comece seu acompanhamento" texto="Cadastre o estudante para criar a primeira pasta de acompanhamento.">
                            <Botao titulo="Cadastrar estudante" icone="add" aoTocar={() => setNovaPasta(true)} />
                        </EstadoVazio>
                        : <EstadoVazio titulo="Comece seu acompanhamento" texto="Use o link de convite enviado pela família para entrar na pasta do estudante.">
                            <Botao titulo="Entrar com convite" icone="enter-outline" aoTocar={() => router.push('/entrar-pasta' as never)} />
                        </EstadoVazio>)}

                    {/* Poucos alunos: o chat é a função principal (RF08), então as conversas vêm primeiro */}
                    {pastas.length > 0 && !muitas && <>
                        {recentes.length > 0 && (
                            <Secao titulo="Conversas recentes">{recentes.map((p) => cartao(p, true))}</Secao>
                        )}
                        <Secao titulo="Acesso rápido">{pastas.map((p) => cartao(p))}</Secao>
                    </>}

                    {/* Muitos alunos: busca e conversas recentes */}
                    {muitas && <>
                        <CampoBusca valor={busca} aoMudar={setBusca} porFamilia={!ehMae} />
                        {busca.trim()
                            ? <ResultadosNaHome achados={buscarPastas(pastas, busca)} busca={busca} cartao={(p) => cartao(p)} />
                            : <Secao titulo="Conversas recentes">
                                {recentes.length === 0
                                    ? <Paragrafo>Ainda não há mensagens. Busque o aluno pelo nome para abrir a conversa.</Paragrafo>
                                    : recentes.map((p) => cartao(p, true))}
                            </Secao>}
                        <Botao titulo={`Ver todos os alunos (${pastas.length})`} tipo="contorno" icone="folder-open-outline"
                            aoTocar={() => router.navigate('/pastas' as never)} />
                    </>}
                </>}
            </Tela>

            {ehMae && <JanelaNovaPasta visivel={novaPasta} aoFechar={() => setNovaPasta(false)} aoCriar={recarregar} />}
        </View>
    );
}

/** Resultado da busca na Home: no máximo MAX_NA_HOME; a lista completa fica na aba Pastas */
function ResultadosNaHome({ achados, busca, cartao }: { achados: Pasta[]; busca: string; cartao: (p: Pasta) => ReactElement }) {
    return (
        <View style={{ gap: 12 }}>
            <ResultadoBusca achados={achados.length} busca={busca} />
            {achados.slice(0, MAX_NA_HOME).map(cartao)}
            {achados.length > MAX_NA_HOME && (
                <Text style={estilos.suave}>Mostrando {MAX_NA_HOME} de {achados.length}. Escreva mais letras do nome para achar mais rápido.</Text>
            )}
        </View>
    );
}
