import { FirebaseError } from "firebase/app";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "~/servicos/firebase";

/**
 * CONVITES (RN01, RN02), iguais a src/services/convite.ts da web.
 * Gerar, aceitar e remover passam pelas MESMAS Cloud Functions; ver e
 * cancelar os próprios convites é direto no Firestore (as regras liberam
 * só para quem criou)
 */

export type PapelConvidado = 'escola' | 'medico';
export interface ConvitePendente { id: string; papel: PapelConvidado; expiraEm: number }

/**
 * As Functions devolvem mensagens em português só para os casos previstos
 * (vencido, já usado, perfil errado...). Qualquer outro erro (rede etc.) vira
 * a mensagem padrão, e não um texto técnico em inglês
 */
const CODIGOS_COM_MENSAGEM = ["functions/failed-precondition", "functions/permission-denied", "functions/not-found",
    "functions/already-exists", "functions/invalid-argument", "functions/unauthenticated", "functions/deadline-exceeded"];
export function mensagemErro(error: unknown, padrao: string): string {
    if (error instanceof FirebaseError && CODIGOS_COM_MENSAGEM.includes(error.code) && error.message) return error.message;
    return padrao;
}

/**
 * Endereço do site, para montar o link do convite (quem recebe pode abrir
 * no navegador OU colar no app). No modo protótipo, o site no computador
 */
const SITE = process.env.EXPO_PUBLIC_SITE_URL
    ?? `http://${process.env.EXPO_PUBLIC_EMULADOR_HOST ?? 'localhost'}:3000`;
// Fora do desenvolvimento, o link do convite (que dá acesso à pasta) só por https
if (!__DEV__ && !SITE.startsWith('https://'))
    throw new Error('EXPO_PUBLIC_SITE_URL precisa ser https:// fora do modo de desenvolvimento.');
export const linkDoConvite = (token: string) => `${SITE}/convite/${token}`;

/**
 * Tira o código do convite de um link colado (ou do próprio código).
 * O código tem 43 letras/números (formato das Functions); nada é enviado
 * se o texto não tiver esse formato
 */
export function codigoDoTexto(texto: string): string | null {
    const achado = texto.match(/(?:convite\/)?([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/);
    return achado ? achado[1] : null;
}

const ConviteServicos = {
    /** A dona gera o convite (vale 48 horas, uso único) */
    gerar: async (pastaId: string, papel: PapelConvidado): Promise<{ success: boolean; token?: string; expiraEm?: number; message?: string }> => {
        try {
            const r = await httpsCallable<{ pastaId: string; papel: PapelConvidado }, { token: string; expiraEm: number }>(functions, "gerarConvite")({ pastaId, papel });
            return { success: true, ...r.data };
        } catch (error) {
            return { success: false, message: mensagemErro(error, "Não foi possível gerar o convite. Tente novamente") };
        }
    },

    /** Escola ou médico aceita e entra na pasta */
    aceitar: async (token: string): Promise<{ success: boolean; pastaId?: string; nomeAluno?: string; message?: string }> => {
        try {
            const r = await httpsCallable<{ token: string }, { pastaId: string; nomeAluno: string }>(functions, "aceitarConvite")({ token });
            return { success: true, ...r.data };
        } catch (error) {
            return { success: false, message: mensagemErro(error, "Não foi possível aceitar o convite. Tente novamente") };
        }
    },

    /** Convites não usados da pasta (válidos e vencidos), criados pela própria pessoa */
    pendentes: async (uid: string, pastaId: string): Promise<{ success: boolean; convites: ConvitePendente[] }> => {
        try {
            const snapshot = await getDocs(query(collection(db, "convites"),
                where("criadoPor", "==", uid), where("pastaId", "==", pastaId), where("usadoEm", "==", null)));
            const convites = snapshot.docs
                .map((d) => ({ id: d.id, papel: d.data().papel, expiraEm: d.data().expiraEm }))
                .sort((a, b) => a.expiraEm - b.expiraEm);
            return { success: true, convites };
        } catch {
            return { success: false, convites: [] };
        }
    },

    /** Cancela: o link para de funcionar na hora */
    cancelar: async (conviteId: string): Promise<{ success: boolean }> => {
        try {
            await deleteDoc(doc(db, "convites", conviteId));
            return { success: true };
        } catch {
            return { success: false };
        }
    },

    /** A dona remove outra pessoa; escola/médico passa o próprio uid para sair */
    removerParticipante: async (pastaId: string, participanteUid: string): Promise<{ success: boolean; message?: string }> => {
        try {
            await httpsCallable(functions, "removerParticipante")({ pastaId, participanteUid });
            return { success: true };
        } catch (error) {
            return { success: false, message: mensagemErro(error, "Não foi possível concluir. Tente novamente") };
        }
    },
};

export default ConviteServicos;
