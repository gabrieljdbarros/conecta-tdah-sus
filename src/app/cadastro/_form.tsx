"use client";
import { AppButton, AppInput, AppSelect } from "@/themes/components";
import { Formik } from "formik";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import UserServices from "@/services/user";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DadosPerfil, UserRole } from "@/types/user";

interface FormValues {
    role: UserRole | '';
    nome: string;
    email: string;
    password: string;
    confirmarSenha: string;
    // mãe
    nomeCrianca: string;
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
    nomeCrianca: '',
    grauParentesco: '',
    nomeEscola: '',
    cargo: '',
    disciplina: '',
    crm: '',
    especialidade: '',
    unidadeSUS: '',
};

const validationSchema = Yup.object({
    role: Yup.string().oneOf(['mae', 'escola', 'medico'], 'Selecione um perfil').required('Selecione um perfil'),
    nome: Yup.string().required('Campo obrigatório'),
    email: Yup.string().email('Campo precisa ser um email').required('Campo obrigatório'),
    password: Yup.string().min(6, 'A senha precisa ter pelo menos 6 caracteres').required('Campo obrigatório'),
    confirmarSenha: Yup.string().oneOf([Yup.ref('password')], 'As senhas não coincidem').required('Campo obrigatório'),

    nomeCrianca: Yup.string().when('role', { is: 'mae', then: (s) => s.required('Campo obrigatório') }),
    grauParentesco: Yup.string().when('role', { is: 'mae', then: (s) => s.required('Campo obrigatório') }),

    nomeEscola: Yup.string().when('role', { is: 'escola', then: (s) => s.required('Campo obrigatório') }),
    cargo: Yup.string().when('role', { is: 'escola', then: (s) => s.required('Campo obrigatório') }),
    disciplina: Yup.string().when('role', { is: 'escola', then: (s) => s.required('Campo obrigatório') }),

    crm: Yup.string().when('role', { is: 'medico', then: (s) => s.required('Campo obrigatório') }),
    especialidade: Yup.string().when('role', { is: 'medico', then: (s) => s.required('Campo obrigatório') }),
    unidadeSUS: Yup.string().when('role', { is: 'medico', then: (s) => s.required('Campo obrigatório') }),
});

// ===========================================================================
export default function CadastroForm() {
    const router = useRouter();
    const { user } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [aguardandoSessao, setAguardandoSessao] = useState(false);

    // Depois do cadastro, o Firebase já autentica o usuário automaticamente.
    // Espera o AuthContext confirmar (perfil no Firestore + cookie) antes de
    // navegar para a área restrita.
    useEffect(() => {
        if (aguardandoSessao && user)
            router.push('/admin/dashboard');
    }, [aguardandoSessao, user, router]);

    // ===========================================================================
    const montarDadosPerfil = (values: FormValues): DadosPerfil => {
        switch (values.role) {
            case 'mae':
                return { nomeCrianca: values.nomeCrianca, grauParentesco: values.grauParentesco };
            case 'escola':
                return { nomeEscola: values.nomeEscola, cargo: values.cargo, disciplina: values.disciplina };
            case 'medico':
                return { crm: values.crm, especialidade: values.especialidade, unidadeSUS: values.unidadeSUS };
            default:
                return {};
        }
    };
    // ===========================================================================
    const handleOnSubmit = async (values: FormValues) => {
        setError(null);

        const { success, message } = await UserServices.cadastrar({
            nome: values.nome,
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
            {({ handleChange, handleSubmit, values, isSubmitting, isValid, errors }) => (
                <form onSubmit={handleSubmit} className="w-[336px] flex flex-col">
                    <h1 className="ff-default text-[30px] text-center mb-3">Criar conta</h1>

                    <AppSelect label="Eu sou:" name="role" onChange={handleChange} value={values.role} error={errors.role}>
                        <option value="">Selecione...</option>
                        <option value="mae">Mãe / Responsável</option>
                        <option value="escola">Escola</option>
                        <option value="medico">Médico (SUS)</option>
                    </AppSelect>

                    <AppInput label="Nome:" placeholder="Digite seu nome" name="nome" onChange={handleChange} icon="person" error={errors.nome} />
                    <AppInput label="Email:" placeholder="Digite seu email" name="email" onChange={handleChange} icon="ios-email" error={errors.email} />
                    <AppInput label="Senha:" placeholder="Digite sua senha" name="password" type="password" onChange={handleChange} icon="locked" openPassword error={errors.password} />
                    <AppInput label="Confirmar senha:" placeholder="Repita sua senha" name="confirmarSenha" type="password" onChange={handleChange} icon="locked" openPassword error={errors.confirmarSenha} />

                    {/* CAMPOS ESPECÍFICOS — MÃE/RESPONSÁVEL */}
                    {values.role === 'mae' && <>
                        <AppInput label="Nome da criança:" placeholder="Nome da criança" name="nomeCrianca" onChange={handleChange} icon="person" error={errors.nomeCrianca} />
                        <AppInput label="Grau de parentesco:" placeholder="Ex: mãe, pai, avó..." name="grauParentesco" onChange={handleChange} icon="ios-people" error={errors.grauParentesco} />
                    </>}

                    {/* CAMPOS ESPECÍFICOS — ESCOLA */}
                    {values.role === 'escola' && <>
                        <AppInput label="Nome da escola:" placeholder="Nome da instituição" name="nomeEscola" onChange={handleChange} icon="home" error={errors.nomeEscola} />
                        <AppInput label="Cargo:" placeholder="Ex: professor(a), coordenador(a)..." name="cargo" onChange={handleChange} icon="briefcase" error={errors.cargo} />
                        <AppInput label="Disciplina:" placeholder="Disciplina lecionada" name="disciplina" onChange={handleChange} icon="ios-book" error={errors.disciplina} />
                    </>}

                    {/* CAMPOS ESPECÍFICOS — MÉDICO (SUS) */}
                    {values.role === 'medico' && <>
                        <AppInput label="CRM:" placeholder="Número do CRM" name="crm" onChange={handleChange} icon="clipboard" error={errors.crm} />
                        <AppInput label="Especialidade:" placeholder="Ex: psiquiatria infantil" name="especialidade" onChange={handleChange} icon="medkit" error={errors.especialidade} />
                        <AppInput label="Unidade SUS:" placeholder="Nome da unidade de saúde" name="unidadeSUS" onChange={handleChange} icon="ios-home" error={errors.unidadeSUS} />
                    </>}

                    {error && <p className="text-[tomato] ff-default text-[15px] text-center mt-3">{error}</p>}

                    <AppButton title="Criar conta" onClick={() => handleSubmit()} disabled={isSubmitting || !isValid} form="round" className="mt-4" />

                    <Link href="/">
                        <p className="ff-default text-center mt-3 text-[13px] text-[#4703D0] cursor-pointer">Já tenho conta — fazer login</p>
                    </Link>
                </form>
            )}
        </Formik>
    );
}
