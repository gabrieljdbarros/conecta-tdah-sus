"use client";
import { AppButton, AppInput, AppLoader } from "@/themes/components";
import { Formik } from "formik";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import UserServices from "@/services/user";
import { useAuth } from "@/contexts/AuthContext";
import { AppUser, DadosPerfil, ROLE_LABELS, UserRole } from "@/types/user";

interface FormValues {
    nome: string;
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

// O role vem do documento salvo e não é editável, então o schema já nasce
// sabendo quais campos de `dadosPerfil` são obrigatórios
function montarSchema(role: UserRole) {
    const obrigatorioSe = (r: UserRole) => role === r ? Yup.string().trim().required('Campo obrigatório') : Yup.string();
    return Yup.object({
        nome: Yup.string().trim().required('Campo obrigatório'),

        nomeCrianca: obrigatorioSe('mae'),
        grauParentesco: obrigatorioSe('mae'),

        nomeEscola: obrigatorioSe('escola'),
        cargo: obrigatorioSe('escola'),
        disciplina: obrigatorioSe('escola'),

        crm: obrigatorioSe('medico'),
        especialidade: obrigatorioSe('medico'),
        unidadeSUS: obrigatorioSe('medico'),
    });
}

function valoresIniciais(user: AppUser): FormValues {
    const d = user.dadosPerfil;
    return {
        nome: user.nome ?? '',
        nomeCrianca: d.nomeCrianca ?? '',
        grauParentesco: d.grauParentesco ?? '',
        nomeEscola: d.nomeEscola ?? '',
        cargo: d.cargo ?? '',
        disciplina: d.disciplina ?? '',
        crm: d.crm ?? '',
        especialidade: d.especialidade ?? '',
        unidadeSUS: d.unidadeSUS ?? '',
    };
}

// Grava só os campos do perfil da pessoa (mesma lógica do cadastro)
function montarDadosPerfil(role: UserRole, values: FormValues): DadosPerfil {
    switch (role) {
        case 'mae':
            return { nomeCrianca: values.nomeCrianca, grauParentesco: values.grauParentesco };
        case 'escola':
            return { nomeEscola: values.nomeEscola, cargo: values.cargo, disciplina: values.disciplina };
        case 'medico':
            return { crm: values.crm, especialidade: values.especialidade, unidadeSUS: values.unidadeSUS };
        default:
            return {};
    }
}

// ===========================================================================
export default function EditarPerfilForm({ userID }: { userID: string }) {
    const { user, loading: carregandoSessao, recarregarUsuario } = useAuth();
    const [perfil, setPerfil] = useState<AppUser | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sucesso, setSucesso] = useState<string | null>(null);

    // Esta tela é só para o próprio perfil. A checagem aqui é UX — quem
    // impede de verdade a edição de outro usuário são as Security Rules.
    const ehProprioPerfil = !!user && user.uid === userID;

    // ===========================================================================
    useEffect(() => {
        if (carregandoSessao) return;
        if (!ehProprioPerfil) {
            setCarregando(false);
            return;
        }
        (async () => {
            const { success, user: dados } = await UserServices.getById(userID);
            if (success && dados) setPerfil(dados);
            else setError('Não foi possível carregar seus dados');
            setCarregando(false);
        })();
    }, [carregandoSessao, ehProprioPerfil, userID]);
    // ===========================================================================
    const handleOnSubmit = async (values: FormValues) => {
        if (!perfil) return;
        setError(null);
        setSucesso(null);

        const { success, message } = await UserServices.atualizarPerfil(perfil.uid, {
            nome: values.nome.trim(),
            dadosPerfil: montarDadosPerfil(perfil.role, values),
        });

        if (success) {
            setSucesso('Dados salvos com sucesso');
            await recarregarUsuario();
        } else
            setError(message ?? 'Não foi possível salvar as alterações');
    };
    // ===========================================================================
    if (carregandoSessao || carregando)
        return <div className="flex justify-center"><AppLoader size={50} className="self-center" /></div>;

