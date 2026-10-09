import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Aviso, Botao, Carregando, Paragrafo, Tela } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { CartaoCriarPasta, estilos, ListaPastas, Secao } from "~/componentes/cartoes";
import { ResumoSemana } from "~/componentes/resumoSemana";
import { useAuth } from "~/contexto/AuthContext";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";
import { cores } from "~/tema/cores";
import { PapelNaPasta, TEXTO_ESCREVER } from "@/types/relatorio";

// "Quarta-feira, 8 de outubro" (no fuso do celular)
function dataDeHoje(): string {
    const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Início (design inicio.png): barra BRANCA com "Olá, Nome" em laranja grande
 * e a data (laranja sobre branco = 3,1:1, texto grande; sobre o cinza das
 * outras barras reprovaria). Depois: o resumo da semana e os alunos
 */
export default function Inicio() {
    const { user } = useAuth();
    const { pastas, carregando, erro, recarregar } = useMinhasPastas();
    const [hoje] = useState(dataDeHoje);
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
                        : `Esta é a tela de início. Para contar como o aluno está, toque em ${pastas.length === 1 ? 'Escrever relatório' : 'Escrever sobre e o nome do aluno'}. Embaixo ficam ${ehMae ? 'as pastas dos seus filhos' : 'os alunos que você acompanha'}: toque no nome do aluno para abrir a pasta. Na barra de baixo você muda de tela: Início, Pastas, Conversas e Perfil.`} />
                    {ehMae && pastas.length === 0 && <CartaoCriarPasta />}
                    {!ehMae && pastas.length === 0 && <>
                        <Paragrafo>Você ainda não acompanha nenhum aluno. Peça à família o link de convite.</Paragrafo>
                        <Botao titulo="Entrar numa pasta (colar convite)" icone="enter-outline" aoTocar={() => router.push('/entrar-pasta' as never)} />
                    </>}

                    {/* "Relatório comportamental / Novo registro" (design). Sem aluno não aparece */}
                    {pastas.length > 0 && (
                        <View style={[estilos.cartao, { gap: 10 }]}>
                            <Text accessibilityRole="header" style={estilos.tituloSecao}>Contar como o aluno está</Text>
                            {/* Escola/médico têm o papel do perfil; a mãe é dona das próprias pastas */}
                            <Text style={estilos.texto}>{TEXTO_ESCREVER[user.role as PapelNaPasta]}</Text>
                            {pastas.length === 1
                                ? <Botao titulo="Escrever relatório" icone="create-outline" aoTocar={() => router.push(`/pasta/${pastas[0].id}/relatorios/novo` as never)} />
                                // Mais de um aluno: a pessoa escolhe sobre quem vai escrever
                                : pastas.map((p) => (
                                    <Botao key={p.id} tipo="contorno" icone="add" titulo={`Escrever sobre ${p.nomeAluno}`}
                                        aoTocar={() => router.push(`/pasta/${p.id}/relatorios/novo` as never)} />
                                ))}
                        </View>
                    )}

                    <ResumoSemana user={user} pastas={pastas} />

                    {pastas.length > 0 && (
                        <Secao titulo={ehMae ? 'Pastas dos seus filhos' : 'Alunos que você acompanha'}>
                            <ListaPastas pastas={pastas} />
                        </Secao>
                    )}
                </>}
            </Tela>
        </View>
    );
}
