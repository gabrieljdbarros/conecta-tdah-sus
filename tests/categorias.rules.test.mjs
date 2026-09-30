/**
 * TESTES DAS SECURITY RULES — coleção `categorias` (RF14, CSU15, RN10)
 *
 * Só o admin cria e edita; qualquer pessoa logada lê; ninguém apaga (a
 * categoria é desativada). Todos os dados abaixo são fictícios.
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
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from "firebase/firestore";

let testEnv;

const USUARIOS = {
    admin1: { role: "admin" },
    mae1: { role: "mae" },
    escola1: { role: "escola" },
    medico1: { role: "medico" },
};

const CATEGORIA = { nome: "Sono", ativa: true, criadoEm: 1700000000000 };

const como = (uid) => testEnv.authenticatedContext(uid).firestore();
const semLogin = () => testEnv.unauthenticatedContext().firestore();
const criar = (uid, dados, id = "nova") => setDoc(doc(como(uid), `categorias/${id}`), dados);
const editar = (uid, dados) => updateDoc(doc(como(uid), "categorias/cat1"), dados);

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
        const db = ctx.firestore();
        for (const [uid, dados] of Object.entries(USUARIOS))
            await setDoc(doc(db, `users/${uid}`), { nome: "Fictício", email: `${uid}@exemplo.com`, dadosPerfil: {}, criadoEm: 1, ...dados });
        await setDoc(doc(db, "categorias/cat1"), CATEGORIA);
    });
});

// =============================================================================
describe("ler categorias", () => {
    test("mãe lê (para classificar relatórios)", async () => {
        await assertSucceeds(getDoc(doc(como("mae1"), "categorias/cat1")));
    });

    test("escola lista todas", async () => {
        await assertSucceeds(getDocs(collection(como("escola1"), "categorias")));
    });

    test("NÃO: sem login", async () => {
        await assertFails(getDoc(doc(semLogin(), "categorias/cat1")));
    });
});

// =============================================================================
describe("criar categorias", () => {
    test("admin cria", async () => {
        await assertSucceeds(criar("admin1", { nome: "Atenção e concentração", ativa: true, criadoEm: 1700000000000 }));
    });

    test("admin cria as 8 sugestões de uma vez (lote, como na tela)", async () => {
        const db = como("admin1");
        const lote = writeBatch(db);
        for (let i = 0; i < 8; i++)
            lote.set(doc(collection(db, "categorias")), { nome: `Sugestão fictícia ${i}`, ativa: true, criadoEm: 1700000000000 });
        await assertSucceeds(lote.commit());
    });

    test("NÃO: mãe cria", async () => {
        await assertFails(criar("mae1", CATEGORIA));
    });

    test("NÃO: escola cria", async () => {
        await assertFails(criar("escola1", CATEGORIA));
    });

    test("NÃO: médico cria", async () => {
        await assertFails(criar("medico1", CATEGORIA));
    });

    test("NÃO: campo extra (ex.: tentar controlar quem lê)", async () => {
        await assertFails(criar("admin1", { ...CATEGORIA, visivelPara: ["escola"] }));
    });

    test("NÃO: faltando o campo ativa", async () => {
        await assertFails(criar("admin1", { nome: "Sono", criadoEm: 1700000000000 }));
    });

    test("NÃO: nome vazio ou só com espaços", async () => {
        await assertFails(criar("admin1", { ...CATEGORIA, nome: "" }));
        await assertFails(criar("admin1", { ...CATEGORIA, nome: "   " }, "outra"));
    });

    test("aceita nome com 60 caracteres, recusa com 61", async () => {
        await assertSucceeds(criar("admin1", { ...CATEGORIA, nome: "a".repeat(60) }));
        await assertFails(criar("admin1", { ...CATEGORIA, nome: "a".repeat(61) }, "outra"));
    });

    test("NÃO: ativa que não é verdadeiro/falso", async () => {
        await assertFails(criar("admin1", { ...CATEGORIA, ativa: "sim" }));
    });
});

// =============================================================================
describe("editar categorias", () => {
    test("admin renomeia", async () => {
        await assertSucceeds(editar("admin1", { nome: "Sono e descanso" }));
    });

    test("admin desativa e reativa", async () => {
        await assertSucceeds(editar("admin1", { ativa: false }));
        await assertSucceeds(editar("admin1", { ativa: true }));
    });

    test("NÃO: mãe edita", async () => {
        await assertFails(editar("mae1", { nome: "Outro nome" }));
    });

    test("NÃO: admin altera criadoEm", async () => {
        await assertFails(editar("admin1", { criadoEm: 1 }));
    });

    test("NÃO: admin adiciona campo novo", async () => {
        await assertFails(editar("admin1", { visivelPara: ["escola"] }));
    });

    test("NÃO: nome inválido na edição", async () => {
        await assertFails(editar("admin1", { nome: " " }));
    });
});

// =============================================================================
describe("apagar categorias", () => {
    test("NÃO: nem o admin apaga (desativa em vez disso)", async () => {
        await assertFails(deleteDoc(doc(como("admin1"), "categorias/cat1")));
    });

    test("NÃO: mãe apaga", async () => {
        await assertFails(deleteDoc(doc(como("mae1"), "categorias/cat1")));
    });
});
