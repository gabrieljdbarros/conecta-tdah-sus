-- =============================================================================
-- RETENÇÃO DAS MENSAGENS DE VOZ (decisão travada 10, RN08, LGPD art. 15 e 16)
-- — CONECTA TDAH SUS
--
-- Todo dia, de madrugada, o sistema:
--  (a) apaga o ARQUIVO das mensagens de voz com mais de 90 dias. A mensagem
--      continua no chat, com o aviso de áudio apagado (`audio_apagado_em`);
--  (b) apaga os arquivos que foram enviados mas nunca viraram mensagem
--      (envio interrompido), depois de 24 horas.
--
-- Quem apaga os arquivos é a Edge Function `limpar-audios`, pela API do
-- Storage (apagar a linha de storage.objects por SQL deixaria o arquivo no
-- disco). Este banco só AGENDA a chamada (pg_cron + pg_net) e oferece as
-- duas funções abaixo, que só o sistema (service_role) executa.
--
-- O endereço da função e a chave da limpeza ficam no Vault do Supabase,
-- nunca no código: ver docs/retencao-audios.md. Sem eles, o agendamento não
-- faz nada.
--
-- Nenhuma tabela ou política RLS muda: o app continua sem poder marcar ou
-- apagar áudio.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- -----------------------------------------------------------------------------
-- (a) Marca como apagadas as mensagens de voz com mais de 90 dias e devolve os
-- arquivos para a função apagar. Marca ANTES de apagar: se o Storage falhar,
-- o arquivo vira "sobra" e é apagado na próxima vez por (b); ninguém fica com
-- um botão de ouvir apontando para um arquivo que sumiu
-- -----------------------------------------------------------------------------
create function public.expirar_audios(p_limite integer default 100)
returns setof text
language sql volatile security definer
set search_path = ''
as $$
  with alvo as (
    select m.id, m.audio_caminho
      from public.mensagens m
     where m.tipo = 'audio'
       and m.audio_caminho is not null
       and m.criado_em < now() - interval '90 days'
     order by m.criado_em
     limit p_limite
     for update skip locked
  )
  update public.mensagens m
     set audio_caminho = null, audio_apagado_em = now()
    from alvo
   where m.id = alvo.id
  returning alvo.audio_caminho;
$$;

-- -----------------------------------------------------------------------------
-- (b) Arquivos do bucket `audios` que nenhuma mensagem usa, enviados há mais
-- de `p_idade` (24 h: dá tempo de um reenvio pelo app terminar)
-- -----------------------------------------------------------------------------
create function public.audios_orfaos(p_idade interval default interval '24 hours', p_limite integer default 100)
returns setof text
language sql stable security definer
set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'audios'
     and o.created_at < now() - p_idade
     and not exists (select 1 from public.mensagens m where m.audio_caminho = o.name)
   order by o.created_at
   limit p_limite;
$$;

-- Só o sistema: nem o app (authenticated) nem quem não fez login (anon)
revoke execute on function public.expirar_audios(integer), public.audios_orfaos(interval, integer)
  from public, anon, authenticated;
grant execute on function public.expirar_audios(integer), public.audios_orfaos(interval, integer)
  to service_role;

-- -----------------------------------------------------------------------------
-- AGENDAMENTO: todo dia às 6h UTC (3h de Brasília), chama a função com a
-- chave da limpeza. Os dois valores vêm do Vault (`limpeza_url` e
-- `limpeza_chave`); se não estiverem configurados, não chama nada
-- -----------------------------------------------------------------------------
select cron.schedule(
  'limpar-audios',
  '0 6 * * *',
  $$
  select net.http_post(
           url := u.decrypted_secret,
           headers := jsonb_build_object('Content-Type', 'application/json', 'x-chave-limpeza', c.decrypted_secret),
           body := '{}'::jsonb,
           timeout_milliseconds := 60000
         )
    from vault.decrypted_secrets u, vault.decrypted_secrets c
   where u.name = 'limpeza_url' and c.name = 'limpeza_chave';
  $$
);
