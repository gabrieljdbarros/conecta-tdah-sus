import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import { Aviso, Botao, Campo, Janela, LinkTexto, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { Ilustracao } from "~/componentes/ilustracoes";
import { BotaoOuvir } from "~/componentes/ouvir";
import { useAuth } from "~/contexto/AuthContext";
import UsuarioServicos from "~/servicos/usuario";
import { cores } from "~/tema/cores";

const esquema = Yup.object({
    email: Yup.string().required('Escreva o seu e-mail').email('E-mail inválido'),
    // Sem mínimo aqui: quem criou a conta quando o mínimo era 6 continua entrando
    senha: Yup.string().required('Escreva a sua senha'),
});

/**
 * Login (design da Daya, "Bem-vindo de volta!"). "Esqueci minha senha" abre
 * uma janela: pede o e-mail e depois mostra "Confira seu e-mail". A nova
 * senha é criada no site (o link do e-mail abre o navegador)
 */
export default function Entrar() {
    const { user, ehAdminNoApp } = useAuth();
    const [erro, setErro] = useState<string | null>(null);
    const [janelaSenha, setJanelaSenha] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [reenviado, setReenviado] = useState(false);
    const [erroSenha, setErroSenha] = useState<string | null>(null);
    const [emailSenha, setEmailSenha] = useState('');
    const refEmail = useRef<TextInput>(null);
    const refSenha = useRef<TextInput>(null);

    // Já logado (o AuthContext carregou o perfil): vai para o Início
    if (user) return <Redirect href="/inicio" />;

    // Admin entrou: o AuthContext já encerrou a sessão; aqui só explica o porquê
    const mensagem = erro ?? (ehAdminNoApp ? 'O administrador usa o painel no computador. Entre pelo site.' : null);

    // A mensagem é a mesma exista ou não a conta: não revela quem tem cadastro.
    // Ao enviar, a janela troca de título e já anuncia; no reenvio, avisa aqui
    const redefinir = async () => {
        setErroSenha(null);
        setReenviado(false);
        if (!Yup.string().email().isValidSync(emailSenha.trim())) {
            setErroSenha('E-mail inválido. Confira o que você escreveu.');
            return;
        }
        setEnviando(true);
        const { success, message } = await UsuarioServicos.redefinirSenha(emailSenha);
        setEnviando(false);
        if (!success) setErroSenha(message ?? 'Não foi possível enviar o e-mail.');
        else if (enviado) setReenviado(true);
        else setEnviado(true);
    };

    const abrirJanela = () => { setEnviado(false); setReenviado(false); setErroSenha(null); setJanelaSenha(true); };

    return (
        <Tela centralizar branco>
            {/* Decorativo: o título logo abaixo diz onde a pessoa está */}
            <Ilustracao nome="girassol" altura={110} style={{ alignSelf: 'center', marginBottom: 8 }} />

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
                            <Titulo destaque>Bem-vindo de volta!</Titulo>
                            <Paragrafo>Entre na sua conta para continuar conectado.</Paragrafo>
                            <BotaoOuvir rotulo="Ouvir instruções" texto="Para entrar, escreva o seu e-mail e a sua senha e toque em Entrar. Se esqueceu a senha, toque em Esqueci minha senha. Se ainda não tem conta, toque em Não tem conta? Cadastre-se." />
                            <Campo ref={refEmail} rotulo="E-mail" value={values.email} onChangeText={handleChange('email')}
                                keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
                                placeholder="Digite seu e-mail" erro={submitCount > 0 ? errors.email : undefined} />
                            <Campo ref={refSenha} rotulo="Senha" senha value={values.senha} onChangeText={handleChange('senha')}
                                autoComplete="current-password" textContentType="password"
                                placeholder="Digite sua senha" erro={submitCount > 0 ? errors.senha : undefined} />
                            <LinkTexto titulo="Esqueci minha senha" aoTocar={abrirJanela} />
                            {mensagem && <Aviso tipo="erro" texto={mensagem} />}
                            <Botao titulo={isSubmitting ? 'Entrando...' : 'Entrar'} aoTocar={enviar} carregando={isSubmitting} />
                            <LinkTexto titulo="Não tem conta? Cadastre-se" aoTocar={() => router.push('/cadastro')} />
                        </View>
                    );
                }}
            </Formik>

            <Janela visivel={janelaSenha} aoFechar={() => setJanelaSenha(false)}
                icone={enviado ? 'mail-outline' : 'lock-closed-outline'}
                titulo={enviado ? 'Confira seu e-mail' : 'Esqueceu sua senha?'}
                descricao={enviado
                    ? 'Se houver uma conta com este e-mail, você vai receber um link para criar uma nova senha:'
                    : 'Escreva o e-mail cadastrado para receber um link de recuperação.'}>
                {/* Depois de enviar, o e-mail fica em destaque: ajuda a notar um erro de digitação */}
                {enviado
                    ? <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto }}>{emailSenha.trim()}</Text>
                    : <Campo rotulo="E-mail" value={emailSenha} onChangeText={setEmailSenha} keyboardType="email-address"
                        autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="Digite seu e-mail" />}
                {erroSenha && <Aviso tipo="erro" texto={erroSenha} />}
                {reenviado && <Aviso tipo="sucesso" texto="link enviado de novo." />}
                {enviado && <LinkTexto titulo="Errei o e-mail: escrever de novo" aoTocar={() => { setEnviado(false); setReenviado(false); }} />}
                {enviado
                    ? <Botao titulo={enviando ? 'Enviando...' : 'Reenviar link'} tipo="contorno" icone="refresh" aoTocar={redefinir} carregando={enviando} />
                    : <Botao titulo={enviando ? 'Enviando...' : 'Enviar link'} aoTocar={redefinir} carregando={enviando} desabilitado={!emailSenha.trim()} />}
            </Janela>
        </Tela>
    );
}
