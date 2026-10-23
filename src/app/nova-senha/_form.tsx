"use client";
import { AppButton, AppInput, AppLoader, AppLogo, AppOuvir } from "@/themes/components";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Yup from 'yup';
import UserServices from "@/services/user";
import { supabase } from "@/services/supabase";

const COR_ERRO = 'text-[#B91C1C]';
const CLASSE_LINK = "self-center mt-4 min-h-[48px] px-6 flex items-center rounded-full border-2 border-(--cor-link) text-(--cor-link) ff-default text-[16px]";
const CLASSE_TITULO = "ff-default text-[32px] leading-tight font-extrabold text-(--cor-destaque) outline-none";

// O link do e-mail chega com "type=recovery" no endereço. É lido assim que
// a página carrega, antes de o Supabase limpar a barra de endereço.
// Só esse link libera a troca: uma sessão comum esquecida aberta (num
// computador da escola, por exemplo) não permite trocar a senha aqui
const VEIO_DO_LINK = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash);

/**
 * Criar nova senha: página aberta pelo link do e-mail de "Esqueci minha
 * senha". O link já entra na conta (só para trocar a senha); sem ele, a
 * página explica como pedir outro
 */
export default function NovaSenhaForm() {
    const router = useRouter();
    // undefined = conferindo o link; false = link inválido ou vencido
    const [temSessao, setTemSessao] = useState<boolean | undefined>(undefined);
    const [erro, setErro] = useState<string | null>(null);
    // A tela troca sem mudar de endereço: o foco vai para o título novo,
    // para o leitor de tela anunciar e o Tab seguir daqui
    const tituloRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        // O Supabase lê o link da barra de endereço e avisa quando entra
        const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
            if (sessao && (VEIO_DO_LINK || evento === 'PASSWORD_RECOVERY')) setTemSessao(true);
            else if (evento === 'INITIAL_SESSION') setTemSessao(false);
        });
        return () => data.subscription.unsubscribe();
    }, []);

    useEffect(() => { if (temSessao !== undefined) tituloRef.current?.focus(); }, [temSessao]);

    return (
        <div className="w-full max-w-[400px] flex flex-col">
            {/* Sempre montado: o leitor de tela anuncia cada mudança */}
            <p role="status" className="sr-only">
                {temSessao === undefined ? 'Conferindo o link...' : temSessao ? 'Pode criar a senha nova.' : 'Link vencido.'}
            </p>

            {temSessao === undefined && (
                <div className="flex flex-col items-center gap-3">
                    <AppLoader size={50} className="self-center" />
                    <p className="ff-default text-[16px]">Conferindo o link...</p>
                </div>
            )}

            {temSessao === false && (
                <>
                    <h1 ref={tituloRef} tabIndex={-1} className={CLASSE_TITULO}>Link vencido</h1>
                    <p className="ff-default text-[18px] text-(--cor-texto) mt-2 mb-3">
                        Este link não vale mais. Vá para a tela de entrar, toque em &quot;Esqueci minha senha&quot; e peça um novo.
                    </p>
                    <AppOuvir rotulo="Ouvir instruções" className="self-start"
                        texto="Este link não vale mais. Vá para a tela de entrar, toque em Esqueci minha senha e peça um novo." />
                    <Link href="/" className={CLASSE_LINK}>Ir para a tela de entrar</Link>
                </>
            )}

            {temSessao && (
                <Formik
                    initialValues={{ senha: '', confirmacao: '' }}
                    validationSchema={Yup.object({
                        senha: Yup.string().required('Campo obrigatório').min(6, 'Use pelo menos 6 caracteres'),
                        confirmacao: Yup.string().required('Campo obrigatório').oneOf([Yup.ref('senha')], 'As senhas não são iguais'),
                    })}
                    onSubmit={async ({ senha }) => {
                        setErro(null);
                        const { success, message } = await UserServices.definirNovaSenha(senha);
                        if (success) router.push('/admin/dashboard');
                        else setErro(message ?? 'Não foi possível salvar a senha');
                    }}
                >
                    {({ handleChange, handleSubmit, isSubmitting, errors, submitCount }) => (
                        <form onSubmit={handleSubmit} className="flex flex-col">
                            <AppLogo className="mb-10 lg:hidden" largura={260} prioridade />
                            <h1 ref={tituloRef} tabIndex={-1} className={CLASSE_TITULO}>Criar nova senha</h1>
                            <p className="ff-default text-[18px] leading-relaxed text-(--cor-texto) mt-2 mb-3">Escolha uma senha nova para a sua conta.</p>
                            <AppOuvir rotulo="Ouvir instruções" className="self-start mb-3"
                                texto="Escreva a senha nova duas vezes, igual nas duas, e toque em Salvar senha." />
                            <AppInput label="Senha nova" placeholder="Pelo menos 6 caracteres" name="senha" type="password" openPassword autoComplete="new-password" onChange={handleChange} error={errors.senha} mostrarErro={submitCount > 0} className="mb-2" />
                            <AppInput label="Repita a senha nova" placeholder="Igual à de cima" name="confirmacao" type="password" openPassword autoComplete="new-password" onChange={handleChange} error={errors.confirmacao} mostrarErro={submitCount > 0} />
                            {submitCount > 0 && Object.keys(errors).length > 0 && (
                                <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>Erro: corrija os campos marcados em vermelho acima.</p>
                            )}
                            {erro && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] text-center mt-3`}>Erro: {erro}</p>}
                            <AppButton title={isSubmitting ? 'Salvando...' : 'Salvar senha'} submit disabled={isSubmitting} form="round" className="mt-4" />
                        </form>
                    )}
                </Formik>
            )}
        </div>
    );
}
