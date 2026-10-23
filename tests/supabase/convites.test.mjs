/**
 * CONVITES (RN01: 48 horas; RN02: uso único) e saída/remoção da pasta.
 * Portados dos antigos testes das Security Rules do Firebase (e das Cloud
 * Functions, no caso dos convites), agora contra o RLS e as funções do banco.
 */
import { createHash } from "node:crypto";
import { before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonimo, criarPasta, criarUsuarios, falhou, linha, negado, PERFIS, permitido, restaurarPerfis, servico } from "./ajuda.mjs";

let u;
let pasta; // pasta da mae1, ainda sem ninguém vinculado
before(async () => { u = await criarUsuarios(); });
beforeEach(async () => {
    await restaurarPerfis(u);
    pasta = await criarPasta(u, "mae1");
});

const cliente = (quem) => (quem ? u[quem].db : anonimo());
const gerar = (quem, papel = "escola", pastaId = pasta) => cliente(quem).rpc("gerar_convite", { p_pasta_id: pastaId, p_papel: papel });
const aceitar = (quem, token) => cliente(quem).rpc("aceitar_convite", { p_token: token });
const remover = (quem, alvo, pastaId = pasta) => cliente(quem).rpc("remover_participante", { p_pasta_id: pastaId, p_participante_id: u[alvo]?.id ?? alvo });
const hash = (token) => createHash("sha256").update(token).digest("hex");

/** A mae1 gera um convite e devolve o token */
async function novoToken(papel = "escola") {
    const { data, error } = await gerar("mae1", papel);
    if (error) throw error;
    return data[0].token;
}
const conviteDo = async (token) => (await servico.from("convites").select().eq("token_hash", hash(token)).single()).data;
const ehMembro = async (quem) => {
    const { data } = await servico.from("membros_pasta").select("usuario_id").eq("pasta_id", pasta).eq("usuario_id", u[quem].id);
    return data.length === 1;
};

// =============================================================================
describe("gerar convite", () => {
    test("a dona gera um convite de 48 horas", async () => {
        const { data, error } = await gerar("mae1");
        assert.equal(error, null, error?.message);
        assert.match(data[0].token, /^[A-Za-z0-9_-]{43}$/);
        const horas = (new Date(data[0].expira_em).getTime() - Date.now()) / 3_600_000;
        assert.ok(horas > 47.9 && horas <= 48);
    });

    test("o banco guarda o hash, não o token", async () => {
        const token = await novoToken();
        const { data } = await servico.from("convites").select();
        assert.equal(data.length, 1);
        assert.equal(data[0].token_hash, hash(token));
        assert.ok(!JSON.stringify(data).includes(token));
    });

    test("NÃO: outra mãe gera convite para a pasta", async () => {
        falhou(await gerar("mae2"), /Só a responsável/);
    });

    test("NÃO: a escola (membro, mas não dona) gera convite", async () => {
        await aceitar("escola1", await novoToken());
        falhou(await gerar("escola1", "medico"), /Só a responsável/);
    });

    test("NÃO: o admin gera convite", async () => {
        falhou(await gerar("admin1"));
    });

    test("NÃO: convite para o papel de mãe ou admin", async () => {
        falhou(await gerar("mae1", "mae"));
        falhou(await gerar("mae1", "admin"));
    });

    test("NÃO: id de pasta inválido", async () => {
        falhou(await gerar("mae1", "escola", "pastas/outra"));
    });

    test("NÃO: sem login", async () => {
        falhou(await gerar(null));
    });
});

