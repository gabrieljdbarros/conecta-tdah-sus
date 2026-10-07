import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import { AppUser } from "@/types/user";
import { PapelNaPasta, Relatorio, TipoRelatorio, TIPOS_QUE_LE } from "@/types/relatorio";

/**
 * SERVICES DOS RELATÓRIOS DA PASTA (decisão travada 9 / RN06)
 *
 * As permissões estão em firestore.rules (`pastas/{id}/relatorios`).
 * Aqui só montamos as consultas e os dados no formato que elas aceitam.
 */

/**
 * Papel da pessoa NA PASTA, igual ao das regras: a mãe é a dona; escola e
 * médico são membros com esse perfil
 */
export function papelNaPasta(user: AppUser, donoUid: string): PapelNaPasta | null {
    if (user.uid === donoUid) return 'mae';
    if (user.role === 'escola' || user.role === 'medico') return user.role;
    return null;
}

const RelatorioServices = {
    /**
     * Relatórios que o papel pode ler, do mais novo para o mais antigo.
     * O filtro por tipo é obrigatório: as regras recusam listar tipos que
     * o papel não pode ver. A ordenação é feita aqui para não exigir
     * índice composto no Firestore
     */
    listar: async (pastaId: string, papel: PapelNaPasta): Promise<{ success: boolean; relatorios: Relatorio[] }> => {
        try {
            const snapshot = await getDocs(query(
                collection(db, "pastas", pastaId, "relatorios"),
                where("tipo", "in", TIPOS_QUE_LE[papel]),
            ));
            const relatorios = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Relatorio);
            relatorios.sort((a, b) => b.criadoEm - a.criadoEm);
            return { success: true, relatorios };
        } catch {
            return { success: false, relatorios: [] };
        }
    },

    /**
     * Um relatório só (tela de detalhe). As regras liberam a leitura só se o
     * TIPO dele for um que o papel da pessoa pode ler: um laudo aberto pela
     * escola (ex.: link copiado) volta como "não encontrado"
     */
    buscar: async (pastaId: string, relatorioId: string): Promise<{ success: boolean; relatorio?: Relatorio }> => {
        try {
            const snapshot = await getDoc(doc(db, "pastas", pastaId, "relatorios", relatorioId));
            if (!snapshot.exists()) return { success: false };
            return { success: true, relatorio: { id: snapshot.id, ...snapshot.data() } as Relatorio };
        } catch {
            return { success: false };
        }
    },

    /** Envia um relatório. Depois de enviado, não pode ser alterado */
    enviar: async (
        pastaId: string,
        autor: AppUser,
        papel: PapelNaPasta,
        dados: { tipo: TipoRelatorio; categoriaId: string; texto: string }
    ): Promise<{ success: boolean; message?: string }> => {
        try {
            await addDoc(collection(db, "pastas", pastaId, "relatorios"), {
                tipo: dados.tipo,
                categoriaId: dados.categoriaId,
                texto: dados.texto,
                autorUid: autor.uid,
                autorNome: autor.nome,
                autorPapel: papel,
                criadoEm: Date.now(),
            });
            return { success: true };
        } catch {
            return { success: false, message: "Não foi possível enviar o relatório. Tente novamente" };
        }
    },
};

export default RelatorioServices;
