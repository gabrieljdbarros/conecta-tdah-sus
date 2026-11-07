import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import { anunciar, Aviso, Botao, Campo, LinkTexto, Paragrafo, Segmentado, Tela, Titulo } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { useAuth } from "~/contexto/AuthContext";
import UsuarioServicos from "~/servicos/usuario";
import { DadosPerfil, UserRole } from "@/types/user";

type Perfil = Exclude<UserRole, 'admin'>;

interface Valores {
    role: Perfil | '';
    nome: string; email: string; senha: string; confirmarSenha: string;
    grauParentesco: string;
    nomeEscola: string; cargo: string; disciplina: string;
    crm: string; especialidade: string; unidadeSUS: string;
}

// Limite igual ao do banco (texto_valido, em supabase/migrations)
const MAX = 100;
const MSG_MAX = `Use no máximo ${MAX} caracteres`;
const obrigatorioSe = (perfil: Perfil) => Yup.string().trim().max(MAX, MSG_MAX)
    .when('role', { is: perfil, then: (s) => s.required('Campo obrigatório') });

// Mesmas regras do cadastro da web (src/app/cadastro/_form.tsx)
const esquema = Yup.object({
    role: Yup.string().oneOf(['mae', 'escola', 'medico'], 'Escolha um perfil').required('Escolha um perfil'),
    nome: Yup.string().trim().max(MAX, MSG_MAX).required('Campo obrigatório'),
    email: Yup.string().email('E-mail inválido').required('Campo obrigatório'),
    senha: Yup.string().min(8, 'A senha precisa ter pelo menos 8 caracteres').required('Campo obrigatório'),
    confirmarSenha: Yup.string().oneOf([Yup.ref('senha')], 'As senhas não são iguais').required('Campo obrigatório'),
    grauParentesco: obrigatorioSe('mae'),
    nomeEscola: obrigatorioSe('escola'),
    cargo: obrigatorioSe('escola'),
    // Opcional: coordenação/direção não leciona
    disciplina: Yup.string().trim().max(MAX, MSG_MAX),
    crm: obrigatorioSe('medico'),
    especialidade: obrigatorioSe('medico'),
    unidadeSUS: obrigatorioSe('medico'),
});

/** Só os campos do perfil escolhido vão para `dadosPerfil` (decisão travada 4) */
function montarDadosPerfil(v: Valores): DadosPerfil {
    if (v.role === 'mae') return { grauParentesco: v.grauParentesco.trim() };
    if (v.role === 'escola') return {
        nomeEscola: v.nomeEscola.trim(), cargo: v.cargo.trim(),
        // Disciplina vazia não é gravada (as regras só aceitam texto preenchido)
        ...(v.disciplina.trim() && { disciplina: v.disciplina.trim() }),
    };
    return { crm: v.crm.trim(), especialidade: v.especialidade.trim(), unidadeSUS: v.unidadeSUS.trim() };
}

// Ordem dos campos na tela e o nome de cada um (para dizer qual corrigir)
const ORDEM: (keyof Valores)[] = ['role', 'nome', 'email', 'grauParentesco', 'nomeEscola', 'cargo', 'disciplina',
    'crm', 'especialidade', 'unidadeSUS', 'senha', 'confirmarSenha'];
const ROTULOS: Record<keyof Valores, string> = {
    nome: 'Nome', role: 'Tipo de perfil', grauParentesco: 'Grau de parentesco', nomeEscola: 'Nome da escola',
    cargo: 'Cargo', disciplina: 'Disciplina', crm: 'CRM', especialidade: 'Especialidade', unidadeSUS: 'Unidade SUS',
    email: 'E-mail', senha: 'Senha', confirmarSenha: 'Confirmar senha',
};
const CAMPOS_DO_PERFIL: Record<Perfil, string> = {
    mae: 'Apareceu o campo grau de parentesco.',
    escola: 'Apareceram os campos nome da escola, cargo e disciplina.',
    medico: 'Apareceram os campos CRM, especialidade e unidade SUS.',
};

