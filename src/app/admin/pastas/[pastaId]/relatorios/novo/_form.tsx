"use client";
import { useEffect, useRef, useState } from "react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Yup from 'yup';
import PastaServices from "@/services/pasta";
import CategoriaServices from "@/services/categoria";
import RelatorioServices, { papelNaPasta } from "@/services/relatorio";
import { AppButton, AppLoader, AppOuvir, AppSelect } from "@/themes/components";
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

// Id de cada campo na página — o resumo de erros leva até ele
const ID_CAMPO: Record<keyof FormValues, string> = {
    tipo: 'campo-tipo',
    categoriaId: 'campo-assunto',
    texto: 'texto-relatorio',
};

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const CLASSE_LINK_VOLTAR = "self-center mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--primary-color) text-(--primary-color) ff-default text-[16px]";

/**
 * Resumo dos erros ao tentar enviar: diz O QUE fazer ("Escolha o assunto"),
 * não só o nome do campo, e cada item leva até o campo. Recebe o foco a
 * cada tentativa. O erro também aparece junto de cada campo; o resumo
 * continua, por ser o padrão recomendado de formulário acessível.
 */
function ResumoErros({ erros, tentativas }: { erros: Partial<Record<keyof FormValues, string>>; tentativas: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const itens = (Object.keys(ID_CAMPO) as (keyof FormValues)[]).filter((campo) => erros[campo]);
    const temErro = tentativas > 0 && itens.length > 0;
    useEffect(() => { if (temErro) ref.current?.focus(); }, [tentativas, temErro]);
    if (!temErro) return null;
    return (
        <div ref={ref} tabIndex={-1} role="alert" className={`${COR_ERRO} ff-default text-[16px] p-3 rounded-xl border-2 border-[#B91C1C] bg-[#FEF2F2]`}>
            <p className="font-bold">Falta preencher:</p>
            <ul className="list-disc pl-6">
                {itens.map((campo) => (
                    <li key={campo}><a href={`#${ID_CAMPO[campo]}`} className="underline">{erros[campo]}</a></li>
                ))}
            </ul>
        </div>
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
    const erroEnvioRef = useRef<HTMLParagraphElement>(null);

    // ===========================================================================
    useEffect(() => {
        if (carregandoSessao || !user) return;
        (async () => {
            // Os serviços não lançam erro (devolvem success: false), então o
            // "Carregando..." sempre termina
            const [{ pasta }, { categorias }] = await Promise.all([PastaServices.buscar(pastaId), CategoriaServices.listar()]);
            setPasta(pasta ?? null);
            // Relatório novo só com categoria ativa (as regras também exigem)
            setCategorias(categorias.filter((c) => c.ativa));
            setCarregando(false);
        })();
    }, [carregandoSessao, user, pastaId]);

    // Falha no envio: o foco vai até a mensagem (o botão fica no fim da tela)
    useEffect(() => { if (error) erroEnvioRef.current?.focus(); }, [error]);

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
            // Anunciada pela tela da pasta (role="status")
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
                    <AppOuvir rotulo="Ouvir instruções" className="self-start"
                        texto="Para escrever o relatório: escolha o tipo, se aparecer a opção, escolha o assunto e escreva o texto. A tela mostra quem vai ver o relatório. Depois de enviado, ele não pode ser alterado. No fim, toque em Enviar relatório." />

                    {/* TIPO — só os que o papel pode escrever */}
                    {tipos.length === 1 ? (
                        <p id={ID_CAMPO.tipo} className="ff-default text-[16px]">
                            <span className="font-bold">Tipo de relatório:</span> {TIPO_LABELS[tipos[0]]}. {TIPO_DESCRICAO[tipos[0]]}
                        </p>
                    ) : (
                        <fieldset id={ID_CAMPO.tipo} aria-describedby={submitCount > 0 && errors.tipo ? 'erro-tipo' : undefined} className="flex flex-col gap-2">
                            <legend className="ff-default text-[16px] font-bold mb-2">Tipo de relatório (obrigatório):</legend>
                            {tipos.map((t) => (
                                <label key={t} className={`flex items-start gap-3 min-h-[48px] p-3 rounded-xl border-2 cursor-pointer ${values.tipo === t ? 'border-(--primary-color) bg-white' : 'border-gray-500'}`}>
                                    <input type="radio" name="tipo" value={t} checked={values.tipo === t} onChange={handleChange} className="mt-1 w-5 h-5" />
                                    <span className="ff-default text-[16px]">
                                        <span className="block font-bold">{TIPO_LABELS[t]}</span>
                                        <span className="block">{TIPO_DESCRICAO[t]}</span>
                                    </span>
                                </label>
                            ))}
                            {submitCount > 0 && errors.tipo && <p id="erro-tipo" className={`${COR_ERRO} ff-default text-[16px]`}>Erro: {errors.tipo}</p>}
                        </fieldset>
                    )}

                    {/* QUEM VAI VER — a regra de acesso explicada para quem escreve.
                        Sempre na página (região "live" que existe desde o início) */}
                    <p aria-live="polite" className={`ff-default text-[16px] ${values.tipo ? 'p-3 rounded-xl bg-white border border-gray-500' : ''}`}>
                        {values.tipo && <>
                            <i className="ion-eye mr-2" aria-hidden="true" />
                            <strong>Quem vai ver este relatório:</strong> {QUEM_VE[values.tipo]}
                        </>}
                    </p>

                    {/* CATEGORIA ("assunto") — só as ativas */}
                    <div id={ID_CAMPO.categoriaId}>
                        {categorias.length === 0 ? (
                            <p role="alert" className={`${COR_ERRO} ff-default text-[16px]`}>
                                Ainda não há assuntos cadastrados. Peça ao administrador para cadastrar.
                            </p>
                        ) : <>
                            <AppSelect label="Assunto (obrigatório):" name="categoriaId" value={values.categoriaId} onChange={handleChange} error={errors.categoriaId} mostrarErro={submitCount > 0}>
                                <option value="">Escolha o assunto...</option>
                                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </AppSelect>
                            <p className="ff-default text-[16px] text-gray-700 ml-3">Sobre o que é este relatório?</p>
                        </>}
                    </div>

                    {/* Aviso ANTES do texto: quem escreve muito já sabe que não dá para alterar */}
                    <p id="aviso-imutavel" className="ff-default text-[16px]">
                        <strong>Depois de enviado, o relatório não pode ser alterado.</strong> Para corrigir
                        alguma coisa, escreva um novo relatório.
                    </p>

                    {/* TEXTO */}
                    <div className="flex flex-col gap-1">
                        <label htmlFor={ID_CAMPO.texto} className="ff-default text-[16px] font-bold">Texto do relatório (obrigatório):</label>
                        <textarea id={ID_CAMPO.texto} name="texto" value={values.texto} onChange={handleChange}
                            rows={8} maxLength={MAX_TEXTO_RELATORIO} aria-describedby="dica-microfone contador-texto aviso-imutavel"
                            className="w-full rounded-xl border-2 border-gray-600 bg-[#f5f5f5] p-3 ff-default text-[16px] leading-relaxed focus:border-(--primary-color) focus:outline-none" />
                        {/* Ditado pelo teclado do celular: ajuda quem tem dificuldade para escrever */}
                        <p id="dica-microfone" className="ff-default text-[16px] text-gray-700">
                            <i className="ion-mic-a mr-1" aria-hidden="true" />Dica: no celular, toque no microfone do teclado para falar em vez de digitar.
                        </p>
                        {/* Lido uma vez ao focar (aria-describedby), não a cada letra */}
                        <p id="contador-texto" className="ff-default text-[16px] text-gray-700 text-right">
                            {values.texto.length} de {MAX_TEXTO_RELATORIO} caracteres
                        </p>
                    </div>

                    <ResumoErros erros={errors} tentativas={submitCount} />
                    {error && <p ref={erroEnvioRef} tabIndex={-1} role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center`}>Erro: {error}</p>}

                    <AppButton title={isSubmitting ? 'Enviando...' : 'Enviar relatório'} icon="paper-airplane" submit disabled={isSubmitting || categorias.length === 0} form="round" />
                    <Link href={`/admin/pastas/${pastaId}`} className={CLASSE_LINK_VOLTAR}>Voltar sem enviar</Link>
                </form>
            )}
        </Formik>
    );
}
