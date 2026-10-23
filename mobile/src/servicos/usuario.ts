import { SITE, supabase } from "~/servicos/supabase";
import { COLUNAS_PERFIL, mensagemErroAuth as mensagemErro, paraAppUser } from "@/helpers/linhas";
import { AppUser, DadosPerfil, UserRole } from "@/types/user";

/**
 * SERVIÇOS DE USUÁRIO (app). Mesma lógica de src/services/user.ts da web:
 * cada função devolve { success, ... } e nunca lança erro para a tela.
 * O banco confere o formato do perfil (restrições da tabela e RLS)
 */

/** Lê o próprio perfil em `perfis` (o RLS não deixa ler o de outros) */
export async function buscarPerfil(uid: string): Promise<AppUser | null> {
    const { data, error } = await supabase.from("perfis").select(COLUNAS_PERFIL).eq("id", uid).maybeSingle();
    if (error) throw error;
    return data ? paraAppUser(data) : null;
}

const UsuarioServicos = {
    entrar: async (email: string, senha: string): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        return error ? { success: false, message: mensagemErro(error) } : { success: true };
    },

    /** Cria a conta no Auth e a linha em `perfis` (mesmo formato da web) */
    cadastrar: async (dados: {
        nome: string; email: string; senha: string; role: UserRole; dadosPerfil: DadosPerfil;
    }): Promise<{ success: boolean; message?: string }> => {
        const { data, error } = await supabase.auth.signUp({ email: dados.email.trim(), password: dados.senha });
        if (error) return { success: false, message: mensagemErro(error) };
        // Com a confirmação de e-mail ligada (projeto real), não há sessão
        // até a pessoa confirmar
        if (!data.user || !data.session)
            return { success: false, message: "Confirme o seu e-mail pelo link que enviamos e depois entre." };

        // TODO: se isto falhar, a conta fica no Auth sem perfil (ver a web)
        const { error: erroPerfil } = await supabase.from("perfis").insert({
            id: data.user.id,
            nome: dados.nome,
            email: dados.email.trim(),
            role: dados.role,
            dados_perfil: dados.dadosPerfil,
        });
        if (erroPerfil) return { success: false, message: "Não foi possível concluir o cadastro. Tente novamente" };
        return { success: true };
    },

    /** Só `nome` e `dados_perfil` (o banco não libera mudar perfil ou e-mail) */
    atualizarPerfil: async (uid: string, dados: { nome: string; dadosPerfil: DadosPerfil }): Promise<{ success: boolean }> => {
        const { data, error } = await supabase.from("perfis")
            .update({ nome: dados.nome, dados_perfil: dados.dadosPerfil })
            .eq("id", uid)
            .select("id");
        return { success: !error && !!data?.length };
    },

    /** O link do e-mail abre a página /nova-senha do site */
    redefinirSenha: async (email: string): Promise<{ success: boolean; message?: string }> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${SITE}/nova-senha` });
        return error ? { success: false, message: mensagemErro(error) } : { success: true };
    },

    sair: async () => {
        await supabase.auth.signOut();
    },
};

export default UsuarioServicos;
