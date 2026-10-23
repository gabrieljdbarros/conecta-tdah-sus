/**
 * PERFIS (decisões travadas 1 a 4): cadastro, leitura e edição.
 * Portados dos antigos testes das Security Rules do Firebase (e das Cloud
 * Functions, no caso dos convites), agora contra o RLS e as funções do banco.
 */
import { before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonimo, criarUsuarios, emailDe, linha, negado, PERFIS, permitido, restaurarPerfis, servico } from "./ajuda.mjs";

let u;
before(async () => { u = await criarUsuarios(); });
beforeEach(async () => { await restaurarPerfis(u); });

const editar = (quem, alvo, dados) => u[quem].db.from("perfis").update(dados).eq("id", u[alvo].id).select();
const X = (n) => "x".repeat(n);

// Cadastro: a conta do Auth já existe; falta a linha em `perfis`
async function semPerfil(apelido) {
    const { error } = await servico.from("perfis").delete().eq("id", u[apelido].id);
    if (error) throw error;
}
const cadastrar = (apelido, dados) => u[apelido].db.from("perfis")
    .insert({ id: u[apelido].id, email: emailDe(apelido), ...dados }).select();

// =============================================================================
describe("cadastro (create)", () => {
    test("cadastro válido de médico", async () => {
        await semPerfil("medico1");
        permitido(await cadastrar("medico1", PERFIS.medico1));
    });

    test("cadastro válido de mãe", async () => {
        await semPerfil("mae1");
        permitido(await cadastrar("mae1", PERFIS.mae1));
    });

    test("cadastro de coordenação sem disciplina", async () => {
        await semPerfil("escola2");
        permitido(await cadastrar("escola2", PERFIS.escola2));
    });

    test("NÃO cadastra mãe com nome da criança no perfil (privacidade)", async () => {
        await semPerfil("mae1");
        negado(await cadastrar("mae1", { ...PERFIS.mae1, dados_perfil: { grauParentesco: "Mãe", nomeCrianca: "Aluno Fictício" } }));
    });

    test("NÃO cadastra como admin", async () => {
        await semPerfil("mae1");
        negado(await cadastrar("mae1", { ...PERFIS.mae1, role: "admin", dados_perfil: {} }));
    });

    test("NÃO cadastra com email diferente do login", async () => {
        await semPerfil("mae1");
        negado(await u.mae1.db.from("perfis").insert({ id: u.mae1.id, email: "outro@example.com", ...PERFIS.mae1 }).select());
    });

    test("NÃO cadastra o perfil de outra pessoa", async () => {
        await semPerfil("mae2");
        negado(await u.mae1.db.from("perfis").insert({ id: u.mae2.id, email: emailDe("mae1"), ...PERFIS.mae1 }).select());
    });

    test("NÃO cadastra escolhendo a data (criado_em é do servidor)", async () => {
        await semPerfil("mae1");
        negado(await cadastrar("mae1", { ...PERFIS.mae1, criado_em: "2020-01-01T00:00:00Z" }));
    });

    test("NÃO cadastra com campos de outro perfil (médico com dados de mãe)", async () => {
        await semPerfil("medico1");
        negado(await cadastrar("medico1", { ...PERFIS.medico1, dados_perfil: PERFIS.mae1.dados_perfil }));
    });

    test("NÃO cadastra com texto acima de 100 caracteres", async () => {
        await semPerfil("mae1");
        negado(await cadastrar("mae1", { ...PERFIS.mae1, nome: X(101) }));
    });

    test("NÃO cadastra sem login", async () => {
        await semPerfil("mae1");
        negado(await anonimo().from("perfis").insert({ id: u.mae1.id, email: emailDe("mae1"), ...PERFIS.mae1 }).select());
    });

    test("NÃO cadastra duas vezes (já tem perfil)", async () => {
        negado(await cadastrar("mae1", PERFIS.mae1));
    });
});

