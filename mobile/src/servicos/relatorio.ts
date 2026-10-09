import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "~/servicos/firebase";
import { AppUser } from "@/types/user";
import { PapelNaPasta, Relatorio, TipoRelatorio, TIPOS_QUE_ESCREVE, TIPOS_QUE_LE } from "@/types/relatorio";

/**
 * SERVIÇOS DOS RELATÓRIOS (decisão travada 9 / RN06), iguais aos da web.
 * A matriz de quem lê cada tipo (TIPOS_QUE_LE) vem de src/types da web:
 * um lugar só, espelho das Security Rules
 */

/** Papel da pessoa NA PASTA (igual às regras): a dona é a mãe */
export function papelNaPasta(user: AppUser, donoUid: string): PapelNaPasta | null {
    if (user.uid === donoUid) return 'mae';
    if (user.role === 'escola' || user.role === 'medico') return user.role;
    return null;
}

const RelatorioServicos = {
    /** Só os tipos que o papel lê (as regras recusam a consulta sem esse filtro) */
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

    /** Um relatório (as regras liberam só se o papel pode ler o tipo dele) */
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
    enviar: async (pastaId: string, autor: AppUser, papel: PapelNaPasta,
        dados: { tipo: TipoRelatorio; categoriaId: string; texto: string }): Promise<{ success: boolean; message?: string }> => {
        // Defesa extra (a barreira real é a regra): só os tipos que o papel escreve
        if (!TIPOS_QUE_ESCREVE[papel].includes(dados.tipo))
            return { success: false, message: "Você não pode escrever este tipo de relatório" };
        try {
            // A regra exige o nome IGUAL ao do perfil: lê o nome atual (pode ter
            // sido editado na web ou em outro aparelho depois de entrar no app)
            const perfil = await getDoc(doc(db, "users", autor.uid));
            await addDoc(collection(db, "pastas", pastaId, "relatorios"), {
                tipo: dados.tipo, categoriaId: dados.categoriaId, texto: dados.texto,
                autorUid: autor.uid, autorNome: perfil.data()?.nome ?? autor.nome, autorPapel: papel, criadoEm: Date.now(),
            });
            return { success: true };
        } catch {
            return { success: false, message: "Não foi possível enviar o relatório. Tente novamente" };
        }
    },
};

export default RelatorioServicos;