// =============================================================================
describe("aceitar convite", () => {
    test("a escola aceita e entra na pasta com nome, papel e escola", async () => {
        const token = await novoToken();
        const { data, error } = await aceitar("escola1", token);
        assert.equal(error, null, error?.message);
        assert.deepEqual(data, [{ pasta_id: pasta, nome_aluno: "Aluno Fictício" }]);

        const { data: membro } = await servico.from("membros_pasta").select("papel, nome, detalhe").eq("usuario_id", u.escola1.id).single();
        assert.deepEqual(membro, { papel: "escola", nome: PERFIS.escola1.nome, detalhe: "Escola Fictícia" });
        const convite = await conviteDo(token);
        assert.equal(convite.usado_por, u.escola1.id);
        assert.ok(convite.usado_em);
        // Agora a escola lê a pasta
        permitido(await u.escola1.db.from("pastas").select().eq("id", pasta));
    });

    test("o médico aceita e aparece com a unidade SUS", async () => {
        await aceitar("medico1", await novoToken("medico"));
        const { data: membro } = await servico.from("membros_pasta").select("papel, detalhe").eq("usuario_id", u.medico1.id).single();
        assert.deepEqual(membro, { papel: "medico", detalhe: "UBS Fictícia" });
    });

    test("NÃO: usar o mesmo link duas vezes (uso único)", async () => {
        const token = await novoToken();
        assert.equal((await aceitar("escola1", token)).error, null);
        falhou(await aceitar("escola2", token), /já foi usado/);
        assert.equal(await ehMembro("escola2"), false);
    });

    test("NÃO: duas pessoas abrindo o mesmo link ao mesmo tempo — só uma entra", async () => {
        const token = await novoToken();
        const resultados = await Promise.all([aceitar("escola1", token), aceitar("escola2", token)]);
        assert.equal(resultados.filter((r) => r.error === null).length, 1);
        const { data } = await servico.from("membros_pasta").select().eq("pasta_id", pasta).eq("papel", "escola");
        assert.equal(data.length, 1);
    });

    test("NÃO: a mesma pessoa abre dois convites da pasta ao mesmo tempo — entra uma vez só", async () => {
        const [t1, t2] = [await novoToken(), await novoToken()];
        const resultados = await Promise.all([aceitar("escola1", t1), aceitar("escola1", t2)]);
        assert.equal(resultados.filter((r) => r.error === null).length, 1);
        const erro = resultados.find((r) => r.error)?.error;
        assert.match(erro.message, /já faz parte/);
    });

    test("NÃO: link expirado", async () => {
        const token = await novoToken();
        await servico.from("convites").update({ expira_em: new Date(Date.now() - 1000).toISOString() }).eq("token_hash", hash(token));
        falhou(await aceitar("escola1", token), /expirou/);
    });

    test("NÃO: médico usa link de escola", async () => {
        falhou(await aceitar("medico1", await novoToken("escola")), /para escola/);
        assert.equal(await ehMembro("medico1"), false);
    });

    test("NÃO: conta de mãe usa o link (leria tudo como mãe)", async () => {
        falhou(await aceitar("mae2", await novoToken()));
        assert.equal(await ehMembro("mae2"), false);
    });

    test("NÃO: admin usa o link", async () => {
        falhou(await aceitar("admin1", await novoToken()));
        assert.equal(await ehMembro("admin1"), false);
    });

    test("NÃO: quem já está na pasta aceita outro convite", async () => {
        await aceitar("escola1", await novoToken());
        falhou(await aceitar("escola1", await novoToken()), /já faz parte/);
    });

    test("NÃO: convite cancelado pela dona", async () => {
        const token = await novoToken();
        permitido(await u.mae1.db.from("convites").delete().eq("token_hash", hash(token)).select());
        falhou(await aceitar("escola1", token), /não existe/);
    });

    test("NÃO: token inventado ou fora do formato", async () => {
        falhou(await aceitar("escola1", "A".repeat(43)), /não existe/);
        falhou(await aceitar("escola1", "curto"), /não existe/);
    });

    test("NÃO: sem login", async () => {
        falhou(await aceitar(null, await novoToken()));
    });
});

