/**
 * MENSAGENS DE VOZ (RF16, RN08, RN09, decisão travada 10)
 * - bucket privado, só membros da pasta enviam e ouvem
 * - nome do arquivo sem o nome da criança; até 1 MB; só áudio
 * - ouvir só com o acesso registrado no log
 * - ninguém troca nem apaga um áudio
 */
import { randomUUID } from "node:crypto";
import { before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonimo, criarPasta, criarUsuarios, falhou, negado, PERFIS, permitido, restaurarPerfis, servico } from "./ajuda.mjs";

let u;
let pasta; // pasta da mae1, com escola1 e medico1
before(async () => { u = await criarUsuarios(); });
beforeEach(async () => {
    await restaurarPerfis(u);
    pasta = await criarPasta(u, "mae1", ["escola1", "medico1"]);
});

// "Áudio" fictício: bytes quaisquer com o tipo de arquivo de voz do app
const audioFicticio = (tamanho = 2048) => new Blob([new Uint8Array(tamanho).fill(7)], { type: "audio/mp4" });
const caminhoNovo = (pastaId = pasta) => `${pastaId}/${randomUUID()}.m4a`;
const bucket = (quem) => (quem ? u[quem].db : anonimo()).storage.from("audios");
const enviarArquivo = (quem, caminho = caminhoNovo(), arquivo = audioFicticio()) =>
    bucket(quem).upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
const existe = async (caminho) => {
    const [pastaId, nome] = caminho.split("/");
    const { data } = await servico.storage.from("audios").list(pastaId, { search: nome });
    return (data ?? []).some((a) => a.name === nome);
};

const msgAudio = (quem, caminho, extra = {}) => ({
    pasta_id: pasta, autor_id: u[quem].id, autor_nome: PERFIS[quem].nome, autor_papel: PERFIS[quem].role,
    tipo: "audio", audio_caminho: caminho, audio_duracao_s: 30, ...extra,
});
const gravarMensagem = (quem, dados) => u[quem].db.from("mensagens").insert(dados).select();

/** A escola1 envia um áudio completo (arquivo + mensagem) e devolve os dois */
async function audioDaEscola() {
    const caminho = caminhoNovo();
    assert.equal((await enviarArquivo("escola1", caminho)).error, null);
    const { data, error } = await gravarMensagem("escola1", msgAudio("escola1", caminho));
    assert.equal(error, null, error?.message);
    return { caminho, mensagem: data[0].id };
}
const registrar = (quem, mensagemId) => (quem ? u[quem].db : anonimo()).rpc("registrar_acesso_audio", { p_mensagem_id: mensagemId });
const link = (quem, caminho) => bucket(quem).createSignedUrl(caminho, 300);

// =============================================================================
describe("enviar o arquivo de áudio", () => {
    for (const quem of ["mae1", "escola1", "medico1"]) {
        test(`${quem} (membro) envia na pasta`, async () => {
            const { error } = await enviarArquivo(quem);
            assert.equal(error, null, error?.message);
        });
    }

    for (const quem of ["medico2", "mae2", "admin1"]) {
        test(`NÃO: ${quem} (fora da pasta) envia`, async () => {
            const caminho = caminhoNovo();
            assert.ok((await enviarArquivo(quem, caminho)).error);
            assert.equal(await existe(caminho), false);
        });
    }

    test("NÃO: sem login", async () => {
        assert.ok((await enviarArquivo(null)).error);
    });

    test("NÃO: membro envia na pasta de outra família", async () => {
        const outra = await criarPasta(u, "mae2");
        assert.ok((await enviarArquivo("escola1", caminhoNovo(outra))).error);
    });

    test("NÃO: nome do arquivo fora do formato (ex.: com o nome da criança)", async () => {
        assert.ok((await enviarArquivo("mae1", `${pasta}/Aluno-Ficticio.m4a`)).error);
        assert.ok((await enviarArquivo("mae1", `${pasta}/${randomUUID()}.mp3`)).error);
        assert.ok((await enviarArquivo("mae1", `${randomUUID()}.m4a`)).error);
    });

    test("NÃO: arquivo maior que 1 MB", async () => {
        assert.ok((await enviarArquivo("mae1", caminhoNovo(), audioFicticio(1024 * 1024 + 1))).error);
    });

    test("NÃO: arquivo que não é áudio", async () => {
        const texto = new Blob(["não é áudio"], { type: "text/plain" });
        assert.ok((await enviarArquivo("mae1", caminhoNovo(), texto)).error);
    });

    test("NÃO: o bucket não é público (o endereço público não abre o arquivo)", async () => {
        const caminho = caminhoNovo();
        await enviarArquivo("mae1", caminho);
        const { data } = servico.storage.from("audios").getPublicUrl(caminho);
        const resposta = await fetch(data.publicUrl);
        assert.notEqual(resposta.status, 200);
    });
});

