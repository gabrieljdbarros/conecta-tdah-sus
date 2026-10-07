"use client";
import { AppButton, AppInput, AppOuvir, AppSelect } from "@/themes/components";
import { Formik } from "formik";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import UserServices from "@/services/user";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DadosPerfil, UserRole } from "@/types/user";
import { conviteDaUrl, destinoAposEntrar } from "@/helpers/router";
import { marcarIntroducaoVista } from "@/helpers/introducao";

interface FormValues {
    role: UserRole | '';
    nome: string;
    email: string;
    password: string;
    confirmarSenha: string;
    // mãe
    grauParentesco: string;
    // escola
    nomeEscola: string;
    cargo: string;
    disciplina: string;
    // médico
    crm: string;
    especialidade: string;
    unidadeSUS: string;
}

const initialValues: FormValues = {
    role: '',
    nome: '',
    email: '',
    password: '',
    confirmarSenha: '',
    grauParentesco: '',
    nomeEscola: '',
    cargo: '',
    disciplina: '',
    crm: '',
    especialidade: '',
    unidadeSUS: '',
};

// Limite igual ao das Security Rules (textoValido em firestore.rules)
const MAX = 100;
const MSG_MAX = `Use no máximo ${MAX} caracteres`;

const validationSchema = Yup.object({
    role: Yup.string().oneOf(['mae', 'escola', 'medico'], 'Selecione um perfil').required('Selecione um perfil'),
    nome: Yup.string().trim().max(MAX, MSG_MAX).required('Campo obrigatório'),
    email: Yup.string().email('Campo precisa ser um email').required('Campo obrigatório'),
    password: Yup.string().min(6, 'A senha precisa ter pelo menos 6 caracteres').required('Campo obrigatório'),
    confirmarSenha: Yup.string().oneOf([Yup.ref('password')], 'As senhas não coincidem').required('Campo obrigatório'),

    grauParentesco: Yup.string().trim().max(MAX, MSG_MAX).when('role', { is: 'mae', then: (s) => s.required('Campo obrigatório') }),

    nomeEscola: Yup.string().trim().max(MAX, MSG_MAX).when('role', { is: 'escola', then: (s) => s.required('Campo obrigatório') }),
    cargo: Yup.string().trim().max(MAX, MSG_MAX).when('role', { is: 'escola', then: (s) => s.required('Campo obrigatório') }),
    // Opcional: coordenação/direção não leciona disciplina
    disciplina: Yup.string().trim().max(MAX, MSG_MAX),

    crm: Yup.string().trim().max(MAX, MSG_MAX).when('role', { is: 'medico', then: (s) => s.required('Campo obrigatório') }),
    especialidade: Yup.string().trim().max(MAX, MSG_MAX).when('role', { is: 'medico', then: (s) => s.required('Campo obrigatório') }),
    unidadeSUS: Yup.string().trim().max(MAX, MSG_MAX).when('role', { is: 'medico', then: (s) => s.required('Campo obrigatório') }),
});

