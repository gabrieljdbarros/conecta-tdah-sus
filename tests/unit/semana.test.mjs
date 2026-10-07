/**
 * TESTES DA SEMANA DA "SÍNTESE DA SEMANA" (Início)
 * A semana vai de segunda 00:00 até a segunda seguinte (sem incluir).
 * Roda direto no Node (sem emulador). Executar: npm run test:unit
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { rotuloSemana, semanaAtual } from "../../src/helpers/semana.ts";

// Datas fictícias, no fuso local (como no aparelho)
const dia = (a, m, d, h = 12) => new Date(a, m - 1, d, h);

describe("semanaAtual", () => {
    test("numa quarta, a semana começa na segunda e termina na segunda seguinte", () => {
        const { inicio, fim } = semanaAtual(dia(2026, 10, 7)); // quarta
        assert.deepEqual(inicio, new Date(2026, 9, 5, 0, 0)); // segunda 5/10
        assert.deepEqual(fim, new Date(2026, 9, 12, 0, 0));   // segunda 12/10
    });

    test("no domingo, ainda é a semana que começou na segunda anterior", () => {
        const { inicio } = semanaAtual(dia(2026, 10, 11, 23));
        assert.deepEqual(inicio, new Date(2026, 9, 5, 0, 0));
    });

    test("na segunda de madrugada, já é a semana nova", () => {
        const { inicio } = semanaAtual(dia(2026, 10, 12, 0));
        assert.deepEqual(inicio, new Date(2026, 9, 12, 0, 0));
    });

    test("semana que vira o mês", () => {
        const { inicio, fim } = semanaAtual(dia(2026, 10, 1)); // quinta
        assert.deepEqual(inicio, new Date(2026, 8, 28, 0, 0)); // segunda 28/09
        assert.deepEqual(fim, new Date(2026, 9, 5, 0, 0));
    });
});

describe("rotuloSemana", () => {
    test("mesmo mês: '5 a 11 de outubro'", () => {
        assert.equal(rotuloSemana(semanaAtual(dia(2026, 10, 7))), "5 a 11 de outubro");
    });

    test("meses diferentes: '28 de setembro a 4 de outubro'", () => {
        assert.equal(rotuloSemana(semanaAtual(dia(2026, 10, 1))), "28 de setembro a 4 de outubro");
    });
});
