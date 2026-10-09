import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import { Ionicons } from "@expo/vector-icons";
import { anunciar, Aviso, Botao, Campo, Carregando, focarLeitor, Opcoes, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import { usePasta } from "~/ganchos/usePasta";
import CategoriaServicos from "~/servicos/categoria";
import RelatorioServicos from "~/servicos/relatorio";
import { cores } from "~/tema/cores";
import { Categoria } from "@/types/categoria";
import { MAX_TEXTO_RELATORIO, QUEM_VE, TIPO_DESCRICAO, TIPO_LABELS, TipoRelatorio, TIPOS_QUE_ESCREVE } from "@/types/relatorio";

interface Valores { tipo: TipoRelatorio | ''; categoriaId: string; texto: string }

/**
 * Escrever relatório (igual à web): o TIPO (só os que o papel escreve), o
 * ASSUNTO (categoria ativa do admin) e o TEXTO. Mostra quem vai ver antes de
 * enviar. Depois de enviado, não pode ser alterado (registro do acompanhamento)
 */
export default function NovoRelatorio() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { pasta, papel, carregando } = usePasta(id);
    const [categorias, setCategorias] = useState<Categoria[] | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const refTexto = useRef<TextInput>(null);
    const refTipo = useRef<View>(null);
    const refAssunto = useRef<View>(null);
    const avisouLimite = useRef(false);

    useEffect(() => {
        // Relatório novo só com categoria ativa (as regras também exigem)
        CategoriaServicos.listar().then(({ categorias }) => setCategorias(categorias.filter((c) => c.ativa)));
    }, []);

    if (carregando || categorias === null) return <Tela><Stack.Screen options={{ title: 'Escrever relatório' }} /><Carregando /></Tela>;
    if (!pasta || !papel || !user) return <Tela><Aviso tipo="erro" texto="não foi possível abrir esta pasta." /></Tela>;

    const tipos = TIPOS_QUE_ESCREVE[papel];
    if (tipos.length === 0) return <Tela><Paragrafo>Você não escreve relatórios nesta pasta.</Paragrafo></Tela>;
    if (categorias.length === 0)
        return <Tela><Aviso tipo="erro" texto="ainda não há assuntos cadastrados. Peça ao administrador para cadastrar as categorias." /></Tela>;

    const esquema = Yup.object({
        tipo: Yup.string().oneOf(tipos, 'Escolha o tipo de relatório').required('Escolha o tipo de relatório'),
        categoriaId: Yup.string().required('Escolha o assunto'),
        texto: Yup.string().trim().max(MAX_TEXTO_RELATORIO, `Use no máximo ${MAX_TEXTO_RELATORIO} caracteres`).required('Escreva o relatório'),
    });

    return (
        <Tela>
            <Stack.Screen options={{ title: 'Escrever relatório' }} />
            <Formik<Valores> initialValues={{ tipo: tipos.length === 1 ? tipos[0] : '', categoriaId: '', texto: '' }} validationSchema={esquema}
                onSubmit={async (v) => {
                    setErro(null);
                    const { success, message } = await RelatorioServicos.enviar(pasta.id, user, papel, {
                        tipo: v.tipo as TipoRelatorio, categoriaId: v.categoriaId, texto: v.texto.trim(),
                    });
                    // Abre a lista (o novo aparece primeiro), com o aviso "enviado"
                    if (success) router.replace(`/pasta/${pasta.id}/relatorios?enviado=1` as never);
                    else setErro(message ?? 'Não foi possível enviar o relatório');
                }}>
                {({ handleChange, handleSubmit, setFieldValue, validateForm, values, errors, submitCount, isSubmitting }) => {
                    // Com erro: diz o que falta, em palavras simples, e leva o foco ao primeiro
                    const enviar = async () => {
                        const erros = await validateForm();
                        handleSubmit();
                        const falta: string[] = [];
                        if (erros.tipo) falta.push('escolher o tipo');
                        if (erros.categoriaId) falta.push('escolher o assunto');
                        if (erros.texto) falta.push('escrever o texto');
                        if (falta.length === 0) return;
                        anunciar(`Falta ${falta.length > 1 ? `${falta.slice(0, -1).join(', ')} e ${falta[falta.length - 1]}` : falta[0]}.`);
                        // Depois do Formik marcar os erros (o nome lido já inclui "Erro: ...")
                        if (erros.tipo && tipos.length > 1) focarLeitor(refTipo.current);
                        else if (erros.categoriaId) focarLeitor(refAssunto.current);
                        else if (erros.texto) setTimeout(() => refTexto.current?.focus(), 450);
                    };
                    // Perto do limite de caracteres, avisa uma vez
                    const mudarTexto = (t: string) => {
                        handleChange('texto')(t);
                        if (t.length >= MAX_TEXTO_RELATORIO - 500 && !avisouLimite.current) {
                            avisouLimite.current = true;
                            anunciar(`Faltam ${MAX_TEXTO_RELATORIO - t.length} caracteres para o limite.`);
                        }
                    };
                    const faltam = MAX_TEXTO_RELATORIO - values.texto.length;
                    return (
                        <View style={{ gap: 14 }}>
                            <View>
                                <Titulo nivel={2}>Escrever relatório</Titulo>
                                <Paragrafo suave>Pasta de {pasta.nomeAluno}</Paragrafo>
                            </View>

                            {tipos.length > 1 ? (
                                <Opcoes<TipoRelatorio> rotulo="Tipo de relatório" valor={values.tipo} refPrimeira={refTipo}
                                    aoEscolher={(t) => { setFieldValue('tipo', t); anunciar(`Quem vai ver: ${QUEM_VE[t]}`); }}
                                    erro={submitCount > 0 ? errors.tipo : undefined}
                                    opcoes={tipos.map((t) => ({ valor: t, titulo: TIPO_LABELS[t], descricao: TIPO_DESCRICAO[t] }))} />
                            ) : (
                                <Paragrafo>Tipo: <Text style={{ fontWeight: '700' }}>{TIPO_LABELS[tipos[0]]}</Text> ({TIPO_DESCRICAO[tipos[0]].toLowerCase()})</Paragrafo>
                            )}

                            {/* QUEM VAI VER: antes de escrever, pelo tipo (RN06) */}
                            {values.tipo !== '' && (
                                <View accessible style={[estilos.cartao, { backgroundColor: cores.fundoInfo, borderColor: cores.fundoInfo, flexDirection: 'row', gap: 8 }]}>
                                    <Ionicons name="eye" size={22} color={cores.secundaria} importantForAccessibility="no" />
                                    <Text style={[estilos.texto, { flexShrink: 1 }]}>Quem vai ver: {QUEM_VE[values.tipo]}</Text>
                                </View>
                            )}

                            <Opcoes<string> rotulo="Assunto" valor={values.categoriaId} refPrimeira={refAssunto}
                                aoEscolher={(c) => setFieldValue('categoriaId', c)}
                                erro={submitCount > 0 ? errors.categoriaId : undefined}
                                opcoes={categorias.map((c) => ({ valor: c.id, titulo: c.nome }))} />

                            <Campo ref={refTexto} rotulo="Texto do relatório" multiline value={values.texto} onChangeText={mudarTexto}
                                maxLength={MAX_TEXTO_RELATORIO} placeholder="Conte o que aconteceu" erro={submitCount > 0 ? errors.texto : undefined}
                                // Menos chance de o teclado "aprender" palavras de um texto de saúde
                                autoCorrect={false} spellCheck={false} />
                            {/* Ditado pelo teclado do celular: ajuda quem tem dificuldade para escrever */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <Ionicons name="mic" size={22} color={cores.textoSuave} importantForAccessibility="no" />
                                <Text style={[estilos.suave, { flexShrink: 1 }]}>Dica: toque no microfone do teclado para falar em vez de digitar.</Text>
                            </View>
                            {/* Contador: só aparece (e só é lido) perto do limite */}
                            {faltam <= 500 && <Text style={estilos.suave}>Faltam {faltam} caracteres</Text>}

                            <Paragrafo>Depois de enviado, o relatório não pode ser alterado nem apagado. Confira antes de enviar.</Paragrafo>
                            {erro && <Aviso tipo="erro" texto={erro} />}
                            <Botao titulo={isSubmitting ? 'Enviando...' : 'Enviar relatório'} icone="paper-plane" aoTocar={enviar} carregando={isSubmitting} />
                        </View>
                    );
                }}
            </Formik>
        </Tela>
    );
}
