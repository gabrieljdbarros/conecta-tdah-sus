import { addDoc, collection, doc, DocumentData, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "~/servicos/firebase";
import { Pasta } from "@/types/pasta";
import { AppUser } from "@/types/user";

/**
 * SERVIÇOS DA PASTA DO ALUNO (RF03), iguais a src/services/pasta.ts da web.
 * As permissões de verdade estão em firestore.rules (coleção `pastas`)
 */

function paraPasta(id: string, data: DocumentData): Pasta {
    return {
        id,
        nomeAluno: data.nomeAluno,
        donoUid: data.donoUid,
        membrosUids: data.membrosUids ?? [],
        participantes: data.participantes ?? {},
        criadoEm: data.criadoEm,
    };
}

const PastaServicos = {
    /** A mãe cria a pasta, só com o nome da criança, e vira a dona (decisão travada 6) */
    criar: async (dona: AppUser, dados: { nomeAluno: string }): Promise<{ success: boolean; message?: string }> => {
        try {
            await addDoc(collection(db, "pastas"), {
                nomeAluno: dados.nomeAluno,
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

    /** Uma pasta (as regras só deixam ler quem é membro) */
    buscar: async (pastaId: string): Promise<{ success: boolean; pasta?: Pasta }> => {
        try {
            const snapshot = await getDoc(doc(db, "pastas", pastaId));
            if (!snapshot.exists()) return { success: false };
            return { success: true, pasta: paraPasta(snapshot.id, snapshot.data()) };
        } catch {
            return { success: false };
        }
    },

    /** Pastas de que a pessoa participa (o filtro é exigido pelas regras) */
    minhas: async (uid: string): Promise<{ success: boolean; pastas: Pasta[] }> => {
        try {
            const snapshot = await getDocs(query(collection(db, "pastas"), where("membrosUids", "array-contains", uid)));
            const pastas = snapshot.docs.map((d) => paraPasta(d.id, d.data()));
            pastas.sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno, "pt-BR"));
            return { success: true, pastas };
        } catch {
            return { success: false, pastas: [] };
        }
    },
};

export default PastaServicos;
