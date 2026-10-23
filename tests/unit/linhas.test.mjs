/**
 * TESTES DA LÓGICA PURA COMPARTILHADA PELA WEB E PELO APP
 * - código do convite colado no app (RN01, RN02)
 * - conversão das linhas do banco para o formato das telas
 * - mensagens de erro (nenhum texto técnico chega ao usuário)
 * Roda direto no Node (sem banco). Executar: npm run test:unit
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { codigoDoTexto } from "../../src/helpers/convite.ts";
import { juntarMensagens, mensagemErro, mensagemErroAuth, paraMensagem, paraPasta } from "../../src/helpers/linhas.ts";

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
        const m = paraMensagem({ id: "x", texto: "Oi", autor_id: null, autor_nome: "Médico Fictício", autor_papel: "medico", criado_em: "2026-10-23T12:00:00Z" });
        assert.equal(m.autorUid, "");
        assert.equal(m.autorNome, "Médico Fictício");
    });

    test("juntarMensagens: sem repetir, em ordem, só as mais recentes", () => {
        const msg = (id, ms) => ({ id, texto: id, autorUid: "u", autorNome: "N", autorPapel: "mae", criadoEm: ms });
        const lista = juntarMensagens([msg("b", 2), msg("a", 1)], [msg("c", 3), msg("b", 2)], 2);
        assert.deepEqual(lista.map((m) => m.id), ["b", "c"]);
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
