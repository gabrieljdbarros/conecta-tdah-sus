/**
 * PASTA DO ALUNO (RF03, decisão travada 6) e membros da pasta.
 * Equivalente de tests/pastas.rules.test.mjs, agora com RLS.
 */
import { before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonimo, criarPasta, criarUsuarios, falhou, linha, negado, PERFIS, permitido, restaurarPerfis, servico } from "./ajuda.mjs";

let u;
let pasta; // pasta da mae1, com a escola1 vinculada
before(async () => { u = await criarUsuarios(); });
beforeEach(async () => {
    await restaurarPerfis(u);
    pasta = await criarPasta(u, "mae1", ["escola1"]);
});

const criar = (quem, nome = "Outro Aluno Fictício") => (quem ? u[quem].db : anonimo()).rpc("criar_pasta", { p_nome_aluno: nome });
const ler = (quem, id = pasta) => (quem ? u[quem].db : anonimo()).from("pastas").select().eq("id", id);
const editar = (quem, dados, id = pasta) => u[quem].db.from("pastas").update(dados).eq("id", id).select();

// =============================================================================
describe("criar pasta", () => {
    test("mãe cria a pasta e entra como dona e única membro", async () => {
        const { data: id, error } = await criar("mae2");
        assert.equal(error, null, error?.message);
        assert.equal((await linha("pastas", id)).dono_id, u.mae2.id);
        const { data: membros } = await servico.from("membros_pasta").select("usuario_id, papel, nome").eq("pasta_id", id);
        assert.deepEqual(membros, [{ usuario_id: u.mae2.id, papel: "mae", nome: PERFIS.mae2.nome }]);
    });

    for (const quem of ["escola1", "medico1", "admin1"]) {
        test(`NÃO: ${quem} cria pasta`, async () => {
            falhou(await criar(quem), /Só a mãe/);
        });
    }

    test("NÃO: sem login", async () => {
        falhou(await criar(null));
    });

    test("NÃO: gravar direto na tabela (pasta em nome de outra mãe, sem passar pela função)", async () => {
        negado(await u.mae1.db.from("pastas").insert({ nome_aluno: "Aluno Fictício", dono_id: u.mae2.id }).select());
        negado(await u.mae1.db.from("pastas").insert({ nome_aluno: "Aluno Fictício", dono_id: u.mae1.id }).select());
    });

    test("NÃO: nome do aluno vazio", async () => {
        falhou(await criar("mae1", ""));
    });

    test("NÃO: nome do aluno só com espaços", async () => {
        falhou(await criar("mae1", "   "));
    });

    test("NÃO: nome do aluno com mais de 100 caracteres", async () => {
        falhou(await criar("mae1", "x".repeat(101)));
    });

    // RF03: só o nome da criança (minimização). A tabela nem tem onde guardar
    // série, data de nascimento ou cartão SUS, nem pelo servidor
    for (const campo of ["serie", "data_nascimento", "cartao_sus"]) {
        test(`NÃO: a pasta não tem a coluna ${campo}`, async () => {
            const { error } = await servico.from("pastas").insert({ nome_aluno: "Aluno Fictício", dono_id: u.mae1.id, [campo]: "x" });
            assert.ok(error);
        });
    }
});

// =============================================================================
describe("ler pasta", () => {
    test("dona lê", async () => {
        permitido(await ler("mae1"));
    });

    test("membro vinculado (escola) lê", async () => {
        permitido(await ler("escola1"));
    });

    for (const [quem, rotulo] of [["medico1", "médico não vinculado"], ["mae2", "outra mãe"], ["admin1", "admin (LGPD — não participa do acompanhamento)"]]) {
        test(`NÃO: ${rotulo}`, async () => {
            negado(await ler(quem));
        });
    }

    test("NÃO: sem login", async () => {
        negado(await ler(null));
    });

    test("listar todas as pastas devolve só as da pessoa", async () => {
        await criarPasta(u, "mae2", [], "Aluno Fictício da Outra Mãe");
        const { data } = await u.mae1.db.from("pastas").select("id");
        assert.deepEqual(data.map((p) => p.id), [pasta]);
        const { data: doAdmin } = await u.admin1.db.from("pastas").select("id");
        assert.deepEqual(doAdmin, []);
    });

    test("NÃO: conta de mãe que é membro mas não é a dona", async () => {
        await servico.from("membros_pasta").insert({ pasta_id: pasta, usuario_id: u.mae2.id, papel: "mae", nome: PERFIS.mae2.nome });
        negado(await ler("mae2"));
    });

    test("NÃO: membro com papel diferente do perfil (perfil de médico gravado como escola)", async () => {
        await servico.from("membros_pasta").insert({ pasta_id: pasta, usuario_id: u.medico1.id, papel: "escola", nome: PERFIS.medico1.nome });
        negado(await ler("medico1"));
    });
});

