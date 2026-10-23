import { supabase } from "@/services/supabase";
import { AppUser } from "@/types/user";
import { PapelNaPasta } from "@/types/pasta";
import { LIMITE_MENSAGENS, Mensagem } from "@/types/mensagem";
import { COLUNAS_MENSAGEM, juntarMensagens, LinhaMensagem, paraMensagem } from "@/helpers/linhas";

/**
 * SERVICES DO CHAT DA PASTA (RN05, decisão travada 7)
 * Um único chat em grupo por pasta. As permissões estão nas políticas RLS
 * da tabela `mensagens` (o Realtime também as respeita).
 */

const MensagemServices = {
    /**
     * Acompanha a conversa em tempo real: carrega as mensagens mais recentes
     * e depois recebe cada mensagem nova. Chama `aoMudar` com a lista da
     * mais antiga para a mais nova.
     * Devolve a função que para de acompanhar (chamar ao sair da tela)
     */
    ouvir: (
        pastaId: string,
        aoMudar: (mensagens: Mensagem[]) => void,
        aoFalhar: () => void
    ): (() => void) => {
        let lista: Mensagem[] = [];
        let carregou = false;
        const pendentes: Mensagem[] = []; // chegaram antes da carga inicial

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
                juntar([...(data as LinhaMensagem[]).map(paraMensagem), ...pendentes]);
            });

        return () => { supabase.removeChannel(canal); };
    },

    /**
     * Envia uma mensagem. Depois de enviada, não pode ser alterada.
     * A data é a do servidor; o banco confere o autor, o nome e o papel
     */
    enviar: async (
        pastaId: string,
        autor: AppUser,
        papel: PapelNaPasta,
        texto: string
    ): Promise<{ success: boolean }> => {
        const { error } = await supabase.from("mensagens").insert({
            pasta_id: pastaId,
            autor_id: autor.uid,
            autor_nome: autor.nome,
            autor_papel: papel,
            texto,
        });
        return { success: !error };
    },
};

export default MensagemServices;
