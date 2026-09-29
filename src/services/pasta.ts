import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import { Pasta, Serie } from "@/types/pasta";

/**
 * SERVICES DA PASTA DO ALUNO (RF03)
 *
 * As permissões de verdade estão em firestore.rules (coleção `pastas`);
 * aqui só montamos os dados no formato que as regras aceitam.
 */
const PastaServices = {
    /**
     * A mãe/responsável cria a pasta e vira a dona e única membro inicial.
     * Escola e médico entram depois, por convite (RN01, RN02).
     */
    criar: async (
        donoUid: string,
        dados: { nomeAluno: string; serie: Serie }
    ): Promise<{ success: boolean; message?: string }> => {
        try {
            await addDoc(collection(db, "pastas"), {
                nomeAluno: dados.nomeAluno,
                serie: dados.serie,
                donoUid,
                membrosUids: [donoUid],
                criadoEm: Date.now(),
            });
            return { success: true };
        } catch {
            return { success: false, message: "Não foi possível criar a pasta. Tente novamente" };
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
            const pastas: Pasta[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    nomeAluno: data.nomeAluno,
                    serie: data.serie,
                    donoUid: data.donoUid,
                    membrosUids: data.membrosUids ?? [],
                    criadoEm: data.criadoEm,
                };
            });
            pastas.sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno, "pt-BR"));
            return { success: true, pastas };
        } catch {
            return { success: false, pastas: [] };
        }
    },
};

export default PastaServices;
