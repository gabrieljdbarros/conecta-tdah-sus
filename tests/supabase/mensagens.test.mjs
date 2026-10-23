/**
 * CHAT EM GRUPO DA PASTA (RN05, RF08, RN08, decisão travada 7).
 * Portados dos antigos testes das Security Rules do Firebase (e das Cloud
 * Functions, no caso dos convites), agora contra o RLS e as funções do banco.
 */
import { before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonimo, criarPasta, criarUsuarios, linha, negado, PERFIS, permitido, restaurarPerfis, servico } from "./ajuda.mjs";

let u;
let pasta;    // pasta da mae1, com escola1 e medico1
let mensagem; // uma mensagem da escola1 nessa pasta
before(async () => { u = await criarUsuarios(); });
beforeEach(async () => {
    await restaurarPerfis(u);
    pasta = await criarPasta(u, "mae1", ["escola1", "medico1"]);
    const { data, error } = await servico.from("mensagens").insert({
        pasta_id: pasta, autor_id: u.escola1.id, autor_nome: PERFIS.escola1.nome, autor_papel: "escola", texto: "Mensagem fictícia",
    }).select().single();
    if (error) throw error;
    mensagem = data.id;
});

const ler = (quem) => (quem ? u[quem].db : anonimo()).from("mensagens").select().eq("pasta_id", pasta);

// Mensagem válida de `quem`, com o papel que a pessoa tem na pasta
const valida = (quem, extra = {}) => ({
    pasta_id: pasta, autor_id: u[quem].id, autor_nome: PERFIS[quem].nome, autor_papel: PERFIS[quem].role, texto: "Olá, mensagem fictícia", ...extra,
});
const enviar = (quem, dados) => u[quem].db.from("mensagens").insert(dados).select();

// =============================================================================
describe("ler o chat", () => {
    for (const quem of ["mae1", "escola1", "medico1"]) {
        test(`${quem} lê o grupo`, async () => {
            permitido(await ler(quem));
        });
    }

    test("lista as 100 mensagens mais recentes (como a tela faz)", async () => {
        const { data, error } = await u.mae1.db.from("mensagens").select()
            .eq("pasta_id", pasta).order("criado_em", { ascending: false }).limit(100);
        assert.equal(error, null);
        assert.equal(data.length, 1);
    });

    test("NÃO: médico não vinculado", async () => {
        negado(await ler("medico2"));
    });

    test("NÃO: quem saiu da pasta", async () => {
        await servico.from("membros_pasta").delete().eq("pasta_id", pasta).eq("usuario_id", u.escola1.id);
        negado(await ler("escola1"));
    });

    test("NÃO: outra mãe", async () => {
        negado(await ler("mae2"));
    });

    test("NÃO: conta de mãe que é membro mas não é a dona", async () => {
        await servico.from("membros_pasta").insert({ pasta_id: pasta, usuario_id: u.mae2.id, papel: "mae", nome: PERFIS.mae2.nome });
        negado(await ler("mae2"));
    });

    test("NÃO: admin", async () => {
        negado(await ler("admin1"));
    });

    test("NÃO: sem login", async () => {
        negado(await ler(null));
    });

    test("NÃO: buscar as mensagens de todas as pastas de uma vez", async () => {
        const outra = await criarPasta(u, "mae2", [], "Aluno Fictício da Outra Mãe");
        await servico.from("mensagens").insert({ pasta_id: outra, autor_id: u.mae2.id, autor_nome: PERFIS.mae2.nome, autor_papel: "mae", texto: "Outra pasta" });
        const { data } = await u.escola1.db.from("mensagens").select("pasta_id");
        assert.deepEqual([...new Set(data.map((m) => m.pasta_id))], [pasta]);
        negado(await u.admin1.db.from("mensagens").select());
    });
});

