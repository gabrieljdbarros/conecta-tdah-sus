"use client";
import { useEffect, useRef, useState } from "react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Yup from 'yup';
import CategoriaServices, { mesmoNome } from "@/services/categoria";
import { AppButton, AppInput, AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { setFlashData } from "@/helpers/router";
import { Categoria, MAX_NOME_CATEGORIA } from "@/types/categoria";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const CLASSE_LINK_VOLTAR = "self-center mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--primary-color) text-(--primary-color) ff-default text-[16px]";

/**
 * Formulário de categoria — o mesmo para criar (sem `categoriaId`) e editar
 */
export default function CategoriaForm({ categoriaId }: { categoriaId?: string }) {
    const router = useRouter();
    const { user, loading: carregandoSessao } = useAuth();
    const [existentes, setExistentes] = useState<Categoria[]>([]);
    const [atual, setAtual] = useState<Categoria | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const erroRef = useRef<HTMLParagraphElement>(null);

    const editando = !!categoriaId;
    const ehAdmin = user?.role === 'admin';

    // Carrega as categorias existentes (para avisar de nome repetido) e,
    // na edição, a categoria atual
    useEffect(() => {
        if (carregandoSessao) return;
        if (!ehAdmin) { setCarregando(false); return; }
        (async () => {
            const { categorias } = await CategoriaServices.listar();
            setExistentes(categorias);
            if (categoriaId) {
                const { categoria } = await CategoriaServices.buscar(categoriaId);
                setAtual(categoria ?? null);
                if (!categoria) setError('Não foi possível encontrar esta categoria');
            }
            setCarregando(false);
        })();
    }, [carregandoSessao, ehAdmin, categoriaId]);

    useEffect(() => { if (error) erroRef.current?.focus(); }, [error]);

    // O schema conhece as categorias já existentes para recusar repetidas
    const validationSchema = Yup.object({
        nome: Yup.string().trim()
            .max(MAX_NOME_CATEGORIA, `Use no máximo ${MAX_NOME_CATEGORIA} caracteres`)
            .required('Escreva o nome da categoria')
            .test('repetida', 'Já existe uma categoria com esse nome',
                (valor) => !existentes.some((c) => c.id !== categoriaId && mesmoNome(c.nome, valor ?? ''))),
    });

    // ===========================================================================
    const handleOnSubmit = async ({ nome }: { nome: string }) => {
        setError(null);
        const nomeLimpo = nome.trim();
        const { success, message } = categoriaId
            ? await CategoriaServices.renomear(categoriaId, nomeLimpo)
            : await CategoriaServices.criar([nomeLimpo]);

        if (success) {
            setFlashData(editando ? 'Categoria salva' : 'Categoria criada');
            router.push('/admin/categorias');
        } else
            setError(message ?? 'Não foi possível salvar');
    };
    // ===========================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando...</p>
            </div>
        );

    // Checagem de UX — as Security Rules também só deixam o admin alterar
    if (!ehAdmin || (editando && !atual))
        return (
            <div className="flex flex-col">
                <p ref={erroRef} tabIndex={-1} role="alert" className="ff-default text-[16px] text-center mt-3">
                    {ehAdmin ? `Erro: ${error}` : 'Só administradores gerenciam as categorias de acompanhamento.'}
                </p>
                <Link href="/admin/categorias" className={CLASSE_LINK_VOLTAR}>Voltar para as categorias</Link>
            </div>
        );

    return (
        <Formik
            initialValues={{ nome: atual?.nome ?? '' }}
            validationSchema={validationSchema}
            onSubmit={handleOnSubmit}
        >
            {({ handleChange, handleSubmit, values, isSubmitting, errors, submitCount }) => (
                <form onSubmit={handleSubmit} className="w-full max-w-[336px] flex flex-col">
                    <p className="ff-default text-[16px] mb-3">
                        Use um nome curto e claro, que mãe, escola e médico entendam. Exemplo: &quot;Sono&quot;.
                    </p>

                    <AppInput label="Nome da categoria:" placeholder="Ex.: Atenção e concentração" name="nome"
                        value={values.nome} onChange={handleChange} icon="pricetag" error={errors.nome} />

                    {/* O AppInput só mostra o erro depois de sair do campo; ao tentar
                        salvar, o erro aparece aqui. TODO: remover quando o AppInput
                        for corrigido (branch de acessibilidade dos componentes) */}
                    {submitCount > 0 && errors.nome && (
                        <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>Erro: {errors.nome}</p>
                    )}
                    {error && <p ref={erroRef} tabIndex={-1} role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>Erro: {error}</p>}

                    <AppButton title={isSubmitting ? 'Salvando...' : editando ? 'Salvar' : 'Criar categoria'}
                        onClick={() => handleSubmit()} disabled={isSubmitting} form="round" className="mt-4" />
                    <Link href="/admin/categorias" className={CLASSE_LINK_VOLTAR}>Voltar sem salvar</Link>
                </form>
            )}
        </Formik>
    );
}
