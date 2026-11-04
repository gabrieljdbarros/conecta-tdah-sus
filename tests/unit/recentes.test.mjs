/**
 * TESTES DA BUSCA E DAS RECENTES (etapa 5)
 * - a busca ignora acentos e maiúsculas e acha pelo aluno, pela mãe ou pela escola
 * - "mensagem nova" só quando outra pessoa escreveu depois da última vista
 * - recentes: da conversa mais nova para a mais antiga, sem as pastas sem conversa
 * Dados fictícios. Roda direto no Node (sem banco). Executar: npm run test:unit
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buscarPastas, ordenarPorConversa, pastasRecentes, quandoFoi, quemEstaNaPasta, semAcentos, temMensagemNova } from "../../src/helpers/recentes.ts";
import { paraUltimaMensagem } from "../../src/helpers/linhas.ts";

const pasta = (id, nomeAluno, participantes) => ({
    id, nomeAluno, donoUid: "mae-" + id, membrosUids: Object.keys(participantes), participantes, criadoEm: 0,
});
const PEDRO = pasta("1", "Pedro Fictício", {
    m1: { nome: "Ana Exemplo", papel: "mae" },
    e1: { nome: "Prof. Teste", papel: "escola", detalhe: "Escola Girassol" },
    d1: { nome: "Dra. Fictícia", papel: "medico", detalhe: "CAPSi Exemplo" },
});
const OUTRO_PEDRO = pasta("2", "Pedro Fictício", { m2: { nome: "Rita Exemplo", papel: "mae" } });
const JOAO = pasta("3", "João Teste", { m3: { nome: "Lia Exemplo", papel: "mae" } });
const TODAS = [PEDRO, OUTRO_PEDRO, JOAO];

describe("busca", () => {
    test("ignora acentos, maiúsculas e espaços", () => {
        assert.equal(semAcentos("  João PEDRO "), "joao pedro");
        assert.deepEqual(buscarPastas(TODAS, "joao").map((p) => p.id), ["3"]);
        assert.deepEqual(buscarPastas(TODAS, "FICTICIO").map((p) => p.id), ["1", "2"]);
    });

    test("acha pelo nome da mãe ou da escola", () => {
        assert.deepEqual(buscarPastas(TODAS, "rita").map((p) => p.id), ["2"]);
        assert.deepEqual(buscarPastas(TODAS, "girassol").map((p) => p.id), ["1"]);
    });

    test("cada palavra precisa aparecer (separa os dois Pedros)", () => {
        assert.deepEqual(buscarPastas(TODAS, "pedro ana").map((p) => p.id), ["1"]);
        assert.deepEqual(buscarPastas(TODAS, "pedro lia").map((p) => p.id), []);
    });

    test("busca vazia devolve todas, sem mudar a lista original", () => {
        const r = buscarPastas(TODAS, "   ");
        assert.equal(r.length, 3);
        assert.notEqual(r, TODAS);
    });
});

describe("mensagem nova", () => {
    const ultima = { pastaId: "1", criadoEm: 2000, autorUid: "e1" };

    test("outra pessoa escreveu depois da última vista: nova", () => {
        assert.equal(temMensagemNova(ultima, 1000, "d1"), true);
    });

    test("nunca aberta neste aparelho: nova", () => {
        assert.equal(temMensagemNova(ultima, undefined, "d1"), true);
    });

    test("já vista: não é nova", () => {
        assert.equal(temMensagemNova(ultima, 2000, "d1"), false);
        assert.equal(temMensagemNova(ultima, 3000, "d1"), false);
    });

    test("a última foi minha: não é nova", () => {
        assert.equal(temMensagemNova(ultima, undefined, "e1"), false);
    });

    test("pasta sem conversa: não é nova", () => {
        assert.equal(temMensagemNova(undefined, undefined, "d1"), false);
    });
});

describe("recentes", () => {
    const ultimas = new Map([
        ["1", { pastaId: "1", criadoEm: 1000, autorUid: "m1" }],
        ["3", { pastaId: "3", criadoEm: 5000, autorUid: "m3" }],
    ]);

    test("da conversa mais nova para a mais antiga; sem conversa fica de fora", () => {
        assert.deepEqual(pastasRecentes(TODAS, ultimas).map((p) => p.id), ["3", "1"]);
    });

    test("respeita o limite", () => {
        assert.deepEqual(pastasRecentes(TODAS, ultimas, 1).map((p) => p.id), ["3"]);
    });

    test("todas: com conversa primeiro, depois as sem conversa", () => {
        assert.deepEqual(ordenarPorConversa(TODAS, ultimas).map((p) => p.id), ["3", "1", "2"]);
    });

    test("não muda a ordem da lista original", () => {
        pastasRecentes(TODAS, ultimas);
        assert.deepEqual(TODAS.map((p) => p.id), ["1", "2", "3"]);
    });
});

describe("quando foi", () => {
    // Datas no fuso do aparelho (o mesmo que a tela usa)
    const agora = new Date(2026, 10, 4, 15, 0).getTime();
    test("hoje com a hora, ontem, data no mesmo ano e em outro ano", () => {
        assert.equal(quandoFoi(new Date(2026, 10, 4, 9, 5).getTime(), agora), "hoje, 09:05");
        assert.equal(quandoFoi(new Date(2026, 10, 3, 23, 59).getTime(), agora), "ontem");
        assert.equal(quandoFoi(new Date(2026, 9, 12, 8, 0).getTime(), agora), "12 de out.");
        assert.equal(quandoFoi(new Date(2025, 4, 1, 8, 0).getTime(), agora), "1 de maio de 2025");
    });

    test("versão falada, sem abreviação", () => {
        assert.equal(quandoFoi(new Date(2026, 10, 4, 9, 5).getTime(), agora, true), "hoje às 09:05");
        assert.equal(quandoFoi(new Date(2026, 10, 3, 9, 5).getTime(), agora, true), "ontem");
        assert.equal(quandoFoi(new Date(2026, 9, 12, 8, 0).getTime(), agora, true), "12 de outubro");
    });
});

describe("quem está na pasta", () => {
    test("mãe e escola, para diferenciar alunos com o mesmo nome", () => {
        assert.equal(quemEstaNaPasta(PEDRO), "Mãe: Ana Exemplo, Escola Girassol");
        assert.equal(quemEstaNaPasta(OUTRO_PEDRO), "Mãe: Rita Exemplo");
    });
});

describe("linha do banco", () => {
    test("converte a última mensagem (data do servidor em milissegundos)", () => {
        assert.deepEqual(
            paraUltimaMensagem({ pasta_id: "1", criado_em: "2026-01-02T10:00:00+00:00", autor_id: null }),
            { pastaId: "1", criadoEm: Date.UTC(2026, 0, 2, 10), autorUid: null },
        );
    });
});
