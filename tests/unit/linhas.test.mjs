/**
 * TESTES DA LÓGICA PURA COMPARTILHADA PELA WEB E PELO APP
 * - código do convite colado no app (RN01, RN02)
 * - conversão das linhas do banco para o formato das telas
 * - duração das mensagens de voz (RF16)
 * - mensagens de erro (nenhum texto técnico chega ao usuário)
 * Roda direto no Node (sem banco). Executar: npm run test:unit
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { codigoDoTexto } from "../../src/helpers/convite.ts";
import { duracaoPorExtenso, formatarDuracao, juntarMensagens, mensagemErro, mensagemErroAuth, paraMensagem, paraPasta } from "../../src/helpers/linhas.ts";

const CODIGO = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123-_A"; // 43 caracteres

describe("codigoDoTexto (convite colado no app)", () => {
    test("aceita o código sozinho", () => {
        assert.equal(codigoDoTexto(CODIGO), CODIGO);
    });

    test("tira o código do link inteiro, mesmo com espaços e texto em volta", () => {
        assert.equal(codigoDoTexto(`  Oi! Entre pelo link http://192.168.1.6:3000/convite/${CODIGO} \n`), CODIGO);
    });

    test("NÃO aceita código curto ou comprido demais", () => {
        assert.equal(codigoDoTexto(CODIGO.slice(1)), null);
        assert.equal(codigoDoTexto(`${CODIGO}x`), null);
    });

    test("NÃO aceita texto sem código", () => {
        assert.equal(codigoDoTexto("http://192.168.1.6:3000/convite/"), null);
        assert.equal(codigoDoTexto(""), null);
    });
});

const linhaTexto = {
    id: "x", tipo: "texto", texto: "Oi", audio_caminho: null, audio_duracao_s: null, audio_apagado_em: null,
    autor_id: "m1", autor_nome: "Médico Fictício", autor_papel: "medico", criado_em: "2026-10-23T12:00:00Z",
};

describe("conversão das linhas do banco", () => {
    test("pasta: membros viram membrosUids e participantes (sem detalhe vazio)", () => {
        const pasta = paraPasta({
            id: "p1", nome_aluno: "Aluno Fictício", dono_id: "m1", criado_em: "2026-10-23T12:00:00Z",
            membros_pasta: [
                { usuario_id: "m1", papel: "mae", nome: "Mãe Fictícia", detalhe: null },
                { usuario_id: "e1", papel: "escola", nome: "Professora Fictícia", detalhe: "Escola Fictícia" },
            ],
        });
        assert.deepEqual(pasta, {
            id: "p1", nomeAluno: "Aluno Fictício", donoUid: "m1",
            membrosUids: ["m1", "e1"],
            participantes: {
                m1: { nome: "Mãe Fictícia", papel: "mae" },
                e1: { nome: "Professora Fictícia", papel: "escola", detalhe: "Escola Fictícia" },
            },
            criadoEm: Date.parse("2026-10-23T12:00:00Z"),
        });
    });

    test("mensagem de autor que teve o perfil apagado continua aparecendo", () => {
        const m = paraMensagem({ ...linhaTexto, autor_id: null });
        assert.equal(m.autorUid, "");
        assert.equal(m.autorNome, "Médico Fictício");
        assert.equal(m.tipo, "texto");
    });

    test("mensagem de voz: caminho e duração, sem texto", () => {
        const m = paraMensagem({ ...linhaTexto, tipo: "audio", texto: null, audio_caminho: "p1/a1.m4a", audio_duracao_s: 95 });
        assert.equal(m.texto, null);
        assert.equal(m.audioCaminho, "p1/a1.m4a");
        assert.equal(m.audioDuracaoS, 95);
        assert.equal(m.audioApagado, false);
    });

    test("mensagem de voz depois dos 90 dias: continua, marcada como apagada", () => {
        const m = paraMensagem({ ...linhaTexto, tipo: "audio", texto: null, audio_duracao_s: 30, audio_apagado_em: "2027-01-21T12:00:00Z" });
        assert.equal(m.audioCaminho, null);
        assert.equal(m.audioApagado, true);
    });

    test("juntarMensagens: sem repetir, em ordem, só as mais recentes", () => {
        const msg = (id, ms) => ({ id, texto: id, autorUid: "u", autorNome: "N", autorPapel: "mae", criadoEm: ms });
        const lista = juntarMensagens([msg("b", 2), msg("a", 1)], [msg("c", 3), msg("b", 2)], 2);
        assert.deepEqual(lista.map((m) => m.id), ["b", "c"]);
    });
});

describe("duração das mensagens de voz", () => {
    test("formatarDuracao: minutos e segundos com dois dígitos", () => {
        assert.equal(formatarDuracao(0), "0:00");
        assert.equal(formatarDuracao(5), "0:05");
        assert.equal(formatarDuracao(95), "1:35");
        assert.equal(formatarDuracao(120), "2:00");
        assert.equal(formatarDuracao(59.6), "1:00");
    });

    test("duracaoPorExtenso: para o leitor de tela, no singular e no plural", () => {
        assert.equal(duracaoPorExtenso(1), "1 segundo");
        assert.equal(duracaoPorExtenso(45), "45 segundos");
        assert.equal(duracaoPorExtenso(60), "1 minuto");
        assert.equal(duracaoPorExtenso(95), "1 minuto e 35 segundos");
        assert.equal(duracaoPorExtenso(120), "2 minutos");
    });
});

describe("mensagens de erro para a tela", () => {
    test("erro previsto da função do banco: mostra a mensagem em português", () => {
        assert.equal(mensagemErro({ code: "22023", message: "Este convite expirou." }, "padrão"), "Este convite expirou.");
    });

    test("erro técnico do banco: mostra a mensagem padrão", () => {
        assert.equal(mensagemErro({ code: "42501", message: "permission denied for table pastas" }, "padrão"), "padrão");
        assert.equal(mensagemErro({ code: "22P02", message: "invalid input syntax for type uuid" }, "padrão"), "padrão");
        assert.equal(mensagemErro(null, "padrão"), "padrão");
    });

    test("login: códigos conhecidos e falta de conexão", () => {
        assert.equal(mensagemErroAuth({ code: "invalid_credentials" }), "E-mail ou senha incorretos");
        assert.equal(mensagemErroAuth({ name: "AuthRetryableFetchError" }), "Sem conexão. Confira a internet e tente de novo");
        assert.equal(mensagemErroAuth({ code: "algo_novo" }), "Não foi possível concluir. Tente novamente");
    });
});
