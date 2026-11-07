import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Botao } from "~/componentes/basicos";
import { Ilustracao } from "~/componentes/ilustracoes";
import { cores, medidas } from "~/tema/cores";
import { Pasta } from "@/types/pasta";

/**
 * Cartões no estilo do design (iguais aos da web, em src/app/admin/pastas/_cartao.tsx)
 */

/** Última mensagem do aluno, para mostrar no cartão (recentes e "mensagem nova") */
export interface InfoConversa {
    quando?: string;
    /** O mesmo, por extenso, para o leitor de tela */
    quandoFalado?: string;
    nova?: boolean;
}

/**
 * Cartão de um aluno: o cartão inteiro é tocável e o nome lido é o do aluno.
 * `conversas`: o cartão abre o chat em vez da pasta. `quem`: mãe e escola,
 * para diferenciar alunos com o mesmo nome. `conversa`: quando foi a última
 * mensagem e um ponto DISCRETO se há mensagem nova (decidido em 04/11/2026:
 * sem notificação, sem contador e sem vermelho). A pista não fica só no
 * ponto: a palavra "nova" vem junto, e o leitor de tela fala "mensagem nova"
 */
export function CartaoPasta({ pasta, conversas, quem, conversa }: {
    pasta: Pasta; conversas?: boolean; quem?: string; conversa?: InfoConversa;
}) {
    const nova = !!conversa?.nova;
    // O rótulo já diz o que o cartão abre (a dica nem sempre é falada)
    const falado = [conversas ? `Conversa sobre ${pasta.nomeAluno}` : pasta.nomeAluno, quem, nova && 'mensagem nova',
        conversa?.quandoFalado && `última mensagem ${conversa.quandoFalado}`].filter(Boolean).join(', ');
    return (
        <Pressable onPress={() => router.push({ pathname: conversas ? '/pasta/[id]/conversas' : '/pasta/[id]', params: { id: pasta.id } })}
            accessibilityRole="button" accessibilityLabel={falado}
            accessibilityHint={conversas ? 'Abre as conversas sobre o aluno' : 'Abre a pasta do aluno'}
            android_ripple={{ color: '#E5E7EB' }}
            style={({ pressed }) => [estilos.cartao, estilos.linha, pressed && { opacity: 0.85 }]}>
            {/* Girassol da Daya em cada aluno (decorativo: o nome já é lido) */}
            <Ilustracao nome="girassol" altura={44} />
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={estilos.nome}>{pasta.nomeAluno}</Text>
                {!!quem && <Text style={estilos.suave}>{quem}</Text>}
                {!!conversa?.quando && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[estilos.suave, nova && { color: cores.texto, fontWeight: '700' }]}>{conversa.quando}</Text>
                        {nova && <>
                            <View style={estilos.pontoNova} />
                            <Text style={[estilos.suave, { color: cores.link, fontWeight: '700' }]}>nova</Text>
                        </>}
                    </View>
                )}
            </View>
            <Ionicons name="chevron-forward" size={22} color={cores.textoSuave} importantForAccessibility="no" />
        </Pressable>
    );
}

/** Lista curta de cartões de alunos (a lista longa usa ListaAlunos, com rolagem leve) */
export function ListaPastas({ pastas, conversas }: { pastas: Pasta[]; conversas?: boolean }) {
    return <View style={{ gap: 12 }}>{pastas.map((p) => <CartaoPasta key={p.id} pasta={p} conversas={conversas} />)}</View>;
}

/** Cartão "Cadastre o aluno" (design), para a mãe que ainda não tem pasta */
export function CartaoCriarPasta() {
    return (
        <View style={[estilos.cartao, { backgroundColor: '#FFF7EE', gap: 8 }]}>
            <Ilustracao nome="pastaVazia" altura={120} style={{ alignSelf: 'center' }} />
            {/* Rótulo pequeno em verde-petróleo (o laranja não pode ser texto pequeno) */}
            <Text style={estilos.rotulo}>PASTA DO ALUNO</Text>
            <Text accessibilityRole="header" style={estilos.tituloCartao}>Cadastre o aluno</Text>
            <Text style={estilos.texto}>Com poucas informações você já pode começar a conectar a escola e os médicos. Sem burocracia.</Text>
            <Botao titulo="Criar pasta do aluno" icone="add" aoTocar={() => router.push('/pasta/nova')} />
        </View>
    );
}

/** Seção com título grande (h2) */
export function Secao({ titulo, lateral, children }: { titulo: string; lateral?: string; children: ReactNode }) {
    return (
        <View style={{ gap: 12, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <Text accessibilityRole="header" style={estilos.tituloSecao}>{titulo}</Text>
                {lateral && <Text style={estilos.suave}>{lateral}</Text>}
            </View>
            {children}
        </View>
    );
}

export const estilos = StyleSheet.create({
    cartao: {
        backgroundColor: cores.fundoCartao, borderRadius: medidas.raio, borderWidth: 1, borderColor: cores.bordaCartao,
        padding: 16, minHeight: 72,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    nome: { fontSize: 18, fontWeight: '700', color: cores.texto },
    texto: { fontSize: 17, lineHeight: 24, color: cores.texto },
    suave: { fontSize: medidas.texto, color: cores.textoSuave },
    rotulo: { fontSize: medidas.texto, fontWeight: '700', letterSpacing: 0.5, color: cores.secundaria },
    tituloCartao: { fontSize: 24, fontWeight: '800', color: cores.texto },
    tituloSecao: { fontSize: 24, fontWeight: '800', color: cores.texto, flexShrink: 1 },
    // Ponto de "mensagem nova": pequeno e azul (o azul passa de 3:1 sobre branco)
    pontoNova: { width: 10, height: 10, borderRadius: 5, backgroundColor: cores.link },
});
