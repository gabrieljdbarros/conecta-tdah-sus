"use client";
import { useEffect, useRef, useState } from "react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Yup from 'yup';
import PastaServices from "@/services/pasta";
import CategoriaServices from "@/services/categoria";
import RelatorioServices, { papelNaPasta } from "@/services/relatorio";
import { AppButton, AppLoader, AppSelect } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { setFlashData } from "@/helpers/router";
import { Categoria } from "@/types/categoria";
import { Pasta } from "@/types/pasta";
import {
    MAX_TEXTO_RELATORIO, PapelNaPasta, QUEM_VE, TIPO_DESCRICAO, TIPO_LABELS, TipoRelatorio, TIPOS_QUE_ESCREVE,
} from "@/types/relatorio";

interface FormValues {
    tipo: TipoRelatorio | '';
    categoriaId: string;
    texto: string;
}

const ROTULOS: Record<keyof FormValues, string> = {
    tipo: 'Tipo de relatório',
    categoriaId: 'Assunto (categoria)',
    texto: 'Texto do relatório',
};

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const CLASSE_LINK_VOLTAR = "self-center mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--primary-color) text-(--primary-color) ff-default text-[16px]";

// Resumo dos campos com erro: recebe o foco a cada tentativa de envio.
// TODO: remover quando os componentes do template mostrarem os próprios erros
function ResumoErros({ campos, tentativas }: { campos: string[]; tentativas: number }) {
    const ref = useRef<HTMLParagraphElement>(null);
    const temErro = tentativas > 0 && campos.length > 0;
    useEffect(() => { if (temErro) ref.current?.focus(); }, [tentativas, temErro]);
    if (!temErro) return null;
    return (
        <p ref={ref} tabIndex={-1} className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>
            Erro: confira estes campos: {campos.join(', ')}
        </p>
    );
}

