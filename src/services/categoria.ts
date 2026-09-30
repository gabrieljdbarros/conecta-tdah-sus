import { collection, doc, getDoc, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/services/firebase";
import { Categoria } from "@/types/categoria";

/**
 * SERVICES DAS CATEGORIAS DE ACOMPANHAMENTO (RF14, CSU15, RN10)
 *
 * As permissões estão em firestore.rules: qualquer pessoa logada lê, só o
 * admin cria e edita, ninguém apaga (desativa-se).
 */

/**
 * Compara nomes ignorando maiúsculas, acentos e espaços nas pontas — para
 * avisar de categoria repetida ("Sono" e "sono " são a mesma). As regras
 * não conseguem garantir nome único, então a checagem fica na tela
 */
export function mesmoNome(a: string, b: string): boolean {
    const normalizar = (s: string) => s.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
    return normalizar(a) === normalizar(b);
}

const CategoriaServices = {
    /** Todas as categorias, em ordem alfabética */
    listar: async (): Promise<{ success: boolean; categorias: Categoria[] }> => {
        try {
            const snapshot = await getDocs(collection(db, "categorias"));
            const categorias: Categoria[] = snapshot.docs.map((d) => ({
                id: d.id,
                nome: d.data().nome,
                ativa: d.data().ativa,
                criadoEm: d.data().criadoEm,
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

    /**
     * Cria uma ou várias categorias de uma vez (as sugestões usam várias).
     * O lote grava tudo ou nada
     */
    criar: async (nomes: string[]): Promise<{ success: boolean; message?: string }> => {
        try {
            const lote = writeBatch(db);
            const agora = Date.now();
            nomes.forEach((nome) => lote.set(doc(collection(db, "categorias")), { nome, ativa: true, criadoEm: agora }));
            await lote.commit();
            return { success: true };
        } catch {
            return { success: false, message: "Não foi possível salvar. Tente novamente" };
        }
    },

    renomear: async (id: string, nome: string): Promise<{ success: boolean; message?: string }> => {
        try {
            await updateDoc(doc(db, "categorias", id), { nome });
            return { success: true };
        } catch {
            return { success: false, message: "Não foi possível salvar. Tente novamente" };
        }
    },

    /** Desativar tira a categoria das opções de relatórios novos, sem apagar */
    definirAtiva: async (id: string, ativa: boolean): Promise<{ success: boolean }> => {
        try {
            await updateDoc(doc(db, "categorias", id), { ativa });
            return { success: true };
        } catch {
            return { success: false };
        }
    },
};

export default CategoriaServices;
