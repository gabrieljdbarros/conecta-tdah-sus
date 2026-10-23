import { addDoc, collection, doc, getDoc, limitToLast, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "~/servicos/firebase";
import { AppUser } from "@/types/user";
import { PapelNaPasta } from "@/types/pasta";
import { LIMITE_MENSAGENS, Mensagem } from "@/types/mensagem";

/**
 * CHAT DA PASTA (RN05, decisão travada 7), igual a src/services/mensagem.ts
 * da web. Um único canal, `grupo`, com todos os membros da pasta. As
 * permissões estão em firestore.rules
 */

const colecao = (pastaId: string, canal: string) => collection(db, "pastas", pastaId, "canais", canal, "mensagens");

/** Sem resposta do servidor nesse tempo, a tela avisa (em vez de "carregando" sem fim) */
const ESPERA_MS = 15000;

const MensagemServicos = {
    /**
     * Acompanha o canal em tempo real (só as 100 mais recentes: pouco
     * consumo de dados). Devolve a função que para de acompanhar.
     * Ignora a primeira resposta que vier só da memória do aparelho: num
     * celular compartilhado, não mostra nada de uma sessão anterior antes de o
     * servidor (e as regras) confirmarem
     */
    ouvir: (pastaId: string, canal: string, aoMudar: (mensagens: Mensagem[]) => void, aoFalhar: () => void): (() => void) => {
        const q = query(colecao(pastaId, canal), orderBy("criadoEm"), limitToLast(LIMITE_MENSAGENS));
        let confirmadoPeloServidor = false;
        const espera = setTimeout(() => { if (!confirmadoPeloServidor) aoFalhar(); }, ESPERA_MS);
        const parar = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            if (!snapshot.metadata.fromCache) confirmadoPeloServidor = true;
            if (!confirmadoPeloServidor) return;
            aoMudar(snapshot.docs.map((d) => {
                // "estimate": a mensagem recém-enviada aparece na hora, com a
                // hora local, até o servidor confirmar a oficial
                const dados = d.data({ serverTimestamps: 'estimate' });
                const criadoEm = dados.criadoEm instanceof Timestamp ? dados.criadoEm.toMillis() : Date.now();
                return { id: d.id, ...dados, criadoEm } as Mensagem;
            }));
        }, () => aoFalhar());
        return () => { clearTimeout(espera); parar(); };
    },

    /**
     * Envia uma mensagem. Depois de enviada, não pode ser alterada.
     * `semConexao`: o servidor não respondeu a tempo (a mensagem pode chegar depois)
     */
    enviar: async (pastaId: string, canal: string, autor: AppUser, papel: PapelNaPasta, texto: string): Promise<{ success: boolean; semConexao?: boolean }> => {
        let espera: ReturnType<typeof setTimeout> | undefined;
        const tempoEsgotado = new Promise<'tempo'>((resolve) => { espera = setTimeout(() => resolve('tempo'), ESPERA_MS); });
        try {
            const resultado = await Promise.race([gravar(pastaId, canal, autor, papel, texto), tempoEsgotado]);
            return resultado === 'tempo' ? { success: false, semConexao: true } : { success: true };
        } catch {
            return { success: false };
        } finally {
            clearTimeout(espera);
        }
    },
};

/** Grava a mensagem (separado para poder esperar com tempo limite) */
async function gravar(pastaId: string, canal: string, autor: AppUser, papel: PapelNaPasta, texto: string) {
    // A regra exige o nome IGUAL ao do perfil: lê o nome atual
    const perfil = await getDoc(doc(db, "users", autor.uid));
    await addDoc(colecao(pastaId, canal), {
        texto,
        autorUid: autor.uid,
        autorNome: perfil.data()?.nome ?? autor.nome,
        autorPapel: papel,
        criadoEm: serverTimestamp(), // data do servidor (as regras exigem)
    });
}

export default MensagemServicos;
