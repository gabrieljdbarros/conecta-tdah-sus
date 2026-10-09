import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "~/servicos/firebase";
import { Categoria } from "@/types/categoria";

/**
 * CATEGORIAS DE ACOMPANHAMENTO (RF14), só leitura no app (quem gerencia é o
 * admin, na web). Classificam o relatório; NUNCA decidem quem lê
 */
const CategoriaServicos = {
    listar: async (): Promise<{ success: boolean; categorias: Categoria[] }> => {
        try {
            const snapshot = await getDocs(collection(db, "categorias"));
            const categorias: Categoria[] = snapshot.docs.map((d) => ({
                id: d.id, nome: d.data().nome, ativa: d.data().ativa, criadoEm: d.data().criadoEm,
            }));
            categorias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            return { success: true, categorias };
        } catch {
            return { success: false, categorias: [] };
        }
    },

    buscar: async (id: string): Promise<{ success: boolean; categoria?: Categoria }> => {
        try {
            const snapshot = await getDoc(doc(db, "categorias", id));
            if (!snapshot.exists()) return { success: false };
            const d = snapshot.data();
            return { success: true, categoria: { id, nome: d.nome, ativa: d.ativa, criadoEm: d.criadoEm } };
        } catch {
            return { success: false };
        }
    },
};

export default CategoriaServicos;
