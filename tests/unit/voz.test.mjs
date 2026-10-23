/**
 * TESTES DA LÓGICA DE VOZ (decisão travada 9)
 *
 * O mais importante: conteúdo (mensagens) NUNCA usa voz online,
 * que mandaria o texto — dado de saúde — para servidores externos.
 * Roda direto no Node (sem banco). Executar: npm run test:unit
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dividirEmTrechos, escolherVoz } from "../../src/helpers/voz.ts";

const voz = (name, lang, localService) => ({ name, lang, localService });

const ONLINE_BR = voz("Google português do Brasil", "pt-BR", false);
const LOCAL_BR = voz("Microsoft Maria", "pt-BR", true);
const LOCAL_PT = voz("Joana", "pt-PT", true);
const INGLES = voz("Samantha", "en-US", true);

describe("escolherVoz", () => {
    test("conteúdo: NUNCA escolhe voz online, mesmo sendo a única em português", () => {
        assert.equal(escolherVoz([ONLINE_BR, INGLES], true), null);
    });

    test("conteúdo: escolhe a voz local em português", () => {
        assert.equal(escolherVoz([ONLINE_BR, LOCAL_BR, INGLES], true), LOCAL_BR);
    });

    test("conteúdo: aceita pt-PT local se não houver pt-BR local", () => {
        assert.equal(escolherVoz([ONLINE_BR, LOCAL_PT], true), LOCAL_PT);
    });

    test("instruções: prefere a local, mas aceita a online como reserva", () => {
        assert.equal(escolherVoz([ONLINE_BR, LOCAL_BR], false), LOCAL_BR);
        assert.equal(escolherVoz([ONLINE_BR, INGLES], false), ONLINE_BR);
    });

    test("prefere pt-BR a pt-PT", () => {
        assert.equal(escolherVoz([LOCAL_PT, LOCAL_BR], true), LOCAL_BR);
    });

    test("aceita o formato pt_BR (alguns Androids)", () => {
        const androide = voz("Português", "pt_BR", true);
        assert.equal(escolherVoz([androide], true), androide);
    });

    test("nunca escolhe voz em outra língua", () => {
        assert.equal(escolherVoz([INGLES], false), null);
    });
});

describe("dividirEmTrechos", () => {
    test("texto curto vira um trecho só", () => {
        assert.deepEqual(dividirEmTrechos("Olá. Tudo bem?"), ["Olá. Tudo bem?"]);
    });

    test("texto longo é quebrado nas frases, sem passar do limite", () => {
        const texto = Array.from({ length: 20 }, (_, i) => `Esta é a frase fictícia número ${i}.`).join(" ");
        const trechos = dividirEmTrechos(texto, 200);
        assert.ok(trechos.length > 1);
        assert.ok(trechos.every((t) => t.length <= 200));
        assert.equal(trechos.join(" "), texto);
    });

    test("frase única maior que o limite é cortada nos espaços", () => {
        const texto = "palavra ".repeat(60).trim();
        const trechos = dividirEmTrechos(texto, 100);
        assert.ok(trechos.every((t) => t.length <= 100));
        assert.equal(trechos.join(" "), texto);
    });

    test("texto vazio não gera trechos", () => {
        assert.deepEqual(dividirEmTrechos("   "), []);
    });
});
