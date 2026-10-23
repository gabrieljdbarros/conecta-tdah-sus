import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import { Ionicons } from "@expo/vector-icons";
import { anunciar, Aviso, Botao, Campo, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { estilos } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import PastaServicos from "~/servicos/pasta";
import { cores } from "~/tema/cores";

// Limite igual ao das Security Rules
const MAX = 100;
const esquema = Yup.object({
    nomeAluno: Yup.string().trim().max(MAX, `Use no máximo ${MAX} caracteres`).required('Escreva o nome do aluno'),
});

/**
 * Criar pasta ("Cadastre o aluno"): só o nome da criança (RF03, minimização
 * na LGPD), e o cartão "Quem terá acesso a esta pasta?" do design
 */
export default function NovaPasta() {
    const { user } = useAuth();
    const [erro, setErro] = useState<string | null>(null);
    const refNome = useRef<TextInput>(null);

    // Só a mãe/responsável cria pasta (decisão travada 6). As regras também recusam
    if (user?.role !== 'mae')
        return <Tela><Paragrafo>Só a mãe ou o responsável pode criar a pasta.</Paragrafo></Tela>;

    return (
        <Tela>
            <Formik initialValues={{ nomeAluno: '' }} validationSchema={esquema}
                onSubmit={async (v) => {
                    setErro(null);
                    const { success, message } = await PastaServicos.criar(user, { nomeAluno: v.nomeAluno.trim() });
                    if (success) {
                        anunciar('Pronto: pasta criada.');
                        router.back();
                    } else setErro(message ?? 'Não foi possível criar a pasta');
                }}>
                {({ handleChange, handleSubmit, validateForm, values, errors, submitCount, isSubmitting }) => {
                    const criar = async () => {
                        const erros = await validateForm();
                        handleSubmit();
                        if (erros.nomeAluno) {
                            anunciar(`Falta corrigir: ${erros.nomeAluno}`);
                            refNome.current?.focus();
                        }
                    };
                    return (
                        <View style={{ gap: 12 }}>
                            <Titulo nivel={2}>Cadastre o aluno</Titulo>
                            <Paragrafo>Só com o nome você já pode começar a conectar a escola e os médicos. Sem burocracia.</Paragrafo>
                            <BotaoOuvir rotulo="Ouvir instruções" texto="Para criar a pasta, escreva o nome completo do aluno e toque em Criar pasta. Depois você poderá convidar a escola e o médico." />
                            <Campo ref={refNome} rotulo="Nome do aluno" value={values.nomeAluno} onChangeText={handleChange('nomeAluno')}
                                placeholder="Como o aluno é chamado" erro={submitCount > 0 ? errors.nomeAluno : undefined} />
                            {erro && <Aviso tipo="erro" texto={erro} />}
                            <Botao titulo={isSubmitting ? 'Criando...' : 'Criar pasta'} aoTocar={criar} carregando={isSubmitting} />
                        </View>
                    );
                }}
            </Formik>

            {/* "Quem terá acesso a esta pasta?" (design) */}
            <View style={[estilos.cartao, { backgroundColor: cores.fundoInfo, borderColor: cores.fundoInfo, gap: 8, marginTop: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="lock-closed" size={20} color={cores.secundaria} importantForAccessibility="no" />
                    <Text accessibilityRole="header" style={[estilos.nome, { flexShrink: 1 }]}>Quem terá acesso a esta pasta?</Text>
                </View>
                <Text style={estilos.texto}>
                    Só você decide. A escola e o médico só veem a pasta se você enviar um convite: um link que vale
                    48 horas e só funciona para uma pessoa. Quem entra na pasta vê todas as mensagens da conversa.
                </Text>
            </View>
        </Tela>
    );
}
