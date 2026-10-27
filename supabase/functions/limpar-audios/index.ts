/**
 * LIMPEZA DOS ÁUDIOS (decisão travada 10, LGPD) — CONECTA TDAH SUS
 *
 * Chamada todo dia pelo banco (pg_cron, ver a migração
 * 20261026120000_retencao_audios.sql). Apaga pela API do Storage:
 *  (a) os arquivos das mensagens de voz com mais de 90 dias (a mensagem
 *      continua no chat, marcada como "áudio apagado");
 *  (b) os arquivos que nunca viraram mensagem, depois de 24 horas.
 *
 * Segurança:
 *  - só roda com a chave da limpeza (cabeçalho `x-chave-limpeza`), guardada
 *    como segredo do servidor (CHAVE_LIMPEZA) e no Vault, nunca no código;
 *  - mesmo chamada por alguém de fora, só faria o que já faz sozinha (apaga
 *    apenas o que passou do prazo) e pode rodar de novo sem problema;
 *  - não registra caminhos, nomes nem conteúdo em log: só os totais.
 */
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

/** Mensagens/arquivos por rodada; limite de rodadas para não rodar sem fim */
const LOTE = 100;
const MAX_RODADAS = 50;

/** Compara a chave sem "vazar" pelo tempo de resposta quantos caracteres batem */
function mesmaChave(recebida: string, esperada: string): boolean {
    const a = new TextEncoder().encode(recebida);
    const b = new TextEncoder().encode(esperada);
    let diferenca = a.length ^ b.length;
    for (let i = 0; i < b.length; i++) diferenca |= (a[i] ?? 0) ^ b[i];
    return diferenca === 0;
}

Deno.serve(async (pedido) => {
    if (pedido.method !== "POST") return new Response(null, { status: 405 });

    const chave = Deno.env.get("CHAVE_LIMPEZA");
    // Sem chave configurada, a função não roda (falha fechada)
    if (!chave || !mesmaChave(pedido.headers.get("x-chave-limpeza") ?? "", chave))
        return new Response(null, { status: 401 });

    // service_role: só existe aqui no servidor (o Supabase injeta), nunca no app
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const bucket = supabase.storage.from("audios");
    const totais = { expirados: 0, orfaos: 0, falhas: 0 };

    // (a) Mais de 90 dias: o banco marca a mensagem e devolve os arquivos.
    // Se o Storage falhar, o arquivo vira sobra e sai em (b) numa próxima vez
    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
        const { data: caminhos, error } = await supabase.rpc("expirar_audios", { p_limite: LOTE });
        if (error) return Response.json({ ...totais, erro: "expirar" }, { status: 500 });
        if (!caminhos?.length) break;
        const { error: erroStorage } = await bucket.remove(caminhos as string[]);
        if (erroStorage) totais.falhas += caminhos.length;
        else totais.expirados += caminhos.length;
    }

    // (b) Sobras: arquivos sem mensagem, com mais de 24 horas
    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
        const { data: caminhos, error } = await supabase.rpc("audios_orfaos", { p_limite: LOTE });
        if (error) return Response.json({ ...totais, erro: "orfaos" }, { status: 500 });
        if (!caminhos?.length) break;
        const { error: erroStorage } = await bucket.remove(caminhos as string[]);
        // Os mesmos arquivos voltariam na próxima rodada: tenta de novo amanhã
        if (erroStorage) { totais.falhas += caminhos.length; break; }
        totais.orfaos += caminhos.length;
    }

    return Response.json(totais);
});
