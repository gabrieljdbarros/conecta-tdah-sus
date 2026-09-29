/**
 * TESTES DAS SECURITY RULES — coleção `users`
 *
 * Rodam contra o Firestore Emulator (nunca contra o projeto real), usando o
 * projeto fictício `demo-conecta-tdah` — o prefixo `demo-` garante que o
 * emulador não tenta falar com nenhum projeto de verdade no Firebase.
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
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv;

const MAE = {
    nome: "Maria Fictícia",
    email: "mae.ficticia@exemplo.com",
    role: "mae",
    dadosPerfil: { grauParentesco: "mãe" },
    criadoEm: 1700000000000,
};
const MEDICO = {
    nome: "Dr. Fictício",
    email: "medico.ficticio@exemplo.com",
    role: "medico",
    dadosPerfil: { crm: "00000", especialidade: "psiquiatria infantil", unidadeSUS: "UBS Fictícia" },
    criadoEm: 1700000000000,
};
const ESCOLA = {
    nome: "Coordenadora Fictícia",
    email: "escola.ficticia@exemplo.com",
    role: "escola",
    dadosPerfil: { nomeEscola: "Escola Fictícia", cargo: "professora", disciplina: "Matemática" },
    criadoEm: 1700000000000,
};
const ADMIN = {
    nome: "Admin Fictício",
    email: "admin.ficticio@exemplo.com",
    role: "admin",
    dadosPerfil: {},
    criadoEm: 1700000000000,
};

// Contextos autenticados como cada usuário
const comoMae = () => testEnv.authenticatedContext("mae1", { email: MAE.email }).firestore();
const comoMedico = () => testEnv.authenticatedContext("medico1", { email: MEDICO.email }).firestore();
const comoEscola = () => testEnv.authenticatedContext("escola1", { email: ESCOLA.email }).firestore();
const comoAdmin = () => testEnv.authenticatedContext("admin1", { email: ADMIN.email }).firestore();
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
        const db = ctx.firestore();
        await setDoc(doc(db, "users/mae1"), MAE);
        await setDoc(doc(db, "users/medico1"), MEDICO);
        await setDoc(doc(db, "users/escola1"), ESCOLA);
        await setDoc(doc(db, "users/admin1"), ADMIN);
    });
});

// =============================================================================
describe("update do próprio perfil", () => {
    test("pode alterar nome e dadosPerfil", async () => {
        await assertSucceeds(updateDoc(doc(comoMae(), "users/mae1"), {
            nome: "Maria Fictícia Editada",
            dadosPerfil: { grauParentesco: "avó" },
        }));
    });

    test("pode alterar só o nome", async () => {
        await assertSucceeds(updateDoc(doc(comoMae(), "users/mae1"), { nome: "Novo Nome" }));
    });

    test("NÃO pode alterar o email", async () => {
        await assertFails(updateDoc(doc(comoMae(), "users/mae1"), { email: "outro@exemplo.com" }));
    });

    test("NÃO pode alterar o role (auto-promoção a admin)", async () => {
        await assertFails(updateDoc(doc(comoMae(), "users/mae1"), { role: "admin" }));
    });

    test("NÃO pode trocar de perfil (mae -> medico)", async () => {
        await assertFails(updateDoc(doc(comoMae(), "users/mae1"), { role: "medico" }));
    });

    test("NÃO pode alterar criadoEm", async () => {
        await assertFails(updateDoc(doc(comoMae(), "users/mae1"), { criadoEm: 1 }));
    });

    test("NÃO pode adicionar campo novo", async () => {
        await assertFails(updateDoc(doc(comoMae(), "users/mae1"), { campoExtra: "x" }));
    });

    test("NÃO pode misturar campo permitido com campo travado", async () => {
        await assertFails(updateDoc(doc(comoMae(), "users/mae1"), { nome: "Ok", email: "outro@exemplo.com" }));
    });

    test("NÃO pode sobrescrever o documento inteiro trocando o email", async () => {
        await assertFails(setDoc(doc(comoMae(), "users/mae1"), { ...MAE, email: "outro@exemplo.com" }));
    });
});

// =============================================================================
describe("update do perfil de outra pessoa", () => {
    test("usuário comum NÃO pode editar outro usuário", async () => {
        await assertFails(updateDoc(doc(comoMedico(), "users/mae1"), { nome: "Invasor" }));
    });

    test("sem login NÃO pode editar", async () => {
        await assertFails(updateDoc(doc(semLogin(), "users/mae1"), { nome: "Invasor" }));
    });

    test("admin pode editar o nome de outro usuário", async () => {
        await assertSucceeds(updateDoc(doc(comoAdmin(), "users/mae1"), { nome: "Editado pelo admin" }));
    });

    test("admin pode editar o próprio nome", async () => {
        await assertSucceeds(updateDoc(doc(comoAdmin(), "users/admin1"), { nome: "Admin Renomeado" }));
    });

    test("NÃO: admin troca o role de outro (escola -> médico leria laudos)", async () => {
        await assertFails(updateDoc(doc(comoAdmin(), "users/medico1"), { role: "escola" }));
    });

    test("NÃO: admin promove outro usuário a admin", async () => {
        await assertFails(updateDoc(doc(comoAdmin(), "users/mae1"), { role: "admin" }));
    });

    test("NÃO: admin troca o email de outro", async () => {
        await assertFails(updateDoc(doc(comoAdmin(), "users/mae1"), { email: "outro@exemplo.com" }));
    });

    test("NÃO: admin adiciona campo novo", async () => {
        await assertFails(updateDoc(doc(comoAdmin(), "users/mae1"), { campoExtra: "x" }));
    });

    test("NÃO: admin grava dadosPerfil inválido", async () => {
        await assertFails(updateDoc(doc(comoAdmin(), "users/medico1"), { dadosPerfil: { crm: "" } }));
    });
});

// =============================================================================
describe("update — validação do conteúdo do perfil", () => {
    const editarMae = (dados) => updateDoc(doc(comoMae(), "users/mae1"), dados);

    test("aceita texto com exatamente 100 caracteres", async () => {
        await assertSucceeds(editarMae({ nome: "a".repeat(100) }));
    });

    test("NÃO aceita texto com mais de 100 caracteres", async () => {
        await assertFails(editarMae({ nome: "a".repeat(101) }));
    });

    test("NÃO aceita nome vazio", async () => {
        await assertFails(editarMae({ nome: "" }));
    });

    test("NÃO aceita nome só com espaços", async () => {
        await assertFails(editarMae({ nome: "   " }));
    });

    test("NÃO aceita nome que não é texto", async () => {
        await assertFails(editarMae({ nome: 123 }));
    });

    test("NÃO aceita campo de outro perfil (mãe gravando crm)", async () => {
        await assertFails(editarMae({ dadosPerfil: { ...MAE.dadosPerfil, crm: "00000" } }));
    });

    test("NÃO aceita nome da criança no perfil da mãe (privacidade)", async () => {
        await assertFails(editarMae({ dadosPerfil: { ...MAE.dadosPerfil, nomeCrianca: "Criança Fictícia" } }));
    });

    test("NÃO aceita chave desconhecida em dadosPerfil", async () => {
        await assertFails(editarMae({ dadosPerfil: { ...MAE.dadosPerfil, laudo: "texto livre" } }));
    });

    test("NÃO aceita dadosPerfil faltando campo obrigatório", async () => {
        await assertFails(editarMae({ dadosPerfil: {} }));
    });

    test("NÃO aceita valor que não é texto em dadosPerfil", async () => {
        await assertFails(editarMae({ dadosPerfil: { grauParentesco: { aninhado: true } } }));
    });

    test("NÃO aceita dadosPerfil que não é objeto", async () => {
        await assertFails(editarMae({ dadosPerfil: "texto" }));
    });

    test("médico edita os próprios campos", async () => {
        await assertSucceeds(updateDoc(doc(comoMedico(), "users/medico1"), {
            dadosPerfil: { crm: "11111", especialidade: "psiquiatria", unidadeSUS: "CAPS Fictício" },
        }));
    });
});

// =============================================================================
// Coordenação/direção não leciona: `disciplina` é opcional para escola
describe("escola — disciplina opcional", () => {
    const editarEscola = (dadosPerfil) => updateDoc(doc(comoEscola(), "users/escola1"), { dadosPerfil });

    test("pode remover a disciplina (virou coordenadora)", async () => {
        await assertSucceeds(editarEscola({ nomeEscola: "Escola Fictícia", cargo: "coordenadora" }));
    });

    test("pode manter a disciplina", async () => {
        await assertSucceeds(editarEscola({ ...ESCOLA.dadosPerfil, disciplina: "Português" }));
    });

    test("NÃO aceita disciplina vazia (a tela omite o campo em vez de mandar vazio)", async () => {
        await assertFails(editarEscola({ ...ESCOLA.dadosPerfil, disciplina: "" }));
    });

    test("NÃO aceita escola sem cargo (continua obrigatório)", async () => {
        await assertFails(editarEscola({ nomeEscola: "Escola Fictícia", disciplina: "Matemática" }));
    });

    test("cadastro de coordenação sem disciplina", async () => {
        const email = "coordenacao.ficticia@exemplo.com";
        const db = testEnv.authenticatedContext("coord1", { email }).firestore();
        await assertSucceeds(setDoc(doc(db, "users/coord1"), {
            nome: "Coordenação Fictícia",
            email,
            role: "escola",
            dadosPerfil: { nomeEscola: "Escola Fictícia", cargo: "coordenador(a)" },
            criadoEm: 1700000000000,
        }));
    });
});

// =============================================================================
describe("create — validação do cadastro", () => {
    const EMAIL = "novo.ficticio@exemplo.com";
    const novoUsuario = () => testEnv.authenticatedContext("novo1", { email: EMAIL }).firestore();
    const cadastroMedico = {
        nome: "Médica Fictícia",
        email: EMAIL,
        role: "medico",
        dadosPerfil: { crm: "22222", especialidade: "psiquiatria infantil", unidadeSUS: "UBS Fictícia" },
        criadoEm: 1700000000000,
    };
    const cadastrar = (dados) => setDoc(doc(novoUsuario(), "users/novo1"), dados);

    test("cadastro válido de médico", async () => {
        await assertSucceeds(cadastrar(cadastroMedico));
    });

    test("cadastro válido de mãe", async () => {
        await assertSucceeds(cadastrar({ ...cadastroMedico, role: "mae", dadosPerfil: MAE.dadosPerfil }));
    });

    test("NÃO cadastra mãe com nome da criança no perfil (privacidade)", async () => {
        await assertFails(cadastrar({ ...cadastroMedico, role: "mae", dadosPerfil: { ...MAE.dadosPerfil, nomeCrianca: "Criança Fictícia" } }));
    });

    test("NÃO cadastra como admin", async () => {
        await assertFails(cadastrar({ ...cadastroMedico, role: "admin", dadosPerfil: {} }));
    });

    test("NÃO cadastra com email diferente do login", async () => {
        await assertFails(cadastrar({ ...cadastroMedico, email: "outro@exemplo.com" }));
    });

    test("NÃO cadastra documento de outra pessoa", async () => {
        await assertFails(setDoc(doc(novoUsuario(), "users/outro1"), cadastroMedico));
    });

    test("NÃO cadastra com campo extra", async () => {
        await assertFails(cadastrar({ ...cadastroMedico, isAdmin: true }));
    });

    test("NÃO cadastra faltando campo do modelo (sem criadoEm)", async () => {
        const semCriadoEm = { ...cadastroMedico };
        delete semCriadoEm.criadoEm;
        await assertFails(cadastrar(semCriadoEm));
    });

    test("NÃO cadastra com criadoEm que não é número inteiro", async () => {
        await assertFails(cadastrar({ ...cadastroMedico, criadoEm: "ontem" }));
    });

    test("NÃO cadastra com campos de outro perfil (médico com dados de mãe)", async () => {
        await assertFails(cadastrar({ ...cadastroMedico, dadosPerfil: MAE.dadosPerfil }));
    });

    test("NÃO cadastra com texto acima de 100 caracteres", async () => {
        await assertFails(cadastrar({ ...cadastroMedico, nome: "a".repeat(101) }));
    });
});

// =============================================================================
// Regressão: garante que a mudança no update não afetou leitura e cadastro
describe("regressão — leitura e cadastro", () => {
    test("lê o próprio perfil", async () => {
        await assertSucceeds(getDoc(doc(comoMae(), "users/mae1")));
    });

    test("NÃO lê o perfil de outra pessoa", async () => {
        await assertFails(getDoc(doc(comoMedico(), "users/mae1")));
    });

    test("admin lê qualquer perfil", async () => {
        await assertSucceeds(getDoc(doc(comoAdmin(), "users/mae1")));
    });

    test("cadastro do próprio documento continua funcionando", async () => {
        const email = "professora.ficticia@exemplo.com";
        const db = testEnv.authenticatedContext("escola2", { email }).firestore();
        await assertSucceeds(setDoc(doc(db, "users/escola2"), {
            nome: "Escola Fictícia",
            email,
            role: "escola",
            dadosPerfil: { nomeEscola: "Escola Fictícia", cargo: "professor(a)", disciplina: "Matemática" },
            criadoEm: Date.now(),
        }));
    });
});
