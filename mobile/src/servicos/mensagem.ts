import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { supabase } from "~/servicos/supabase";
import { COLUNAS_MENSAGEM, juntarMensagens, LinhaMensagem, mensagemErro, paraMensagem } from "@/helpers/linhas";
import { AppUser } from "@/types/user";
import { PapelNaPasta } from "@/types/pasta";
import { LIMITE_MENSAGENS, Mensagem } from "@/types/mensagem";

/**
 * CHAT DA PASTA (RN05, decisão travada 7), igual a src/services/mensagem.ts
 * da web: um único chat em grupo por pasta, com todos os membros. As
 * permissões estão nas políticas RLS da tabela `mensagens` (o Realtime
 * também as respeita).
 *
 * MENSAGENS DE VOZ (RF16, decisão travada 10): o arquivo vai para o bucket
 * privado `audios` (as políticas estão em supabase/migrations) e a mensagem
 * guarda só o caminho e a duração. Para ouvir, o banco registra quem ouviu
 * (RN09) e só então o Storage libera um link que vale 5 minutos
 */

/** Sem resposta do servidor nesse tempo, a tela avisa (em vez de "carregando" sem fim) */
const ESPERA_MS = 15000;
/** O áudio (até ~500 KB) demora mais para subir numa internet fraca */
const ESPERA_AUDIO_MS = 45000;
/** Validade do link para ouvir um áudio: o suficiente para ouvir 2 minutos */
const VALIDADE_LINK_S = 300;

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
    enviar: (pastaId: string, autor: AppUser, papel: PapelNaPasta, texto: string) =>
        comTempoLimite(gravar(pastaId, autor, papel, { texto }), ESPERA_MS),

    /**
     * Envia uma mensagem de voz: primeiro o arquivo, depois a mensagem que
     * aponta para ele. O nome do arquivo é aleatório e não tem o nome da
     * criança: <id da pasta>/<id aleatório>.m4a.
     *
     * O id é criado UMA vez por gravação (`novoIdAudio`): se a internet
     * demorar e a pessoa tocar em Enviar de novo, o reenvio usa o mesmo
     * arquivo e a mesma mensagem, sem duplicar a voz no servidor.
     * TODO (RN07): pedir o consentimento para gravar voz quando houver o
     * texto dos termos (caixa opcional no cadastro e no Perfil)
     */
    enviarAudio: (pastaId: string, autor: AppUser, papel: PapelNaPasta, gravacao: { arquivoLocal: string; id: string; duracaoS: number }) =>
        comTempoLimite((async () => {
            const caminho = `${pastaId}/${gravacao.id}.m4a`;
            const bytes = await new File(gravacao.arquivoLocal).arrayBuffer();
            const { error } = await supabase.storage.from("audios")
                .upload(caminho, bytes, { contentType: "audio/mp4", upsert: false });
            // "Já existe": o envio anterior chegou ao servidor; segue para a mensagem
            const jaEnviado = error && "statusCode" in error && error.statusCode === "409";
            if (error && !jaEnviado) return false;
            // Se a mensagem falhar aqui, o arquivo fica sem mensagem: a
            // limpeza automática da etapa 4d apaga esses arquivos
            return gravar(pastaId, autor, papel, { tipo: "audio", audio_caminho: caminho, audio_duracao_s: gravacao.duracaoS });
        })(), ESPERA_AUDIO_MS),

    /** Id do arquivo de uma gravação nova (aleatório, impossível de adivinhar) */
    novoIdAudio: () => randomUUID(),

    /**
     * Link temporário para ouvir um áudio. O banco registra quem ouviu
     * (RN09) e devolve o caminho; sem esse registro o Storage não libera o
     * link. O link não é guardado: cada vez que a pessoa ouve, um registro novo
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

/**
 * Espera a gravação com tempo limite.
 * `semConexao`: o servidor não respondeu a tempo (a mensagem pode chegar depois)
 */
async function comTempoLimite(gravacao: Promise<boolean>, esperaMs: number): Promise<{ success: boolean; semConexao?: boolean }> {
    let espera: ReturnType<typeof setTimeout> | undefined;
    const tempoEsgotado = new Promise<'tempo'>((resolve) => { espera = setTimeout(() => resolve('tempo'), esperaMs); });
    try {
        const resultado = await Promise.race([gravacao.catch(() => false), tempoEsgotado]);
        if (resultado === 'tempo') return { success: false, semConexao: true };
        return { success: resultado };
    } finally {
        clearTimeout(espera);
    }
}

/** Conteúdo da mensagem: texto, ou áudio com o caminho do arquivo e a duração */
type Conteudo = { texto: string } | { tipo: "audio"; audio_caminho: string; audio_duracao_s: number };

/** Grava a mensagem (separado para poder esperar com tempo limite) */
async function gravar(pastaId: string, autor: AppUser, papel: PapelNaPasta, conteudo: Conteudo): Promise<boolean> {
    // O banco exige o nome IGUAL ao do perfil: lê o nome atual (pode ter
    // sido editado na web depois de entrar no app)
    const { data: perfil } = await supabase.from("perfis").select("nome").eq("id", autor.uid).maybeSingle();
    const { error } = await supabase.from("mensagens").insert({
        pasta_id: pastaId,
        autor_id: autor.uid,
        autor_nome: perfil?.nome ?? autor.nome,
        autor_papel: papel,
        ...conteudo,
    });
    // 23505 (repetido): a mensagem deste áudio já foi gravada num envio
    // anterior (o arquivo só pode estar em uma mensagem)
    return !error || ("audio_caminho" in conteudo && error.code === "23505");
}

export default MensagemServicos;
