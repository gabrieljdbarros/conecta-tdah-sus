"use client";
import { AppButton, AppInput, AppLoader, AppOuvir } from "@/themes/components";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Yup from 'yup';
import PastaServices from "@/services/pasta";
import { useAuth } from "@/contexts/AuthContext";
import { setFlashData } from "@/helpers/router";

interface FormValues {
    nomeAluno: string;
}

// Rótulos dos campos — usados nos inputs e no resumo de erros
const ROTULOS: Record<keyof FormValues, string> = {
    nomeAluno: 'Nome do aluno',
};

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';

// Botão de saída com alvo de toque grande
const CLASSE_LINK_VOLTAR = "self-center mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px]";

// Limite igual ao das Security Rules (textoValido em firestore.rules)
const MAX = 100;

const validationSchema = Yup.object({
    nomeAluno: Yup.string().trim().max(MAX, `Use no máximo ${MAX} caracteres`).required('Campo obrigatório'),
});

// Resumo dos campos com erro. Recebe o foco a cada tentativa de envio, para
// quem usa teclado ou leitor de tela não precisar procurar o problema.
// O erro também aparece junto de cada campo; o resumo continua
function ResumoErros({ campos, tentativas }: { campos: string[]; tentativas: number }) {
    const ref = useRef<HTMLParagraphElement>(null);
    const temErro = tentativas > 0 && campos.length > 0;

    useEffect(() => {
        if (temErro) ref.current?.focus();
    }, [tentativas, temErro]);

    if (!temErro) return null;
    return (
        <p ref={ref} tabIndex={-1} role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>
            Erro: confira estes campos: {campos.join(', ')}
        </p>
    );
}

// ===========================================================================
export default function NovaPastaForm() {
    const router = useRouter();
    const { user, loading: carregandoSessao } = useAuth();
    const [error, setError] = useState<string | null>(null);

    // ===========================================================================
    const handleOnSubmit = async (values: FormValues) => {
        if (!user) return;
        setError(null);

        const { success, message } = await PastaServices.criar(user, {
            nomeAluno: values.nomeAluno.trim(),
        });

        if (success) {
            setFlashData('Pasta criada com sucesso');
            router.push('/admin/pastas');
        } else
            setError(message ?? 'Não foi possível criar a pasta');
    };
    // ===========================================================================
    if (carregandoSessao)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando...</p>
            </div>
        );

    // Só a mãe/responsável cria pasta (decisão travada 6). Checagem de UX —
    // as Security Rules também recusam
    if (user?.role !== 'mae')
        return (
            <div className="flex flex-col">
                <p className="ff-default text-[16px] text-center mt-3">Só a mãe ou o responsável pode criar a pasta.</p>
                <Link href="/admin/pastas" className={CLASSE_LINK_VOLTAR}>Voltar para as pastas</Link>
            </div>
        );

    return (
        <Formik
            initialValues={{ nomeAluno: '' } as FormValues}
            validationSchema={validationSchema}
            onSubmit={handleOnSubmit}
        >
            {({ handleChange, handleSubmit, values, isSubmitting, errors, submitCount }) => (
                <form onSubmit={handleSubmit} className="w-full max-w-[480px] flex flex-col">
                    <h2 className="ff-default text-[26px] font-extrabold leading-tight text-(--cor-texto)">Cadastre o aluno</h2>
                    <p className="ff-default text-[16px] text-(--cor-texto) mt-1 mb-3">
                        Só com o nome você já pode começar a conectar a escola e os médicos. Sem burocracia.
                    </p>
                    <AppOuvir rotulo="Ouvir instruções" className="self-start mb-3"
                        texto="Para criar a pasta, escreva o nome completo do aluno e toque em Criar pasta. Depois você poderá convidar a escola e o médico." />

                    <AppInput label={ROTULOS.nomeAluno} placeholder="Nome completo da criança ou jovem" name="nomeAluno" value={values.nomeAluno} onChange={handleChange} error={errors.nomeAluno} mostrarErro={submitCount > 0} className="mb-2" />

                    <ResumoErros
                        campos={(Object.keys(errors) as (keyof FormValues)[]).map(campo => ROTULOS[campo])}
                        tentativas={submitCount}
                    />
                    {error && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>Erro: {error}</p>}

                    {/* Botão só bloqueia durante o envio: com erro, o clique mostra o resumo acima */}
                    <AppButton title={isSubmitting ? 'Criando...' : 'Criar pasta'} submit disabled={isSubmitting} className="mt-4" />
                    <Link href="/admin/pastas" className={CLASSE_LINK_VOLTAR}>Voltar sem criar</Link>

                    {/* "Quem terá acesso a esta pasta?" (design): explica o convite antes de criar */}
                    <section aria-labelledby="titulo-acesso" className="mt-8 p-4 rounded-xl bg-[#EEF2FF] flex flex-col gap-2">
                        <h3 id="titulo-acesso" className="ff-default text-[18px] font-bold text-(--cor-texto) flex items-center gap-2">
                            <i className="ion-locked text-(--cor-secundaria)" aria-hidden="true" />Quem terá acesso a esta pasta?
                        </h3>
                        <p className="ff-default text-[16px] text-(--cor-texto)">
                            Só você decide. A escola e o médico só veem a pasta se você enviar um convite: um link
                            que vale 48 horas e só funciona para uma pessoa. Quem entra na pasta vê todas as mensagens da conversa.
                        </p>
                        <ul className="flex flex-wrap gap-2 mt-1">
                            <li className="ff-default text-[16px] font-bold text-(--cor-texto) bg-white rounded-lg px-3 py-2 flex items-center gap-2">
                                <i className="ion-key text-(--cor-secundaria)" aria-hidden="true" />Acesso só por convite
                            </li>
                            <li className="ff-default text-[16px] font-bold text-(--cor-texto) bg-white rounded-lg px-3 py-2 flex items-center gap-2">
                                <i className="ion-eye-disabled text-(--cor-secundaria)" aria-hidden="true" />Nada fica público
                            </li>
                        </ul>
                    </section>
                </form>
            )}
        </Formik>
    );
}
