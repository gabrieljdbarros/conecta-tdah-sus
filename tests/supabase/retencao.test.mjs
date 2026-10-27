/**
 * RETENÇÃO DOS ÁUDIOS (decisão travada 10, LGPD)
 * - mensagem de voz com mais de 90 dias: o arquivo é apagado e a mensagem
 *   fica marcada como "áudio apagado"; áudio recente não é tocado
 * - arquivo que nunca virou mensagem: listado como sobra depois de 24 h
 * - a limpeza só roda com a chave; as funções do banco só para o sistema
 *
 * Precisa do Edge Runtime ligado (`npx supabase start` sem excluir o
 * edge-runtime) e da chave em supabase/functions/.env (docs/retencao-audios.md)
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonimo, API_URL, criarPasta, criarUsuarios, PERFIS, restaurarPerfis, servico } from "./ajuda.mjs";

const CHAVE = readFileSync(new URL("../../supabase/functions/.env", import.meta.url), "utf8")
    .match(/^CHAVE_LIMPEZA=(.+)$/m)?.[1]?.trim();
const FUNCAO = `${API_URL}/functions/v1/limpar-audios`;

let u;
let pasta; // pasta da mae1, com escola1
before(async () => {
    assert.ok(CHAVE, "Falta CHAVE_LIMPEZA em supabase/functions/.env");
    u = await criarUsuarios();
});
beforeEach(async () => {
    await restaurarPerfis(u);
    pasta = await criarPasta(u, "mae1", ["escola1"]);
});

const audioFicticio = () => new Blob([new Uint8Array(2048).fill(7)], { type: "audio/mp4" });
const caminhoNovo = () => `${pasta}/${randomUUID()}.m4a`;
const enviarArquivo = async (caminho) => {
    const { error } = await u.escola1.db.storage.from("audios").upload(caminho, audioFicticio(), { contentType: "audio/mp4" });
    assert.equal(error, null, error?.message);
};
const existe = async (caminho) => {
    const [pastaId, nome] = caminho.split("/");
    const { data } = await servico.storage.from("audios").list(pastaId, { search: nome });
    return (data ?? []).some((a) => a.name === nome);
};

/** Áudio completo da escola1; `diasAtras` envelhece a mensagem (só o sistema consegue) */
async function audio(diasAtras = 0) {
    const caminho = caminhoNovo();
    await enviarArquivo(caminho);
    const { data, error } = await u.escola1.db.from("mensagens").insert({
        pasta_id: pasta, autor_id: u.escola1.id, autor_nome: PERFIS.escola1.nome, autor_papel: "escola",
        tipo: "audio", audio_caminho: caminho, audio_duracao_s: 30,
    }).select("id");
    assert.equal(error, null, error?.message);
    const id = data[0].id;
    if (diasAtras) {
        const quando = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000).toISOString();
        const { error: erroData } = await servico.from("mensagens").update({ criado_em: quando }).eq("id", id);
        assert.equal(erroData, null, erroData?.message);
    }
    return { id, caminho };
}

const limpar = (cabecalhos = { "x-chave-limpeza": CHAVE }, metodo = "POST") =>
    fetch(FUNCAO, { method: metodo, headers: { "Content-Type": "application/json", ...cabecalhos }, body: metodo === "POST" ? "{}" : undefined });

const mensagem = async (id) =>
    (await servico.from("mensagens").select("audio_caminho, audio_apagado_em").eq("id", id).single()).data;

// =============================================================================
describe("limpeza diária (Edge Function limpar-audios)", () => {
    test("áudio com mais de 90 dias: arquivo apagado, mensagem continua marcada", async () => {
        const antigo = await audio(91);
        const resposta = await limpar();
        assert.equal(resposta.status, 200);
        assert.ok((await resposta.json()).expirados >= 1);

        const m = await mensagem(antigo.id);
        assert.equal(m.audio_caminho, null);
        assert.ok(m.audio_apagado_em, "a mensagem fica com a data em que o áudio foi apagado");
        assert.equal(await existe(antigo.caminho), false);
    });

    test("depois de apagado, ninguém consegue mais o link (aviso do prazo de guarda)", async () => {
        const antigo = await audio(91);
        assert.equal((await limpar()).status, 200);
        const { error } = await u.mae1.db.rpc("registrar_acesso_audio", { p_mensagem_id: antigo.id });
        assert.equal(error?.code, "P0002");
    });

    test("áudio recente (89 dias) e sobra recente continuam", async () => {
        const recente = await audio(89);
        const sobra = caminhoNovo();
        await enviarArquivo(sobra);
        assert.equal((await limpar()).status, 200);

        const m = await mensagem(recente.id);
        assert.equal(m.audio_caminho, recente.caminho);
        assert.equal(m.audio_apagado_em, null);
        assert.equal(await existe(recente.caminho), true);
        assert.equal(await existe(sobra), true, "a sobra só sai depois de 24 h (reenvio pelo app)");
    });

    test("NÃO roda sem a chave, com a chave errada ou por GET", async () => {
        const antigo = await audio(91);
        assert.equal((await limpar({})).status, 401);
        assert.equal((await limpar({ "x-chave-limpeza": "chave-errada" })).status, 401);
        assert.equal((await limpar({ "x-chave-limpeza": CHAVE }, "GET")).status, 405);
        assert.equal(await existe(antigo.caminho), true);
    });
});

describe("funções do banco da limpeza", () => {
    test("audios_orfaos: lista só o arquivo sem mensagem, passado o prazo", async () => {
        const comMensagem = await audio();
        const sobra = caminhoNovo();
        await enviarArquivo(sobra);

        const { data: velhos } = await servico.rpc("audios_orfaos", { p_idade: "0 seconds" });
        assert.ok(velhos.includes(sobra));
        assert.ok(!velhos.includes(comMensagem.caminho));

        const { data: padrao } = await servico.rpc("audios_orfaos");
        assert.ok(!padrao.includes(sobra), "com o prazo padrão (24 h), a sobra recente não entra");
    });

    for (const quem of ["mae1", "escola1", "admin1", null]) {
        test(`NÃO: ${quem ?? "sem login"} executa expirar_audios ou audios_orfaos`, async () => {
            const cliente = quem ? u[quem].db : anonimo();
            const antigo = await audio(91);
            assert.ok((await cliente.rpc("expirar_audios")).error);
            assert.ok((await cliente.rpc("audios_orfaos", { p_idade: "0 seconds" })).error);
            assert.equal((await mensagem(antigo.id)).audio_caminho, antigo.caminho);
        });
    }
});
