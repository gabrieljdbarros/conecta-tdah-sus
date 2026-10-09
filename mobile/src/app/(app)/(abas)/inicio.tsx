import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Aviso, Botao, Carregando, Paragrafo, Tela } from "~/componentes/basicos";
import { CartaoCriarPasta, ListaPastas, Secao } from "~/componentes/cartoes";
import { ResumoSemana } from "~/componentes/resumoSemana";
import { useAuth } from "~/contexto/AuthContext";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";
import { cores } from "~/tema/cores";

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

            <Tela>
                {carregando && <Carregando texto="Carregando os alunos..." />}

                {!carregando && erro && <>
                    <Aviso tipo="erro" texto="não deu para carregar os alunos. Toque em Tentar de novo." />
                    <Botao titulo="Tentar de novo" tipo="contorno" icone="refresh" aoTocar={recarregar} />
                </>}

                {!carregando && !erro && user && <>
                    {ehMae && pastas.length === 0 && <CartaoCriarPasta />}
                    {!ehMae && pastas.length === 0 && (
                        <Paragrafo>Você ainda não acompanha nenhum aluno. Peça à família o link de convite.</Paragrafo>
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
