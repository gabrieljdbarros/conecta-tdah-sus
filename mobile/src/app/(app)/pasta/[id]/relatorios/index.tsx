import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { anunciar, Aviso, Botao, Carregando, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import { usePasta } from "~/ganchos/usePasta";
import CategoriaServicos from "~/servicos/categoria";
import RelatorioServicos from "~/servicos/relatorio";
import { cores } from "~/tema/cores";
import { formatarDia, ICONE_TIPO } from "~/util/relatorio";
import { Relatorio, TEXTO_ESCREVER, TIPO_LABELS, TipoRelatorio, TIPOS_QUE_ESCREVE, TIPOS_QUE_LE } from "@/types/relatorio";
import { ROLE_LABELS } from "@/types/user";

/**
 * Relatórios da pasta (decisão travada 9 / RN06): cartões e filtro por tipo.
 * Cada pessoa vê só os tipos que o seu papel pode ler (as regras garantem).
 * "Orientações" é esta lista filtrada (atalho da pasta: ?tipo=orientacao_medica)
 */
export default function Relatorios() {
    const params = useLocalSearchParams<{ id: string; tipo?: string; enviado?: string }>();
    const { pasta, papel, carregando: carregandoPasta } = usePasta(params.id);
    const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
    const [nomesCategorias, setNomesCategorias] = useState<Record<string, string>>({});
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const [filtro, setFiltro] = useState<TipoRelatorio | undefined>(
        params.tipo && Object.prototype.hasOwnProperty.call(TIPO_LABELS, params.tipo) ? params.tipo as TipoRelatorio : undefined);

    const carregar = useCallback(async () => {
        if (!papel || !pasta) return;
        const [lista, cats] = await Promise.all([RelatorioServicos.listar(pasta.id, papel), CategoriaServicos.listar()]);
        setRelatorios(lista.relatorios);
        // Inclui as desativadas: relatórios antigos continuam mostrando o nome
        setNomesCategorias(Object.fromEntries(cats.categorias.map((c) => [c.id, c.nome])));
        setErro(!lista.success);
        setCarregando(false);
    }, [pasta, papel]);

    useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

    // Tipo pedido só vale se o papel pode ler (senão: todos)
    const tiposQueLe = papel ? TIPOS_QUE_LE[papel] : [];
    const filtroValido = filtro && tiposQueLe.includes(filtro) ? filtro : undefined;
    const visiveis = filtroValido ? relatorios.filter((r) => r.tipo === filtroValido) : relatorios;

    // Um anúncio só por vez: na primeira carga, só se veio de "enviar"
    // ("Relatório enviado. ..."); depois, a cada troca de filtro, o resultado
    const primeiraCarga = useRef(true);
    const [veioDeEnviar] = useState(params.enviado === '1');
    useEffect(() => {
        if (carregando) return;
        const qtd = visiveis.length;
        const nomeTipo = filtroValido ? TIPO_LABELS[filtroValido].toLowerCase() : '';
        const resultado = filtroValido
            ? (qtd === 0 ? `Nenhum relatório do tipo ${nomeTipo}.` : `Mostrando ${qtd} ${qtd === 1 ? 'relatório' : 'relatórios'} do tipo ${nomeTipo}.`)
            : (qtd === 0 ? 'Nenhum relatório.' : `Mostrando ${qtd} ${qtd === 1 ? 'relatório' : 'relatórios'}.`);
        if (primeiraCarga.current) {
            primeiraCarga.current = false;
            if (veioDeEnviar) {
                anunciar(`Relatório enviado. ${resultado}`, 800);
                // O aviso não volta ao reabrir a tela ou ao trocar o filtro
                router.setParams({ enviado: undefined });
            }
            return;
        }
        anunciar(resultado);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroValido, carregando]);

    const titulo = filtroValido === 'orientacao_medica' ? 'Orientações' : 'Relatórios';
    if (carregandoPasta) return <Tela><Stack.Screen options={{ title: 'Relatórios' }} /><Carregando texto="Carregando os relatórios..." /></Tela>;
    if (!pasta || !papel) return <Tela><Aviso tipo="erro" texto="não foi possível abrir os relatórios desta pasta." /></Tela>;

    return (
        <Tela>
            <Stack.Screen options={{ title: titulo }} />
            <View style={{ gap: 2 }}>
                <Titulo nivel={2}>{filtroValido === 'orientacao_medica' ? 'Todas as orientações' : 'Relatórios do aluno'}</Titulo>
                <Paragrafo suave>Pasta de {pasta.nomeAluno}</Paragrafo>
            </View>

            {veioDeEnviar && <Aviso tipo="sucesso" texto="relatório enviado." silencioso />}

            {TIPOS_QUE_ESCREVE[papel].length > 0 && (
                <View style={{ gap: 8 }}>
                    <Paragrafo>{TEXTO_ESCREVER[papel]}</Paragrafo>
                    <Botao titulo="Escrever relatório" icone="create-outline" aoTocar={() => router.push(`/pasta/${pasta.id}/relatorios/novo` as never)} />
                </View>
            )}

            {/* Transparência: a escola sabe que não vê tudo */}
            {papel === 'escola' && (
                <Paragrafo>Você vê as orientações médicas e as avaliações escolares. Laudos e relatos da família ficam só entre a família e o médico.</Paragrafo>
            )}

            {/* FILTRO: um tipo por vez (ou todos) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Filtrar por tipo">
                {[undefined, ...tiposQueLe].map((t) => {
                    const ativo = t === filtroValido;
                    const nome = t ? TIPO_LABELS[t] : 'Todos';
                    return (
                        <Pressable key={t ?? 'todos'} onPress={() => setFiltro(t)}
                            accessibilityRole="radio" accessibilityState={{ checked: ativo }} accessibilityLabel={`Mostrar: ${nome}`}
                            style={{
                                minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 2, borderColor: cores.link,
                                backgroundColor: ativo ? cores.link : '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6,
                            }}>
                            {/* O marcado não depende só da cor: tem o sinal de "certo" */}
                            {ativo && <Ionicons name="checkmark" size={20} color="#FFFFFF" importantForAccessibility="no" />}
                            <Text style={{ fontSize: 16, fontWeight: ativo ? '700' : '500', color: ativo ? '#FFFFFF' : cores.link, flexShrink: 1 }}>{nome}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {carregando && <Carregando texto="Carregando os relatórios..." />}
            {!carregando && erro && <Aviso tipo="erro" texto="não deu para carregar os relatórios." />}
            {!carregando && !erro && visiveis.length === 0 && (
                <Paragrafo>{filtroValido ? `Ainda não há ${TIPO_LABELS[filtroValido].toLowerCase()} nesta pasta.` : 'Ainda não há relatórios nesta pasta.'}</Paragrafo>
            )}

            {visiveis.map((r) => (
                // Nome lido: tipo e data, depois autor e assunto. O começo do texto não é lido (está no detalhe)
                <Pressable key={r.id} onPress={() => router.push(`/pasta/${pasta.id}/relatorios/${r.id}` as never)}
                    accessibilityRole="button" android_ripple={{ color: '#E5E7EB' }}
                    accessibilityLabel={`${TIPO_LABELS[r.tipo]}, ${formatarDia(r.criadoEm)}. ${r.autorNome}, ${ROLE_LABELS[r.autorPapel]}. Assunto: ${nomesCategorias[r.categoriaId] ?? 'não encontrado'}`}
                    accessibilityHint="Abre o relatório inteiro"
                    style={({ pressed }) => [estilos.cartao, estilos.linha, { alignItems: 'flex-start' }, pressed && { opacity: 0.85 }]}>
                    <Ionicons name={ICONE_TIPO[r.tipo]} size={24} color={cores.link} style={{ marginTop: 2 }} importantForAccessibility="no" />
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={estilos.nome}>{TIPO_LABELS[r.tipo]}</Text>
                        <Text style={estilos.suave}>{formatarDia(r.criadoEm)}</Text>
                        <Text style={estilos.texto}>{r.autorNome} ({ROLE_LABELS[r.autorPapel]}) · Assunto: {nomesCategorias[r.categoriaId] ?? 'não encontrado'}</Text>
                        <Text style={estilos.texto} numberOfLines={2}>{r.texto}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={cores.textoSuave} style={{ alignSelf: 'center' }} importantForAccessibility="no" />
                </Pressable>
            ))}
        </Tela>
    );
}