// =============================================================================
describe("leitura", () => {
    test("lê o próprio perfil", async () => {
        permitido(await u.mae1.db.from("perfis").select().eq("id", u.mae1.id));
    });

    test("NÃO lê o perfil de outra pessoa", async () => {
        negado(await u.mae1.db.from("perfis").select().eq("id", u.escola1.id));
        const { data } = await u.mae1.db.from("perfis").select();
        assert.deepEqual(data.map((p) => p.id), [u.mae1.id]);
    });

    test("admin lê qualquer perfil (listagem do painel)", async () => {
        const { data, error } = await u.admin1.db.from("perfis").select();
        assert.equal(error, null);
        assert.equal(data.length, Object.keys(PERFIS).length);
    });

    test("NÃO: sem login", async () => {
        negado(await anonimo().from("perfis").select());
    });
});

// =============================================================================
describe("editar o próprio perfil", () => {
    test("pode alterar nome e dados do perfil", async () => {
        permitido(await editar("mae1", "mae1", { nome: "Nome Novo Fictício", dados_perfil: { grauParentesco: "Tia" } }));
    });

    test("pode alterar só o nome", async () => {
        permitido(await editar("mae1", "mae1", { nome: "Nome Novo Fictício" }));
    });

    test("NÃO pode alterar o email", async () => {
        negado(await editar("mae1", "mae1", { email: "outro@example.com" }));
        assert.equal((await linha("perfis", u.mae1.id)).email, emailDe("mae1"));
    });

    test("NÃO pode alterar o role (auto-promoção a admin)", async () => {
        negado(await editar("mae1", "mae1", { role: "admin" }));
        assert.equal((await linha("perfis", u.mae1.id)).role, "mae");
    });

    test("NÃO pode trocar de perfil (mãe -> médico)", async () => {
        negado(await editar("mae1", "mae1", { role: "medico", dados_perfil: PERFIS.medico1.dados_perfil }));
    });

    test("NÃO pode alterar criado_em", async () => {
        negado(await editar("mae1", "mae1", { criado_em: "2020-01-01T00:00:00Z" }));
    });

    test("NÃO pode misturar campo permitido com campo travado", async () => {
        negado(await editar("mae1", "mae1", { nome: "Nome Novo Fictício", role: "admin" }));
        assert.equal((await linha("perfis", u.mae1.id)).nome, PERFIS.mae1.nome);
    });

    test("NÃO pode sobrescrever a linha inteira trocando o role (upsert)", async () => {
        negado(await u.mae1.db.from("perfis").upsert({ id: u.mae1.id, email: emailDe("mae1"), ...PERFIS.mae1, role: "admin", dados_perfil: {} }).select());
        assert.equal((await linha("perfis", u.mae1.id)).role, "mae");
    });
});

// =============================================================================
describe("editar o perfil de outra pessoa", () => {
    test("usuário comum NÃO pode editar outro usuário", async () => {
        negado(await editar("mae1", "escola1", { nome: "Invadido" }));
        assert.equal((await linha("perfis", u.escola1.id)).nome, PERFIS.escola1.nome);
    });

    test("sem login NÃO pode editar", async () => {
        negado(await anonimo().from("perfis").update({ nome: "Invadido" }).eq("id", u.mae1.id).select());
    });

    test("admin pode editar o nome de outro usuário", async () => {
        permitido(await editar("admin1", "escola1", { nome: "Nome Corrigido Fictício" }));
    });

    test("admin pode editar o próprio nome", async () => {
        permitido(await editar("admin1", "admin1", { nome: "Admin Renomeado Fictício" }));
    });

    test("admin edita só o nome de outro admin", async () => {
        permitido(await editar("admin1", "admin2", { nome: "Admin Renomeado Fictício" }));
    });

    test("NÃO: admin troca o role de outro (escola -> médico)", async () => {
        negado(await editar("admin1", "escola1", { role: "medico" }));
        assert.equal((await linha("perfis", u.escola1.id)).role, "escola");
    });

    test("NÃO: admin promove outro usuário a admin", async () => {
        negado(await editar("admin1", "mae1", { role: "admin" }));
    });

    test("NÃO: admin rebaixa outro admin", async () => {
        negado(await editar("admin1", "admin2", { role: "mae" }));
    });

    test("NÃO: admin troca o email de outro", async () => {
        negado(await editar("admin1", "mae1", { email: "outro@example.com" }));
    });

    test("NÃO: admin grava dados do perfil inválidos", async () => {
        negado(await editar("admin1", "medico1", { dados_perfil: { crm: "" } }));
    });
});

