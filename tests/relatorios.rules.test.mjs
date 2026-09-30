/**
 * TESTES DAS SECURITY RULES — relatórios da pasta (decisão travada 9 / RN06)
 *
 * `pastas/{pastaId}/relatorios/{id}`: quem lê depende do papel na pasta e do
 * TIPO do relatório (nunca da categoria). Registro imutável.
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

const TODOS_OS_TIPOS = ["orientacao_medica", "laudo", "avaliacao_escolar", "relato_familia"];

const USUARIOS = {
    mae1: { role: "mae", nome: "Mãe Fictícia" },
    mae2: { role: "mae", nome: "Outra Mãe Fictícia" },
    escola1: { role: "escola", nome: "Escola Fictícia" },
    escola2: { role: "escola", nome: "Escola Não Vinculada" },
    medico1: { role: "medico", nome: "Médico Fictício" },
    exEscola: { role: "escola", nome: "Escola Que Saiu" },
    admin1: { role: "admin", nome: "Admin Fictício" },
};

// Pasta da mae1 com escola1 e medico1. A exEscola saiu, mas escreveu antes
const PASTA = {
    nomeAluno: "Aluno Fictício", serie: "ef3", donoUid: "mae1",
    membrosUids: ["mae1", "escola1", "medico1"], participantes: {}, criadoEm: 1,
};

// Um relatório de cada tipo, todos com a MESMA categoria (a categoria não
// pode mudar quem lê)
const relatorio = (tipo, autor, papel) => ({
    tipo, categoriaId: "cat1", texto: `Texto fictício de ${tipo}.`,
    autorUid: autor, autorNome: USUARIOS[autor].nome, autorPapel: papel, criadoEm: 1700000000000,
});

const como = (uid) => testEnv.authenticatedContext(uid).firestore();
const semLogin = () => testEnv.unauthenticatedContext().firestore();
const ler = (uid, id, pasta = "pasta1") => getDoc(doc(como(uid), `pastas/${pasta}/relatorios/${id}`));

// Relatório novo válido escrito por `uid`
const novo = (uid, tipo, papel, extra = {}) => ({ ...relatorio(tipo, uid, papel), ...extra });
const escrever = (uid, dados, pasta = "pasta1") => setDoc(doc(como(uid), `pastas/${pasta}/relatorios/novo`), dados);

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
        await setDoc(doc(db, "categorias/cat1"), { nome: "Sono", ativa: true, criadoEm: 1 });
        await setDoc(doc(db, "categorias/cat2"), { nome: "Antiga", ativa: false, criadoEm: 1 });
        await setDoc(doc(db, "pastas/pasta1"), PASTA);
        await setDoc(doc(db, "pastas/pasta1/relatorios/orientacao"), relatorio("orientacao_medica", "medico1", "medico"));
        await setDoc(doc(db, "pastas/pasta1/relatorios/laudo"), relatorio("laudo", "medico1", "medico"));
        await setDoc(doc(db, "pastas/pasta1/relatorios/avaliacao"), relatorio("avaliacao_escolar", "escola1", "escola"));
        await setDoc(doc(db, "pastas/pasta1/relatorios/relato"), relatorio("relato_familia", "mae1", "mae"));
        await setDoc(doc(db, "pastas/pasta1/relatorios/deQuemSaiu"), relatorio("avaliacao_escolar", "exEscola", "escola"));
        // Estado anômalo: uma conta de mãe como membro que NÃO é a dona
        await setDoc(doc(db, "pastas/pasta2"), { ...PASTA, membrosUids: ["mae1", "mae2"] });
        await setDoc(doc(db, "pastas/pasta2/relatorios/relato"), relatorio("relato_familia", "mae1", "mae"));
    });
});

// =============================================================================
describe("matriz de leitura (RN06)", () => {
    const matriz = {
        mae1: { orientacao: true, laudo: true, avaliacao: true, relato: true },
        medico1: { orientacao: true, laudo: true, avaliacao: true, relato: true },
        escola1: { orientacao: true, laudo: false, avaliacao: true, relato: false },
    };
    for (const [uid, permissoes] of Object.entries(matriz))
        for (const [id, pode] of Object.entries(permissoes))
            test(`${uid} ${pode ? "lê" : "NÃO lê"} ${id}`, async () => {
                await (pode ? assertSucceeds : assertFails)(ler(uid, id));
            });

    test("a categoria não muda quem lê: mesma categoria, escola lê a avaliação mas não o laudo", async () => {
        await assertSucceeds(ler("escola1", "avaliacao"));
        await assertFails(ler("escola1", "laudo"));
    });

    test("relatório de quem saiu da pasta continua para a mãe", async () => {
        await assertSucceeds(ler("mae1", "deQuemSaiu"));
    });

    test("NÃO: quem saiu da pasta lê o que escreveu", async () => {
        await assertFails(ler("exEscola", "deQuemSaiu"));
    });

    test("NÃO: escola não vinculada", async () => {
        await assertFails(ler("escola2", "avaliacao"));
    });

    test("NÃO: outra mãe", async () => {
        await assertFails(ler("mae2", "orientacao"));
    });

    test("NÃO: conta de mãe que é membro mas não é a dona", async () => {
        await assertFails(ler("mae2", "relato", "pasta2"));
    });

    test("NÃO: admin", async () => {
        await assertFails(ler("admin1", "orientacao"));
    });

    test("NÃO: sem login", async () => {
        await assertFails(getDoc(doc(semLogin(), "pastas/pasta1/relatorios/orientacao")));
    });
});

// =============================================================================
describe("listar relatórios", () => {
    const listar = (uid, tipos) => {
        const col = collection(como(uid), "pastas/pasta1/relatorios");
        return getDocs(tipos ? query(col, where("tipo", "in", tipos)) : col);
    };

    test("escola lista filtrando pelos tipos que pode ver", async () => {
        await assertSucceeds(listar("escola1", ["orientacao_medica", "avaliacao_escolar"]));
    });

    test("NÃO: escola lista pedindo todos os tipos", async () => {
        await assertFails(listar("escola1", TODOS_OS_TIPOS));
    });

    test("NÃO: escola lista sem filtro", async () => {
        await assertFails(listar("escola1"));
    });

    test("mãe e médico listam todos os tipos", async () => {
        await assertSucceeds(listar("mae1", TODOS_OS_TIPOS));
        await assertSucceeds(listar("medico1", TODOS_OS_TIPOS));
    });
});

// =============================================================================
describe("escrever relatórios", () => {
    test("médico escreve orientação e laudo", async () => {
        await assertSucceeds(escrever("medico1", novo("medico1", "orientacao_medica", "medico")));
        await assertSucceeds(setDoc(doc(como("medico1"), "pastas/pasta1/relatorios/novo2"), novo("medico1", "laudo", "medico")));
    });

    test("NÃO: médico escreve avaliação escolar ou relato da família", async () => {
        await assertFails(escrever("medico1", novo("medico1", "avaliacao_escolar", "medico")));
        await assertFails(escrever("medico1", novo("medico1", "relato_familia", "medico")));
    });

    test("escola escreve avaliação escolar", async () => {
        await assertSucceeds(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola")));
    });

    test("NÃO: escola escreve laudo", async () => {
        await assertFails(escrever("escola1", novo("escola1", "laudo", "escola")));
    });

    test("mãe escreve relato da família", async () => {
        await assertSucceeds(escrever("mae1", novo("mae1", "relato_familia", "mae")));
    });

    test("NÃO: mãe escreve laudo", async () => {
        await assertFails(escrever("mae1", novo("mae1", "laudo", "mae")));
    });

    test("NÃO: escola não vinculada escreve", async () => {
        await assertFails(escrever("escola2", novo("escola2", "avaliacao_escolar", "escola")));
    });

    test("NÃO: conta de mãe que é membro mas não é a dona", async () => {
        await assertFails(escrever("mae2", novo("mae2", "relato_familia", "mae"), "pasta2"));
    });

    test("NÃO: admin escreve", async () => {
        await assertFails(escrever("admin1", novo("admin1", "orientacao_medica", "medico")));
    });

    test("NÃO: escrever em nome de outra pessoa", async () => {
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { autorUid: "medico1" })));
    });

    test("NÃO: nome do autor diferente do perfil", async () => {
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { autorNome: "Dr. Inventado" })));
    });

    test("NÃO: papel do autor falso", async () => {
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "medico")));
    });

    test("NÃO: categoria desativada", async () => {
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { categoriaId: "cat2" })));
    });

    test("NÃO: categoria inexistente", async () => {
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { categoriaId: "naoExiste" })));
    });

    test("NÃO: texto vazio ou só com espaços", async () => {
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { texto: "" })));
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { texto: "   " })));
    });

    test("aceita 5.000 caracteres, recusa 5.001", async () => {
        await assertSucceeds(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { texto: "a".repeat(5000) })));
        await assertFails(setDoc(doc(como("escola1"), "pastas/pasta1/relatorios/novo2"),
            novo("escola1", "avaliacao_escolar", "escola", { texto: "a".repeat(5001) })));
    });

    test("NÃO: campo extra (ex.: tentar escolher quem vê)", async () => {
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { visivelPara: ["mae"] })));
    });

    test("NÃO: tipo inventado", async () => {
        await assertFails(escrever("medico1", novo("medico1", "receita", "medico")));
    });

    test("NÃO: criadoEm que não é número inteiro", async () => {
        await assertFails(escrever("escola1", novo("escola1", "avaliacao_escolar", "escola", { criadoEm: "hoje" })));
    });
});

// =============================================================================
describe("registro imutável", () => {
    test("NÃO: o autor altera o texto", async () => {
        await assertFails(updateDoc(doc(como("medico1"), "pastas/pasta1/relatorios/laudo"), { texto: "Texto alterado." }));
    });

    test("NÃO: a mãe apaga um relatório", async () => {
        await assertFails(deleteDoc(doc(como("mae1"), "pastas/pasta1/relatorios/avaliacao")));
    });

    test("NÃO: o autor apaga o próprio relatório", async () => {
        await assertFails(deleteDoc(doc(como("medico1"), "pastas/pasta1/relatorios/laudo")));
    });
});
