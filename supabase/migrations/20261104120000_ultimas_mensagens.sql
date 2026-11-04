-- =============================================================================
-- ÚLTIMA MENSAGEM DE CADA PASTA (etapa 5, Home com busca e recentes)
--
-- Para quem acompanha muitos alunos (a psiquiatra, com mais de 50 pastas),
-- a Home mostra primeiro as conversas que se mexeram por último e marca,
-- de forma discreta, as que têm mensagem nova. Decidido em 04/11/2026:
--  - "mensagem nova" = a última mensagem é mais nova que a última vez que
--    a pessoa abriu a conversa, e não foi ela quem mandou;
--  - "a última vez que abriu" fica SÓ NO CELULAR (opção A): o servidor
--    nunca sabe quem leu o quê. Assim continua valendo a decisão do RN09
--    (leitura de mensagens de texto não é registrada) e não se coleta um
--    dado a mais (LGPD: minimização);
--  - sem notificação e sem contador: só um ponto ao lado da hora.
--
-- Esta função NÃO cria tabela nem muda permissões: só lê, com as regras de
-- quem chama (`security invoker`). Cada pessoa recebe só as pastas de que
-- é membro (RLS de `pastas` e de `mensagens`); o admin não recebe nada
-- (RF13). Devolve só a data e o autor, nunca o texto: a lista da Home não
-- mostra o conteúdo (dado de saúde) para quem estiver olhando a tela.
-- =============================================================================

create function public.ultimas_mensagens()
returns table (pasta_id uuid, criado_em timestamptz, autor_id uuid)
language sql stable security invoker
set search_path = ''
as $$
  -- Uma busca pelo índice (pasta_id, criado_em desc) por pasta: rápida
  -- mesmo com muitas pastas e conversas longas
  select p.id, u.criado_em, u.autor_id
    from public.pastas p
    cross join lateral (
      select m.criado_em, m.autor_id
        from public.mensagens m
       where m.pasta_id = p.id
       order by m.criado_em desc
       limit 1
    ) u;
$$;

revoke execute on function public.ultimas_mensagens() from public, anon;
grant execute on function public.ultimas_mensagens() to authenticated;
