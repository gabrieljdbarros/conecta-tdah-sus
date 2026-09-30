import { addDoc, collection, limitToLast, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/services/firebase";
import { AppUser } from "@/types/user";
import { PapelNaPasta } from "@/types/relatorio";
import { LIMITE_MENSAGENS, Mensagem } from "@/types/mensagem";

/**
 * SERVICES DO CHAT DA PASTA (RN05, decisão travada 10)
 * As permissões estão em firestore.rules (`pastas/{id}/canais/...`).
 */

const colecao = (pastaId: string, canal: string) => collection(db, "pastas", pastaId, "canais", canal, "mensagens");

const MensagemServices = {
    /**
     * Acompanha o canal em tempo real (onSnapshot): chama `aoMudar` com as
     * mensagens mais recentes, da mais antiga para a mais nova.
     * Devolve a função que para de acompanhar (chamar ao sair da tela/aba)
     */
    ouvir: (
        pastaId: string,
        canal: string,
        aoMudar: (mensagens: Mensagem[]) => void,
        aoFalhar: () => void
    ): (() => void) => {
        const q = query(colecao(pastaId, canal), orderBy("criadoEm"), limitToLast(LIMITE_MENSAGENS));
        return onSnapshot(
            q,
            (snapshot) => aoMudar(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Mensagem)),
            () => aoFalhar()
        );
    },

    /** Envia uma mensagem. Depois de enviada, não pode ser alterada */
    enviar: async (
        pastaId: string,
        canal: string,
        autor: AppUser,
        papel: PapelNaPasta,
        texto: string
    ): Promise<{ success: boolean }> => {
        try {
            await addDoc(colecao(pastaId, canal), {
                texto,
                autorUid: autor.uid,
                autorNome: autor.nome,
                autorPapel: papel,
                criadoEm: Date.now(),
            });
            return { success: true };
        } catch {
            return { success: false };
        }
    },
};

export default MensagemServices;