// =============================================================================
describe("mensagem de áudio no chat", () => {
    test("o membro envia o arquivo e a mensagem, com duração", async () => {
        const { mensagem } = await audioDaEscola();
        const { data } = await u.mae1.db.from("mensagens").select("tipo, texto, audio_duracao_s, autor_papel").eq("id", mensagem).single();
        assert.deepEqual(data, { tipo: "audio", texto: null, audio_duracao_s: 30, autor_papel: "escola" });
    });

    test("aceita 120 segundos, recusa 121 e 0", async () => {
        for (const [duracao, ok] of [[120, true], [121, false], [0, false]]) {
            const caminho = caminhoNovo();
            await enviarArquivo("mae1", caminho);
            const r = await gravarMensagem("mae1", msgAudio("mae1", caminho, { audio_duracao_s: duracao }));
            if (ok) permitido(r); else negado(r);
        }
    });

    test("NÃO: mensagem de áudio sem o arquivo enviado", async () => {
        negado(await gravarMensagem("mae1", msgAudio("mae1", caminhoNovo())));
    });

    test("NÃO: usar o arquivo que outra pessoa enviou", async () => {
        const caminho = caminhoNovo();
        await enviarArquivo("escola1", caminho);
        negado(await gravarMensagem("medico1", msgAudio("medico1", caminho)));
    });

    test("NÃO: arquivo de outra pasta", async () => {
        const outra = await criarPasta(u, "mae2", ["escola1"]);
        const caminho = caminhoNovo(outra);
        assert.equal((await enviarArquivo("escola1", caminho)).error, null);
        negado(await gravarMensagem("escola1", msgAudio("escola1", caminho)));
    });

    test("NÃO: o mesmo arquivo em duas mensagens", async () => {
        const { caminho } = await audioDaEscola();
        negado(await gravarMensagem("escola1", msgAudio("escola1", caminho)));
    });

    test("NÃO: áudio com texto junto, ou texto com arquivo", async () => {
        const caminho = caminhoNovo();
        await enviarArquivo("mae1", caminho);
        negado(await gravarMensagem("mae1", msgAudio("mae1", caminho, { texto: "oi" })));
        negado(await gravarMensagem("mae1", { ...msgAudio("mae1", caminho), tipo: "texto", texto: "oi" }));
    });

    test("NÃO: o app marca o áudio como apagado", async () => {
        const caminho = caminhoNovo();
        await enviarArquivo("mae1", caminho);
        negado(await gravarMensagem("mae1", msgAudio("mae1", caminho, { audio_apagado_em: new Date().toISOString() })));
    });

    test("mensagem de texto continua funcionando", async () => {
        permitido(await gravarMensagem("mae1", {
            pasta_id: pasta, autor_id: u.mae1.id, autor_nome: PERFIS.mae1.nome, autor_papel: "mae", texto: "Mensagem de texto fictícia",
        }));
    });
});

