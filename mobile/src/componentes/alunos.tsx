import { ReactElement, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { estilos as base, useEspacoBarraAbas } from "~/componentes/basicos";
import { CartaoPasta, estilos, InfoConversa } from "~/componentes/cartoes";
import { cores } from "~/tema/cores";
import { buscarPastas, quandoFoi, quemEstaNaPasta, temMensagemNova } from "@/helpers/recentes";
import { Pasta, UltimaMensagem } from "@/types/pasta";

/**
 * LISTA DE ALUNOS PARA QUEM ACOMPANHA MUITOS (etapa 5): a psiquiatra pode
 * ter mais de 50 pastas. Busca pelo nome (no aparelho, sem gastar internet)
 * e uma lista com rolagem leve (FlatList: desenha só os cartões que
 * aparecem na tela, para não travar celulares simples)
 */

/** Quando foi a última mensagem e se há mensagem nova, para o cartão */
export function infoConversa(pasta: Pasta, ultimas: ReadonlyMap<string, UltimaMensagem>, vistas: Record<string, number>, meuUid: string): InfoConversa {
    const ultima = ultimas.get(pasta.id);
    if (!ultima) return {};
    return {
        quando: quandoFoi(ultima.criadoEm),
        quandoFalado: quandoFoi(ultima.criadoEm, Date.now(), true),
        nova: temMensagemNova(ultima, vistas[pasta.id], meuUid),
    };
}

/**
 * Campo de busca com rótulo visível em cima (o texto de exemplo some ao
 * digitar), lupa, letras grandes e botão de limpar. `porFamilia`: diz que
 * também acha pelo nome da mãe ou da escola (para escola e médico)
 */
export function CampoBusca({ valor, aoMudar, porFamilia = false }: { valor: string; aoMudar: (texto: string) => void; porFamilia?: boolean }) {
    const [focado, setFocado] = useState(false);
    const campo = useRef<TextInput>(null);
    return (
        <View style={base.grupoCampo}>
            <Text style={base.rotulo} importantForAccessibility="no" accessibilityElementsHidden>Buscar aluno</Text>
            <View style={[base.caixaCampo, focado && base.caixaFocada, { paddingLeft: 12 }]}>
                <Ionicons name="search" size={22} color={cores.textoSuave} importantForAccessibility="no" />
                <TextInput ref={campo} value={valor} onChangeText={aoMudar}
                    placeholder={porFamilia ? 'Nome do aluno, da mãe ou da escola' : 'Nome do aluno'}
                    accessibilityLabel={porFamilia ? 'Buscar aluno pelo nome, da mãe ou da escola' : 'Buscar aluno pelo nome'}
                    placeholderTextColor={cores.textoSuave} autoCorrect={false} returnKeyType="search"
                    onFocus={() => setFocado(true)} onBlur={() => setFocado(false)}
                    style={[base.entrada, { fontSize: 18 }]} />
                {valor.length > 0 && (
                    // Ao limpar, o botão some: o foco volta para o campo
                    <Pressable onPress={() => { aoMudar(''); campo.current?.focus(); }}
                        accessibilityRole="button" accessibilityLabel="Limpar a busca" style={base.olho}>
                        <Ionicons name="close-circle" size={24} color={cores.textoSuave} />
                    </Pressable>
                )}
            </View>
        </View>
    );
}

/** Quantos a busca achou: falado pelo leitor de tela quando muda */
export function ResultadoBusca({ achados, busca }: { achados: number; busca: string }) {
    if (!busca.trim()) return null;
    return (
        <Text style={estilos.suave} accessibilityLiveRegion="polite">
            {achados === 0 ? 'Nenhum aluno encontrado. Confira o nome ou tente só o primeiro nome.'
                : achados === 1 ? '1 aluno encontrado' : `${achados} alunos encontrados`}
        </Text>
    );
}

const Separador = () => <View style={{ height: 12 }} />;

/**
 * Tela inteira com a lista de alunos: o `cabecalho` (título, instruções,
 * botões) rola junto com a lista. Com `buscar`, a busca fica logo acima
 */
export function ListaAlunos({ pastas, ultimas, vistas, meuUid, cabecalho, conversas, mostrarQuem, buscar = true, vazio }: {
    pastas: Pasta[]; ultimas: ReadonlyMap<string, UltimaMensagem>; vistas: Record<string, number>; meuUid: string;
    cabecalho: ReactElement; conversas?: boolean;
    /** Mãe e escola em cada cartão (para quem acompanha alunos de várias famílias) */
    mostrarQuem?: boolean;
    buscar?: boolean;
    vazio?: ReactElement;
}) {
    const [busca, setBusca] = useState('');
    const achados = buscarPastas(pastas, busca);
    // A lista fica numa aba: o último cartão rola até acima da barra flutuante
    const espacoBarra = useEspacoBarraAbas();
    return (
        <SafeAreaView style={base.tela} edges={['left', 'right']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <FlatList data={achados} keyExtractor={(p) => p.id}
                    contentContainerStyle={[base.conteudo, { paddingBottom: espacoBarra }]} keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                        <View style={{ gap: 12 }}>
                            {cabecalho}
                            {buscar && pastas.length > 0 && <>
                                <CampoBusca valor={busca} aoMudar={setBusca} porFamilia={mostrarQuem} />
                                <ResultadoBusca achados={achados.length} busca={busca} />
                            </>}
                        </View>
                    }
                    ItemSeparatorComponent={Separador}
                    ListEmptyComponent={pastas.length === 0 ? vazio : null}
                    renderItem={({ item }) => (
                        <CartaoPasta pasta={item} conversas={conversas}
                            quem={mostrarQuem ? quemEstaNaPasta(item) : undefined}
                            conversa={infoConversa(item, ultimas, vistas, meuUid)} />
                    )}
                    // Primeiros cartões já prontos; o resto vai sendo desenhado ao rolar
                    initialNumToRender={12} windowSize={7} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
