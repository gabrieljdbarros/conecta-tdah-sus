/**
 * TESTES DO QUESTIONÁRIO SNAP-IV (decisão travada 11)
 * - as 18 perguntas, na ordem e nos grupos certos
 * - contagem de sintomas: "Bastante" ou "Demais" conta; o resto não
 * - respostas incompletas ou fora da escala são recusadas (como no banco)
 * Roda direto no Node (sem banco). Executar: npm run test:unit
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { contarSintomas, ESCALA, ITENS_POR_GRUPO, PERGUNTAS, respostasValidas } from "../../src/helpers/questionario.ts";
import { paraQuestionario } from "../../src/helpers/linhas.ts";

const todas = (nota) => Array(18).fill(nota);

describe("perguntas", () => {
    test("18 itens numerados de 1 a 18, sem repetir", () => {
        assert.deepEqual(PERGUNTAS.map((p) => p.numero), Array.from({ length: 18 }, (_, i) => i + 1));
    });

    test("1–9 desatenção; 10–18 hiperatividade e impulsividade (9 em cada grupo)", () => {
        assert.ok(PERGUNTAS.slice(0, 9).every((p) => p.grupo === "desatencao"));
        assert.ok(PERGUNTAS.slice(9).every((p) => p.grupo === "hiperatividadeImpulsividade"));
        assert.equal(PERGUNTAS.filter((p) => p.grupo === "desatencao").length, ITENS_POR_GRUPO);
    });

    test("seções do formulário: 10–15 hiperatividade, 16–18 impulsividade", () => {
        assert.equal(PERGUNTAS[9].secao, "hiperatividade");
        assert.equal(PERGUNTAS[14].secao, "hiperatividade");
        assert.equal(PERGUNTAS[15].secao, "impulsividade");
    });

    test("escala de 4 níveis, de 0 a 3", () => {
        assert.deepEqual([...ESCALA], ["Nem um pouco", "Só um pouco", "Bastante", "Demais"]);
    });
});

describe("contarSintomas (regra de leitura por contagem)", () => {
    test("nada marcado como sintoma: zero nos dois grupos", () => {
        assert.deepEqual(contarSintomas(todas(1)), { desatencao: 0, hiperatividadeImpulsividade: 0 });
    });

    test("tudo 'Demais': 9 nos dois grupos", () => {
        assert.deepEqual(contarSintomas(todas(3)), { desatencao: 9, hiperatividadeImpulsividade: 9 });
    });

    test("'Bastante' (2) já conta; 'Só um pouco' (1) não", () => {
        const r = todas(0);
        r[0] = 2; r[1] = 1; r[8] = 3; // desatenção: itens 1 e 9
        r[9] = 1; r[17] = 2;          // hiperatividade/impulsividade: item 18
        assert.deepEqual(contarSintomas(r), { desatencao: 2, hiperatividadeImpulsividade: 1 });
    });

    test("NÃO conta respostas incompletas", () => {
        assert.throws(() => contarSintomas(todas(0).slice(1)));
    });
});

describe("respostasValidas (mesma regra do banco)", () => {
    test("aceita 18 notas de 0 a 3", () => {
        assert.equal(respostasValidas([...todas(0).slice(0, 9), ...todas(3).slice(0, 9)]), true);
    });

    for (const [caso, respostas] of [
        ["17 itens", todas(0).slice(1)],
        ["19 itens", [...todas(0), 0]],
        ["nota 4", [...todas(0).slice(1), 4]],
        ["nota negativa", [...todas(0).slice(1), -1]],
        ["nota quebrada", [...todas(0).slice(1), 1.5]],
        ["item sem resposta", [...todas(0).slice(1), null]],
        ["texto", [...todas(0).slice(1), "2"]],
    ]) {
        test(`NÃO aceita ${caso}`, () => {
            assert.equal(respostasValidas(respostas), false);
        });
    }
});

test("paraQuestionario converte a linha do banco", () => {
    const q = paraQuestionario({
        id: "q1", pasta_id: "p1", versao: "snap-iv-18-v1", respostas: todas(2),
        respondido_por: null, criado_em: "2026-11-02T12:00:00Z",
    });
    assert.equal(q.pastaId, "p1");
    assert.equal(q.respondidoPorUid, "");
    assert.equal(q.criadoEm, Date.UTC(2026, 10, 2, 12));
    assert.equal(q.respostas.length, 18);
});