// =============================================================================
describe("ler e mexer nos convites direto na tabela", () => {
    test("quem criou lê os próprios convites da pasta", async () => {
        await novoToken();
        await novoToken("medico");
        const { data } = await u.mae1.db.from("convites").select().eq("pasta_id", pasta);
        assert.equal(data.length, 2);
    });

    for (const quem of ["escola1", "mae2", "admin1"]) {
        test(`NÃO: ${quem} lê os convites`, async () => {
            await novoToken();
            negado(await u[quem].db.from("convites").select());
        });
    }

    test("NÃO: sem login", async () => {
        await novoToken();
        negado(await anonimo().from("convites").select());
    });

    test("NÃO: apagar convite já usado (registro de quem entrou)", async () => {
        const token = await novoToken();
        await aceitar("escola1", token);
        negado(await u.mae1.db.from("convites").delete().eq("token_hash", hash(token)).select());
        assert.ok(await conviteDo(token));
    });

    test("NÃO: outra pessoa cancela o convite", async () => {
        const token = await novoToken();
        negado(await u.mae2.db.from("convites").delete().eq("token_hash", hash(token)).select());
        assert.ok(await conviteDo(token));
    });

    test("NÃO: criar convite direto na tabela (só pela função)", async () => {
        negado(await u.mae1.db.from("convites").insert({
            token_hash: hash("x".repeat(43)), pasta_id: pasta, papel: "escola", criado_por: u.mae1.id, expira_em: new Date(Date.now() + 1e9).toISOString(),
        }).select());
    });

    test("NÃO: marcar convite como usado ou aumentar a validade", async () => {
        const token = await novoToken();
        const antes = await conviteDo(token);
        negado(await u.mae1.db.from("convites").update({ usado_em: new Date().toISOString(), usado_por: u.escola1.id }).eq("id", antes.id).select());
        negado(await u.mae1.db.from("convites").update({ expira_em: "2099-01-01T00:00:00Z" }).eq("id", antes.id).select());
        assert.deepEqual(await linha("convites", antes.id), antes);
    });
});

// =============================================================================
describe("remover participante e sair da pasta", () => {
    beforeEach(async () => {
        await aceitar("escola1", await novoToken("escola"));
        await aceitar("medico1", await novoToken("medico"));
    });

    test("a dona remove a escola, que sai da pasta e perde a leitura", async () => {
        const { error } = await remover("mae1", "escola1");
        assert.equal(error, null, error?.message);
        assert.equal(await ehMembro("escola1"), false);
        negado(await u.escola1.db.from("pastas").select().eq("id", pasta));
        negado(await u.escola1.db.from("mensagens").select().eq("pasta_id", pasta));
    });

    test("o médico sai da pasta", async () => {
        assert.equal((await remover("medico1", "medico1")).error, null);
        assert.equal(await ehMembro("medico1"), false);
    });

    test("quem saiu pode ser convidado de novo", async () => {
        await remover("mae1", "escola1");
        assert.equal((await aceitar("escola1", await novoToken())).error, null);
        assert.equal(await ehMembro("escola1"), true);
    });

    test("NÃO: o médico remove a escola", async () => {
        falhou(await remover("medico1", "escola1"), /Só a responsável/);
        assert.equal(await ehMembro("escola1"), true);
    });

    test("NÃO: a dona sai da pasta (ficaria sem responsável)", async () => {
        falhou(await remover("mae1", "mae1"), /não pode sair/);
    });

    test("NÃO: a escola remove a dona", async () => {
        falhou(await remover("escola1", "mae1"), /não pode sair/);
        assert.equal(await ehMembro("mae1"), true);
    });

    test("NÃO: remover quem não faz parte da pasta", async () => {
        falhou(await remover("mae1", "medico2"), /não faz parte da pasta/);
    });

    test("NÃO: quem não é membro chama (nem descobre se a pasta existe)", async () => {
        const naPasta = await remover("mae2", "escola1");
        const semPasta = await remover("mae2", "escola1", "00000000-0000-0000-0000-000000000000");
        falhou(naPasta);
        falhou(semPasta);
        assert.equal(naPasta.error.message, semPasta.error.message);
        assert.equal(await ehMembro("escola1"), true);
    });

    test("NÃO: o admin remove alguém", async () => {
        falhou(await remover("admin1", "escola1"));
        assert.equal(await ehMembro("escola1"), true);
    });

    test("NÃO: ids inválidos", async () => {
        falhou(await remover("mae1", "nao-e-um-id"));
        falhou(await remover("mae1", "escola1", "pastas/outra"));
    });

    test("NÃO: sem login", async () => {
        falhou(await remover(null, "escola1"));
    });
});
