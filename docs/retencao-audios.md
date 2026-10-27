# Retenção das mensagens de voz

Decisão travada 10: o arquivo de cada mensagem de voz é apagado **90 dias** depois de enviado. A mensagem continua no chat, com o aviso "Mensagem de voz apagada depois de 90 dias (prazo de guarda)". Os arquivos que foram enviados mas nunca viraram mensagem (envio interrompido) são apagados depois de **24 horas**.

## Como funciona

1. **Todo dia às 3h de Brasília** (6h UTC), o `pg_cron` do banco chama a Edge Function `limpar-audios` pelo `pg_net`.
2. A função pede ao banco as mensagens de voz vencidas (`expirar_audios`). O banco **marca** cada mensagem (`audio_caminho = null`, `audio_apagado_em = agora`) e devolve os arquivos.
3. A função apaga esses arquivos **pela API do Storage**. Apagar a linha de `storage.objects` por SQL deixaria o arquivo no disco.
4. Depois, apaga as sobras com mais de 24 h (`audios_orfaos`).

O banco marca antes de apagar: se o Storage falhar, o arquivo vira sobra e é apagado no dia seguinte, e ninguém fica com um "Ouvir" apontando para um arquivo que não existe.

**Segurança:**
- a função só roda com a **chave da limpeza** (cabeçalho `x-chave-limpeza`);
- as funções do banco só podem ser executadas pelo sistema (`service_role`), nunca pelo app;
- nada de caminho, nome ou conteúdo vai para os logs, só os totais.

No celular, o app apaga ao abrir as gravações que tenham sobrado no cache, por exemplo se o app foi fechado no meio de uma gravação.

Código: `supabase/migrations/20261026120000_retencao_audios.sql` e `supabase/functions/limpar-audios/index.ts`. Testes: `tests/supabase/retencao.test.mjs`.

## Em aberto

- **Prazo de guarda do log de áudios (`log_audios`, RN09):** o log guarda quem enviou e quem ouviu cada áudio (nome, papel e data), hoje sem prazo. É dado pessoal: a LGPD pede um prazo ligado à finalidade (auditoria). A definir com o orientador e a cliente; depois, pode virar uma segunda tarefa do `pg_cron`. Depois que o arquivo é apagado, o caminho no log não aponta para nada e não tem o nome da criança.
- **Prazo de guarda das mensagens de texto:** também em aberto (ver CLAUDE.md).

## Ambiente local

1. Crie a chave da limpeza em `supabase/functions/.env`. O arquivo é ignorado pelo git, **nunca o commite**:

   ```sh
   node -e "console.log('CHAVE_LIMPEZA='+require('crypto').randomBytes(32).toString('base64url'))" > supabase/functions/.env
   ```

2. Suba o Supabase **com** o Edge Runtime:

   ```sh
   npx supabase start -x vector,logflare,imgproxy
   ```

3. Testes: `npm run test:db` (inclui a retenção).

4. (Opcional) Para o agendamento chamar a função localmente, guarde o endereço e a chave no Vault. Abra o SQL Editor do painel local (http://127.0.0.1:54323) e rode, trocando `<CHAVE>` pelo valor do `.env`:

   ```sql
   select vault.create_secret('http://host.docker.internal:54321/functions/v1/limpar-audios', 'limpeza_url');
   select vault.create_secret('<CHAVE>', 'limpeza_chave');
   ```

   O `npx supabase db reset` apaga o Vault: repita este passo depois de cada reset. Sem esses dois valores, o agendamento simplesmente não faz nada.

## Na publicação (projeto Supabase em São Paulo)

1. Gere uma chave nova (não reaproveite a local) e guarde como segredo da função:

   ```sh
   npx supabase secrets set CHAVE_LIMPEZA=<chave nova>
   ```

2. Publique a função: `npx supabase functions deploy limpar-audios`. O `verify_jwt = false` do `config.toml` vai junto: a função confere a própria chave.
3. No SQL Editor do projeto, guarde no Vault o endereço `https://<projeto>.supabase.co/functions/v1/limpar-audios` como `limpeza_url` e a mesma chave como `limpeza_chave`. O endereço **precisa ser https**: a chave viaja no cabeçalho do pedido. O `http://host.docker.internal` serve só para o ambiente local.
4. Confira no painel (Integrations → Cron) se a tarefa `limpar-audios` aparece ativa e, no dia seguinte, se rodou com sucesso.
