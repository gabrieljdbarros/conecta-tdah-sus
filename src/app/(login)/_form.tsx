"use client";
import { AppButton, AppInput, AppModal, AppOuvir } from "@/themes/components";
import { Formik } from "formik";
import Image from "next/image";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import UserServices from "@/services/user";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { conviteDaUrl, destinoAposEntrar } from "@/helpers/router";

export default function LoginForm() {
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
    // carregado do Firestore + cookie setado) — evita o middleware barrar
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
            setMessageResetPassword({success: true, message: 'Olhe a sua caixa de email para reseta a senha'});
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
                    <form onSubmit={handleSubmit}>
                        <div className="w-full max-w-[336px] flex flex-col">

                            <h1 className="ff-default text-[37px] text-center">Entrar</h1>
                            <AppOuvir rotulo="Ouvir instruções" className="self-center mb-2"
                                texto="Para entrar, escreva o seu e-mail e a sua senha e toque em Entrar. Se ainda não tem conta, toque em Cadastre-se." />
                            {/* Sempre montado: o leitor de tela anuncia quando o texto aparece */}
                            <p role="status" className="ff-default text-[16px] text-center mb-2 empty:hidden">
                                {convite && 'Entre para aceitar o convite.'}
                            </p>
                            <AppInput label="E-mail:" placeholder="Digite seu e-mail" name="email" onChange={handleChange} icon="ios-email" autoComplete="email" error={errors.email} mostrarErro={submitCount > 0} />
                            <AppInput label="Senha:" placeholder="Digite sua senha" name="password" type="password" onChange={handleChange} icon="locked" openPassword autoComplete="current-password" error={errors.password} mostrarErro={submitCount > 0} />
                            
                            <button type="button" className="self-start min-h-[48px] cursor-pointer text-[16px] ff-default text-[#4703D0] underline" onClick={() => setShowResetPasswordModal(true)}>Esqueci minha senha</button>

                            {errorLogin && <p role="alert" className="text-[#B91C1C] ff-default text-[16px] text-center mt-3">Erro: {errorLogin}</p>}


                            {/* Botão de envio de verdade: o Enter no campo também entra */}
                            <AppButton title={isSubmitting ? "Entrando..." : "Entrar"} submit disabled={isSubmitting} form="round" className="mt-2" />

                            <Link href={convite ? `/cadastro?convite=${convite}` : "/cadastro"} className="min-h-[48px] flex items-center justify-center">
                                <p className="ff-default text-center text-[16px] text-[#4703D0] cursor-pointer"> Não tem conta? Cadastre-se</p>
                            </Link>
                        </div>
                    </form>
                )}
            </Formik>

            {/* MODAL - RESETAR SENHA */}
            {showResetPasswordModal && <AppModal title="Esqueci a senha" onClose={() => closeModal()}>
                <div className="flex-col flex items-stretch">

                    <Image className="self-center my-4" src="/assets/img/icons/reset-password.png" alt="" width={120} height={120} />

                    <p className="text-center ff-default text-[16px]">Digite seu e-mail e toque em &quot;Enviar&quot; para receber um e-mail para criar uma nova senha.</p>

                    <AppInput label="E-mail:" placeholder="Digite seu e-mail" icon="android-mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/>

                    {messageResetPassword?.success == false && <p role="alert" className="text-[#B91C1C] ff-default text-[16px] text-center mt-3">Erro: {messageResetPassword.message}</p>}
                    {messageResetPassword?.success == true && <p role="status" className="text-[#166534] ff-default text-[16px] text-center mt-3">Pronto: {messageResetPassword.message}</p>}

                    <div className="flex flex-wrap justify-between gap-3">
                        <button type="button" className="bg-white border-2 border-[#B91C1C] text-[#B91C1C] rounded-full flex-1 min-w-[140px] min-h-[48px] mt-5 cursor-pointer" onClick={closeModal}>Cancelar</button>
                        <button type="button" className="bg-(--primary-color) text-white rounded-full flex-1 min-w-[140px] min-h-[48px] mt-5 cursor-pointer" onClick={onSubmitResetPassword}>Enviar</button>
                    </div>
                </div>
            </AppModal>}
        </>
    )
}