// ===========================================================================
export default function NovoRelatorioForm({ pastaId }: { pastaId: string }) {
    const router = useRouter();
    const { user, loading: carregandoSessao } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ===========================================================================
    useEffect(() => {
        if (carregandoSessao || !user) return;
        (async () => {
            const [{ pasta }, { categorias }] = await Promise.all([PastaServices.buscar(pastaId), CategoriaServices.listar()]);
            setPasta(pasta ?? null);
            // Relatório novo só com categoria ativa (as regras também exigem)
            setCategorias(categorias.filter((c) => c.ativa));
            setCarregando(false);
        })();
    }, [carregandoSessao, user, pastaId]);

    const papel: PapelNaPasta | null = user && pasta ? papelNaPasta(user, pasta.donoUid) : null;
    const tipos = papel ? TIPOS_QUE_ESCREVE[papel] : [];

    // ===========================================================================
    const handleOnSubmit = async (values: FormValues) => {
        if (!user || !papel) return;
        setError(null);
        const { success, message } = await RelatorioServices.enviar(pastaId, user, papel, {
            tipo: values.tipo as TipoRelatorio,
            categoriaId: values.categoriaId,
            texto: values.texto.trim(),
        });
        if (success) {
            setFlashData('Relatório enviado');
            router.push(`/admin/pastas/${pastaId}`);
        } else
            setError(message ?? 'Não foi possível enviar o relatório');
    };
    // ===========================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando...</p>
            </div>
        );

    if (!pasta || !papel || tipos.length === 0)
        return (
            <div className="flex flex-col">
                <p role="alert" className="ff-default text-[16px] text-center mt-3">
                    Não foi possível abrir esta pasta, ou você não pode escrever relatórios nela.
                </p>
                <Link href="/admin/pastas" className={CLASSE_LINK_VOLTAR}>Voltar para as pastas</Link>
            </div>
        );

    const validationSchema = Yup.object({
        tipo: Yup.string().oneOf(tipos, 'Escolha o tipo de relatório').required('Escolha o tipo de relatório'),
        categoriaId: Yup.string().oneOf(categorias.map((c) => c.id), 'Escolha o assunto').required('Escolha o assunto'),
        texto: Yup.string().trim()
            .max(MAX_TEXTO_RELATORIO, `Use no máximo ${MAX_TEXTO_RELATORIO} caracteres`)
            .required('Escreva o relatório'),
    });

    return (
        <Formik
            // Com um tipo só (ex.: a mãe), ele já vem escolhido
            initialValues={{ tipo: tipos.length === 1 ? tipos[0] : '', categoriaId: '', texto: '' } as FormValues}
            validationSchema={validationSchema}
            onSubmit={handleOnSubmit}
        >
            {({ handleChange, handleSubmit, values, isSubmitting, errors, submitCount }) => (
                <form onSubmit={handleSubmit} className="w-full max-w-[560px] flex flex-col gap-4">
                    <p className="ff-default text-[16px]">
                        Relatório sobre <strong>{pasta.nomeAluno}</strong>.
                    </p>

                    {/* TIPO — só os que o papel pode escrever */}
                    {tipos.length === 1 ? (
                        <p className="ff-default text-[16px]">
                            <span className="font-bold">{ROTULOS.tipo}:</span> {TIPO_LABELS[tipos[0]]} — {TIPO_DESCRICAO[tipos[0]]}
                        </p>
                    ) : (
                        <fieldset className="flex flex-col gap-2">
                            <legend className="ff-default text-[16px] font-bold mb-2">{ROTULOS.tipo}:</legend>
                            {tipos.map((t) => (
                                <label key={t} className={`flex items-start gap-3 min-h-[48px] p-3 rounded-xl border-2 cursor-pointer ${values.tipo === t ? 'border-(--primary-color) bg-white' : 'border-gray-300'}`}>
                                    <input type="radio" name="tipo" value={t} checked={values.tipo === t} onChange={handleChange} className="mt-1 w-5 h-5" />
                                    <span className="ff-default text-[16px]">
                                        <span className="font-bold">{TIPO_LABELS[t]}</span><br />
                                        {TIPO_DESCRICAO[t]}
                                    </span>
                                </label>
                            ))}
                        </fieldset>
                    )}

                    {/* QUEM VAI VER — a regra de acesso explicada para quem escreve */}
                    <p aria-live="polite" className="ff-default text-[16px] p-3 rounded-xl bg-white border border-gray-300 empty:hidden">
                        {values.tipo && <>
                            <i className="ion-eye mr-2" aria-hidden="true" />
                            <strong>Quem vai ver este relatório:</strong> {QUEM_VE[values.tipo]}
                        </>}
                    </p>

                    {/* CATEGORIA — só as ativas */}
                    {categorias.length === 0 ? (
                        <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>
                            Ainda não há assuntos (categorias) cadastrados. Peça ao administrador para cadastrar.
                        </p>
                    ) : (
                        <AppSelect label={`${ROTULOS.categoriaId}:`} name="categoriaId" value={values.categoriaId} onChange={handleChange} error={errors.categoriaId}>
                            <option value="">Escolha o assunto...</option>
                            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </AppSelect>
                    )}

                    {/* TEXTO */}
                    <div className="flex flex-col gap-1">
                        <label htmlFor="texto-relatorio" className="ff-default text-[16px] font-bold">{ROTULOS.texto}:</label>
                        <textarea id="texto-relatorio" name="texto" value={values.texto} onChange={handleChange}
                            rows={8} maxLength={MAX_TEXTO_RELATORIO} aria-describedby="contador-texto aviso-imutavel"
                            className="w-full rounded-xl border-2 border-gray-400 bg-[#f5f5f5] p-3 ff-default text-[16px] focus:border-(--primary-color) focus:outline-none" />
                        <p id="contador-texto" className="ff-default text-[14px] text-gray-700 text-right">
                            {values.texto.length} de {MAX_TEXTO_RELATORIO} caracteres
                        </p>
                    </div>

                    <p id="aviso-imutavel" className="ff-default text-[16px]">
                        <strong>Depois de enviado, o relatório não pode ser alterado.</strong> Para corrigir
                        alguma coisa, escreva um novo relatório.
                    </p>

                    <ResumoErros
                        campos={(Object.keys(errors) as (keyof FormValues)[]).map((campo) => ROTULOS[campo])}
                        tentativas={submitCount}
                    />
                    {error && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center`}>Erro: {error}</p>}

                    <AppButton title={isSubmitting ? 'Enviando...' : 'Enviar relatório'} icon="paper-airplane"
                        onClick={() => handleSubmit()} disabled={isSubmitting || categorias.length === 0} form="round" />
                    <Link href={`/admin/pastas/${pastaId}`} className={CLASSE_LINK_VOLTAR}>Voltar sem enviar</Link>
                </form>
            )}
        </Formik>
    );
}
