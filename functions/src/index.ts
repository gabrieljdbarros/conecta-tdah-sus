/**
 * CLOUD FUNCTIONS — CONECTA TDAH SUS
 *
 * - Convite por link para vincular escola e médico à pasta do aluno
 *   (RN01: link com expiração; RN02: uso único).
 * - Remover participante da pasta (dona) e sair da pasta (escola/médico).
 *
 * Por que Function e não Security Rule: `membrosUids` e `participantes`
 * nunca mudam pelo navegador (quem aceita o convite ainda NÃO é membro, e a
 * remoção precisa mexer nas duas listas juntas).
 * A Function roda no servidor (Admin SDK, que ignora as regras), faz todas
 * as checagens e grava tudo numa transação.
 *
 * LGPD: nada aqui registra dados da pasta ou do aluno em log.
 */
import { createHash, randomBytes } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

// São Paulo: os dados e o processamento ficam no Brasil
setGlobalOptions({ region: "southamerica-east1" });

/** Validade do link: 48 horas (decisão do projeto) */
const VALIDADE_MS = 48 * 60 * 60 * 1000;

type PapelConvidado = "escola" | "medico";
const PAPEIS_CONVIDADOS: PapelConvidado[] = ["escola", "medico"];
const PAPEL_LABEL: Record<PapelConvidado, string> = { escola: "escola", medico: "médico" };

/**
 * O banco guarda só o hash do token, nunca o token: quem vê o banco não
 * consegue montar um link válido (mesma ideia de não guardar senhas).
 */
function hashDoToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * Ids do Firestore (addDoc) e do Firebase Auth: só letras e números.
 * Validar evita montar caminhos com "/" vindos do navegador
 */
const ID_VALIDO = /^[A-Za-z0-9]{1,128}$/;

function exigirLogin(uid: string | undefined): string {
    if (!uid) throw new HttpsError("unauthenticated", "Entre na sua conta para continuar.");
    return uid;
}

// =============================================================================
/**
 * A dona da pasta gera um convite para escola ou médico.
 * Devolve o token, que vira o link `/convite/<token>`.
 */
export const gerarConvite = onCall(async (request) => {
    const uid = exigirLogin(request.auth?.uid);
    const { pastaId, papel } = (request.data ?? {}) as { pastaId?: unknown; papel?: unknown };

    if (typeof pastaId !== "string" || !ID_VALIDO.test(pastaId))
        throw new HttpsError("invalid-argument", "Pasta inválida.");
    if (!PAPEIS_CONVIDADOS.includes(papel as PapelConvidado))
        throw new HttpsError("invalid-argument", "Escolha se o convite é para a escola ou para o médico.");

    const pasta = await db.doc(`pastas/${pastaId}`).get();
    const dados = pasta.data();
    if (!pasta.exists || dados?.donoUid !== uid || !(dados?.membrosUids ?? []).includes(uid))
        throw new HttpsError("permission-denied", "Só a responsável pela pasta pode convidar.");

    // 32 bytes aleatórios: impossível de adivinhar
    const token = randomBytes(32).toString("base64url");
    const agora = Date.now();
    const expiraEm = agora + VALIDADE_MS;

    await db.doc(`convites/${hashDoToken(token)}`).set({
        pastaId,
        papel,
        criadoPor: uid,
        criadoEm: agora,
        expiraEm,
        usadoEm: null,
        usadoPor: null,
    });

    return { token, expiraEm };
});

// =============================================================================
/**
 * Escola ou médico aceita o convite: entra em `membrosUids` e na lista de
 * `participantes` da pasta. Tudo numa transação, para garantir o uso único
 * mesmo se o link for aberto duas vezes ao mesmo tempo.
 */
