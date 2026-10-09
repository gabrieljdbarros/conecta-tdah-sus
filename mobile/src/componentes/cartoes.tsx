import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Botao } from "~/componentes/basicos";
import { cores, medidas } from "~/tema/cores";
import { Pasta, SERIE_LABELS } from "@/types/pasta";

/**
 * Cartões no estilo do design (iguais aos da web, em src/app/admin/pastas/_cartao.tsx)
 */

/** Cartão de um aluno: o cartão inteiro é tocável e o nome lido é "aluno, série" */
export function CartaoPasta({ pasta }: { pasta: Pasta }) {
    const serie = SERIE_LABELS[pasta.serie] ?? '';
    return (
        <Pressable onPress={() => router.push({ pathname: '/pasta/[id]', params: { id: pasta.id } })}
            accessibilityRole="button" accessibilityLabel={[pasta.nomeAluno, serie].filter(Boolean).join(', ')} accessibilityHint="Abre a pasta do aluno"
            android_ripple={{ color: '#E5E7EB' }}
            style={({ pressed }) => [estilos.cartao, estilos.linha, pressed && { opacity: 0.85 }]}>
            <View style={estilos.circulo} importantForAccessibility="no">
                <Ionicons name="folder" size={24} color={cores.link} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={estilos.nome}>{pasta.nomeAluno}</Text>
                <Text style={estilos.suave}>{serie}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={cores.textoSuave} importantForAccessibility="no" />
        </Pressable>
    );
}

/** Lista de cartões de alunos */
export function ListaPastas({ pastas }: { pastas: Pasta[] }) {
    return <View style={{ gap: 12 }}>{pastas.map((p) => <CartaoPasta key={p.id} pasta={p} />)}</View>;
}

/** Cartão "Cadastre o aluno" (design), para a mãe que ainda não tem pasta */
export function CartaoCriarPasta() {
    return (
        <View style={[estilos.cartao, { backgroundColor: '#FFF7EE', gap: 8 }]}>
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
    circulo: { width: 48, height: 48, borderRadius: 24, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center' },
    nome: { fontSize: 18, fontWeight: '700', color: cores.texto },
    texto: { fontSize: 17, lineHeight: 24, color: cores.texto },
    suave: { fontSize: medidas.texto, color: cores.textoSuave },
    rotulo: { fontSize: medidas.texto, fontWeight: '700', letterSpacing: 0.5, color: cores.secundaria },
    tituloCartao: { fontSize: 24, fontWeight: '800', color: cores.texto },
    tituloSecao: { fontSize: 24, fontWeight: '800', color: cores.texto, flexShrink: 1 },
});