    if (!ehProprioPerfil)
        return <p className="ff-default text-[16px] text-center mt-3">Você só pode editar o seu próprio perfil.</p>;

    if (!perfil)
        return <p className="text-[tomato] ff-default text-[16px] text-center mt-3">{error}</p>;

    return (
        <Formik
            initialValues={valoresIniciais(perfil)}
            validationSchema={montarSchema(perfil.role)}
            onSubmit={handleOnSubmit}
        >
            {({ handleChange, handleSubmit, values, isSubmitting, isValid, errors }) => (
                <form onSubmit={handleSubmit} className="w-[336px] flex flex-col">

                    {/* DADOS QUE NÃO PODEM SER ALTERADOS — exibidos como texto, não como campo */}
                    <div className="ml-3 mb-3">
                        <p className="ff-default text-[grey] text-[13px]">Email</p>
                        <p className="ff-default text-[16px]">{perfil.email}</p>
                        <p className="ff-default text-[grey] text-[13px] mt-2">Perfil</p>
                        <p className="ff-default text-[16px]">{ROLE_LABELS[perfil.role]}</p>
                    </div>

                    <AppInput label="Nome:" placeholder="Digite seu nome" name="nome" value={values.nome} onChange={handleChange} icon="person" error={errors.nome} />

                    {/* CAMPOS ESPECÍFICOS — MÃE/RESPONSÁVEL */}
                    {perfil.role === 'mae' && <>
                        <AppInput label="Nome da criança:" placeholder="Nome da criança" name="nomeCrianca" value={values.nomeCrianca} onChange={handleChange} icon="person" error={errors.nomeCrianca} />
                        <AppInput label="Grau de parentesco:" placeholder="Ex: mãe, pai, avó..." name="grauParentesco" value={values.grauParentesco} onChange={handleChange} icon="ios-people" error={errors.grauParentesco} />
                    </>}

                    {/* CAMPOS ESPECÍFICOS — ESCOLA */}
                    {perfil.role === 'escola' && <>
                        <AppInput label="Nome da escola:" placeholder="Nome da instituição" name="nomeEscola" value={values.nomeEscola} onChange={handleChange} icon="home" error={errors.nomeEscola} />
                        <AppInput label="Cargo:" placeholder="Ex: professor(a), coordenador(a)..." name="cargo" value={values.cargo} onChange={handleChange} icon="briefcase" error={errors.cargo} />
                        <AppInput label="Disciplina:" placeholder="Disciplina lecionada" name="disciplina" value={values.disciplina} onChange={handleChange} icon="ios-book" error={errors.disciplina} />
                    </>}

                    {/* CAMPOS ESPECÍFICOS — MÉDICO (SUS) */}
                    {perfil.role === 'medico' && <>
                        <AppInput label="CRM:" placeholder="Número do CRM" name="crm" value={values.crm} onChange={handleChange} icon="clipboard" error={errors.crm} />
                        <AppInput label="Especialidade:" placeholder="Ex: psiquiatria infantil" name="especialidade" value={values.especialidade} onChange={handleChange} icon="medkit" error={errors.especialidade} />
                        <AppInput label="Unidade SUS:" placeholder="Nome da unidade de saúde" name="unidadeSUS" value={values.unidadeSUS} onChange={handleChange} icon="ios-home" error={errors.unidadeSUS} />
                    </>}

                    {error && <p className="text-[tomato] ff-default text-[15px] text-center mt-3">{error}</p>}
                    {sucesso && <p className="text-[green] ff-default text-[15px] text-center mt-3">{sucesso}</p>}

                    <AppButton title="Salvar alterações" onClick={() => handleSubmit()} disabled={isSubmitting || !isValid} form="round" className="mt-4" />
                </form>
            )}
        </Formik>
    );
}
