/**
 * Apoio dos testes do banco (Supabase local: `npx supabase start`).
 *
 * Cada usuário de teste é um cliente com o próprio login, sujeito ao RLS,
 * como o app de verdade. O cliente `servico` (service_role) ignora o RLS e
 * serve só para preparar e conferir os dados.
 *
 * As chaves vêm do `supabase status` na hora (são as de demonstração do
 * ambiente local) e nunca ficam no código. Só dados fictícios.
 *
 * ATENÇÃO: os testes apagam os dados do banco LOCAL antes de cada caso.
 */
import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

function carregarAmbiente() {
    const saida = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const env = {};
    for (const linha of saida.split(/\r?\n/)) {
        const m = linha.match(/^([A-Z_]+)="?(.*?)"?$/);
        if (m) env[m[1]] = m[2];
    }
    if (!env.API_URL || !env.ANON_KEY || !env.SERVICE_ROLE_KEY)
        throw new Error("Supabase local não está rodando. Rode `npx supabase start`.");
    return env;
}

const env = carregarAmbiente();
const OPCOES = { auth: { persistSession: false, autoRefreshToken: false } };

export const servico = createClient(env.API_URL, env.SERVICE_ROLE_KEY, OPCOES);
/** Cliente sem login */
export const anonimo = () => createClient(env.API_URL, env.ANON_KEY, OPCOES);

const SENHA = "senha-ficticia-123";

/** Perfis fictícios usados em todos os testes */
export const PERFIS = {
    mae1: { nome: "Mãe Fictícia", role: "mae", dados_perfil: { grauParentesco: "Mãe" } },
    mae2: { nome: "Outra Mãe Fictícia", role: "mae", dados_perfil: { grauParentesco: "Avó" } },
    escola1: { nome: "Professora Fictícia", role: "escola", dados_perfil: { nomeEscola: "Escola Fictícia", cargo: "Professora", disciplina: "Português" } },
    escola2: { nome: "Outra Professora Fictícia", role: "escola", dados_perfil: { nomeEscola: "Outra Escola Fictícia", cargo: "Coordenadora" } },
    medico1: { nome: "Médico Fictício", role: "medico", dados_perfil: { crm: "00000-AL", especialidade: "Psiquiatria", unidadeSUS: "UBS Fictícia" } },
    medico2: { nome: "Outro Médico Fictício", role: "medico", dados_perfil: { crm: "11111-AL", especialidade: "Pediatria", unidadeSUS: "Outra UBS Fictícia" } },
    admin1: { nome: "Admin Fictício", role: "admin", dados_perfil: {} },
    admin2: { nome: "Outro Admin Fictício", role: "admin", dados_perfil: {} },
};

export const emailDe = (apelido) => `${apelido}@example.com`;

/** Apaga todos os dados das tabelas (os usuários do Auth ficam) */
export async function limparDados() {
    // Apagar a pasta leva junto membros, convites e mensagens (cascade)
    for (const tabela of ["pastas", "perfis"]) {
        const { error } = await servico.from(tabela).delete().not("id", "is", null);
        if (error) throw error;
    }
}

/**
 * Cria (uma vez por arquivo) os usuários do Auth e devolve, para cada
 * apelido, o id e um cliente já logado
 */
export async function criarUsuarios(apelidos = Object.keys(PERFIS)) {
    await limparDados();
    // Começa do zero: apaga contas de execuções anteriores
    const { data: lista, error: erroLista } = await servico.auth.admin.listUsers({ perPage: 1000 });
    if (erroLista) throw erroLista;
    for (const u of lista.users) await servico.auth.admin.deleteUser(u.id);

    const usuarios = {};
    for (const apelido of apelidos) {
        const { data, error } = await servico.auth.admin.createUser({ email: emailDe(apelido), password: SENHA, email_confirm: true });
        if (error) throw error;
        const db = anonimo();
        const { error: erroLogin } = await db.auth.signInWithPassword({ email: emailDe(apelido), password: SENHA });
        if (erroLogin) throw erroLogin;
        usuarios[apelido] = { id: data.user.id, db };
    }
    return usuarios;
}

/** Recria os perfis de todos os usuários (antes de cada teste) */
export async function restaurarPerfis(usuarios) {
    await limparDados();
    const linhas = Object.entries(usuarios).map(([apelido, u]) => ({ id: u.id, email: emailDe(apelido), ...PERFIS[apelido] }));
    const { error } = await servico.from("perfis").insert(linhas);
    if (error) throw error;
}

/**
 * Cria uma pasta direto no banco (sem RLS), com a dona e os membros
 * informados. `membros`: lista de apelidos de escola/médico
 */
export async function criarPasta(usuarios, dona, membros = [], nomeAluno = "Aluno Fictício") {
    const { data: pasta, error } = await servico.from("pastas")
        .insert({ nome_aluno: nomeAluno, dono_id: usuarios[dona].id }).select().single();
    if (error) throw error;
    const linhas = [{ pasta_id: pasta.id, usuario_id: usuarios[dona].id, papel: "mae", nome: PERFIS[dona].nome }];
    for (const apelido of membros) {
        const p = PERFIS[apelido];
        linhas.push({
            pasta_id: pasta.id, usuario_id: usuarios[apelido].id, papel: p.role, nome: p.nome,
            detalhe: p.dados_perfil.nomeEscola ?? p.dados_perfil.unidadeSUS,
        });
    }
    const { error: erroMembros } = await servico.from("membros_pasta").insert(linhas);
    if (erroMembros) throw erroMembros;
    return pasta.id;
}

/** Linha atual no banco (sem RLS), para conferir que nada mudou */
export async function linha(tabela, id) {
    const { data, error } = await servico.from(tabela).select().eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
}

/** A operação deu certo e devolveu pelo menos uma linha */
export function permitido({ data, error }) {
    assert.equal(error, null, error?.message);
    if (Array.isArray(data)) assert.ok(data.length > 0, "não devolveu nenhuma linha");
}

/**
 * A operação foi barrada. Com RLS, o Postgres às vezes devolve erro
 * (falta de permissão) e às vezes simplesmente não encontra a linha
 * (leitura vazia, update/delete sem efeito): os dois contam como negado
 */
export function negado({ data, error }) {
    if (error) return;
    assert.ok(data === null || (Array.isArray(data) && data.length === 0), `deveria ser negado, mas devolveu ${JSON.stringify(data)}`);
}

/** Função do banco (RPC) que precisa falhar */
export function falhou({ error }, trecho) {
    assert.ok(error, "deveria ter falhado");
    if (trecho) assert.match(error.message, trecho);
}
