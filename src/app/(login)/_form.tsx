"use client";
import { AppButton, AppInput, AppModal } from "@/themes/components";
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
    const onSubmitLogin = async ({email, password}: any) => {

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
                {({handleChange, handleSubmit, isSubmitting, isValid, errors}) => (
                    <form onSubmit={handleSubmit}>
                        <div className="w-[336px] flex flex-col">

                            <h1 className="ff-default text-[37px] text-center">Entrar</h1>
                            {/* Sempre montado: o leitor de tela anuncia quando o texto aparece */}
                            <p role="status" className="ff-default text-[16px] text-center mb-2 empty:hidden">
                                {convite && 'Entre para aceitar o convite.'}
                            </p>
                            <AppInput placeholder="EMAIL" name="email" onChange={handleChange} icon="ios-email" error={errors.email} />
                            <AppInput placeholder="SENHA" name="password" type="password" onChange={handleChange} icon="locked" openPassword  error={errors.password}/>
                            
                            <p className="cursor-pointer text-[11px] ff-default text-[#4703D0]" onClick={() => setShowResetPasswordModal(true)}>Esqueci minha senha</p>

                            {errorLogin && <p className="text-[tomato] ff-default text-[20px] text-center mt-3">{errorLogin}</p>}


                            <AppButton title="Entrar" onClick={handleSubmit} disabled={isSubmitting || !isValid} form="round" />

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

                    <Image className="self-center my-10" src="/assets/img/icons/reset-password.png" alt="ícone resetar senha" width={120} height={120} />

                    <p className="text-center ff-default text-[16px]">Digite seu E-mail e clique em "Enviar" para receber um email para redefinir sua senha.</p>

                    <AppInput placeholder="Digite seu email" icon="android-mail" value={email} onChange={(e) => setEmail(e.target.value)}/>

                    {messageResetPassword?.success == false && <p className="text-[tomato] ff-default text-[20px] text-center mt-3">{messageResetPassword.message}</p>}
                    {messageResetPassword?.success == true && <p className="text-[green] ff-default text-[20px] text-center mt-3">{messageResetPassword.message}</p>}

                    <div className="flex justify-between">
                        <button className="bg-white border border-[red] text-[red] rounded-full w-[170px] py-2 mt-5 cursor-pointer" onClick={closeModal}>Cancelar</button>
                        <button className="bg-(--primary-color) text-white rounded-full w-[170px] py-2 mt-5  cursor-pointer" onClick={onSubmitResetPassword}>Enviar</button>
                    </div>
                </div>
            </AppModal>}
        </>
    )
}