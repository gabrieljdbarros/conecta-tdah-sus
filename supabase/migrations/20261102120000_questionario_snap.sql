-- =============================================================================
-- QUESTIONÁRIO SNAP-IV (decisão travada 11) — CONECTA TDAH SUS
--
-- Versão brasileira MTA-SNAP-IV (Mattos et al., 2006): 18 itens, cada um
-- respondido de 0 ("Nem um pouco") a 3 ("Demais"). É TRIAGEM, não
-- diagnóstico: a tela mostra só as barras, e quem interpreta é o médico.
--
-- Quem faz o quê:
--  - responde: só a mãe DONA da pasta (a família responde o questionário);
--  - vê: todos os membros da pasta (mãe, escola e médico);
--  - admin: não vê (LGPD: acesso só por necessidade, como pastas e chat);
--  - ninguém edita nem apaga uma resposta concluída (registro confiável,
--    como as mensagens, RN08).
--
-- O banco guarda só as respostas e a VERSÃO do questionário. A contagem de
-- sintomas é calculada no app (src/helpers/questionario.ts): se a regra de
-- leitura mudar, nenhum dado salvo fica errado.
--
-- Não há rascunho: as respostas só chegam aqui quando a mãe conclui.
-- TODO: consentimento (RN07) e prazo de guarda das respostas (em aberto).
-- TODO: a exclusão da pasta a pedido da família (LGPD) precisa decidir o
-- que acontece com as respostas (hoje ninguém apaga pasta pelo app).
-- A mãe pode responder várias vezes (comparação entre datas), sem limite.
-- =============================================================================

create table public.questionarios (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references public.pastas (id) on delete cascade,
  respondido_por uuid references public.perfis (id) on delete set null,
  -- Versões aceitas: uma nova versão (outro texto ou outra escala) entra
  -- por uma nova migração, e as respostas antigas continuam legíveis
  versao text not null check (versao in ('snap-iv-18-v1')),
  -- 18 respostas, na ordem dos itens, todas preenchidas, de 0 a 3
  respostas smallint[] not null check (
    array_ndims(respostas) = 1
    and cardinality(respostas) = 18
    and array_position(respostas, null) is null
    and 0 <= all (respostas)
    and 3 >= all (respostas)
  ),
  -- Data do SERVIDOR: o celular não escolhe a data da resposta
  criado_em timestamptz not null default now()
);
create index questionarios_pasta_data on public.questionarios (pasta_id, criado_em desc);

alter table public.questionarios enable row level security;
revoke all on public.questionarios from anon, authenticated;

-- Só ler e inserir: sem update nem delete para ninguém do app
grant select on public.questionarios to authenticated;
grant insert (pasta_id, respondido_por, versao, respostas) on public.questionarios to authenticated;

create policy "questionarios: membros leem"
  on public.questionarios for select to authenticated
  using (public.eh_membro(pasta_id));

-- papel_na_pasta = 'mae' só vale para a DONA da pasta com perfil de mãe
create policy "questionarios: a mãe dona responde"
  on public.questionarios for insert to authenticated
  with check (
    respondido_por = auth.uid()
    and public.papel_na_pasta(pasta_id) = 'mae'
  );
