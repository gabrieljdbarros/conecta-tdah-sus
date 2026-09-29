import { FirebaseError } from "firebase/app";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/services/firebase";

/**
 * SERVICES DO CONVITE (RN01, RN02)
 *
 * Gerar e aceitar passam pelas Cloud Functions (functions/src/index.ts).
 * Ver e cancelar os próprios convites é feito direto no Firestore, liberado
 * pelas regras só para quem criou o convite.
 */

export type PapelConvidado = 'escola' | 'medico';

export interface ConvitePendente {
    id: string;
    papel: PapelConvidado;
    expiraEm: number;
}

/**
 * As Functions já devolvem mensagens em português para os casos previstos
 * (expirado, já usado, perfil errado...). Erros inesperados viram uma
 * mensagem genérica.
 */
function mensagemErro(error: unknown, padrao: string): string {
    if (error instanceof FirebaseError && error.code !== "functions/internal" && error.message)
        return error.message;
    return padrao;
}

const ConviteServices = {
    /** A dona da pasta gera o link de convite (vale 48 horas, uso único) */
    gerar: async (
        pastaId: string,
        papel: PapelConvidado
    ): Promise<{ success: boolean; token?: string; expiraEm?: number; message?: string }> => {
        try {
            const resultado = await httpsCallable<
                { pastaId: string; papel: PapelConvidado },
                { token: string; expiraEm: number }
            >(functions, "gerarConvite")({ pastaId, papel });
            return { success: true, ...resultado.data };
        } catch (error) {
            return { success: false, message: mensagemErro(error, "Não foi possível gerar o convite. Tente novamente") };
        }
    },

    /** Escola ou médico aceita o convite e entra na pasta */
    aceitar: async (
        token: string
    ): Promise<{ success: boolean; pastaId?: string; nomeAluno?: string; message?: string }> => {
        try {
            const resultado = await httpsCallable<
                { token: string },
                { pastaId: string; nomeAluno: string }
            >(functions, "aceitarConvite")({ token });
            return { success: true, ...resultado.data };
        } catch (error) {
            return { success: false, message: mensagemErro(error, "Não foi possível aceitar o convite. Tente novamente") };
        }
    },

    /**
     * Convites da pasta que ainda não foram usados nem expiraram.
     * O filtro `criadoPor` é obrigatório: as regras só liberam os próprios.
     */
    pendentes: async (uid: string, pastaId: string): Promise<{ success: boolean; convites: ConvitePendente[] }> => {
        try {
            const snapshot = await getDocs(query(
                collection(db, "convites"),
                where("criadoPor", "==", uid),
                where("pastaId", "==", pastaId),
                where("usadoEm", "==", null),
            ));
            const agora = Date.now();
            const convites = snapshot.docs
                .map((d) => ({ id: d.id, papel: d.data().papel, expiraEm: d.data().expiraEm }))
                .filter((c) => c.expiraEm > agora)
                .sort((a, b) => a.expiraEm - b.expiraEm);
            return { success: true, convites };
        } catch {
            return { success: false, convites: [] };
        }
    },

    /** Cancela um convite: o link para de funcionar na hora */
    cancelar: async (conviteId: string): Promise<{ success: boolean }> => {
        try {
            await deleteDoc(doc(db, "convites", conviteId));
            return { success: true };
        } catch {
            return { success: false };
        }
    },
};

export default ConviteServices;