const vazio: Valores = {
    role: '', nome: '', email: '', senha: '', confirmarSenha: '',
    grauParentesco: '', nomeEscola: '', cargo: '', disciplina: '', crm: '', especialidade: '', unidadeSUS: '',
};

const PERFIS: Perfil[] = ['mae', 'escola', 'medico'];

/**
 * Cadastro, passo 2 (design da Daya, "Crie sua conta"): o perfil escolhido
 * no passo 1 vem marcado nas abas do topo e pode ser trocado aqui. Os
 * campos são os da decisão travada 4 (sem telefone, foto ou nome da criança)
 */
export default function Cadastro() {
    const { user, recarregarUsuario } = useAuth();
    const { perfil } = useLocalSearchParams<{ perfil?: string }>();
    const [erro, setErro] = useState<string | null>(null);
    // Campos de texto, para levar o foco ao primeiro com erro
    const refs = useRef<Partial<Record<keyof Valores, TextInput | null>>>({});
    const registrar = (campo: keyof Valores) => (el: TextInput | null) => { refs.current[campo] = el; };
    if (user) return <Redirect href="/inicio" />;
    // Sem perfil válido (link quebrado): volta para a escolha
    if (!PERFIS.includes(perfil as Perfil)) return <Redirect href="/cadastro" />;

    return (
        <Tela branco>
            <Formik initialValues={{ ...vazio, role: perfil as Perfil }} validationSchema={esquema}
                onSubmit={async (v) => {
                    setErro(null);
                    const { success, message } = await UsuarioServicos.cadastrar({
                        nome: v.nome.trim(), email: v.email, senha: v.senha,
                        role: v.role as Perfil, dadosPerfil: montarDadosPerfil(v),
                    });
                    // O login acontece ANTES de o perfil ser gravado, e o
                    // AuthContext não o encontra: recarrega agora que ele existe
                    if (success) await recarregarUsuario();
                    else setErro(message ?? 'Não foi possível criar a conta');
                }}>
                {({ handleChange, handleSubmit, setFieldValue, setErrors, validateForm, values, errors, submitCount, isSubmitting }) => {
                    const e = (campo: keyof Valores) => (submitCount > 0 ? errors[campo] : undefined);
                    const comErro = ORDEM.filter((c) => errors[c]);
                    const resumo = comErro.length === 0 ? '' : `${comErro.length === 1 ? 'Há 1 campo' : `Há ${comErro.length} campos`} para corrigir. O primeiro é: ${ROTULOS[comErro[0]]}.`;
                    // Com erro: diz quantos campos faltam e leva o foco (e o teclado) ao primeiro
                    const enviar = async () => {
                        const erros = await validateForm();
                        handleSubmit();
                        const lista = ORDEM.filter((c) => erros[c]);
                        if (lista.length === 0) return;
                        anunciar(`${lista.length === 1 ? 'Há 1 campo' : `Há ${lista.length} campos`} para corrigir. O primeiro é: ${ROTULOS[lista[0]]}.`);
                        refs.current[lista[0]]?.focus();
                    };
                    return (
                        <View style={{ gap: 12 }}>
                            <Titulo>Crie sua conta</Titulo>
                            <Paragrafo suave>Preencha seus dados para começar a usar o Conecta TDAH SUS.</Paragrafo>
                            <BotaoOuvir rotulo="Ouvir instruções" texto="Confira se o seu perfil está certo nas opções do topo: Responsável, Escola ou Médico. Escreva o seu nome completo e o seu e-mail. Responda as perguntas do seu perfil. Depois crie uma senha com pelo menos oito letras ou números e repita a senha. No fim, toque em Cadastrar." />

                            <Segmentado<Perfil> rotulo="Como você deseja participar?" valor={values.role as Perfil}
                                // Troca de perfil: os erros antigos (de campos que sumiram) saem da contagem
                                aoEscolher={(v) => { setFieldValue('role', v, false); setErrors({}); anunciar(CAMPOS_DO_PERFIL[v]); }}
                                opcoes={[
                                    { valor: 'mae', titulo: 'Responsável', falado: 'Mãe ou responsável' },
                                    { valor: 'escola', titulo: 'Escola', falado: 'Escola ou professor' },
                                    { valor: 'medico', titulo: 'Médico', falado: 'Profissional de psiquiatria' },
                                ]} />
                            <Campo ref={registrar('nome')} rotulo="Nome completo" value={values.nome} onChangeText={handleChange('nome')}
                                autoComplete="name" placeholder="Digite aqui" erro={e('nome')} />
                            <Campo ref={registrar('email')} rotulo="E-mail" value={values.email} onChangeText={handleChange('email')} keyboardType="email-address"
                                autoCapitalize="none" autoComplete="email" placeholder="exemplo@email.com" erro={e('email')} />

                            {values.role === 'mae' && (
                                <Campo ref={registrar('grauParentesco')} rotulo="Grau de parentesco" value={values.grauParentesco} onChangeText={handleChange('grauParentesco')}
                                    placeholder="Ex.: mãe, pai, avó" erro={e('grauParentesco')} />
                            )}
                            {values.role === 'escola' && <>
                                <Campo ref={registrar('nomeEscola')} rotulo="Nome da escola" value={values.nomeEscola} onChangeText={handleChange('nomeEscola')}
                                    placeholder="Nome da instituição" erro={e('nomeEscola')} />
                                <Campo ref={registrar('cargo')} rotulo="Cargo" value={values.cargo} onChangeText={handleChange('cargo')}
                                    placeholder="Ex.: professora, coordenador" erro={e('cargo')} />
                                <Campo ref={registrar('disciplina')} rotulo="Disciplina (se for professor)" value={values.disciplina} onChangeText={handleChange('disciplina')}
                                    placeholder="Deixe em branco se não leciona" erro={e('disciplina')} />
                            </>}
                            {values.role === 'medico' && <>
                                <Campo ref={registrar('crm')} rotulo="CRM (registro do médico)" value={values.crm} onChangeText={handleChange('crm')}
                                    placeholder="Número do CRM" erro={e('crm')} />
                                <Campo ref={registrar('especialidade')} rotulo="Especialidade" value={values.especialidade} onChangeText={handleChange('especialidade')}
                                    placeholder="Ex.: psiquiatria infantil" erro={e('especialidade')} />
                                <Campo ref={registrar('unidadeSUS')} rotulo="Unidade SUS (posto ou hospital)" value={values.unidadeSUS} onChangeText={handleChange('unidadeSUS')}
                                    placeholder="Nome da unidade de saúde" erro={e('unidadeSUS')} />
                            </>}

                            <Campo ref={registrar('senha')} rotulo="Senha" senha value={values.senha} onChangeText={handleChange('senha')}
                                autoComplete="new-password" placeholder="Pelo menos 8 letras ou números" erro={e('senha')} />
                            <Campo ref={registrar('confirmarSenha')} rotulo="Confirmar senha" senha value={values.confirmarSenha} onChangeText={handleChange('confirmarSenha')}
                                autoComplete="new-password" placeholder="Repita a senha" erro={e('confirmarSenha')} />

                            <Paragrafo>Só as pessoas ligadas ao aluno veem estas informações, e cada uma vê só o que precisa.</Paragrafo>

                            {/* Para quem enxerga: o mesmo resumo que o leitor de tela falou */}
                            {submitCount > 0 && resumo !== '' && <Aviso tipo="erro" texto={resumo} silencioso />}
                            {erro && <Aviso tipo="erro" texto={erro} />}
                            <Botao titulo={isSubmitting ? 'Cadastrando...' : 'Cadastrar'} aoTocar={enviar} carregando={isSubmitting} />
                            <LinkTexto titulo="Já tem conta? Entrar" aoTocar={() => router.replace('/entrar')} />
                        </View>
                    );
                }}
            </Formik>
        </Tela>
    );
}
