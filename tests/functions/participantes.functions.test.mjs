/**
 * TESTES DA CLOUD FUNCTION removerParticipante
 *
 * A dona remove outra pessoa da pasta; escola/médico sai da pasta.
 * Rodam nos emuladores de Auth, Firestore e Functions, no projeto fictício
 * `demo-conecta-tdah`. Todos os dados são fictícios.
 *
 * Executar: npm run test:functions
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { doc, getDoc } from "firebase/firestore";
import {
    encerrarAmbiente, falhaCom, novaEscola, novaMae, novaPasta, novoApp, novoMedico, prepararAmbiente, vincular,
} from "./ajuda.mjs";

before(prepararAmbiente);
after(encerrarAmbiente);

/** Pasta com mãe (dona), escola e médico já vinculados */
async function pastaCompleta() {
    const mae = await novaMae();
    const escola = await novaEscola();
    const medico = await novoMedico();
    const pastaId = await novaPasta(mae);
    await vincular(mae, pastaId, escola, "escola");
    await vincular(mae, pastaId, medico, "medico");
    return { mae, escola, medico, pastaId };
}

const lerPasta = async (quem, pastaId) => (await getDoc(doc(quem.db, `pastas/${pastaId}`))).data();

// =============================================================================
describe("removerParticipante", () => {
    test("a dona remove a escola, que some das duas listas e perde a leitura", async () => {
        const { mae, escola, pastaId } = await pastaCompleta();

        await mae.chamar("removerParticipante", { pastaId, participanteUid: escola.uid });

        const pasta = await lerPasta(mae, pastaId);
        assert.equal(pasta.membrosUids.includes(escola.uid), false);
        assert.equal(escola.uid in pasta.participantes, false);
        // As regras já não deixam a escola ler a pasta
        await assert.rejects(getDoc(doc(escola.db, `pastas/${pastaId}`)));
    });

    test("o médico sai da pasta", async () => {
        const { mae, medico, pastaId } = await pastaCompleta();

        await medico.chamar("removerParticipante", { pastaId, participanteUid: medico.uid });

        const pasta = await lerPasta(mae, pastaId);
        assert.equal(pasta.membrosUids.includes(medico.uid), false);
        assert.equal(medico.uid in pasta.participantes, false);
    });

    test("quem saiu pode ser convidado de novo", async () => {
        const { mae, escola, pastaId } = await pastaCompleta();
        await escola.chamar("removerParticipante", { pastaId, participanteUid: escola.uid });

        await vincular(mae, pastaId, escola, "escola");

        const pasta = await lerPasta(mae, pastaId);
        assert.ok(pasta.membrosUids.includes(escola.uid));
        assert.equal(pasta.participantes[escola.uid].papel, "escola");
    });

    test("NÃO: o médico remove a escola", async () => {
        const { medico, escola, pastaId } = await pastaCompleta();
        await falhaCom(medico.chamar("removerParticipante", { pastaId, participanteUid: escola.uid }), "permission-denied");
    });

    test("NÃO: a dona sai da pasta (ficaria sem responsável)", async () => {
        const { mae, pastaId } = await pastaCompleta();
        await falhaCom(mae.chamar("removerParticipante", { pastaId, participanteUid: mae.uid }), "failed-precondition");
    });

    test("NÃO: a escola remove a dona", async () => {
        const { mae, escola, pastaId } = await pastaCompleta();
        await falhaCom(escola.chamar("removerParticipante", { pastaId, participanteUid: mae.uid }), "failed-precondition");
    });

    test("NÃO: remover quem não faz parte da pasta", async () => {
        const { mae, pastaId } = await pastaCompleta();
        const outraEscola = await novaEscola();
        await falhaCom(mae.chamar("removerParticipante", { pastaId, participanteUid: outraEscola.uid }), "not-found");
    });

    test("NÃO: quem não é membro chama (nem descobre se a pasta existe)", async () => {
        const { escola, pastaId } = await pastaCompleta();
        const intrusa = await novaMae();
        await falhaCom(intrusa.chamar("removerParticipante", { pastaId, participanteUid: escola.uid }), "permission-denied");
        await falhaCom(intrusa.chamar("removerParticipante", { pastaId: "naoExiste123", participanteUid: escola.uid }), "permission-denied");
    });

    test("NÃO: ids inválidos", async () => {
        const { mae, escola, pastaId } = await pastaCompleta();
        await falhaCom(mae.chamar("removerParticipante", { pastaId: "x/../y", participanteUid: escola.uid }), "invalid-argument");
        await falhaCom(mae.chamar("removerParticipante", { pastaId, participanteUid: "a/b" }), "invalid-argument");
    });

    test("NÃO: sem login", async () => {
        const { escola, pastaId } = await pastaCompleta();
        await falhaCom(novoApp().chamar("removerParticipante", { pastaId, participanteUid: escola.uid }), "unauthenticated");
    });
});