// ===========================================================================
export default function CadastroForm() {
    const router = useRouter();
    const { user } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [aguardandoSessao, setAguardandoSessao] = useState(false);
    // Convite aberto antes de criar a conta (RN01): lido depois de montar a tela
    const [convite, setConvite] = useState<string | null>(null);
    useEffect(() => setConvite(conviteDaUrl()), []);
    // Quem chegou ao cadastro já passou da introdução: "voltar ao login" leva ao login
    useEffect(() => marcarIntroducaoVista(), []);

    // Depois do cadastro, o Firebase já autentica o usuário automaticamente.
    // Espera o AuthContext confirmar (perfil no Firestore + cookie) antes de
    // navegar para a área restrita — ou de volta ao convite, se veio de um
    useEffect(() => {
        if (aguardandoSessao && user)
            router.push(destinoAposEntrar());
    }, [aguardandoSessao, user, router]);

    // ===========================================================================
    const montarDadosPerfil = (values: FormValues): DadosPerfil => {
        switch (values.role) {
            case 'mae':
                return { grauParentesco: values.grauParentesco.trim() };
            case 'escola':
                // Disciplina vazia não é gravada (as regras só aceitam texto preenchido)
                return {
                    nomeEscola: values.nomeEscola.trim(),
                    cargo: values.cargo.trim(),
                    ...(values.disciplina.trim() && { disciplina: values.disciplina.trim() }),
                };
            case 'medico':
                return { crm: values.crm.trim(), especialidade: values.especialidade.trim(), unidadeSUS: values.unidadeSUS.trim() };
            default:
                return {};
        }
    };
    // ===========================================================================
    const handleOnSubmit = async (values: FormValues) => {
        setError(null);

        const { success, message } = await UserServices.cadastrar({
            nome: values.nome.trim(),
            email: values.email,
            password: values.password,
            role: values.role as UserRole,
            dadosPerfil: montarDadosPerfil(values),
        });

        if (success)
            setAguardandoSessao(true);
        else
            setError(message ?? 'Não foi possível concluir o cadastro');
    };
    // ===========================================================================
    return (
        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleOnSubmit}
        >
            {({ handleChange, handleSubmit, values, isSubmitting, errors, submitCount }) => (
                <form onSubmit={handleSubmit} className="w-full max-w-[400px] flex flex-col">
                    {/* Barra superior do design: voltar ao login */}
                    <div className="flex items-center gap-2 mb-4">
                        <Link href={convite ? `/?convite=${convite}` : "/"} className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[26px] text-(--cor-texto) rounded-full">
                            <i className="ion-arrow-left-c" aria-hidden="true" />
                            <span className="sr-only">Voltar para o login</span>
                        </Link>
                        <span className="ff-default text-[18px] text-(--cor-texto)">Criar conta</span>
                    </div>

                    {/* Título laranja: só em tamanho grande, negrito e sobre branco (texto grande, 3,1:1) */}
                    <h1 className="ff-default text-[32px] leading-tight font-extrabold text-(--cor-destaque)">Crie seu acesso</h1>
                    <p className="ff-default text-[18px] leading-relaxed text-(--cor-texto) mt-2 mb-3">
                        Cadastre-se para participar do acompanhamento do estudante.
                    </p>
                    <AppOuvir rotulo="Ouvir instruções" className="self-start mb-3"
                        texto="Escreva o seu nome. Escolha quem você é: mãe ou responsável, escola ou médico. Responda as perguntas que aparecerem. Depois escreva o seu e-mail e crie uma senha com pelo menos seis letras ou números. No fim, toque em Criar conta." />
                    {/* Sempre montado: o leitor de tela anuncia quando o texto aparece */}
                    <p role="status" className="ff-default text-[16px] mb-3 empty:hidden">
                        {convite && 'Crie sua conta para aceitar o convite. Escolha o seu perfil: escola ou médico.'}
                    </p>

                    <AppInput label="Nome" placeholder="Nome completo" name="nome" onChange={handleChange} autoComplete="name" error={errors.nome} mostrarErro={submitCount > 0} className="mb-2" />

                    <AppSelect label="Tipo de perfil" name="role" onChange={handleChange} value={values.role} error={errors.role} mostrarErro={submitCount > 0} className="mb-2">
                        <option value="">Selecione...</option>
                        {/* Convite só serve para escola ou médico (a Function recusa mãe) */}
                        {!convite && <option value="mae">Mãe / Responsável</option>}
                        <option value="escola">Escola</option>
                        <option value="medico">Médico (SUS)</option>
                    </AppSelect>


                    {/* CAMPOS ESPECÍFICOS — MÃE/RESPONSÁVEL */}
                    {values.role === 'mae' && <>
                        <AppInput label="Grau de parentesco" placeholder="Ex.: mãe, pai, avó" name="grauParentesco" onChange={handleChange} className="mb-2" error={errors.grauParentesco} mostrarErro={submitCount > 0} />
                    </>}

                    {/* CAMPOS ESPECÍFICOS — ESCOLA */}
                    {values.role === 'escola' && <>
                        <AppInput label="Nome da escola" placeholder="Nome da instituição" name="nomeEscola" onChange={handleChange} className="mb-2" error={errors.nomeEscola} mostrarErro={submitCount > 0} />
                        <AppInput label="Cargo" placeholder="Ex.: professora, coordenador" name="cargo" onChange={handleChange} className="mb-2" error={errors.cargo} mostrarErro={submitCount > 0} />
                        <AppInput label="Disciplina (se for professor)" placeholder="Deixe em branco se não leciona" name="disciplina" onChange={handleChange} className="mb-2" error={errors.disciplina} mostrarErro={submitCount > 0} />
                    </>}

                    {/* CAMPOS ESPECÍFICOS — MÉDICO (SUS) */}
                    {values.role === 'medico' && <>
                        <AppInput label="CRM (registro do médico)" placeholder="Número do CRM" name="crm" onChange={handleChange} className="mb-2" error={errors.crm} mostrarErro={submitCount > 0} />
                        <AppInput label="Especialidade" placeholder="Ex.: psiquiatria infantil" name="especialidade" onChange={handleChange} className="mb-2" error={errors.especialidade} mostrarErro={submitCount > 0} />
                        <AppInput label="Unidade SUS (posto ou hospital)" placeholder="Nome da unidade de saúde" name="unidadeSUS" onChange={handleChange} className="mb-2" error={errors.unidadeSUS} mostrarErro={submitCount > 0} />
                    </>}

                    <AppInput label="E-mail" placeholder="Seu melhor e-mail" name="email" type="email" onChange={handleChange} autoComplete="email" error={errors.email} mostrarErro={submitCount > 0} className="mb-2" />
                    <AppInput label="Senha" placeholder="Pelo menos 6 letras ou números" name="password" type="password" onChange={handleChange} openPassword autoComplete="new-password" error={errors.password} mostrarErro={submitCount > 0} className="mb-2" />
                    <AppInput label="Confirmar senha" placeholder="Repita a senha" name="confirmarSenha" type="password" onChange={handleChange} openPassword autoComplete="new-password" error={errors.confirmarSenha} mostrarErro={submitCount > 0} />

                    {/* TODO (LGPD): quando houver o texto dos termos de uso e do
                        consentimento, ligar aqui e pedir o aceite (decisão com o orientador) */}
                    <p className="ff-default text-[16px] text-(--cor-texto) mt-5">
                        Só as pessoas ligadas ao estudante veem estas informações, e cada uma vê só o que precisa.
                    </p>

                    {/* Aviso perto do botão: com muitos campos, o erro pode estar fora da tela */}
                    {submitCount > 0 && Object.keys(errors).length > 0 &&
                        <p role="alert" className="text-[#B91C1C] ff-default text-[16px] text-center mt-3">Erro: corrija os campos marcados em vermelho acima.</p>}
                    {error && <p role="alert" className="text-[#B91C1C] ff-default text-[16px] text-center mt-3">Erro: {error}</p>}

                    <AppButton title={isSubmitting ? "Criando..." : "Criar conta"} submit disabled={isSubmitting} className="mt-5" />

                    <Link href={convite ? `/?convite=${convite}` : "/"} className="min-h-[48px] mt-2 flex items-center justify-center">
                        <p className="ff-default text-center text-[18px] text-(--cor-link) underline cursor-pointer">Já tenho conta — fazer login</p>
                    </Link>
                </form>
            )}
        </Formik>
    );
}