// =============================================================================
describe("enviar mensagens", () => {
    test("escola, mãe e médico escrevem no grupo", async () => {
        for (const quem of ["mae1", "escola1", "medico1"])
            permitido(await enviar(quem, valida(quem)));
    });

    test("a data é a do servidor", async () => {
        const antes = Date.now();
        const { data } = await enviar("mae1", valida("mae1"));
        assert.ok(Math.abs(new Date(data[0].criado_em).getTime() - antes) < 60_000);
    });

    test("NÃO: médico não vinculado escreve no grupo", async () => {
        negado(await enviar("medico2", valida("medico2")));
    });

    test("NÃO: admin escreve", async () => {
        negado(await enviar("admin1", { ...valida("admin1"), autor_papel: "mae" }));
    });

    test("NÃO: escrever em nome de outra pessoa", async () => {
        negado(await enviar("medico1", { ...valida("mae1") }));
    });

    test("NÃO: nome do autor diferente do perfil", async () => {
        negado(await enviar("escola1", valida("escola1", { autor_nome: "Diretora Inventada" })));
    });

    test("NÃO: papel do autor falso (escola se passando pela mãe)", async () => {
        negado(await enviar("escola1", valida("escola1", { autor_papel: "mae" })));
    });

    test("NÃO: texto vazio ou só com espaços", async () => {
        negado(await enviar("mae1", valida("mae1", { texto: "" })));
        negado(await enviar("mae1", valida("mae1", { texto: "   " })));
    });

    test("aceita 2.000 caracteres, recusa 2.001", async () => {
        permitido(await enviar("mae1", valida("mae1", { texto: "x".repeat(2000) })));
        negado(await enviar("mae1", valida("mae1", { texto: "x".repeat(2001) })));
    });

    test("NÃO: data escolhida pelo celular (passado ou futuro) em vez da do servidor", async () => {
        negado(await enviar("mae1", valida("mae1", { criado_em: "2020-01-01T00:00:00Z" })));
        negado(await enviar("mae1", valida("mae1", { criado_em: "2099-01-01T00:00:00Z" })));
    });

    test("NÃO: sem login", async () => {
        negado(await anonimo().from("mensagens").insert(valida("mae1")).select());
    });
});

// =============================================================================
describe("tempo real (Realtime respeita o RLS)", () => {
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
    const assinar = (quem, recebidas) => new Promise((ok) => {
        u[quem].db.channel(`mensagens:${pasta}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `pasta_id=eq.${pasta}` },
                (e) => recebidas.push(e.new.texto))
            .subscribe((status) => { if (status === "SUBSCRIBED") ok(); });
    });

    test("o membro recebe a mensagem nova; quem está fora da pasta não recebe", async () => {
        const daEscola = [];
        const doMedicoDeFora = [];
        const doAdmin = [];
        try {
            await Promise.all([assinar("escola1", daEscola), assinar("medico2", doMedicoDeFora), assinar("admin1", doAdmin)]);
            await esperar(1500); // o servidor termina de preparar a assinatura
            permitido(await enviar("mae1", valida("mae1", { texto: "Mensagem em tempo real" })));
            await esperar(3000);
            // A escola pode receber também a mensagem gravada antes do teste
            // (o Realtime lê as mudanças com um pequeno atraso): ela é membro
            assert.ok(daEscola.includes("Mensagem em tempo real"), JSON.stringify(daEscola));
            assert.deepEqual(doMedicoDeFora, []);
            assert.deepEqual(doAdmin, []);
        } finally {
            for (const quem of ["escola1", "medico2", "admin1"]) await u[quem].db.removeAllChannels();
        }
    });
});

// =============================================================================
describe("mensagens imutáveis (RN08)", () => {
    test("NÃO: o autor edita", async () => {
        negado(await u.escola1.db.from("mensagens").update({ texto: "Editada" }).eq("id", mensagem).select());
        assert.equal((await linha("mensagens", mensagem)).texto, "Mensagem fictícia");
    });

    test("NÃO: o autor apaga", async () => {
        negado(await u.escola1.db.from("mensagens").delete().eq("id", mensagem).select());
        assert.ok(await linha("mensagens", mensagem));
    });

    test("NÃO: a mãe (dona da pasta) apaga mensagem de outra pessoa", async () => {
        negado(await u.mae1.db.from("mensagens").delete().eq("id", mensagem).select());
        assert.ok(await linha("mensagens", mensagem));
    });

    test("NÃO: o admin apaga", async () => {
        negado(await u.admin1.db.from("mensagens").delete().eq("id", mensagem).select());
        assert.ok(await linha("mensagens", mensagem));
    });
});
