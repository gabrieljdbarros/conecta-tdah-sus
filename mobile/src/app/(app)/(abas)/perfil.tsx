import { useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { anunciar, Aviso, Botao, Campo, Tela, Titulo } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { estilos } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import UsuarioServicos from "~/servicos/usuario";
import { DadosPerfil, ROLE_LABELS } from "@/types/user";

const MAX = 100;
const MSG_MAX = `Use no máximo ${MAX} caracteres`;
const texto = (obrigatorio: boolean) => obrigatorio
    ? Yup.string().trim().max(MAX, MSG_MAX).required('Campo obrigatório')
    : Yup.string().trim().max(MAX, MSG_MAX);

/**
 * Meu perfil: editar nome e os campos do perfil. O perfil (mãe, escola,
 * médico) e o e-mail NÃO mudam (as regras recusam), como na web
 */
export default function Perfil() {
    const { user, sair, recarregarUsuario } = useAuth();
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
    const refs = useRef<Record<string, TextInput | null>>({});
    const registrar = (campo: string) => (el: TextInput | null) => { refs.current[campo] = el; };
    if (!user) return null;

    // Janela de confirmação do próprio sistema: o TalkBack lê a pergunta e os
    // dois botões e leva o foco até ela (no app nativo funciona bem; a web usa
    // confirmação na tela porque o navegador do WhatsApp bloqueia janelas)
    const confirmarSaida = () => Alert.alert(
        'Sair do aplicativo?',
        'Para entrar de novo, será preciso o e-mail e a senha.',
        [{ text: 'Não, continuar', style: 'cancel' }, { text: 'Sim, sair', style: 'destructive', onPress: sair }],
    );

    const dp = user.dadosPerfil;
    const iniciais = {
        nome: user.nome ?? '',
        grauParentesco: dp.grauParentesco ?? '',
        nomeEscola: dp.nomeEscola ?? '', cargo: dp.cargo ?? '', disciplina: dp.disciplina ?? '',
        crm: dp.crm ?? '', especialidade: dp.especialidade ?? '', unidadeSUS: dp.unidadeSUS ?? '',
    };
    const papel = user.role;
    const esquema = Yup.object({
        nome: texto(true),
        grauParentesco: texto(papel === 'mae'),
        nomeEscola: texto(papel === 'escola'), cargo: texto(papel === 'escola'), disciplina: texto(false),
        crm: texto(papel === 'medico'), especialidade: texto(papel === 'medico'), unidadeSUS: texto(papel === 'medico'),
    });

    return (
        <Tela emAba>
            <View style={[estilos.cartao, { gap: 8 }]}>
                <View accessible accessibilityLabel={`E-mail: ${user.email}. Não pode ser alterado.`}>
                    <Text style={estilos.suave}>E-mail (não pode ser alterado)</Text>
                    <Text style={estilos.texto}>{user.email}</Text>
                </View>
                <View accessible accessibilityLabel={`Perfil: ${ROLE_LABELS[user.role]}. Não pode ser alterado.`}>
                    <Text style={estilos.suave}>Perfil (não pode ser alterado)</Text>
                    <Text style={estilos.texto}>{ROLE_LABELS[user.role]}</Text>
                </View>
            </View>

            <Formik initialValues={iniciais} validationSchema={esquema} enableReinitialize
                onSubmit={async (v) => {
                    setAviso(null);
                    let dadosPerfil: DadosPerfil = {};
                    if (papel === 'mae') dadosPerfil = { grauParentesco: v.grauParentesco.trim() };
                    if (papel === 'escola') dadosPerfil = {
                        nomeEscola: v.nomeEscola.trim(), cargo: v.cargo.trim(),
                        ...(v.disciplina.trim() && { disciplina: v.disciplina.trim() }),
                    };
                    if (papel === 'medico') dadosPerfil = { crm: v.crm.trim(), especialidade: v.especialidade.trim(), unidadeSUS: v.unidadeSUS.trim() };
                    const { success } = await UsuarioServicos.atualizarPerfil(user.uid, { nome: v.nome.trim(), dadosPerfil });
                    if (success) await recarregarUsuario();
                    setAviso(success ? { ok: true, texto: 'Perfil salvo.' } : { ok: false, texto: 'não foi possível salvar. Tente de novo.' });
                }}>
                {({ handleChange, handleSubmit, validateForm, values, errors, submitCount, isSubmitting }) => {
                    const e = (c: keyof typeof iniciais) => (submitCount > 0 ? errors[c] : undefined);
                    // Com erro: diz quantos e leva o foco ao primeiro (o erro é lido junto do nome do campo)
                    const ordem = ['nome', 'grauParentesco', 'nomeEscola', 'cargo', 'disciplina', 'crm', 'especialidade', 'unidadeSUS'] as const;
                    const salvar = async () => {
                        const erros = await validateForm();
                        handleSubmit();
                        const lista = ordem.filter((c) => erros[c]);
                        if (lista.length === 0) return;
                        anunciar(lista.length === 1 ? 'Há 1 campo para corrigir.' : `Há ${lista.length} campos para corrigir.`);
                        refs.current[lista[0]]?.focus();
                    };
                    // Mexeu num campo: o "Perfil salvo" antigo some (não engana que já salvou)
                    const mudar = (campo: keyof typeof iniciais) => (t: string) => { setAviso(null); handleChange(campo)(t); };
                    return (
                        <View style={{ gap: 12 }}>
                            <Titulo nivel={2}>Seus dados</Titulo>
                            <BotaoOuvir rotulo="Ouvir instruções" texto="Aqui você muda o seu nome e os seus dados. Depois toque em Salvar alterações. Para sair, toque em Sair do aplicativo, lá embaixo." />
                            <Campo ref={registrar('nome')} rotulo="Nome" value={values.nome} onChangeText={mudar('nome')} autoComplete="name" erro={e('nome')} />
                            {papel === 'mae' && (
                                <Campo ref={registrar('grauParentesco')} rotulo="Grau de parentesco" value={values.grauParentesco} onChangeText={mudar('grauParentesco')} erro={e('grauParentesco')} />
                            )}
                            {papel === 'escola' && <>
                                <Campo ref={registrar('nomeEscola')} rotulo="Nome da escola" value={values.nomeEscola} onChangeText={mudar('nomeEscola')} erro={e('nomeEscola')} />
                                <Campo ref={registrar('cargo')} rotulo="Cargo" value={values.cargo} onChangeText={mudar('cargo')} erro={e('cargo')} />
                                <Campo ref={registrar('disciplina')} rotulo="Disciplina (se for professor)" value={values.disciplina} onChangeText={mudar('disciplina')} erro={e('disciplina')} />
                            </>}
                            {papel === 'medico' && <>
                                <Campo ref={registrar('crm')} rotulo="CRM (registro do médico)" value={values.crm} onChangeText={mudar('crm')} erro={e('crm')} />
                                <Campo ref={registrar('especialidade')} rotulo="Especialidade" value={values.especialidade} onChangeText={mudar('especialidade')} erro={e('especialidade')} />
                                <Campo ref={registrar('unidadeSUS')} rotulo="Unidade SUS (posto ou hospital)" value={values.unidadeSUS} onChangeText={mudar('unidadeSUS')} erro={e('unidadeSUS')} />
                            </>}
                            {aviso && <Aviso tipo={aviso.ok ? 'sucesso' : 'erro'} texto={aviso.texto} />}
                            <Botao titulo={isSubmitting ? 'Salvando...' : 'Salvar alterações'} aoTocar={salvar} carregando={isSubmitting} />
                        </View>
                    );
                }}
            </Formik>

            {/* Sair (celular compartilhado: sair é importante), com confirmação */}
            <View style={{ marginTop: 24 }}>
                <Botao titulo="Sair do aplicativo" tipo="contorno" icone="log-out-outline" aoTocar={confirmarSaida} />
            </View>
        </Tela>
    );
}
