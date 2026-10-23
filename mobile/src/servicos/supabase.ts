import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * CONEXÃO COM O SUPABASE (app nativo)
 *
 * O MESMO banco, as MESMAS políticas RLS e as MESMAS funções da versão web.
 * Em desenvolvimento, EXPO_PUBLIC_SUPABASE_URL aponta para o Supabase local
 * rodando no computador (http://<IP do computador na rede>:54321).
 * A chave anon é pública por natureza: quem protege os dados é o RLS.
 * A chave `service_role` NUNCA entra no app.
 *
 * O que fica guardado no celular: só o LOGIN (AsyncStorage), como em
 * qualquer app. Pastas e mensagens não ficam guardadas no aparelho
 * (celular compartilhado)
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chaveAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !chaveAnon)
    throw new Error("Faltam EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no mobile/.env.local.");
// Fora do desenvolvimento, senha, sessão e mensagens só trafegam com https
if (!__DEV__ && !url.startsWith("https://"))
    throw new Error("EXPO_PUBLIC_SUPABASE_URL precisa ser https:// fora do modo de desenvolvimento.");

// O polyfill acima completa a função URL do React Native, que o cliente do
// Supabase usa para montar os endereços
export const supabase = createClient(url, chaveAnon, {
    auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // No app não há link na barra de endereço para ler
        detectSessionInUrl: false,
    },
});

// A sessão só é renovada com o app aberto na tela (economiza bateria e dados)
AppState.addEventListener("change", (estado) => {
    if (estado === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
});

/**
 * Endereço do site, para montar links (convite e "esqueci minha senha").
 * Em desenvolvimento, o site no mesmo computador do Supabase
 */
export const SITE = process.env.EXPO_PUBLIC_SITE_URL ?? `http://${new URL(url).hostname}:3000`;
// Fora do desenvolvimento, links que dão acesso à conta ou à pasta só por https
if (!__DEV__ && !SITE.startsWith("https://"))
    throw new Error("EXPO_PUBLIC_SITE_URL precisa ser https:// fora do modo de desenvolvimento.");

export { mensagemErro } from "@/helpers/linhas";
