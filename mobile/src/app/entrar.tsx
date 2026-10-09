import { useRef, useState } from "react";
import { Image, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import { anunciar, Aviso, Botao, Campo, LinkTexto, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { useAuth } from "~/contexto/AuthContext";
import UsuarioServicos from "~/servicos/usuario";

const esquema = Yup.object({
    email: Yup.string().required('Escreva o seu e-mail').email('E-mail inválido'),
    senha: Yup.string().required('Escreva a sua senha').min(6, 'A senha tem pelo menos 6 caracteres'),
});

/** Login (design "Bem-vindo de volta"), com "Esqueci minha senha" na própria tela */
export default function Entrar() {
    const { user, ehAdminNoApp } = useAuth();
    const [erro, setErro] = useState<string | null>(null);
    const [modoSenha, setModoSenha] = useState(false);
    const [avisoSenha, setAvisoSenha] = useState<{ ok: boolean; texto: string } | null>(null);
    const [emailSenha, setEmailSenha] = useState('');
    const refEmail = useRef<TextInput>(null);
    const refSenha = useRef<TextInput>(null);

    // Já logado (o AuthContext carregou o perfil): vai para o Início
    if (user) return <Redirect href="/inicio" />;

    // Admin entrou: o AuthContext já encerrou a sessão; aqui só explica o porquê
    const mensagem = erro ?? (ehAdminNoApp ? 'O administrador usa o painel no computador. Entre pelo site.' : null);

    const redefinir = async () => {
        setAvisoSenha(null);
        const { success, message } = await UsuarioServicos.redefinirSenha(emailSenha);
        setAvisoSenha(success
            ? { ok: true, texto: 'Olhe a sua caixa de e-mail para criar uma nova senha.' }
            : { ok: false, texto: message ?? 'Não foi possível enviar o e-mail.' });
    };

    // A tela troca de conteúdo sem mudar de endereço: o leitor de tela é avisado
    const trocarModo = (senha: boolean) => {
        setModoSenha(senha);
        setAvisoSenha(null);
        anunciar(senha ? 'Esqueceu sua senha? Digite o e-mail cadastrado.' : 'Entrar. Digite o e-mail e a senha.');
    };

    return (
        <Tela centralizar branco semCabecalho>
            {/* Decorativo: o título logo abaixo já diz onde a pessoa está */}
            <Image source={require('../../assets/logo.png')} importantForAccessibility="no" accessibilityElementsHidden
                style={{ width: 260, height: 70, alignSelf: 'center', marginBottom: 24 }} resizeMode="contain" />

            {!modoSenha ? (
                <Formik initialValues={{ email: '', senha: '' }} validationSchema={esquema}
                    onSubmit={async ({ email, senha }) => {
                        setErro(null);
                        const { success, message } = await UsuarioServicos.entrar(email, senha);
                        // Deu certo: o AuthContext carrega o perfil e esta tela redireciona sozinha
                        if (!success) setErro(message ?? 'E-mail ou senha incorretos');
                    }}>
                    {({ handleChange, handleSubmit, validateForm, values, errors, submitCount, isSubmitting }) => {
                        // Com erro, leva o foco (e o teclado) ao primeiro campo errado
                        const enviar = async () => {
                            const erros = await validateForm();
                            handleSubmit();
                            if (erros.email) refEmail.current?.focus();
                            else if (erros.senha) refSenha.current?.focus();
                        };
                        return (
                            <View style={{ gap: 12 }}>
                                <Titulo destaque>Bem-vindo de volta</Titulo>
                                <Paragrafo>Acesse sua conta para acompanhar as informações e a comunicação relacionadas ao aluno.</Paragrafo>
                                <Campo ref={refEmail} rotulo="E-mail" value={values.email} onChangeText={handleChange('email')}
                                    keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
                                    placeholder="Digite seu e-mail" erro={submitCount > 0 ? errors.email : undefined} />
                                <Campo ref={refSenha} rotulo="Senha" senha value={values.senha} onChangeText={handleChange('senha')}
                                    autoComplete="current-password" textContentType="password"
                                    placeholder="Digite sua senha" erro={submitCount > 0 ? errors.senha : undefined} />
                                <LinkTexto titulo="Esqueci minha senha" aoTocar={() => trocarModo(true)} />
                                {mensagem && <Aviso tipo="erro" texto={mensagem} />}
                                <Botao titulo={isSubmitting ? 'Entrando...' : 'Entrar'} aoTocar={enviar} carregando={isSubmitting} />
                                <LinkTexto titulo="Não possui conta? Cadastre-se aqui" aoTocar={() => router.push('/cadastro')} />
                            </View>
                        );
                    }}
                </Formik>
            ) : (
                <View style={{ gap: 12 }}>
                    <Titulo destaque>Esqueceu sua senha?</Titulo>
                    <Paragrafo>Digite o e-mail cadastrado e enviaremos o link para você criar uma nova senha.</Paragrafo>
                    <Campo rotulo="E-mail" value={emailSenha} onChangeText={setEmailSenha} keyboardType="email-address"
                        autoCapitalize="none" autoComplete="email" placeholder="Digite seu e-mail" />
                    {avisoSenha && <Aviso tipo={avisoSenha.ok ? 'sucesso' : 'erro'} texto={avisoSenha.texto} />}
                    <Botao titulo="Enviar" aoTocar={redefinir} desabilitado={!emailSenha.trim()} />
                    <LinkTexto titulo="Voltar para entrar" aoTocar={() => trocarModo(false)} />
                </View>
            )}
        </Tela>
    );
}
