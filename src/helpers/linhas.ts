/**
 * LINHAS DO BANCO → FORMATO DAS TELAS
 *
 * O banco (Supabase/Postgres) usa nomes em snake_case e datas em texto; as
 * telas usam os tipos de src/types. As conversões ficam aqui, num lugar só,
 * e servem à web (src/services) e ao app (mobile/src/servicos).
 * Lógica pura: sem acesso ao banco.
 */
// `import type`: some ao rodar, então os testes de lógica rodam direto no Node
import type { AppUser, DadosPerfil, UserRole } from "@/types/user";
import type { Participante, PapelNaPasta, Pasta } from "@/types/pasta";
import type { Mensagem } from "@/types/mensagem";

// ---------------------------------------------------------------------------
// PERFIL (tabela `perfis`)
// ---------------------------------------------------------------------------
export const COLUNAS_PERFIL = "id, nome, email, role, dados_perfil";

export interface LinhaPerfil {
    id: string;
    nome: string;
    email: string;
    role: UserRole;
    dados_perfil: DadosPerfil | null;
}

export function paraAppUser(linha: LinhaPerfil): AppUser {
    return {
        uid: linha.id,
        nome: linha.nome,
        email: linha.email,
        role: linha.role,
        dadosPerfil: linha.dados_perfil ?? {},
    };
}

// ---------------------------------------------------------------------------
// PASTA (tabelas `pastas` e `membros_pasta`)
// ---------------------------------------------------------------------------
// A pasta já vem com os membros (o RLS só deixa ler as pastas de que a
// pessoa participa, e os membros dessas pastas)
export const COLUNAS_PASTA = "id, nome_aluno, dono_id, criado_em, membros_pasta (usuario_id, papel, nome, detalhe)";

export interface LinhaPasta {
    id: string;
    nome_aluno: string;
    dono_id: string;
    criado_em: string;
    membros_pasta: { usuario_id: string; papel: PapelNaPasta; nome: string; detalhe: string | null }[];
}

export function paraPasta(linha: LinhaPasta): Pasta {
    const participantes: Record<string, Participante> = {};
    for (const m of linha.membros_pasta)
        participantes[m.usuario_id] = { nome: m.nome, papel: m.papel, ...(m.detalhe && { detalhe: m.detalhe }) };
    return {
        id: linha.id,
        nomeAluno: linha.nome_aluno,
        donoUid: linha.dono_id,
        membrosUids: linha.membros_pasta.map((m) => m.usuario_id),
        participantes,
        criadoEm: new Date(linha.criado_em).getTime(),
    };
}

/** Ordem alfabética do nome do aluno, como as telas mostram */
export const ordenarPastas = (pastas: Pasta[]) => pastas.sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno, "pt-BR"));

// ---------------------------------------------------------------------------
// MENSAGEM (tabela `mensagens`)
// ---------------------------------------------------------------------------
export const COLUNAS_MENSAGEM = "id, texto, autor_id, autor_nome, autor_papel, criado_em";

export interface LinhaMensagem {
    id: string;
    texto: string;
    autor_id: string | null;
    autor_nome: string;
    autor_papel: PapelNaPasta;
    criado_em: string;
}

export function paraMensagem(linha: LinhaMensagem): Mensagem {
    return {
        id: linha.id,
        texto: linha.texto,
        autorUid: linha.autor_id ?? '',
        autorNome: linha.autor_nome,
        autorPapel: linha.autor_papel,
        criadoEm: new Date(linha.criado_em).getTime(),
    };
}

/**
 * Junta mensagens novas à lista (sem repetir), da mais antiga para a mais
 * nova, guardando só as `limite` mais recentes
 */
export function juntarMensagens(lista: Mensagem[], novas: Mensagem[], limite: number): Mensagem[] {
    const porId = new Map(lista.map((m) => [m.id, m]));
    for (const m of novas) porId.set(m.id, m);
    return [...porId.values()].sort((a, b) => a.criadoEm - b.criadoEm).slice(-limite);
}

// ---------------------------------------------------------------------------
// ERROS DO LOGIN (Supabase Auth)
// ---------------------------------------------------------------------------
/**
 * Traduz os códigos de erro do Supabase Auth para mensagens em português,
 * legíveis para quem está preenchendo o formulário
 */
export function mensagemErroAuth(error: { code?: string; name?: string } | null): string {
    switch (error?.code) {
        case "email_address_invalid":
        case "validation_failed":
            return "E-mail inválido";
        case "invalid_credentials":
            return "E-mail ou senha incorretos";
        case "user_already_exists":
        case "email_exists":
            return "Já existe uma conta com este e-mail";
        case "weak_password":
            return "A senha precisa ter pelo menos 6 caracteres";
        case "over_request_rate_limit":
        case "over_email_send_rate_limit":
            return "Muitas tentativas. Tente novamente em alguns minutos";
        default:
            // Sem código: em geral, o aparelho não alcançou o servidor
            return error?.name === "AuthRetryableFetchError"
                ? "Sem conexão. Confira a internet e tente de novo"
                : "Não foi possível concluir. Tente novamente";
    }
}

// ---------------------------------------------------------------------------
// ERROS DAS FUNÇÕES DO BANCO
// ---------------------------------------------------------------------------
// Erros que as funções do banco devolvem de propósito, já com a mensagem em
// português para o usuário (convite expirado, já usado, perfil errado...)
const ERROS_PREVISTOS = ['42501', '22023', 'P0002', '23505'];

/**
 * Mensagem para a tela: a do banco, quando é um erro previsto; senão, a
 * mensagem padrão (erros técnicos não aparecem para o usuário)
 */
export function mensagemErro(error: { code?: string; message: string } | null, padrao: string): string {
    if (error?.code && ERROS_PREVISTOS.includes(error.code) && !/permission denied|violates/i.test(error.message))
        return error.message;
    return padrao;
}
