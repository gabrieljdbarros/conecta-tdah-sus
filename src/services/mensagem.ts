import { supabase } from "@/services/supabase";
import { AppUser } from "@/types/user";
import { PapelNaPasta } from "@/types/pasta";
import { LIMITE_MENSAGENS, Mensagem } from "@/types/mensagem";
import { COLUNAS_MENSAGEM, juntarMensagens, LinhaMensagem, mensagemErro, paraMensagem } from "@/helpers/linhas";

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

    /**
     * Link temporário para ouvir uma mensagem de voz (RF16), igual ao do app.
     * O banco registra quem ouviu (RN09) e devolve o caminho do arquivo; sem
     * esse registro o Storage não libera o link. O link vale 5 minutos e não
     * é guardado: cada vez que a pessoa ouve, um registro novo
     */
    linkAudio: async (mensagemId: string): Promise<{ url?: string; erro?: string }> => {
        const padrao = "não foi possível abrir o áudio. Confira a internet e tente de novo.";
        try {
            const { data: caminho, error } = await supabase.rpc("registrar_acesso_audio", { p_mensagem_id: mensagemId });
            if (error || typeof caminho !== "string") return { erro: mensagemErro(error, padrao) };
            const { data, error: erroLink } = await supabase.storage.from("audios").createSignedUrl(caminho, VALIDADE_LINK_S);
            if (erroLink || !data) return { erro: padrao };
            return { url: data.signedUrl };
        } catch {
            return { erro: padrao };
        }
    },
};

/** Validade do link para ouvir um áudio: o suficiente para ouvir 2 minutos */
const VALIDADE_LINK_S = 300;

export default MensagemServices;
