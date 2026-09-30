"use client";
import { AppButton, AppInput, AppLoader, AppSelect } from "@/themes/components";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Yup from 'yup';
import PastaServices from "@/services/pasta";
import { useAuth } from "@/contexts/AuthContext";
import { setFlashData } from "@/helpers/router";
import { Serie, SERIE_LABELS } from "@/types/pasta";

interface FormValues {
    nomeAluno: string;
    serie: Serie | '';
}

// Rótulos dos campos — usados nos inputs e no resumo de erros
const ROTULOS: Record<keyof FormValues, string> = {
    nomeAluno: 'Nome do aluno',
    serie: 'Série',
};

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';

// Botão de saída com alvo de toque grande
const CLASSE_LINK_VOLTAR = "self-center mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--primary-color) text-(--primary-color) ff-default text-[16px]";

// Limite igual ao das Security Rules (textoValido em firestore.rules)
const MAX = 100;

const validationSchema = Yup.object({
    nomeAluno: Yup.string().trim().max(MAX, `Use no máximo ${MAX} caracteres`).required('Campo obrigatório'),
    serie: Yup.string().oneOf(Object.keys(SERIE_LABELS), 'Escolha a série').required('Escolha a série'),
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
            serie: values.serie as Serie,
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

    // Só a mãe/responsável cria pasta (decisão travada 8). Checagem de UX —
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
            initialValues={{ nomeAluno: '', serie: '' } as FormValues}
            validationSchema={validationSchema}
            onSubmit={handleOnSubmit}
        >
            {({ handleChange, handleSubmit, values, isSubmitting, errors, submitCount }) => (
                <form onSubmit={handleSubmit} className="w-full max-w-[336px] flex flex-col">
                    <p className="ff-default text-[16px] mb-3">
                        A pasta reúne tudo sobre o acompanhamento do aluno. Depois você poderá convidar a escola e o médico.
                    </p>

                    <AppInput label={`${ROTULOS.nomeAluno}:`} placeholder="Nome completo do aluno" name="nomeAluno" value={values.nomeAluno} onChange={handleChange} icon="person" error={errors.nomeAluno} mostrarErro={submitCount > 0} />

                    <AppSelect label={`${ROTULOS.serie}:`} name="serie" value={values.serie} onChange={handleChange} error={errors.serie} mostrarErro={submitCount > 0}>
                        <option value="">Escolha a série...</option>
                        {(Object.entries(SERIE_LABELS) as [Serie, string][]).map(([codigo, rotulo]) => (
                            <option key={codigo} value={codigo}>{rotulo}</option>
                        ))}
                    </AppSelect>

                    <ResumoErros
                        campos={(Object.keys(errors) as (keyof FormValues)[]).map(campo => ROTULOS[campo])}
                        tentativas={submitCount}
                    />
                    {error && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>Erro: {error}</p>}

                    {/* Botão só bloqueia durante o envio: com erro, o clique mostra o resumo acima */}
                    <AppButton title={isSubmitting ? 'Criando...' : 'Criar pasta'} onClick={() => handleSubmit()} disabled={isSubmitting} form="round" className="mt-4" />
                    <Link href="/admin/pastas" className={CLASSE_LINK_VOLTAR}>Voltar sem criar</Link>
                </form>
            )}
        </Formik>
    );
}
