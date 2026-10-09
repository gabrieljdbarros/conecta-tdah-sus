import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import { Ionicons } from "@expo/vector-icons";
import { anunciar, Aviso, Botao, Campo, Opcoes, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import PastaServicos from "~/servicos/pasta";
import { cores } from "~/tema/cores";
import { Serie, SERIE_LABELS } from "@/types/pasta";

// Limite igual ao das Security Rules
const MAX = 100;
const esquema = Yup.object({
    nomeAluno: Yup.string().trim().max(MAX, `Use no máximo ${MAX} caracteres`).required('Escreva o nome do aluno'),
    serie: Yup.string().oneOf(Object.keys(SERIE_LABELS), 'Escolha a série').required('Escolha a série'),
});

// A série em DUAS etapas (13 opções de uma vez é demais para ler e ouvir):
// primeiro a etapa, depois o ano, com nomes curtos. Os códigos gravados são
// os mesmos da web (SERIE_LABELS)
type Etapa = 'infantil' | 'fundamental' | 'medio';
const ANOS: Record<Exclude<Etapa, 'infantil'>, { valor: Serie; titulo: string }[]> = {
    fundamental: (['ef1', 'ef2', 'ef3', 'ef4', 'ef5', 'ef6', 'ef7', 'ef8', 'ef9'] as Serie[]).map((valor, i) => ({ valor, titulo: `${i + 1}º ano` })),
    medio: (['em1', 'em2', 'em3'] as Serie[]).map((valor, i) => ({ valor, titulo: `${i + 1}ª série` })),
};
const etapaDa = (s: Serie | ''): Etapa | '' => s === '' ? '' : s === 'infantil' ? 'infantil' : s.startsWith('ef') ? 'fundamental' : 'medio';

/**
 * Criar pasta ("Cadastre o aluno"): só nome e série (minimização, LGPD),
 * e o cartão "Quem terá acesso a esta pasta?" do design
 */
export default function NovaPasta() {
    const { user } = useAuth();
    const [erro, setErro] = useState<string | null>(null);
    const [etapa, setEtapa] = useState<Etapa | ''>('');
    const refNome = useRef<TextInput>(null);

    // Só a mãe/responsável cria pasta (decisão travada 8). As regras também recusam
    if (user?.role !== 'mae')
        return <Tela><Paragrafo>Só a mãe ou o responsável pode criar a pasta.</Paragrafo></Tela>;

    return (
        <Tela>
            <Formik initialValues={{ nomeAluno: '', serie: '' as Serie | '' }} validationSchema={esquema}
                onSubmit={async (v) => {
                    setErro(null);
                    const { success, message } = await PastaServicos.criar(user, { nomeAluno: v.nomeAluno.trim(), serie: v.serie as Serie });
                    if (success) {
                        anunciar('Pronto: pasta criada.');
                        router.back();
                    } else setErro(message ?? 'Não foi possível criar a pasta');
                }}>
                {({ handleChange, handleSubmit, setFieldValue, validateForm, values, errors, submitCount, isSubmitting }) => {
                    const criar = async () => {
                        const erros = await validateForm();
                        handleSubmit();
                        const n = Object.keys(erros).length;
                        if (n > 0) anunciar(n === 1 ? `Falta corrigir: ${erros.nomeAluno ?? erros.serie}` : 'Escreva o nome do aluno e escolha a série.');
                        if (erros.nomeAluno) refNome.current?.focus();
                    };
                    const escolherEtapa = (e: Etapa) => {
                        setEtapa(e);
                        if (e === 'infantil') { setFieldValue('serie', 'infantil'); return; }
                        // Trocou de etapa: o ano escolhido antes não vale mais
                        if (etapaDa(values.serie) !== e) setFieldValue('serie', '');
                        anunciar('Agora escolha o ano.');
                    };
                    return (
                        <View style={{ gap: 12 }}>
                            <Titulo nivel={2}>Cadastre o aluno</Titulo>
                            <Paragrafo>Com estas informações você já pode começar a conectar a escola e os médicos. Sem burocracia.</Paragrafo>
                            <Campo ref={refNome} rotulo="Nome do aluno" value={values.nomeAluno} onChangeText={handleChange('nomeAluno')}
                                placeholder="Como o aluno é chamado" erro={submitCount > 0 ? errors.nomeAluno : undefined} />
                            <Opcoes<Etapa> rotulo="Etapa da escola" valor={etapa} aoEscolher={escolherEtapa}
                                erro={submitCount > 0 && !etapa ? errors.serie : undefined}
                                opcoes={[
                                    { valor: 'infantil', titulo: 'Educação Infantil' },
                                    { valor: 'fundamental', titulo: 'Ensino Fundamental' },
                                    { valor: 'medio', titulo: 'Ensino Médio' },
                                ]} />
                            {(etapa === 'fundamental' || etapa === 'medio') && (
                                <Opcoes<Serie> rotulo={etapa === 'fundamental' ? 'Ano' : 'Série'} valor={values.serie}
                                    aoEscolher={(s) => setFieldValue('serie', s)} opcoes={ANOS[etapa]}
                                    erro={submitCount > 0 ? errors.serie : undefined} />
                            )}
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
                    48 horas e só funciona para uma pessoa. A escola não vê os laudos nem o que você conta sobre a casa.
                </Text>
            </View>
        </Tela>
    );
}