export const aceitarConvite = onCall(async (request) => {
    const uid = exigirLogin(request.auth?.uid);
    const { token } = (request.data ?? {}) as { token?: unknown };

    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
        throw new HttpsError("not-found", "Este convite não existe ou foi cancelado.");

    const conviteRef = db.doc(`convites/${hashDoToken(token)}`);
    const usuarioRef = db.doc(`users/${uid}`);

    return db.runTransaction(async (tx) => {
        // Na transação, todas as leituras vêm antes das escritas
        const [convite, usuario] = await Promise.all([tx.get(conviteRef), tx.get(usuarioRef)]);

        if (!convite.exists)
            throw new HttpsError("not-found", "Este convite não existe ou foi cancelado.");
        const c = convite.data()!;
        if (c.usadoEm !== null)
            throw new HttpsError("failed-precondition", "Este convite já foi usado. Peça um novo link à mãe ou ao responsável pelo aluno.");
        if (c.expiraEm < Date.now())
            throw new HttpsError("failed-precondition", "Este convite expirou. Peça um novo link à mãe ou ao responsável pelo aluno.");

        // O papel vem do Firestore (decisão travada 2), nunca do navegador.
        // Isso também barra contas de mãe: só escola/médico entram por convite
        const perfil = usuario.data();
        const papelConvite = c.papel as PapelConvidado;
        if (perfil?.role !== papelConvite)
            throw new HttpsError(
                "permission-denied",
                `Este convite é para ${PAPEL_LABEL[papelConvite]}. Entre com uma conta de ${PAPEL_LABEL[papelConvite]} para aceitar.`
            );

        const pastaRef = db.doc(`pastas/${c.pastaId}`);
        const pasta = await tx.get(pastaRef);
        if (!pasta.exists)
            throw new HttpsError("not-found", "Esta pasta não existe mais.");
        if ((pasta.data()?.membrosUids ?? []).includes(uid))
            throw new HttpsError("already-exists", "Você já faz parte desta pasta.");

        // Resumo público do participante (minimização: só nome, papel e
        // instituição — sem CRM, cargo etc.)
        const detalhe = papelConvite === "escola"
            ? perfil?.dadosPerfil?.nomeEscola
            : perfil?.dadosPerfil?.unidadeSUS;

        tx.update(pastaRef, {
            membrosUids: FieldValue.arrayUnion(uid),
            [`participantes.${uid}`]: { nome: perfil?.nome ?? "", papel: papelConvite, detalhe: detalhe ?? "" },
        });
        tx.update(conviteRef, { usadoEm: Date.now(), usadoPor: uid });

        return { pastaId: c.pastaId as string, nomeAluno: pasta.data()?.nomeAluno as string };
    });
});

// =============================================================================
/**
 * Tira alguém da pasta (sai de `membrosUids` e de `participantes` juntos):
 *  - a dona remove outra pessoa;
 *  - escola/médico remove a si mesmo ("sair da pasta").
 * A dona não sai nem é removida: a pasta ficaria sem responsável (apagar a
 * pasta é o TODO de exclusão da LGPD).
 * Quem sai perde a leitura na hora, porque as regras só deixam ler membros.
 */
export const removerParticipante = onCall(async (request) => {
    const uid = exigirLogin(request.auth?.uid);
    const { pastaId, participanteUid } = (request.data ?? {}) as { pastaId?: unknown; participanteUid?: unknown };

    if (typeof pastaId !== "string" || !ID_VALIDO.test(pastaId)
        || typeof participanteUid !== "string" || !ID_VALIDO.test(participanteUid))
        throw new HttpsError("invalid-argument", "Pedido inválido.");

    const pastaRef = db.doc(`pastas/${pastaId}`);

    await db.runTransaction(async (tx) => {
        const pasta = await tx.get(pastaRef);
        const membros: string[] = pasta.data()?.membrosUids ?? [];

        // Mesma resposta para "pasta não existe" e "você não é membro": não
        // revela a quem não participa se a pasta existe
        if (!pasta.exists || !membros.includes(uid))
            throw new HttpsError("permission-denied", "Você não faz parte desta pasta.");

        const donoUid = pasta.data()?.donoUid;
        if (participanteUid === donoUid)
            throw new HttpsError("failed-precondition", "A responsável pela pasta não pode sair nem ser removida.");
        if (uid !== donoUid && uid !== participanteUid)
            throw new HttpsError("permission-denied", "Só a responsável pela pasta pode remover outras pessoas.");
        if (!membros.includes(participanteUid))
            throw new HttpsError("not-found", "Esta pessoa não faz parte da pasta.");

        tx.update(pastaRef, {
            membrosUids: FieldValue.arrayRemove(participanteUid),
            [`participantes.${participanteUid}`]: FieldValue.delete(),
        });
    });

    return { ok: true };
});
