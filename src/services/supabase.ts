import { createClient } from "@supabase/supabase-js";

/**
 * CONEXÃO COM O SUPABASE (Auth, Postgres e Realtime)
 *
 * A URL e a chave "anon" ficam em variáveis NEXT_PUBLIC_* (vão para o
 * navegador). Isso é esperado: a chave anon é pública por natureza, e a
 * proteção real dos dados é feita pelas políticas RLS do banco
 * (supabase/migrations). A chave `service_role` NUNCA entra no site.
 *
 * Em desenvolvimento, use o Supabase local (`npx supabase start`): a URL e
 * a chave anon aparecem no `npx supabase status`. Preencha o `.env.local`
 * a partir de `.env.local.example`.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chaveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !chaveAnon)
    throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.");

// O login fica guardado no navegador, e a sessão é
// renovada sozinha enquanto o site está aberto
export const supabase = createClient(url, chaveAnon);

// Conversão das mensagens de erro: em src/helpers/linhas.ts (web e app)
export { mensagemErro } from "@/helpers/linhas";
