import { ReactElement, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Aviso, Botao, Carregando, Paragrafo, Tela } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { CampoBusca, infoConversa, ResultadoBusca } from "~/componentes/alunos";
import { CartaoCriarPasta, CartaoPasta, estilos, Secao } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";
import { cores } from "~/tema/cores";
import { buscarPastas, pastasRecentes, POUCAS_PASTAS, quemEstaNaPasta } from "@/helpers/recentes";
import { Pasta } from "@/types/pasta";

/** Na Home, a busca mostra no máximo estes; o resto fica na aba Pastas */
const MAX_NA_HOME = 20;

// "Quarta-feira, 8 de outubro" (no fuso do celular)
function dataDeHoje(): string {
    const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Início (design inicio.png): barra BRANCA com "Olá, Nome" em laranja grande
 * e a data (laranja sobre branco = 3,1:1, texto grande; sobre o cinza das
 * outras barras reprovaria). Depois, conforme a quantidade de alunos:
 *  - até 2 (a mãe, quase sempre): o atalho para a conversa e os cartões;
 *  - mais (a psiquiatra pode ter mais de 50): busca pelo nome e as
 *    conversas recentes, com um ponto discreto onde há mensagem nova
 *    (sem notificação, decidido em 04/11/2026)
 */
export default function Inicio() {
    const { user } = useAuth();
    const { pastas, ultimas, vistas, carregando, erro, recarregar } = useMinhasPastas();
    const [hoje] = useState(dataDeHoje);
    const [busca, setBusca] = useState('');
    const muitas = pastas.length > POUCAS_PASTAS;
    const recentes = muitas ? pastasRecentes(pastas, ultimas) : [];
    const primeiroNome = user?.nome?.trim().split(/\s+/)[0];
    const ehMae = user?.role === 'mae';

    return (
        <View style={{ flex: 1, backgroundColor: cores.fundo }}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF', elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 14 }} accessible accessibilityRole="header">
                    <Text style={{ fontSize: 30, fontWeight: '800', color: cores.destaque }}>
                        {primeiroNome ? `Olá, ${primeiroNome}` : 'Início'}
                    </Text>
                    <Text style={{ fontSize: 16, color: cores.tituloBarra }}>{hoje}</Text>
                </View>
            </SafeAreaView>

            <Tela emAba>
                {carregando && <Carregando texto="Carregando os alunos..." />}

                {!carregando && erro && <>
                    <Aviso tipo="erro" texto="não deu para carregar os alunos. Toque em Tentar de novo." />
                    <Botao titulo="Tentar de novo" tipo="contorno" icone="refresh" aoTocar={recarregar} />
                </>}

                {!carregando && !erro && user && <>
                    <BotaoOuvir rotulo="Ouvir instruções" texto={pastas.length === 0
                        ? ehMae
                            ? 'Esta é a tela de início. Você ainda não tem pasta. Para começar, toque em Criar pasta do aluno.'
                            : 'Esta é a tela de início. Você ainda não acompanha nenhum aluno. Peça à família o link de convite e toque em Entrar numa pasta.'
                        : muitas
                            ? `Esta é a tela de início. Para achar um aluno, escreva o nome ${ehMae ? 'dele' : 'dele, da mãe ou da escola'} no campo de busca. Embaixo estão as últimas conversas. A palavra nova mostra onde há mensagem nova. Toque no aluno para abrir a conversa. Para ver todos, toque em Ver todos os alunos. Na barra de baixo você muda de tela: Início, Pastas, Conversas e Perfil.`
                            : `Esta é a tela de início. Para conversar sobre o aluno, toque em ${pastas.length === 1 ? 'Abrir conversa' : 'Conversa sobre e o nome do aluno'}. Embaixo ficam ${ehMae ? 'as pastas dos seus filhos' : 'os alunos que você acompanha'}: toque no nome do aluno para abrir a pasta. Na barra de baixo você muda de tela: Início, Pastas, Conversas e Perfil.`} />
                    {ehMae && pastas.length === 0 && <CartaoCriarPasta />}
                    {!ehMae && pastas.length === 0 && <>
                        <Paragrafo>Você ainda não acompanha nenhum aluno. Peça à família o link de convite.</Paragrafo>
                        <Botao titulo="Entrar numa pasta (colar convite)" icone="enter-outline" aoTocar={() => router.push('/entrar-pasta' as never)} />
                    </>}

                    {/* Poucos alunos. O chat é a função principal (RF08): atalho direto para a conversa */}
                    {pastas.length > 0 && !muitas && <>
                        <View style={[estilos.cartao, { gap: 10 }]}>
                            <Text accessibilityRole="header" style={estilos.tituloSecao}>Conversar sobre o aluno</Text>
                            <Text style={estilos.texto}>A família, a escola e os médicos da pasta veem todas as mensagens.</Text>
                            {pastas.length === 1
                                ? <Botao titulo="Abrir conversa" icone="chatbubbles-outline" aoTocar={() => router.push(`/pasta/${pastas[0].id}/conversas` as never)} />
                                // Mais de um aluno: a pessoa escolhe sobre quem vai conversar
                                : pastas.map((p) => (
                                    <Botao key={p.id} tipo="contorno" icone="chatbubbles-outline" titulo={`Conversa sobre ${p.nomeAluno}`}
                                        aoTocar={() => router.push(`/pasta/${p.id}/conversas` as never)} />
                                ))}
                        </View>
                        <Secao titulo={ehMae ? 'Pastas dos seus filhos' : 'Alunos que você acompanha'}>
                            {pastas.map((p) => <CartaoPasta key={p.id} pasta={p} conversa={infoConversa(p, ultimas, vistas, user.uid)} />)}
                        </Secao>
                    </>}

                    {/* Muitos alunos: busca e conversas recentes */}
                    {muitas && <>
                        <CampoBusca valor={busca} aoMudar={setBusca} porFamilia={!ehMae} />
                        {busca.trim()
                            ? <ResultadosNaHome achados={buscarPastas(pastas, busca)} busca={busca}
                                cartao={(p) => <CartaoPasta key={p.id} pasta={p} quem={ehMae ? undefined : quemEstaNaPasta(p)} conversa={infoConversa(p, ultimas, vistas, user.uid)} />} />
                            : <Secao titulo="Conversas recentes">
                                {recentes.length === 0
                                    ? <Paragrafo>Ainda não há mensagens. Busque o aluno pelo nome para abrir a conversa.</Paragrafo>
                                    : recentes.map((p) => (
                                        <CartaoPasta key={p.id} pasta={p} conversas quem={ehMae ? undefined : quemEstaNaPasta(p)}
                                            conversa={infoConversa(p, ultimas, vistas, user.uid)} />
                                    ))}
                            </Secao>}
                        <Botao titulo={`Ver todos os alunos (${pastas.length})`} tipo="contorno" icone="folder-open-outline"
                            aoTocar={() => router.navigate('/pastas' as never)} />
                    </>}
                </>}
            </Tela>
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
