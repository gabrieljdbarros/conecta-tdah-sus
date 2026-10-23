import Cookies from "js-cookie";
import { supabase } from "@/services/supabase";
import { COLUNAS_PERFIL, mensagemErroAuth, paraAppUser } from "@/helpers/linhas";
import { AppUser, DadosPerfil, UserRole } from "@/types/user";

/**
 * SERVICES DE GERENCIAMENTO DE USUÁRIOS (Supabase Auth + tabela `perfis`)
 * A senha fica só no Supabase Auth (decisão travada 3)
 */
const UserServices = {
    /**
     * Autenticação de usuário
     */
    login: async (
        email: string,
        password: string
    ): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        // Sem erro, o AuthContext assume (carrega o perfil e seta o cookie)
        return error ? { success: false, message: mensagemErroAuth(error) } : { success: true };
    },

    /**
     * Cadastro multiperfil: cria a conta no Supabase Auth e a linha em
     * `perfis`, já com o `role` e os campos do perfil em `dados_perfil`.
     * As políticas do banco recusam role admin e e-mail diferente do login
     */
    cadastrar: async (dados: {
        nome: string;
        email: string;
        password: string;
        role: UserRole;
        dadosPerfil: DadosPerfil;
    }): Promise<{ success: boolean; message?: string }> => {
        const { data, error } = await supabase.auth.signUp({ email: dados.email, password: dados.password });
        if (error) return { success: false, message: mensagemErroAuth(error) };
        // Com a confirmação de e-mail ligada (projeto real), não há sessão
        // até a pessoa confirmar
        if (!data.user || !data.session)
            return { success: false, message: "Confirme o seu e-mail pelo link que enviamos e depois entre." };

        const { error: erroPerfil } = await supabase.from("perfis").insert({
            id: data.user.id,
            nome: dados.nome,
            email: dados.email,
            role: dados.role,
            dados_perfil: dados.dadosPerfil,
        });
        // TODO: se isto falhar, a conta fica no Auth sem perfil, e tentar de
        // novo com o mesmo e-mail dá "Já existe uma conta". Tratar no retry
        if (erroPerfil) return { success: false, message: "Não foi possível concluir o cadastro. Tente novamente" };
        return { success: true };
    },

    /**
     * Lista todos os usuários cadastrados (uso do painel admin; o RLS só
     * devolve todos para o admin). Sem paginação por ora — volume esperado
     * é baixo neste estágio do TCC.
     */
    getAll: async (): Promise<{ success: boolean; users: AppUser[] }> => {
        const { data, error } = await supabase.from("perfis").select(COLUNAS_PERFIL).order("nome");
        if (error) return { success: false, users: [] };
        return { success: true, users: data.map(paraAppUser) };
    },

    /**
     * Perfil completo (`role` + `dados_perfil`) de um usuário
     */
    getById: async (uid: string): Promise<{ success: boolean; user?: AppUser }> => {
        const { data, error } = await supabase.from("perfis").select(COLUNAS_PERFIL).eq("id", uid).maybeSingle();
        if (error || !data) return { success: false };
        return { success: true, user: paraAppUser(data) };
    },

    /**
     * Edição do perfil: envia SOMENTE `nome` e `dados_perfil`. O banco só
     * libera essas duas colunas (ninguém altera role, e-mail ou data)
     */
    atualizarPerfil: async (
        uid: string,
        dados: { nome: string; dadosPerfil: DadosPerfil }
    ): Promise<{ success: boolean; message?: string }> => {
        const { data, error } = await supabase.from("perfis")
            .update({ nome: dados.nome, dados_perfil: dados.dadosPerfil })
            .eq("id", uid)
            .select("id");
        // Sem linha alterada = sem permissão (o RLS não dá erro, só não acha)
        if (error || !data?.length)
            return { success: false, message: "Não foi possível salvar as alterações. Tente novamente" };
        return { success: true };
    },

    /**
     * Envia o e-mail para criar uma senha nova. O link leva para a página
     * /nova-senha deste site
     */
    resetPassword: async (email: string): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/nova-senha`,
        });
        return error ? { success: false, message: mensagemErroAuth(error) } : { success: true };
    },

    /**
     * Grava a senha nova (na página aberta pelo link do e-mail)
     */
    definirNovaSenha: async (senha: string): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) return { success: false, message: mensagemErroAuth(error) };
        // Senha nova: as sessões abertas em outros aparelhos são encerradas
        await supabase.auth.signOut({ scope: 'others' });
        return { success: true };
    },

    /**
     * Encerra a sessão do usuário
     */
    logout: async (): Promise<{ success: boolean }> => {
        await supabase.auth.signOut();
        Cookies.remove("session");
        return { success: true };
    },
};

export default UserServices;
