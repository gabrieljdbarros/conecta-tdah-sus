/**
 * ÚLTIMA MENSAGEM DE CADA PASTA (Home com recentes, etapa 5)
 * - cada membro recebe a data e o autor da última mensagem das SUAS pastas
 * - quem é de fora, quem saiu da pasta, o admin e quem não entrou não recebem
 * - nunca devolve o texto da mensagem
 */
import { before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonimo, criarPasta, criarUsuarios, PERFIS, restaurarPerfis, servico } from "./ajuda.mjs";

let u;
let pasta;      // pasta da mae1, com escola1 e medico1, com 2 mensagens
let semConversa; // outra pasta da mae1, sem nenhuma mensagem
let ultima;     // a mensagem mais nova da `pasta` (do medico1)

const mensagem = async (pastaId, quem, texto, criado_em) => {
    const { data, error } = await servico.from("mensagens").insert({
        pasta_id: pastaId, autor_id: u[quem].id, autor_nome: PERFIS[quem].nome,
        autor_papel: PERFIS[quem].role, texto, criado_em,
    }).select().single();
    if (error) throw error;
    return data;
};

const recentes = async (quem) => {
    const r = await (quem ? u[quem].db : anonimo()).rpc("ultimas_mensagens");
    return r;
};
const daPasta = (data, id) => (data ?? []).filter((l) => l.pasta_id === id);

before(async () => { u = await criarUsuarios(); });
beforeEach(async () => {
    await restaurarPerfis(u);
    pasta = await criarPasta(u, "mae1", ["escola1", "medico1"]);
    semConversa = await criarPasta(u, "mae1", [], "Outro Aluno Fictício");
    await mensagem(pasta, "mae1", "Mensagem fictícia antiga", "2026-01-01T10:00:00Z");
    ultima = await mensagem(pasta, "medico1", "Mensagem fictícia nova", "2026-01-02T10:00:00Z");
});

// =============================================================================
describe("membros recebem a última mensagem", () => {
    for (const quem of ["mae1", "escola1", "medico1"]) {
        test(`${quem} recebe a data e o autor da mensagem mais nova`, async () => {
            const { data, error } = await recentes(quem);
            assert.equal(error, null, error?.message);
            const linhas = daPasta(data, pasta);
            assert.equal(linhas.length, 1, "uma linha por pasta");
            assert.equal(new Date(linhas[0].criado_em).getTime(), new Date(ultima.criado_em).getTime());
            assert.equal(linhas[0].autor_id, u.medico1.id);
        });
    }

    test("só data e autor: nunca o texto da mensagem", async () => {
        const { data } = await recentes("mae1");
        assert.deepEqual(Object.keys(daPasta(data, pasta)[0]).sort(), ["autor_id", "criado_em", "pasta_id"]);
    });

    test("última de voz: só data e autor, sem o caminho do áudio", async () => {
        const { error } = await servico.from("mensagens").insert({
            pasta_id: pasta, autor_id: u.escola1.id, autor_nome: PERFIS.escola1.nome, autor_papel: "escola",
            tipo: "audio", audio_caminho: `${pasta}/00000000-0000-4000-8000-000000000001.m4a`, audio_duracao_s: 10,
            criado_em: "2026-01-03T10:00:00Z",
        });
        if (error) throw error;
        const linha = daPasta((await recentes("medico1")).data, pasta)[0];
        assert.deepEqual(Object.keys(linha).sort(), ["autor_id", "criado_em", "pasta_id"]);
        assert.equal(linha.autor_id, u.escola1.id);
    });

    test("autor sem perfil (apagado): a linha vem com autor vazio", async () => {
        const { error } = await servico.from("mensagens").insert({
            pasta_id: pasta, autor_id: null, autor_nome: "Pessoa Fictícia", autor_papel: "escola",
            texto: "Mensagem fictícia sem autor", criado_em: "2026-01-04T10:00:00Z",
        });
        if (error) throw error;
        assert.equal(daPasta((await recentes("mae1")).data, pasta)[0].autor_id, null);
    });

    test("cada um recebe só as próprias pastas, mesmo tendo outras com conversa", async () => {
        const outra = await criarPasta(u, "mae2", ["medico2"], "Aluno Fictício Dois");
        await mensagem(outra, "mae2", "Mensagem fictícia de outra família", "2026-01-05T10:00:00Z");
        const daMae2 = (await recentes("mae2")).data;
        assert.equal(daPasta(daMae2, outra).length, 1);
        assert.equal(daPasta(daMae2, pasta).length, 0);
        const daMae1 = (await recentes("mae1")).data;
        assert.equal(daPasta(daMae1, outra).length, 0);
        assert.equal(daPasta(daMae1, pasta).length, 1);
    });

    test("pasta sem mensagem não aparece", async () => {
        const { data } = await recentes("mae1");
        assert.equal(daPasta(data, semConversa).length, 0);
    });
});

// =============================================================================
describe("quem não é membro não recebe", () => {
    for (const quem of ["mae2", "escola2", "medico2", "admin1"]) {
        test(`NÃO: ${quem} recebe a pasta`, async () => {
            const { data, error } = await recentes(quem);
            assert.equal(error, null, error?.message);
            assert.equal(daPasta(data, pasta).length, 0);
        });
    }

    test("NÃO: o admin recebe qualquer pasta (RF13)", async () => {
        const { data } = await recentes("admin1");
        assert.equal(data.length, 0);
    });

    test("NÃO: quem saiu da pasta", async () => {
        await servico.from("membros_pasta").delete().eq("pasta_id", pasta).eq("usuario_id", u.medico1.id);
        const { data } = await recentes("medico1");
        assert.equal(daPasta(data, pasta).length, 0);
    });

    test("NÃO: a dona que não está mais entre os membros", async () => {
        await servico.from("membros_pasta").delete().eq("pasta_id", pasta).eq("usuario_id", u.mae1.id);
        const { data } = await recentes("mae1");
        assert.equal(daPasta(data, pasta).length, 0);
    });

    test("NÃO: quem só recebeu o convite (ainda não aceitou)", async () => {
        const { error } = await u.mae1.db.rpc("gerar_convite", { p_pasta_id: pasta, p_papel: "escola" });
        assert.equal(error, null, error?.message);
        const { data } = await recentes("escola2");
        assert.equal(daPasta(data, pasta).length, 0);
    });

    test("NÃO: sem login (a função nem pode ser chamada)", async () => {
        const { error } = await recentes(null);
        assert.ok(error, "deveria ter falhado");
        assert.match(`${error.code} ${error.message}`, /42501|permission denied/);
    });
});
