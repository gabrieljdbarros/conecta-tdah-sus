"use client";
import { AppButton, AppInput, AppLoader } from "@/themes/components";
import { Formik } from "formik";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import UserServices from "@/services/user";
import { useAuth } from "@/contexts/AuthContext";
import { AppUser, DadosPerfil, ROLE_LABELS, UserRole } from "@/types/user";

interface FormValues {
    nome: string;
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

// Rótulos dos campos — usados nos inputs e no resumo de erros
const ROTULOS: Record<keyof FormValues, string> = {
    nome: 'Nome',
    grauParentesco: 'Grau de parentesco',
    nomeEscola: 'Nome da escola',
    cargo: 'Cargo',
    disciplina: 'Disciplina (se for professor)',
    crm: 'CRM (registro do médico)',
    especialidade: 'Especialidade',
    unidadeSUS: 'Unidade SUS (posto ou hospital)',
};

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';

// Limite igual ao das Security Rules (textoValido em firestore.rules)
const MAX = 100;
const MSG_MAX = `Use no máximo ${MAX} caracteres`;

// O role vem do documento salvo e não é editável, então o schema já nasce
// sabendo quais campos de `dadosPerfil` são obrigatórios
function montarSchema(role: UserRole) {
    const texto = () => Yup.string().trim().max(MAX, MSG_MAX);
    const obrigatorioSe = (r: UserRole) => role === r ? texto().required('Campo obrigatório') : texto();
    return Yup.object({
        nome: texto().required('Campo obrigatório'),

        grauParentesco: obrigatorioSe('mae'),

        nomeEscola: obrigatorioSe('escola'),
        cargo: obrigatorioSe('escola'),
        disciplina: texto(), // opcional: coordenação/direção não leciona

        crm: obrigatorioSe('medico'),
        especialidade: obrigatorioSe('medico'),
        unidadeSUS: obrigatorioSe('medico'),
    });
}

function valoresIniciais(user: AppUser): FormValues {
    const d = user.dadosPerfil;
    return {
        nome: user.nome ?? '',
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
}

// Link de saída para as telas sem formulário (alvo de toque grande)
function LinkVoltar() {
    return (
        <Link href="/admin/dashboard" className="self-center mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--primary-color) text-(--primary-color) ff-default text-[16px]">
            Voltar ao início
        </Link>
    );
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
            else setError('Não foi possível carregar seus dados. Tente novamente mais tarde');
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
            setSucesso('Seus dados foram salvos');
            await recarregarUsuario();
        } else
            setError(message ?? 'Não foi possível salvar as alterações');
    };
    // ===========================================================================
    // Texto visível (e anunciado pelo leitor de tela) enquanto carrega
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando seus dados...</p>
            </div>
        );

    if (!ehProprioPerfil)
        return (
            <div className="flex flex-col">
                <p role="alert" className="ff-default text-[16px] text-center mt-3">Você só pode editar o seu próprio perfil.</p>
                <LinkVoltar />
            </div>
        );

    if (!perfil)
        return (
            <div className="flex flex-col">
                <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>Erro: {error}</p>
                <LinkVoltar />
            </div>
        );

    return (
        <Formik
            initialValues={valoresIniciais(perfil)}
            validationSchema={montarSchema(perfil.role)}
            onSubmit={handleOnSubmit}
        >
            {({ handleChange, handleSubmit, values, isSubmitting, errors, submitCount }) => {
                // Como o AppInput só mostra o erro depois que o campo perde o
                // foco, um resumo diz quais campos faltam quando a pessoa tenta
                // salvar. TODO: remover quando o AppInput for corrigido
                // (branch de acessibilidade dos componentes)
                const camposComErro = (Object.keys(errors) as (keyof FormValues)[]).map(campo => ROTULOS[campo]);

                return (
                    <form onSubmit={handleSubmit} className="w-full max-w-[336px] flex flex-col">

                        {/* DADOS QUE NÃO PODEM SER ALTERADOS — exibidos como texto, não como campo */}
                        <dl className="ml-3 mb-3">
                            <dt className="ff-default text-[14px] text-[#4b5563]">Email (não pode ser alterado)</dt>
                            <dd className="ff-default text-[16px] break-all">{perfil.email}</dd>
                            <dt className="ff-default text-[14px] text-[#4b5563] mt-2">Perfil (não pode ser alterado)</dt>
                            <dd className="ff-default text-[16px]">{ROLE_LABELS[perfil.role]}</dd>
                        </dl>

                        <AppInput label={`${ROTULOS.nome}:`} placeholder="Digite seu nome" name="nome" value={values.nome} onChange={handleChange} icon="person" error={errors.nome} />

                        {/* CAMPOS ESPECÍFICOS — MÃE/RESPONSÁVEL */}
                        {perfil.role === 'mae' && <>
                            <AppInput label={`${ROTULOS.grauParentesco}:`} placeholder="Ex: mãe, pai, avó..." name="grauParentesco" value={values.grauParentesco} onChange={handleChange} icon="ios-people" error={errors.grauParentesco} />
                        </>}

                        {/* CAMPOS ESPECÍFICOS — ESCOLA */}
                        {perfil.role === 'escola' && <>
                            <AppInput label={`${ROTULOS.nomeEscola}:`} placeholder="Nome da instituição" name="nomeEscola" value={values.nomeEscola} onChange={handleChange} icon="home" error={errors.nomeEscola} />
                            <AppInput label={`${ROTULOS.cargo}:`} placeholder="Ex: professor(a), coordenador(a)..." name="cargo" value={values.cargo} onChange={handleChange} icon="briefcase" error={errors.cargo} />
                            <AppInput label={`${ROTULOS.disciplina}:`} placeholder="Deixe em branco se não leciona" name="disciplina" value={values.disciplina} onChange={handleChange} icon="ios-book" error={errors.disciplina} />
                        </>}

                        {/* CAMPOS ESPECÍFICOS — MÉDICO (SUS) */}
                        {perfil.role === 'medico' && <>
                            <AppInput label={`${ROTULOS.crm}:`} placeholder="Número do CRM" name="crm" value={values.crm} onChange={handleChange} icon="clipboard" error={errors.crm} />
                            <AppInput label={`${ROTULOS.especialidade}:`} placeholder="Ex: psiquiatria infantil" name="especialidade" value={values.especialidade} onChange={handleChange} icon="medkit" error={errors.especialidade} />
                            <AppInput label={`${ROTULOS.unidadeSUS}:`} placeholder="Nome da unidade de saúde" name="unidadeSUS" value={values.unidadeSUS} onChange={handleChange} icon="ios-home" error={errors.unidadeSUS} />
                        </>}

                        {/* MENSAGENS — logo acima do botão, onde a pessoa está olhando.
                            role="alert"/"status" faz o leitor de tela anunciar */}
                        {submitCount > 0 && camposComErro.length > 0 && (
                            <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>
                                Erro: confira estes campos: {camposComErro.join(', ')}
                            </p>
                        )}
                        {error && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>Erro: {error}</p>}
                        <p role="status" className={`${COR_SUCESSO} ff-default text-[16px] text-center mt-3`}>
                            {sucesso && `Pronto: ${sucesso}`}
                        </p>

                        {/* Botão só bloqueia durante o envio: com erro, o clique mostra o resumo acima */}
                        <AppButton title={isSubmitting ? 'Salvando...' : 'Salvar alterações'} onClick={() => handleSubmit()} disabled={isSubmitting} form="round" className="mt-2" />
                    </form>
                );
            }}
        </Formik>
    );
}
