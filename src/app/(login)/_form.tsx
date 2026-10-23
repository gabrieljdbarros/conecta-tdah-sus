"use client";
import { AppButton, AppInput, AppLogo, AppModal, AppOuvir } from "@/themes/components";
import { Formik } from "formik";
import { useEffect, useRef, useState } from "react";
import * as Yup from 'yup';
import UserServices from "@/services/user";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { conviteDaUrl, destinoAposEntrar } from "@/helpers/router";

/** `focarTitulo`: veio da introdução (a tela trocou sem mudar de endereço) */
export default function LoginForm({ focarTitulo = false }: { focarTitulo?: boolean }) {
    // Leva o foco ao título para o leitor de tela anunciar a tela nova e o
    // Tab seguir daqui (o botão clicado na introdução deixou de existir)
    const tituloRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => { if (focarTitulo) tituloRef.current?.focus(); }, [focarTitulo]);

    const [ showResetPasswordModal, setShowResetPasswordModal ] = useState(false);
    const [ email, setEmail ] = useState('');
    const [ errorLogin, setErrorLogin ] = useState<string|null>(null);
    const [ messageResetPassword, setMessageResetPassword ] = useState<{success: boolean, message: string}|null>(null);
    const [ aguardandoSessao, setAguardandoSessao ] = useState(false);
    const router = useRouter();
    const { user } = useAuth();
    // Convite aberto antes de entrar (RN01): lido depois de montar a tela
    const [ convite, setConvite ] = useState<string|null>(null);
    useEffect(() => setConvite(conviteDaUrl()), []);

    // Só redireciona depois que o AuthContext confirmar a sessão (perfil
    // carregado do banco + cookie setado) — evita o middleware barrar
    // a navegação por falta do cookie ainda não gravado.
    // Se veio de um link de convite, volta para ele
    useEffect(() => {
        if (aguardandoSessao && user)
            router.push(destinoAposEntrar());
    }, [aguardandoSessao, user, router]);
    // ======================================================
    const onSubmitLogin = async ({email, password}: {email: string, password: string}) => {

        setErrorLogin(null);
        const { success, message } = await UserServices.login(email, password);
        if (success)
            setAguardandoSessao(true);
        else
            setErrorLogin(message ?? 'Login ou senha incorreta');
    }
    // -------
    const onSubmitResetPassword = async () => {

        setErrorLogin(null);
        setEmail('');
        const { success, message } = await UserServices.resetPassword(email);
        if (success)
            setMessageResetPassword({success: true, message: 'Olhe a sua caixa de e-mail para criar uma nova senha.'});
        else
            setMessageResetPassword({success: false, message: message ?? 'Não foi possível resetar a senha'});
    }
    // --------
    const closeModal = () => {
        setEmail('');
        setMessageResetPassword(null); // não reaparece a mensagem antiga ao reabrir
        setShowResetPasswordModal(false);
    }
    // ======================================================
    return (
        <>
            <Formik
                initialValues={{email: '', password: ''}}
                validationSchema={Yup.object({
                    email: Yup.string().required('Campo obrigatório').email('Campo precisa ser um email'),
                    password: Yup.string().required('Campo obrigatório').min(6, 'Campo precisa ter pelo menos 6 caracteres')
                })}
                onSubmit={onSubmitLogin}
                >
                {({handleChange, handleSubmit, isSubmitting, errors, submitCount}) => (
                    <form onSubmit={handleSubmit} className="w-full max-w-[400px]">
                        <div className="w-full flex flex-col">

                            {/* No computador, o logo já está na metade esquerda */}
                            <AppLogo className="mb-10 lg:hidden" largura={260} prioridade />
                            {/* Título laranja: só em tamanho grande, negrito e sobre branco (texto grande, 3,1:1) */}
                            <h1 ref={tituloRef} tabIndex={-1} className="ff-default text-[32px] leading-tight font-extrabold text-(--cor-destaque) outline-none">Bem-vindo de volta</h1>
                            <p className="ff-default text-[18px] leading-relaxed text-(--cor-texto) mt-2 mb-3">
                                Acesse sua conta para acompanhar as informações e a comunicação relacionadas ao estudante.
                            </p>
                            <AppOuvir rotulo="Ouvir instruções" className="self-start mb-3"
                                texto="Para entrar, escreva o seu e-mail e a sua senha e toque em Entrar. Se ainda não tem conta, toque em Cadastre-se aqui." />
                            {/* Sempre montado: o leitor de tela anuncia quando o texto aparece */}
                            <p role="status" className="ff-default text-[16px] text-center mb-2 empty:hidden">
                                {convite && 'Entre para aceitar o convite.'}
                            </p>
                            <AppInput label="E-mail" placeholder="Digite seu e-mail" name="email" type="email" onChange={handleChange} autoComplete="email" error={errors.email} mostrarErro={submitCount > 0} className="mb-2" />
                            <AppInput label="Senha" placeholder="Digite sua senha" name="password" type="password" onChange={handleChange} openPassword autoComplete="current-password" error={errors.password} mostrarErro={submitCount > 0} />

                            <button type="button" className="self-start min-h-[48px] flex items-center gap-2 cursor-pointer text-[16px] ff-default text-(--cor-link) underline" onClick={() => setShowResetPasswordModal(true)}>
                                <i className="ion-help-circled" aria-hidden="true" />Esqueci minha senha
                            </button>

                            {errorLogin && <p role="alert" className="text-[#B91C1C] ff-default text-[16px] text-center mt-3">Erro: {errorLogin}</p>}


                            {/* Botão de envio de verdade: o Enter no campo também entra */}
                            <AppButton title={isSubmitting ? "Entrando..." : "Entrar"} submit disabled={isSubmitting} form="round" className="mt-2" />

                            <p className="ff-default text-center text-[18px] text-(--cor-texto) mt-3">
                                Não possui conta?{' '}
                                <Link href={convite ? `/cadastro?convite=${convite}` : "/cadastro"} className="inline-flex items-center min-h-[48px] text-(--cor-link) underline">
                                    Cadastre-se aqui!
                                </Link>
                            </p>
                        </div>
                    </form>
                )}
            </Formik>

            {/* MODAL - RESETAR SENHA */}
            {showResetPasswordModal && <AppModal title="Esqueceu sua senha?" onClose={() => closeModal()}>
                <div className="flex-col flex items-stretch">

                    <p className="ff-default text-[18px] text-(--cor-texto) mb-3">Digite o e-mail cadastrado e enviaremos o link para você criar uma nova senha.</p>

                    <AppInput label="E-mail" placeholder="Digite seu e-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/>

                    {messageResetPassword?.success == false && <p role="alert" className="text-[#B91C1C] ff-default text-[16px] text-center mt-3">Erro: {messageResetPassword.message}</p>}
                    {messageResetPassword?.success == true && <p role="status" className="text-[#166534] ff-default text-[16px] text-center mt-3">Pronto: {messageResetPassword.message}</p>}

                    <AppButton title="Enviar" onClick={onSubmitResetPassword} className="mt-5" />
                    <button type="button" className="self-center min-h-[48px] px-6 mt-2 ff-default text-[18px] text-(--cor-link) underline cursor-pointer" onClick={closeModal}>Cancelar</button>
                </div>
            </AppModal>}
        </>
    )
}