// =============================================================================
describe("membros da pasta", () => {
    test("os membros veem quem está na pasta (nome, papel e instituição)", async () => {
        const { data, error } = await u.escola1.db.from("membros_pasta").select("papel, nome, detalhe").eq("pasta_id", pasta).order("papel");
        assert.equal(error, null);
        assert.deepEqual(data, [
            { papel: "escola", nome: PERFIS.escola1.nome, detalhe: "Escola Fictícia" },
            { papel: "mae", nome: PERFIS.mae1.nome, detalhe: null },
        ]);
    });

    for (const quem of ["medico1", "admin1"]) {
        test(`NÃO: ${quem} (fora da pasta) vê os membros`, async () => {
            negado(await u[quem].db.from("membros_pasta").select().eq("pasta_id", pasta));
        });
    }

    test("NÃO: a dona adiciona membro direto (vínculo só por convite)", async () => {
        negado(await u.mae1.db.from("membros_pasta").insert({ pasta_id: pasta, usuario_id: u.medico1.id, papel: "medico", nome: "x" }).select());
        negado(await ler("medico1"));
    });

    test("NÃO: a pessoa se adiciona a uma pasta", async () => {
        negado(await u.medico1.db.from("membros_pasta").insert({ pasta_id: pasta, usuario_id: u.medico1.id, papel: "medico", nome: PERFIS.medico1.nome }).select());
    });

    test("NÃO: a dona remove membro direto (só pela função)", async () => {
        negado(await u.mae1.db.from("membros_pasta").delete().eq("pasta_id", pasta).eq("usuario_id", u.escola1.id).select());
        permitido(await ler("escola1"));
    });

    test("NÃO: alterar o papel ou o nome de um membro", async () => {
        negado(await u.escola1.db.from("membros_pasta").update({ papel: "mae" }).eq("usuario_id", u.escola1.id).select());
        negado(await u.mae1.db.from("membros_pasta").update({ nome: "Outro Nome" }).eq("usuario_id", u.escola1.id).select());
    });
});

// =============================================================================
describe("editar pasta", () => {
    test("dona altera o nome", async () => {
        permitido(await editar("mae1", { nome_aluno: "Nome Corrigido Fictício" }));
    });

    test("NÃO: dona transfere a pasta", async () => {
        negado(await editar("mae1", { dono_id: u.mae2.id }));
        assert.equal((await linha("pastas", pasta)).dono_id, u.mae1.id);
    });

    test("NÃO: dona altera a data de criação", async () => {
        negado(await editar("mae1", { criado_em: "2020-01-01T00:00:00Z" }));
    });

    test("NÃO: nome vazio", async () => {
        negado(await editar("mae1", { nome_aluno: " " }));
    });

    test("NÃO: membro que não é dono (escola) edita", async () => {
        negado(await editar("escola1", { nome_aluno: "Nome Corrigido Fictício" }));
        assert.equal((await linha("pastas", pasta)).nome_aluno, "Aluno Fictício");
    });

    test("NÃO: não membro edita", async () => {
        negado(await editar("mae2", { nome_aluno: "Nome Corrigido Fictício" }));
    });

    test("NÃO: dona que não é mais membro edita", async () => {
        await servico.from("membros_pasta").delete().eq("pasta_id", pasta).eq("usuario_id", u.mae1.id);
        negado(await editar("mae1", { nome_aluno: "Nome Corrigido Fictício" }));
    });
});

// =============================================================================
describe("apagar pasta", () => {
    for (const quem of ["mae1", "admin1"]) {
        test(`NÃO: ${quem} apaga (TODO: fluxo de exclusão LGPD)`, async () => {
            negado(await u[quem].db.from("pastas").delete().eq("id", pasta).select());
            assert.ok(await linha("pastas", pasta));
        });
    }

    test("NÃO: o admin apaga o perfil de uma mãe que tem pasta (a pasta ficaria sem dona)", async () => {
        const r = await u.admin1.db.from("perfis").delete().eq("id", u.mae1.id).select();
        assert.ok(r.error);
        assert.ok(await linha("pastas", pasta));
    });
});
