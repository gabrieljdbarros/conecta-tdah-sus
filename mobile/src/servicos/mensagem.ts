import { supabase } from "~/servicos/supabase";
import { COLUNAS_MENSAGEM, juntarMensagens, LinhaMensagem, paraMensagem } from "@/helpers/linhas";
import { AppUser } from "@/types/user";
import { PapelNaPasta } from "@/types/pasta";
import { LIMITE_MENSAGENS, Mensagem } from "@/types/mensagem";

/**
 * CHAT DA PASTA (RN05, decisão travada 7), igual a src/services/mensagem.ts
 * da web: um único chat em grupo por pasta, com todos os membros. As
 * permissões estão nas políticas RLS da tabela `mensagens` (o Realtime
 * também as respeita)
 */

/** Sem resposta do servidor nesse tempo, a tela avisa (em vez de "carregando" sem fim) */
const ESPERA_MS = 15000;

const MensagemServicos = {
    /**
     * Acompanha a conversa em tempo real (só as 100 mais recentes: pouco
     * consumo de dados): carrega as últimas e depois recebe cada mensagem
     * nova. Devolve a função que para de acompanhar.
     * Nada fica guardado no aparelho: a lista vem sempre do servidor (e
     * passa pelo RLS), inclusive num celular compartilhado
     */
    ouvir: (pastaId: string, aoMudar: (mensagens: Mensagem[]) => void, aoFalhar: () => void): (() => void) => {
        let lista: Mensagem[] = [];
        let carregou = false;
        const pendentes: Mensagem[] = []; // chegaram antes da carga inicial
        const espera = setTimeout(() => { if (!carregou) aoFalhar(); }, ESPERA_MS);

        const juntar = (novas: Mensagem[]) => {
            lista = juntarMensagens(lista, novas, LIMITE_MENSAGENS);
            aoMudar(lista);
        };

        // Primeiro assina (para não perder mensagem enviada durante a carga),
        // depois carrega as últimas
        const canal = supabase
            .channel(`mensagens:${pastaId}`)
            .on("postgres_changes",
                { event: "INSERT", schema: "public", table: "mensagens", filter: `pasta_id=eq.${pastaId}` },
                (evento) => {
                    const m = paraMensagem(evento.new as LinhaMensagem);
                    if (carregou) juntar([m]);
                    else pendentes.push(m);
                })
            .subscribe(async (status) => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    aoFalhar();
                    return;
                }
                if (status !== "SUBSCRIBED" || carregou) return;

                const { data, error } = await supabase.from("mensagens")
                    .select(COLUNAS_MENSAGEM)
                    .eq("pasta_id", pastaId)
                    .order("criado_em", { ascending: false })
                    .limit(LIMITE_MENSAGENS);
                if (error) {
                    aoFalhar();
                    return;
                }
                carregou = true;
                clearTimeout(espera);
                juntar([...(data as LinhaMensagem[]).map(paraMensagem), ...pendentes]);
            });

        return () => { clearTimeout(espera); supabase.removeChannel(canal); };
    },

    /**
     * Envia uma mensagem. Depois de enviada, não pode ser alterada.
     * `semConexao`: o servidor não respondeu a tempo (a mensagem pode chegar depois)
     */
    enviar: async (pastaId: string, autor: AppUser, papel: PapelNaPasta, texto: string): Promise<{ success: boolean; semConexao?: boolean }> => {
        let espera: ReturnType<typeof setTimeout> | undefined;
        const tempoEsgotado = new Promise<'tempo'>((resolve) => { espera = setTimeout(() => resolve('tempo'), ESPERA_MS); });
        try {
            const resultado = await Promise.race([gravar(pastaId, autor, papel, texto), tempoEsgotado]);
            if (resultado === 'tempo') return { success: false, semConexao: true };
            return { success: resultado };
        } finally {
            clearTimeout(espera);
        }
    },
};

/** Grava a mensagem (separado para poder esperar com tempo limite) */
async function gravar(pastaId: string, autor: AppUser, papel: PapelNaPasta, texto: string): Promise<boolean> {
    // O banco exige o nome IGUAL ao do perfil: lê o nome atual (pode ter
    // sido editado na web depois de entrar no app)
    const { data: perfil } = await supabase.from("perfis").select("nome").eq("id", autor.uid).maybeSingle();
    const { error } = await supabase.from("mensagens").insert({
        pasta_id: pastaId,
        autor_id: autor.uid,
        autor_nome: perfil?.nome ?? autor.nome,
        autor_papel: papel,
        texto,
    });
    return !error;
}

export default MensagemServicos;
