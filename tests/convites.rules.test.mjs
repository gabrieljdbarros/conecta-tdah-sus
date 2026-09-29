/**
 * TESTES DAS SECURITY RULES — coleção `convites` (RN01, RN02)
 *
 * Os convites são criados e usados só pelas Cloud Functions. Pelo navegador,
 * a dona da pasta pode apenas ver e cancelar (apagar) os convites que criou.
 * Todos os dados abaixo são fictícios.
 *
 * Executar: npm run test:rules
 */
import { before, after, beforeEach, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from "@firebase/rules-unit-testing";
import {
    collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where,
} from "firebase/firestore";

let testEnv;

const CONVITE = {
    pastaId: "pasta1",
    papel: "escola",
    criadoPor: "mae1",
    criadoEm: 1700000000000,
    expiraEm: 1700172800000,
    usadoEm: null,
    usadoPor: null,
};

const como = (uid) => testEnv.authenticatedContext(uid).firestore();
const semLogin = () => testEnv.unauthenticatedContext().firestore();

before(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: "demo-conecta-tdah",
        firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });
});

after(async () => {
    await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "convites/hash1"), CONVITE);
    });
});

// =============================================================================
describe("ler convites", () => {
    test("quem criou lê o convite", async () => {
        await assertSucceeds(getDoc(doc(como("mae1"), "convites/hash1")));
    });

    test("quem criou lista os próprios convites de uma pasta", async () => {
        const q = query(
            collection(como("mae1"), "convites"),
            where("criadoPor", "==", "mae1"),
            where("pastaId", "==", "pasta1"),
        );
        await assertSucceeds(getDocs(q));
    });

    test("NÃO: outra pessoa lê o convite", async () => {
        await assertFails(getDoc(doc(como("escola1"), "convites/hash1")));
    });

    test("NÃO: listar convites sem filtrar pelo próprio uid", async () => {
        await assertFails(getDocs(query(collection(como("mae1"), "convites"), where("pastaId", "==", "pasta1"))));
    });

    test("NÃO: sem login", async () => {
        await assertFails(getDoc(doc(semLogin(), "convites/hash1")));
    });
});

// =============================================================================
describe("escrever convites", () => {
    test("quem criou cancela (apaga) o convite", async () => {
        await assertSucceeds(deleteDoc(doc(como("mae1"), "convites/hash1")));
    });

    test("NÃO: outra pessoa cancela o convite", async () => {
        await assertFails(deleteDoc(doc(como("escola1"), "convites/hash1")));
    });

    test("NÃO: criar convite pelo navegador (só pela Cloud Function)", async () => {
        await assertFails(setDoc(doc(como("mae1"), "convites/hash2"), CONVITE));
    });

    test("NÃO: marcar convite como usado pelo navegador", async () => {
        await assertFails(updateDoc(doc(como("mae1"), "convites/hash1"), { usadoEm: 1, usadoPor: "escola1" }));
    });

    test("NÃO: aumentar a validade do convite", async () => {
        await assertFails(updateDoc(doc(como("mae1"), "convites/hash1"), { expiraEm: 9999999999999 }));
    });
});