// =============================================================================
describe("validação do conteúdo do perfil", () => {
    test("aceita texto com exatamente 100 caracteres", async () => {
        permitido(await editar("mae1", "mae1", { nome: X(100) }));
    });

    test("NÃO aceita texto com mais de 100 caracteres", async () => {
        negado(await editar("mae1", "mae1", { nome: X(101) }));
    });

    test("NÃO aceita nome vazio", async () => {
        negado(await editar("mae1", "mae1", { nome: "" }));
    });

    test("NÃO aceita nome só com espaços", async () => {
        negado(await editar("mae1", "mae1", { nome: "   " }));
    });

    test("NÃO aceita campo de outro perfil (mãe gravando crm)", async () => {
        negado(await editar("mae1", "mae1", { dados_perfil: { grauParentesco: "Mãe", crm: "123" } }));
    });

    test("NÃO aceita nome da criança no perfil da mãe (privacidade)", async () => {
        negado(await editar("mae1", "mae1", { dados_perfil: { grauParentesco: "Mãe", nomeCrianca: "Aluno Fictício" } }));
    });

    test("NÃO aceita dados do perfil faltando campo obrigatório", async () => {
        negado(await editar("medico1", "medico1", { dados_perfil: { crm: "00000-AL", especialidade: "Psiquiatria" } }));
    });

    test("NÃO aceita valor que não é texto", async () => {
        negado(await editar("mae1", "mae1", { dados_perfil: { grauParentesco: 123 } }));
    });

    test("NÃO aceita dados do perfil que não são objeto", async () => {
        negado(await editar("mae1", "mae1", { dados_perfil: ["Mãe"] }));
    });

    test("médico edita os próprios campos", async () => {
        permitido(await editar("medico1", "medico1", { dados_perfil: { crm: "22222-AL", especialidade: "Psiquiatria infantil", unidadeSUS: "CAPSi Fictício" } }));
    });
});

// =============================================================================
describe("escola — disciplina opcional", () => {
    test("pode remover a disciplina (virou coordenadora)", async () => {
        permitido(await editar("escola1", "escola1", { dados_perfil: { nomeEscola: "Escola Fictícia", cargo: "Coordenadora" } }));
    });

    test("pode manter a disciplina", async () => {
        permitido(await editar("escola1", "escola1", { dados_perfil: PERFIS.escola1.dados_perfil }));
    });

    test("NÃO aceita disciplina vazia (a tela omite o campo em vez de mandar vazio)", async () => {
        negado(await editar("escola1", "escola1", { dados_perfil: { ...PERFIS.escola1.dados_perfil, disciplina: "" } }));
    });

    test("NÃO aceita escola sem cargo (continua obrigatório)", async () => {
        negado(await editar("escola1", "escola1", { dados_perfil: { nomeEscola: "Escola Fictícia" } }));
    });
});

// =============================================================================
describe("apagar perfil", () => {
    test("admin apaga o perfil de outro usuário", async () => {
        permitido(await u.admin1.db.from("perfis").delete().eq("id", u.escola1.id).select());
    });

    test("NÃO: usuário comum apaga outro perfil", async () => {
        negado(await u.mae1.db.from("perfis").delete().eq("id", u.escola1.id).select());
        assert.ok(await linha("perfis", u.escola1.id));
    });

    test("NÃO: usuário comum apaga o próprio perfil (pelo app, só o admin)", async () => {
        negado(await u.mae1.db.from("perfis").delete().eq("id", u.mae1.id).select());
        assert.ok(await linha("perfis", u.mae1.id));
    });
});
