/**
 * TESTES DAS SECURITY RULES — chat da pasta (RN05, decisão travada 10)
 *
 *   pastas/{id}/canais/grupo/mensagens            → todos os membros
 *   pastas/{id}/canais/privado-{medico}/mensagens → só a mãe (dona) e aquele médico
 * Mensagens imutáveis. Todos os dados abaixo são fictícios.
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
    collection, deleteDoc, doc, getDoc, getDocs, limitToLast, orderBy, query, setDoc, updateDoc,
} from "firebase/firestore";

let testEnv;

const USUARIOS = {
    mae1: { role: "mae", nome: "Mãe Fictícia" },
    mae2: { role: "mae", nome: "Outra Mãe Fictícia" },
    escola1: { role: "escola", nome: "Escola Fictícia" },
    medico1: { role: "medico", nome: "Médico Fictício" },
    medico2: { role: "medico", nome: "Outro Médico Fictício" },
    medico3: { role: "medico", nome: "Médico Não Vinculado" },
    exMedico: { role: "medico", nome: "Médico Que Saiu" },
    admin1: { role: "admin", nome: "Admin Fictício" },
};

// Pasta da mae1 com escola1, medico1 e medico2. O exMedico saiu da pasta
const PASTA = {
    nomeAluno: "Aluno Fictício", serie: "ef3", donoUid: "mae1",
    membrosUids: ["mae1", "escola1", "medico1", "medico2"], participantes: {}, criadoEm: 1,
};

const mensagem = (autor, papel, extra = {}) => ({
    texto: "Mensagem fictícia.", autorUid: autor, autorNome: USUARIOS[autor].nome,
    autorPapel: papel, criadoEm: 1700000000000, ...extra,
});

const como = (uid) => testEnv.authenticatedContext(uid).firestore();
const semLogin = () => testEnv.unauthenticatedContext().firestore();
const caminho = (canal, id = "m1", pasta = "pasta1") => `pastas/${pasta}/canais/${canal}/mensagens/${id}`;
const ler = (uid, canal, pasta) => getDoc(doc(como(uid), caminho(canal, "m1", pasta)));
const enviar = (uid, canal, dados, pasta) => setDoc(doc(como(uid), caminho(canal, "nova", pasta)), dados);

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
            await setDoc(doc(db, `users/${uid}`), { email: `${uid}@exemplo.com`, dadosPerfil: {}, criadoEm: 1, ...dados });
        await setDoc(doc(db, "pastas/pasta1"), PASTA);
        await setDoc(doc(db, caminho("grupo")), mensagem("escola1", "escola"));
        await setDoc(doc(db, caminho("privado-medico1")), mensagem("medico1", "medico"));
        await setDoc(doc(db, caminho("privado-exMedico")), mensagem("exMedico", "medico"));
        // Estado anômalo: conta de mãe como membro que NÃO é a dona
        await setDoc(doc(db, "pastas/pasta2"), { ...PASTA, membrosUids: ["mae1", "mae2"] });
        await setDoc(doc(db, caminho("grupo", "m1", "pasta2")), mensagem("mae1", "mae"));
    });
});

// =============================================================================
describe("chat em grupo", () => {
    for (const uid of ["mae1", "escola1", "medico1", "medico2"])
        test(`${uid} lê o grupo`, async () => {
            await assertSucceeds(ler(uid, "grupo"));
        });

    test("lista as 100 mensagens mais recentes (como a tela faz)", async () => {
        const q = query(collection(como("escola1"), "pastas/pasta1/canais/grupo/mensagens"), orderBy("criadoEm"), limitToLast(100));
        await assertSucceeds(getDocs(q));
    });

    test("NÃO: médico não vinculado", async () => {
        await assertFails(ler("medico3", "grupo"));
    });

    test("NÃO: quem saiu da pasta", async () => {
        await assertFails(ler("exMedico", "grupo"));
    });

    test("NÃO: outra mãe", async () => {
        await assertFails(ler("mae2", "grupo"));
    });

    test("NÃO: conta de mãe que é membro mas não é a dona", async () => {
        await assertFails(ler("mae2", "grupo", "pasta2"));
    });

    test("NÃO: admin", async () => {
        await assertFails(ler("admin1", "grupo"));
    });

    test("NÃO: sem login", async () => {
        await assertFails(getDoc(doc(semLogin(), caminho("grupo"))));
    });
});

// =============================================================================
describe("canal privado mãe–médico", () => {
    test("a mãe e o médico do canal leem", async () => {
        await assertSucceeds(ler("mae1", "privado-medico1"));
        await assertSucceeds(ler("medico1", "privado-medico1"));
    });

    test("NÃO: a escola lê o privado", async () => {
        await assertFails(ler("escola1", "privado-medico1"));
    });

    test("NÃO: outro médico da pasta lê o privado", async () => {
        await assertFails(ler("medico2", "privado-medico1"));
    });

    test("NÃO: admin lê o privado", async () => {
        await assertFails(ler("admin1", "privado-medico1"));
    });

    test("a mãe continua lendo o histórico se o médico saiu", async () => {
        await assertSucceeds(ler("mae1", "privado-exMedico"));
    });

    test("NÃO: o médico que saiu lê o privado", async () => {
        await assertFails(ler("exMedico", "privado-exMedico"));
    });

    test("NÃO: canal com nome inventado", async () => {
        await assertFails(ler("mae1", "secreto"));
    });
});

// =============================================================================
describe("enviar mensagens", () => {
    test("escola, mãe e médico escrevem no grupo", async () => {
        await assertSucceeds(enviar("escola1", "grupo", mensagem("escola1", "escola")));
        await assertSucceeds(setDoc(doc(como("mae1"), caminho("grupo", "nova2")), mensagem("mae1", "mae")));
        await assertSucceeds(setDoc(doc(como("medico1"), caminho("grupo", "nova3")), mensagem("medico1", "medico")));
    });

    test("a mãe e o médico escrevem no privado deles", async () => {
        await assertSucceeds(enviar("mae1", "privado-medico1", mensagem("mae1", "mae")));
        await assertSucceeds(setDoc(doc(como("medico1"), caminho("privado-medico1", "nova2")), mensagem("medico1", "medico")));
    });

    test("NÃO: a escola escreve no privado", async () => {
        await assertFails(enviar("escola1", "privado-medico1", mensagem("escola1", "escola")));
    });

    test("NÃO: outro médico escreve no privado", async () => {
        await assertFails(enviar("medico2", "privado-medico1", mensagem("medico2", "medico")));
    });

    test("NÃO: a mãe escreve no privado de quem saiu da pasta", async () => {
        await assertFails(enviar("mae1", "privado-exMedico", mensagem("mae1", "mae")));
    });

    test("NÃO: a mãe abre um 'privado' com a escola (só existe com médico)", async () => {
        await assertFails(enviar("mae1", "privado-escola1", mensagem("mae1", "mae")));
    });

    test("NÃO: canal inventado", async () => {
        await assertFails(enviar("mae1", "secreto", mensagem("mae1", "mae")));
    });

    test("NÃO: médico não vinculado escreve no grupo", async () => {
        await assertFails(enviar("medico3", "grupo", mensagem("medico3", "medico")));
    });

    test("NÃO: escrever em nome de outra pessoa", async () => {
        await assertFails(enviar("escola1", "grupo", mensagem("escola1", "escola", { autorUid: "medico1" })));
    });

    test("NÃO: nome do autor diferente do perfil", async () => {
        await assertFails(enviar("escola1", "grupo", mensagem("escola1", "escola", { autorNome: "Dr. Inventado" })));
    });

    test("NÃO: papel do autor falso", async () => {
        await assertFails(enviar("escola1", "grupo", mensagem("escola1", "medico")));
    });

    test("NÃO: texto vazio ou só com espaços", async () => {
        await assertFails(enviar("escola1", "grupo", mensagem("escola1", "escola", { texto: "" })));
        await assertFails(enviar("escola1", "grupo", mensagem("escola1", "escola", { texto: "   " })));
    });

    test("aceita 2.000 caracteres, recusa 2.001", async () => {
        await assertSucceeds(enviar("escola1", "grupo", mensagem("escola1", "escola", { texto: "a".repeat(2000) })));
        await assertFails(setDoc(doc(como("escola1"), caminho("grupo", "nova2")), mensagem("escola1", "escola", { texto: "a".repeat(2001) })));
    });

    test("NÃO: campo extra", async () => {
        await assertFails(enviar("escola1", "grupo", mensagem("escola1", "escola", { anexo: "arquivo.pdf" })));
    });

    test("NÃO: criadoEm que não é número inteiro", async () => {
        await assertFails(enviar("escola1", "grupo", mensagem("escola1", "escola", { criadoEm: "agora" })));
    });
});

// =============================================================================
describe("mensagens imutáveis", () => {
    test("NÃO: o autor edita", async () => {
        await assertFails(updateDoc(doc(como("escola1"), caminho("grupo")), { texto: "Editada." }));
    });

    test("NÃO: o autor apaga", async () => {
        await assertFails(deleteDoc(doc(como("escola1"), caminho("grupo"))));
    });

    test("NÃO: a mãe apaga mensagem do privado", async () => {
        await assertFails(deleteDoc(doc(como("mae1"), caminho("privado-medico1"))));
    });
});
