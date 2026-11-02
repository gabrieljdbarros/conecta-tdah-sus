/**
 * QUESTIONÁRIO SNAP-IV (decisão travada 11)
 * - só a mãe DONA da pasta responde, e como ela mesma
 * - todos os membros da pasta leem; quem é de fora (inclusive o admin) não
 * - ninguém edita nem apaga uma resposta concluída
 * - o banco recusa respostas incompletas, fora da escala ou de versão desconhecida
 */
import { before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonimo, criarPasta, criarUsuarios, linha, negado, permitido, restaurarPerfis, servico } from "./ajuda.mjs";

let u;
let pasta;        // pasta da mae1, com escola1 e medico1
let questionario; // uma resposta da mae1 nessa pasta
const RESPOSTAS = [0, 1, 2, 3, 2, 2, 1, 0, 3, 1, 2, 3, 0, 0, 1, 2, 3, 2];

before(async () => { u = await criarUsuarios(); });
beforeEach(async () => {
    await restaurarPerfis(u);
    pasta = await criarPasta(u, "mae1", ["escola1", "medico1"]);
    const { data, error } = await servico.from("questionarios")
        .insert({ pasta_id: pasta, respondido_por: u.mae1.id, versao: "snap-iv-18-v1", respostas: RESPOSTAS })
        .select().single();
    if (error) throw error;
    questionario = data.id;
});

const valido = (quem, extra = {}) => ({
    pasta_id: pasta, respondido_por: u[quem].id, versao: "snap-iv-18-v1", respostas: RESPOSTAS, ...extra,
});
const responder = (quem, dados) => u[quem].db.from("questionarios").insert(dados).select();
const ler = (quem) => (quem ? u[quem].db : anonimo()).from("questionarios").select().eq("pasta_id", pasta);

// =============================================================================
describe("responder", () => {
    test("a mãe dona responde; data e id vêm do servidor", async () => {
        const r = await responder("mae1", valido("mae1"));
        permitido(r);
        assert.deepEqual(r.data[0].respostas, RESPOSTAS);
    });

    test("a mãe pode responder de novo em outra data (comparação)", async () => {
        permitido(await responder("mae1", valido("mae1")));
        const { data } = await ler("mae1");
        assert.equal(data.length, 2);
    });

    for (const quem of ["escola1", "medico1"]) {
        test(`NÃO: ${quem} (membro da pasta) responde`, async () => {
            negado(await responder(quem, valido(quem)));
        });
    }

    test("NÃO: outra mãe responde na pasta que não é dela", async () => {
        negado(await responder("mae2", valido("mae2")));
    });

    test("NÃO: admin responde", async () => {
        negado(await responder("admin1", valido("admin1")));
    });

    test("NÃO: sem login", async () => {
        negado(await anonimo().from("questionarios").insert(valido("mae1")).select());
    });

    test("NÃO: a mãe responde em nome de outra pessoa", async () => {
        negado(await responder("mae1", valido("mae1", { respondido_por: u.mae2.id })));
    });

    test("NÃO: conta de mãe que é membro mas não é a dona", async () => {
        await servico.from("membros_pasta").insert({ pasta_id: pasta, usuario_id: u.mae2.id, papel: "mae", nome: "Outra Mãe Fictícia" });
        negado(await responder("mae2", valido("mae2")));
    });

    test("NÃO: a mãe escolhe a data da resposta", async () => {
        negado(await responder("mae1", valido("mae1", { criado_em: "2020-01-01T00:00:00Z" })));
    });

    test("NÃO: a mãe escolhe o id da resposta", async () => {
        negado(await responder("mae1", valido("mae1", { id: "00000000-0000-4000-8000-000000000000" })));
    });

    test("NÃO: resposta sem quem respondeu", async () => {
        negado(await responder("mae1", valido("mae1", { respondido_por: null })));
        const semAutor = valido("mae1");
        delete semAutor.respondido_por;
        negado(await responder("mae1", semAutor));
    });

    test("NÃO: a dona que não está mais entre os membros (lê ou responde)", async () => {
        await servico.from("membros_pasta").delete().eq("pasta_id", pasta).eq("usuario_id", u.mae1.id);
        negado(await ler("mae1"));
        negado(await responder("mae1", valido("mae1")));
    });
});

describe("o banco recusa respostas inválidas", () => {
    for (const [caso, respostas] of [
        ["17 itens", RESPOSTAS.slice(1)],
        ["19 itens", [...RESPOSTAS, 0]],
        ["nota 4", [...RESPOSTAS.slice(1), 4]],
        ["nota negativa", [...RESPOSTAS.slice(1), -1]],
        ["item sem resposta", [...RESPOSTAS.slice(1), null]],
        ["nenhum item", []],
    ]) {
        test(`NÃO: ${caso}`, async () => {
            negado(await responder("mae1", valido("mae1", { respostas })));
        });
    }

    test("NÃO: versão desconhecida", async () => {
        negado(await responder("mae1", valido("mae1", { versao: "snap-iv-26" })));
    });
});

// =============================================================================
describe("ler", () => {
    for (const quem of ["mae1", "escola1", "medico1"]) {
        test(`${quem} (membro) lê as respostas da pasta`, async () => {
            permitido(await ler(quem));
        });
    }

    for (const quem of ["mae2", "escola2", "medico2", "admin1", null]) {
        test(`NÃO: ${quem ?? "sem login"} lê`, async () => {
            negado(await ler(quem));
        });
    }

    test("NÃO: quem saiu da pasta", async () => {
        await servico.from("membros_pasta").delete().eq("pasta_id", pasta).eq("usuario_id", u.medico1.id);
        negado(await ler("medico1"));
    });
});

// =============================================================================
describe("ninguém edita nem apaga", () => {
    for (const quem of ["mae1", "escola1", "medico1", "mae2", "escola2", "medico2", "admin1", null]) {
        const tabela = () => (quem ? u[quem].db : anonimo()).from("questionarios");

        test(`NÃO: ${quem ?? "sem login"} edita`, async () => {
            negado(await tabela().update({ respostas: Array(18).fill(0) }).eq("id", questionario).select());
            assert.deepEqual((await linha("questionarios", questionario)).respostas, RESPOSTAS);
        });

        test(`NÃO: ${quem ?? "sem login"} apaga`, async () => {
            negado(await tabela().delete().eq("id", questionario).select());
            assert.ok(await linha("questionarios", questionario));
        });
    }
});
