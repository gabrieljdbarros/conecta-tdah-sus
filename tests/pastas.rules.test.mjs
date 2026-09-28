/**
 * TESTES DAS SECURITY RULES — coleção `pastas` (RF03)
 *
 * Rodam contra o Firestore Emulator, no projeto fictício `demo-conecta-tdah`.
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

// Usuários fictícios (só o `role` importa para estas regras)
const USUARIOS = {
    mae1: { role: "mae" },
    mae2: { role: "mae" },
    escola1: { role: "escola" },
    medico1: { role: "medico" },
    admin1: { role: "admin" },
};

// Pasta da mae1, com a escola1 já vinculada (como a Cloud Function do
// convite fará na próxima etapa)
const PASTA = {
    nomeAluno: "Aluno Fictício",
    serie: "ef3",
    donoUid: "mae1",
    membrosUids: ["mae1", "escola1"],
    criadoEm: 1700000000000,
};

const como = (uid) => testEnv.authenticatedContext(uid).firestore();
const semLogin = () => testEnv.unauthenticatedContext().firestore();

// Pasta nova válida, criada por `uid`
const novaPasta = (uid) => ({
    nomeAluno: "Outro Aluno Fictício",
    serie: "infantil",
    donoUid: uid,
    membrosUids: [uid],
    criadoEm: 1700000000000,
});
const criar = (uid, dados, id = "nova") => setDoc(doc(como(uid), `pastas/${id}`), dados);

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
        await setDoc(doc(db, "pastas/pasta1"), PASTA);
    });
});

// =============================================================================
describe("criar pasta", () => {
    test("mãe cria a própria pasta", async () => {
        await assertSucceeds(criar("mae1", novaPasta("mae1")));
    });

    test("NÃO: escola cria pasta", async () => {
        await assertFails(criar("escola1", novaPasta("escola1")));
    });

    test("NÃO: médico cria pasta", async () => {
        await assertFails(criar("medico1", novaPasta("medico1")));
    });

    test("NÃO: admin cria pasta", async () => {
        await assertFails(criar("admin1", novaPasta("admin1")));
    });

    test("NÃO: sem login", async () => {
        await assertFails(setDoc(doc(semLogin(), "pastas/nova"), novaPasta("mae1")));
    });

    test("NÃO: pasta em nome de outra mãe", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), donoUid: "mae2", membrosUids: ["mae2"] }));
    });

    test("NÃO: já incluir outra pessoa como membro (vínculo só por convite)", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), membrosUids: ["mae1", "escola1"] }));
    });

    test("NÃO: campo extra", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), diagnostico: "texto" }));
    });

    test("NÃO: faltando a série", async () => {
        const semSerie = novaPasta("mae1");
        delete semSerie.serie;
        await assertFails(criar("mae1", semSerie));
    });

    test("NÃO: série fora da lista", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), serie: "10º ano" }));
    });

    test("NÃO: nome do aluno vazio", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), nomeAluno: "" }));
    });

    test("NÃO: nome do aluno com mais de 100 caracteres", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), nomeAluno: "a".repeat(101) }));
    });

    test("NÃO: criadoEm que não é número inteiro", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), criadoEm: "hoje" }));
    });
});

// =============================================================================
describe("ler pasta", () => {
    test("dona lê", async () => {
        await assertSucceeds(getDoc(doc(como("mae1"), "pastas/pasta1")));
    });

    test("membro vinculado (escola) lê", async () => {
        await assertSucceeds(getDoc(doc(como("escola1"), "pastas/pasta1")));
    });

    test("NÃO: médico não vinculado", async () => {
        await assertFails(getDoc(doc(como("medico1"), "pastas/pasta1")));
    });

    test("NÃO: outra mãe", async () => {
        await assertFails(getDoc(doc(como("mae2"), "pastas/pasta1")));
    });

    test("NÃO: admin (LGPD — não participa do acompanhamento)", async () => {
        await assertFails(getDoc(doc(como("admin1"), "pastas/pasta1")));
    });

    test("NÃO: sem login", async () => {
        await assertFails(getDoc(doc(semLogin(), "pastas/pasta1")));
    });

    test("lista 'minhas pastas' filtrando pelo próprio uid", async () => {
        const q = query(collection(como("escola1"), "pastas"), where("membrosUids", "array-contains", "escola1"));
        await assertSucceeds(getDocs(q));
    });

    test("NÃO: listar todas as pastas sem filtro", async () => {
        await assertFails(getDocs(collection(como("mae1"), "pastas")));
    });

    test("NÃO: listar filtrando pelo uid de outra pessoa", async () => {
        const q = query(collection(como("mae2"), "pastas"), where("membrosUids", "array-contains", "mae1"));
        await assertFails(getDocs(q));
    });
});

// =============================================================================
describe("editar pasta", () => {
    const editar = (uid, dados) => updateDoc(doc(como(uid), "pastas/pasta1"), dados);

    test("dona altera nome e série", async () => {
        await assertSucceeds(editar("mae1", { nomeAluno: "Nome Corrigido", serie: "ef4" }));
    });

    test("NÃO: dona adiciona membro (vínculo só por convite)", async () => {
        await assertFails(editar("mae1", { membrosUids: ["mae1", "escola1", "medico1"] }));
    });

    test("NÃO: dona remove membro pelo navegador", async () => {
        await assertFails(editar("mae1", { membrosUids: ["mae1"] }));
    });

    test("NÃO: dona transfere a pasta", async () => {
        await assertFails(editar("mae1", { donoUid: "mae2" }));
    });

    test("NÃO: série inválida", async () => {
        await assertFails(editar("mae1", { serie: "qualquer" }));
    });

    test("NÃO: membro que não é dono (escola) edita", async () => {
        await assertFails(editar("escola1", { serie: "ef4" }));
    });

    test("NÃO: não membro edita", async () => {
        await assertFails(editar("mae2", { serie: "ef4" }));
    });
});

// =============================================================================
describe("apagar pasta", () => {
    test("NÃO: dona apaga (TODO: fluxo de exclusão LGPD)", async () => {
        await assertFails(deleteDoc(doc(como("mae1"), "pastas/pasta1")));
    });

    test("NÃO: admin apaga", async () => {
        await assertFails(deleteDoc(doc(como("admin1"), "pastas/pasta1")));
    });
});
