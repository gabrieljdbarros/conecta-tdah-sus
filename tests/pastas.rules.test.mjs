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
    donoUid: "mae1",
    membrosUids: ["mae1", "escola1"],
    participantes: {
        mae1: { nome: "Fictício", papel: "mae" },
        escola1: { nome: "Fictício", papel: "escola", detalhe: "Escola Fictícia" },
    },
    criadoEm: 1700000000000,
};

const como = (uid) => testEnv.authenticatedContext(uid).firestore();
const semLogin = () => testEnv.unauthenticatedContext().firestore();

// Pasta nova válida, criada por `uid`
const novaPasta = (uid) => ({
    nomeAluno: "Outro Aluno Fictício",
    donoUid: uid,
    membrosUids: [uid],
    // O nome precisa ser igual ao do perfil em `users` (todos são "Fictício")
    participantes: { [uid]: { nome: "Fictício", papel: "mae" } },
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

    // RF03: só o nome da criança (minimização). Série, data de nascimento e
    // cartão SUS saíram a pedido da cliente e não podem voltar pela porta dos fundos
    test("NÃO: com a série (campo retirado)", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), serie: "ef3" }));
    });

    test("NÃO: com data de nascimento", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), dataNascimento: "2015-01-01" }));
    });

    test("NÃO: com cartão SUS", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), cartaoSus: "000000000000000" }));
    });

    test("NÃO: faltando o nome do aluno", async () => {
        const semNome = novaPasta("mae1");
        delete semNome.nomeAluno;
        await assertFails(criar("mae1", semNome));
    });

    test("NÃO: nome do aluno vazio", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), nomeAluno: "" }));
    });

    test("NÃO: nome do aluno só com espaços", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), nomeAluno: "   " }));
    });

    test("NÃO: nome do aluno com mais de 100 caracteres", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), nomeAluno: "a".repeat(101) }));
    });

    test("NÃO: sem a lista de participantes", async () => {
        const semParticipantes = novaPasta("mae1");
        delete semParticipantes.participantes;
        await assertFails(criar("mae1", semParticipantes));
    });

    test("NÃO: participante com nome diferente do perfil", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), participantes: { mae1: { nome: "Outro Nome", papel: "mae" } } }));
    });

    test("NÃO: mãe se registra com outro papel na lista", async () => {
        await assertFails(criar("mae1", { ...novaPasta("mae1"), participantes: { mae1: { nome: "Fictício", papel: "medico" } } }));
    });

    test("NÃO: já incluir outra pessoa na lista de participantes", async () => {
        await assertFails(criar("mae1", {
            ...novaPasta("mae1"),
            participantes: { mae1: { nome: "Fictício", papel: "mae" }, escola1: { nome: "Fictício", papel: "escola" } },
        }));
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

    test("dona altera o nome", async () => {
        await assertSucceeds(editar("mae1", { nomeAluno: "Nome Corrigido" }));
    });

    test("NÃO: dona adiciona membro (vínculo só por convite)", async () => {
        await assertFails(editar("mae1", { membrosUids: ["mae1", "escola1", "medico1"] }));
    });

    test("NÃO: dona remove membro pelo navegador", async () => {
        await assertFails(editar("mae1", { membrosUids: ["mae1"] }));
    });

    test("NÃO: dona altera a lista de participantes pelo navegador", async () => {
        await assertFails(editar("mae1", { participantes: { mae1: { nome: "Fictício", papel: "mae" } } }));
    });

    test("NÃO: dona transfere a pasta", async () => {
        await assertFails(editar("mae1", { donoUid: "mae2" }));
    });

    test("NÃO: dona acrescenta a série (campo retirado)", async () => {
        await assertFails(editar("mae1", { serie: "ef4" }));
    });

    test("NÃO: dona acrescenta outro dado da criança", async () => {
        await assertFails(editar("mae1", { nomeAluno: "Nome Corrigido", dataNascimento: "2015-01-01" }));
    });

    test("NÃO: membro que não é dono (escola) edita", async () => {
        await assertFails(editar("escola1", { nomeAluno: "Nome Corrigido" }));
    });

    test("NÃO: não membro edita", async () => {
        await assertFails(editar("mae2", { nomeAluno: "Nome Corrigido" }));
    });

    test("NÃO: dona que não é mais membro edita", async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "pastas/pasta2"), { ...PASTA, membrosUids: ["escola1"] });
        });
        await assertFails(updateDoc(doc(como("mae1"), "pastas/pasta2"), { nomeAluno: "Nome Corrigido" }));
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

// =============================================================================
// Relatórios e categorias saíram do escopo (20/10/2026): o bloqueio geral
// nega qualquer acesso, inclusive a dados antigos que tenham ficado no banco
describe("relatórios e categorias (fora do escopo)", () => {
    beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            await setDoc(doc(db, "pastas/pasta1/relatorios/r1"), { tipo: "laudo", texto: "Relatório fictício." });
            await setDoc(doc(db, "categorias/c1"), { nome: "Categoria fictícia", ativa: true, criadoEm: 1 });
        });
    });

    for (const uid of ["mae1", "escola1", "admin1"])
        test(`NÃO: ${uid} lê ou escreve relatório`, async () => {
            await assertFails(getDoc(doc(como(uid), "pastas/pasta1/relatorios/r1")));
            await assertFails(setDoc(doc(como(uid), "pastas/pasta1/relatorios/r2"), { tipo: "relato_familia", texto: "Fictício." }));
        });

    for (const uid of ["mae1", "admin1"])
        test(`NÃO: ${uid} lê ou escreve categoria`, async () => {
            await assertFails(getDoc(doc(como(uid), "categorias/c1")));
            await assertFails(setDoc(doc(como(uid), "categorias/c2"), { nome: "Nova", ativa: true, criadoEm: 1 }));
        });
});
