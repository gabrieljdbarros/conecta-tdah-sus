/**
 * TESTES DAS CLOUD FUNCTIONS DE CONVITE (RN01, RN02)
 *
 * Rodam nos emuladores de Auth, Firestore e Functions, no projeto fictício
 * `demo-conecta-tdah`. Cada usuário é uma conta de verdade no emulador de
 * Auth, e as chamadas passam pelo mesmo caminho que o site usa
 * (httpsCallable). Todos os dados são fictícios.
 *
 * Executar: npm run test:functions
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import {
    HORA, encerrarAmbiente, falhaCom, hashDoToken, novaEscola, novaMae, novaPasta, novoApp, novoMedico,
    prepararAmbiente,
} from "./ajuda.mjs";

let testEnv;

before(async () => {
    // Usado só para gravar um convite expirado direto no banco
    testEnv = await prepararAmbiente();
});

after(encerrarAmbiente);

// =============================================================================
describe("gerarConvite", () => {
    test("a dona gera um convite de 48 horas", async () => {
        const mae = await novaMae();
        const pastaId = await novaPasta(mae);
        const antes = Date.now();
        const { token, expiraEm } = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });

        assert.match(token, /^[A-Za-z0-9_-]{43}$/);
        assert.ok(Math.abs(expiraEm - (antes + 48 * HORA)) < 60_000);
    });

    test("o banco guarda o hash, não o token", async () => {
        const mae = await novaMae();
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "medico" });

        const peloHash = await getDoc(doc(mae.db, `convites/${hashDoToken(token)}`));
        assert.equal(peloHash.exists(), true);
        assert.equal(JSON.stringify(peloHash.data()).includes(token), false);
    });

    test("NÃO: outra mãe gera convite para a pasta", async () => {
        const mae = await novaMae();
        const outra = await novaMae();
        const pastaId = await novaPasta(mae);
        await falhaCom(outra.chamar("gerarConvite", { pastaId, papel: "escola" }), "permission-denied");
    });

    test("NÃO: id de pasta com caminho (\"/\")", async () => {
        const mae = await novaMae();
        await falhaCom(mae.chamar("gerarConvite", { pastaId: "x/../y", papel: "escola" }), "invalid-argument");
    });

    test("NÃO: convite para o papel de mãe", async () => {
        const mae = await novaMae();
        const pastaId = await novaPasta(mae);
        await falhaCom(mae.chamar("gerarConvite", { pastaId, papel: "mae" }), "invalid-argument");
    });

    test("NÃO: sem login", async () => {
        const mae = await novaMae();
        const pastaId = await novaPasta(mae);
        await falhaCom(novoApp().chamar("gerarConvite", { pastaId, papel: "escola" }), "unauthenticated");
    });
});

// =============================================================================
describe("aceitarConvite", () => {
    test("a escola aceita e entra na pasta com nome, papel e escola", async () => {
        const mae = await novaMae();
        const escola = await novaEscola();
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });

        const resultado = await escola.chamar("aceitarConvite", { token });
        assert.deepEqual(resultado, { pastaId, nomeAluno: "Aluno Fictício" });

        const pasta = (await getDoc(doc(mae.db, `pastas/${pastaId}`))).data();
        assert.ok(pasta.membrosUids.includes(escola.uid));
        assert.deepEqual(pasta.participantes[escola.uid], { nome: escola.nome, papel: "escola", detalhe: "Escola Fictícia" });

        // Agora a escola consegue ler a pasta pelas regras
        assert.equal((await getDoc(doc(escola.db, `pastas/${pastaId}`))).exists(), true);
    });

    test("o médico aceita e aparece com a unidade SUS", async () => {
        const mae = await novaMae();
        const medico = await novoMedico();
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "medico" });

        await medico.chamar("aceitarConvite", { token });
        const pasta = (await getDoc(doc(mae.db, `pastas/${pastaId}`))).data();
        assert.deepEqual(pasta.participantes[medico.uid], { nome: medico.nome, papel: "medico", detalhe: "UBS Fictícia" });
    });

    test("NÃO: usar o mesmo link duas vezes (uso único)", async () => {
        const mae = await novaMae();
        const [escola1, escola2] = [await novaEscola(), await novaEscola()];
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });

        await escola1.chamar("aceitarConvite", { token });
        await falhaCom(escola2.chamar("aceitarConvite", { token }), "failed-precondition");
    });

    test("NÃO: duas pessoas abrindo o mesmo link ao mesmo tempo — só uma entra", async () => {
        const mae = await novaMae();
        const [escola1, escola2] = [await novaEscola(), await novaEscola()];
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });

        const resultados = await Promise.allSettled([
            escola1.chamar("aceitarConvite", { token }),
            escola2.chamar("aceitarConvite", { token }),
        ]);
        assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);

        const pasta = (await getDoc(doc(mae.db, `pastas/${pastaId}`))).data();
        assert.equal(pasta.membrosUids.length, 2); // mãe + uma escola
    });

    test("NÃO: link expirado", async () => {
        const mae = await novaMae();
        const escola = await novaEscola();
        const pastaId = await novaPasta(mae);
        const token = randomBytes(32).toString("base64url");
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), `convites/${hashDoToken(token)}`), {
                pastaId, papel: "escola", criadoPor: mae.uid,
                criadoEm: Date.now() - 49 * HORA, expiraEm: Date.now() - HORA,
                usadoEm: null, usadoPor: null,
            });
        });
        await falhaCom(escola.chamar("aceitarConvite", { token }), "failed-precondition");
    });

    test("NÃO: médico usa link de escola", async () => {
        const mae = await novaMae();
        const medico = await novoMedico();
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });
        await falhaCom(medico.chamar("aceitarConvite", { token }), "permission-denied");
    });

    test("NÃO: conta de mãe usa o link (leria tudo como mãe)", async () => {
        const mae = await novaMae();
        const outraMae = await novaMae();
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });
        await falhaCom(outraMae.chamar("aceitarConvite", { token }), "permission-denied");
    });

    test("NÃO: quem já está na pasta aceita outro convite", async () => {
        const mae = await novaMae();
        const escola = await novaEscola();
        const pastaId = await novaPasta(mae);
        const convite1 = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });
        const convite2 = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });

        await escola.chamar("aceitarConvite", { token: convite1.token });
        await falhaCom(escola.chamar("aceitarConvite", { token: convite2.token }), "already-exists");
    });

    test("NÃO: convite cancelado pela dona", async () => {
        const mae = await novaMae();
        const escola = await novaEscola();
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });

        await deleteDoc(doc(mae.db, `convites/${hashDoToken(token)}`));
        await falhaCom(escola.chamar("aceitarConvite", { token }), "not-found");
    });

    test("NÃO: token inventado", async () => {
        const escola = await novaEscola();
        await falhaCom(escola.chamar("aceitarConvite", { token: randomBytes(32).toString("base64url") }), "not-found");
        await falhaCom(escola.chamar("aceitarConvite", { token: "../pastas/x" }), "not-found");
    });

    test("NÃO: sem login", async () => {
        const mae = await novaMae();
        const pastaId = await novaPasta(mae);
        const { token } = await mae.chamar("gerarConvite", { pastaId, papel: "escola" });
        await falhaCom(novoApp().chamar("aceitarConvite", { token }), "unauthenticated");
    });
});
