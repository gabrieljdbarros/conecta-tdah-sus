/**
 * FUNÇÕES DE APOIO DOS TESTES DAS CLOUD FUNCTIONS
 *
 * Criam contas fictícias no emulador de Auth, perfis em `users`, pastas e
 * clientes "navegador" ligados aos emuladores. Usadas pelos arquivos
 * *.test.mjs desta pasta (este arquivo não é um teste).
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { addDoc, collection, connectFirestoreEmulator, doc, getFirestore, setDoc } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

export const PROJETO = "demo-conecta-tdah";

// Portas dos emuladores de TESTE (firebase.test.json), diferentes das do
// modo protótipo: os testes rodam mesmo com os emuladores de demonstração
// abertos, sem misturar os dados
const PORTAS = JSON.parse(readFileSync("firebase.test.json", "utf8")).emulators;
export const HORA = 60 * 60 * 1000;

const apps = [];
let testEnv;

/** Ambiente com acesso direto ao banco (ignora as regras) — só para preparar casos */
export async function prepararAmbiente() {
    testEnv = await initializeTestEnvironment({
        projectId: PROJETO,
        firestore: { host: "127.0.0.1", port: PORTAS.firestore.port, rules: readFileSync("firestore.rules", "utf8") },
    });
    return testEnv;
}

export async function encerrarAmbiente() {
    await Promise.all(apps.map((app) => deleteApp(app)));
    await testEnv?.cleanup();
}

/** Cria um app "navegador" isolado, ligado aos emuladores */
export function novoApp() {
    const app = initializeApp({ projectId: PROJETO, apiKey: "chave-ficticia" }, `app-${randomUUID()}`);
    apps.push(app);
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://127.0.0.1:${PORTAS.auth.port}`, { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", PORTAS.firestore.port);
    const fns = getFunctions(app, "southamerica-east1");
    connectFunctionsEmulator(fns, "127.0.0.1", PORTAS.functions.port);
    return { auth, db, chamar: (nome, dados) => httpsCallable(fns, nome)(dados).then((r) => r.data) };
}

/**
 * Cria uma conta fictícia com perfil em `users` (pelas regras, como no
 * cadastro). O email é único: o emulador de Auth guarda as contas entre os
 * arquivos de teste da mesma execução
 */
async function novoUsuario(role, dadosPerfil) {
    const cliente = novoApp();
    const sufixo = randomUUID().slice(0, 8);
    const email = `${role}-${sufixo}@exemplo.com`;
    const cred = await createUserWithEmailAndPassword(cliente.auth, email, "senha-ficticia");
    const nome = `${role} Fictício ${sufixo}`;
    await setDoc(doc(cliente.db, `users/${cred.user.uid}`), { nome, email, role, dadosPerfil, criadoEm: Date.now() });
    return { ...cliente, uid: cred.user.uid, nome };
}

export const novaMae = () => novoUsuario("mae", { grauParentesco: "mãe" });
export const novaEscola = () => novoUsuario("escola", { nomeEscola: "Escola Fictícia", cargo: "professora" });
export const novoMedico = () => novoUsuario("medico", { crm: "00000", especialidade: "psiquiatria", unidadeSUS: "UBS Fictícia" });

/** A mãe cria uma pasta pelo navegador (como na tela Nova pasta) */
export async function novaPasta(mae) {
    const ref = await addDoc(collection(mae.db, "pastas"), {
        nomeAluno: "Aluno Fictício",
        serie: "ef3",
        donoUid: mae.uid,
        membrosUids: [mae.uid],
        participantes: { [mae.uid]: { nome: mae.nome, papel: "mae" } },
        criadoEm: Date.now(),
    });
    return ref.id;
}

/** Convida e aceita: coloca `convidado` (escola ou médico) na pasta da mãe */
export async function vincular(mae, pastaId, convidado, papel) {
    const { token } = await mae.chamar("gerarConvite", { pastaId, papel });
    await convidado.chamar("aceitarConvite", { token });
}

export const hashDoToken = (token) => createHash("sha256").update(token).digest("hex");

/** Espera que a chamada falhe com o código indicado */
export async function falhaCom(promessa, codigo) {
    await assert.rejects(promessa, (erro) => {
        assert.equal(erro.code, `functions/${codigo}`);
        return true;
    });
}