// =============================================================================
describe("ouvir o áudio (link temporário com log, RN09)", () => {
    test("o membro registra o acesso e recebe um link que funciona", async () => {
        const { caminho, mensagem } = await audioDaEscola();
        const { data: devolvido, error } = await registrar("mae1", mensagem);
        assert.equal(error, null, error?.message);
        assert.equal(devolvido, caminho);

        const { data, error: erroLink } = await link("mae1", caminho);
        assert.equal(erroLink, null, erroLink?.message);
        const resposta = await fetch(data.signedUrl);
        assert.equal(resposta.status, 200);
        assert.equal((await resposta.arrayBuffer()).byteLength, 2048);
    });

    test("o log registra quem enviou e cada vez que alguém ouve (com nome e papel)", async () => {
        const { mensagem } = await audioDaEscola();
        await registrar("mae1", mensagem);
        await registrar("medico1", mensagem);
        await registrar("mae1", mensagem);
        const { data } = await servico.from("log_audios").select("acao, usuario_id, usuario_nome, usuario_papel")
            .eq("mensagem_id", mensagem).order("registrado_em");
        assert.deepEqual(data.map((l) => [l.acao, l.usuario_id]), [
            ["enviou", u.escola1.id], ["ouviu", u.mae1.id], ["ouviu", u.medico1.id], ["ouviu", u.mae1.id],
        ]);
        assert.deepEqual([data[1].usuario_nome, data[1].usuario_papel], [PERFIS.mae1.nome, "mae"]);
    });

    test("o log continua legível se o perfil de quem ouviu for apagado", async () => {
        const { mensagem } = await audioDaEscola();
        await registrar("medico1", mensagem);
        await servico.from("perfis").delete().eq("id", u.medico1.id);
        const { data } = await servico.from("log_audios").select("usuario_id, usuario_nome").eq("acao", "ouviu").eq("mensagem_id", mensagem).single();
        assert.deepEqual(data, { usuario_id: null, usuario_nome: PERFIS.medico1.nome });
    });

    test("NÃO: pedir o link sem registrar o acesso (o log não pode ser pulado)", async () => {
        const { caminho } = await audioDaEscola();
        assert.ok((await link("mae1", caminho)).error);
        assert.ok((await bucket("mae1").download(caminho)).error);
    });

    test("NÃO: registro de acesso de outra pessoa não serve", async () => {
        const { caminho, mensagem } = await audioDaEscola();
        await registrar("mae1", mensagem);
        assert.ok((await link("medico1", caminho)).error);
    });

    test("NÃO: registro com mais de 5 minutos não serve", async () => {
        const { caminho, mensagem } = await audioDaEscola();
        await registrar("mae1", mensagem);
        await servico.from("log_audios").update({ registrado_em: new Date(Date.now() - 6 * 60_000).toISOString() }).eq("mensagem_id", mensagem);
        assert.ok((await link("mae1", caminho)).error);
    });

    for (const [quem, rotulo] of [["medico2", "médico de fora da pasta"], ["mae2", "outra mãe"], ["admin1", "admin"]]) {
        test(`NÃO: ${rotulo} ouve`, async () => {
            const { caminho, mensagem } = await audioDaEscola();
            falhou(await registrar(quem, mensagem), /Não foi possível abrir/);
            assert.ok((await link(quem, caminho)).error);
        });
    }

    test("NÃO: quem saiu da pasta ouve", async () => {
        const { mensagem } = await audioDaEscola();
        await servico.from("membros_pasta").delete().eq("pasta_id", pasta).eq("usuario_id", u.medico1.id);
        falhou(await registrar("medico1", mensagem));
    });

    test("NÃO: sem login", async () => {
        const { caminho, mensagem } = await audioDaEscola();
        falhou(await registrar(null, mensagem));
        assert.ok((await link(null, caminho)).error);
    });

    test("NÃO: listar os áudios da pasta", async () => {
        await audioDaEscola();
        const { data } = await bucket("mae1").list(pasta);
        assert.deepEqual(data ?? [], []);
    });

    test("ninguém lê o log pelo app", async () => {
        const { mensagem } = await audioDaEscola();
        await registrar("mae1", mensagem);
        for (const quem of ["mae1", "admin1"]) negado(await u[quem].db.from("log_audios").select());
    });

    test("áudio apagado pelo prazo de guarda: avisa, sem link", async () => {
        const { mensagem } = await audioDaEscola();
        await servico.from("mensagens").update({ audio_caminho: null, audio_apagado_em: new Date().toISOString() }).eq("id", mensagem);
        falhou(await registrar("mae1", mensagem), /90 dias/);
    });
});

// =============================================================================
describe("ninguém troca nem apaga um áudio (RN08)", () => {
    test("NÃO: o autor apaga o arquivo", async () => {
        const { caminho } = await audioDaEscola();
        await bucket("escola1").remove([caminho]);
        assert.equal(await existe(caminho), true);
    });

    test("NÃO: a mãe (dona da pasta) apaga o arquivo", async () => {
        const { caminho } = await audioDaEscola();
        await bucket("mae1").remove([caminho]);
        assert.equal(await existe(caminho), true);
    });

    test("NÃO: o autor troca o arquivo por outro", async () => {
        const { caminho } = await audioDaEscola();
        assert.ok((await bucket("escola1").update(caminho, audioFicticio(10))).error);
        assert.ok((await bucket("escola1").upload(caminho, audioFicticio(10), { upsert: true, contentType: "audio/mp4" })).error);
    });

    test("NÃO: o autor edita a mensagem de áudio", async () => {
        const { mensagem } = await audioDaEscola();
        negado(await u.escola1.db.from("mensagens").update({ audio_duracao_s: 5 }).eq("id", mensagem).select());
    });
});
