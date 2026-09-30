import { addDoc, collection, doc, DocumentData, getDoc, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/services/firebase";
import { mensagemErro } from "@/services/convite";
import { Pasta, Serie } from "@/types/pasta";
import { AppUser } from "@/types/user";

/**
 * SERVICES DA PASTA DO ALUNO (RF03)
 *
 * As permissões de verdade estão em firestore.rules (coleção `pastas`);
 * aqui só montamos os dados no formato que as regras aceitam.
 */

function paraPasta(id: string, data: DocumentData): Pasta {
    return {
        id,
        nomeAluno: data.nomeAluno,
        serie: data.serie,
        donoUid: data.donoUid,
        membrosUids: data.membrosUids ?? [],
        // Pastas criadas antes da lista de participantes não têm o campo
        participantes: data.participantes ?? {},
        criadoEm: data.criadoEm,
    };
}

const PastaServices = {
    /**
     * A mãe/responsável cria a pasta e vira a dona e única membro inicial.
     * Escola e médico entram depois, por convite (RN01, RN02).
     * O nome em `participantes` precisa ser igual ao do perfil (as regras
     * conferem).
     */
    criar: async (
        dona: AppUser,
        dados: { nomeAluno: string; serie: Serie }
    ): Promise<{ success: boolean; message?: string }> => {
        try {
            await addDoc(collection(db, "pastas"), {
                nomeAluno: dados.nomeAluno,
                serie: dados.serie,
                donoUid: dona.uid,
                membrosUids: [dona.uid],
                participantes: { [dona.uid]: { nome: dona.nome, papel: "mae" } },
                criadoEm: Date.now(),
            });
            return { success: true };
        } catch {
            return { success: false, message: "Não foi possível criar a pasta. Tente novamente" };
        }
    },

    /**
     * Uma pasta específica (as regras só deixam ler quem é membro)
     */
    buscar: async (pastaId: string): Promise<{ success: boolean; pasta?: Pasta }> => {
        try {
            const snapshot = await getDoc(doc(db, "pastas", pastaId));
            if (!snapshot.exists()) return { success: false };
            return { success: true, pasta: paraPasta(snapshot.id, snapshot.data()) };
        } catch {
            return { success: false };
        }
    },

    /**
     * Pastas das quais o usuário participa (como dona ou vinculado).
     * O filtro `array-contains` é obrigatório: as regras recusam listar
     * pastas sem ele. A ordenação é feita aqui para não exigir índice
     * composto no Firestore.
     */
    minhas: async (uid: string): Promise<{ success: boolean; pastas: Pasta[] }> => {
        try {
            const snapshot = await getDocs(
                query(collection(db, "pastas"), where("membrosUids", "array-contains", uid))
            );
            const pastas = snapshot.docs.map((docSnap) => paraPasta(docSnap.id, docSnap.data()));
            pastas.sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno, "pt-BR"));
            return { success: true, pastas };
        } catch {
            return { success: false, pastas: [] };
        }
    },

    /**
     * Tira alguém da pasta (Cloud Function `removerParticipante`):
     * a dona remove outra pessoa; escola/médico passa o próprio uid para sair.
     */
    removerParticipante: async (
        pastaId: string,
        participanteUid: string
    ): Promise<{ success: boolean; message?: string }> => {
        try {
            await httpsCallable(functions, "removerParticipante")({ pastaId, participanteUid });
            return { success: true };
        } catch (error) {
            return { success: false, message: mensagemErro(error, "Não foi possível concluir. Tente novamente") };
        }
    },
};

export default PastaServices;
