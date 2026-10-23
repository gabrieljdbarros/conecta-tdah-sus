-- =============================================================================
-- ESQUEMA INICIAL — CONECTA TDAH SUS (migração do Firebase para o Supabase)
--
-- Mesmas regras do firestore.rules e das Cloud Functions, agora no Postgres:
--  - RBAC pelo `role` gravado na tabela `perfis` (decisão travada 2), nunca
--    em dados que o próprio usuário edita no Auth
--  - RLS ativado em TODAS as tabelas; quem não tem política, não acessa
--  - O que mexe em duas tabelas de uma vez (criar pasta, convite, remover
--    participante) vira função no banco (RPC), numa transação só. É o papel
--    que as Cloud Functions faziam, sem um servidor a mais para manter
--  - Permissões por COLUNA: o cliente só grava as colunas que pode mudar
--    (ex.: ninguém altera `role`, `email` ou `criado_em` pelo app)
--
-- LGPD: dados de saúde de crianças. O admin NÃO lê pastas, membros,
-- convites nem mensagens (decisão travada 8).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- VALIDAÇÕES (espelham o Yup dos formulários)
-- -----------------------------------------------------------------------------

-- Texto obrigatório: não vazio (nem só espaços) e com até 100 caracteres
create function public.texto_valido(valor text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select valor is not null and length(btrim(valor)) > 0 and length(valor) <= 100;
$$;

-- Valor de um campo do JSON: precisa ser texto e válido
create function public.texto_json_valido(valor jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select valor is not null
     and jsonb_typeof(valor) = 'string'
     and public.texto_valido(valor #>> '{}');
$$;

-- Campos do perfil (decisão travada 4): exatamente as chaves do perfil, todas
-- texto. O nome da criança NÃO fica no perfil da mãe (o admin lê perfis):
-- ele existe só na pasta do aluno, que o admin não lê
create function public.dados_perfil_valido(p_role text, dp jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare
  permitidas text[];
  obrigatorias text[];
  chaves text[];
begin
  if dp is null or jsonb_typeof(dp) <> 'object' then
    return false;
  end if;

  case p_role
    when 'mae' then
      permitidas := array['grauParentesco'];
      obrigatorias := permitidas;
    -- `disciplina` é opcional: coordenação/direção não leciona
    when 'escola' then
      permitidas := array['nomeEscola', 'cargo', 'disciplina'];
      obrigatorias := array['nomeEscola', 'cargo'];
    when 'medico' then
      permitidas := array['crm', 'especialidade', 'unidadeSUS'];
      obrigatorias := permitidas;
    when 'admin' then
      return dp = '{}'::jsonb;
    else
      return false;
  end case;

  chaves := array(select jsonb_object_keys(dp));
  return chaves <@ permitidas
     and obrigatorias <@ chaves
     and (select bool_and(public.texto_json_valido(dp -> k)) from unnest(chaves) as k);
end;
$$;

-- -----------------------------------------------------------------------------
-- TABELAS
-- -----------------------------------------------------------------------------

-- Perfil do usuário (decisão travada 1, equivalente da Opção A): uma linha
-- por usuário, com os campos de cada perfil agrupados em `dados_perfil`.
-- A senha fica só no Supabase Auth (decisão travada 3)
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (public.texto_valido(nome)),
  email text not null,
  role text not null check (role in ('admin', 'mae', 'escola', 'medico')),
  dados_perfil jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  constraint dados_perfil_do_role check (public.dados_perfil_valido(role, dados_perfil))
);

-- Pasta do aluno (RF03, decisão travada 6): só o nome da criança.
-- Apagar a mãe com pastas é bloqueado: a exclusão da pasta (direito do
-- titular na LGPD) ainda precisa de um fluxo próprio (TODO)
create table public.pastas (
  id uuid primary key default gen_random_uuid(),
  nome_aluno text not null check (public.texto_valido(nome_aluno)),
  dono_id uuid not null references public.perfis (id) on delete restrict,
  criado_em timestamptz not null default now()
);

-- Quem está em cada pasta (substitui `membrosUids` e `participantes`).
-- `nome` e `detalhe` são o resumo que os outros membros veem (minimização:
-- só nome, papel e instituição; sem CRM, cargo etc.). Os membros não leem a
-- tabela `perfis` uns dos outros
create table public.membros_pasta (
  pasta_id uuid not null references public.pastas (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  papel text not null check (papel in ('mae', 'escola', 'medico')),
  nome text not null,
  detalhe text,
  entrou_em timestamptz not null default now(),
  primary key (pasta_id, usuario_id)
);
create index membros_pasta_usuario on public.membros_pasta (usuario_id);

-- Convites (RN01: 48 horas; RN02: uso único). O banco guarda só o HASH do
-- token: quem lê a tabela não consegue montar um link válido
create table public.convites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  pasta_id uuid not null references public.pastas (id) on delete cascade,
  papel text not null check (papel in ('escola', 'medico')),
  criado_por uuid not null references public.perfis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz,
  usado_por uuid references public.perfis (id) on delete set null
);
create index convites_pasta on public.convites (pasta_id);

-- Chat (RN05, RF08, decisão travada 7): um único chat em grupo por pasta.
-- Mensagens não são editadas nem apagadas (RN08). `criado_em` vem do
-- relógio do SERVIDOR: o celular não define a ordem da conversa.
-- Se o perfil do autor for apagado, a mensagem fica (sem o vínculo)
create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references public.pastas (id) on delete cascade,
  autor_id uuid references public.perfis (id) on delete set null,
  autor_nome text not null,
  autor_papel text not null check (autor_papel in ('mae', 'escola', 'medico')),
  texto text not null check (length(btrim(texto)) > 0 and length(texto) <= 2000),
  criado_em timestamptz not null default now()
);
create index mensagens_pasta_data on public.mensagens (pasta_id, criado_em desc);

-- -----------------------------------------------------------------------------
-- RLS: ativado em todas as tabelas, e o acesso padrão do Supabase é retirado.
-- Depois, cada perfil recebe só o que precisa (tabela e coluna)
-- -----------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.pastas enable row level security;
alter table public.membros_pasta enable row level security;
alter table public.convites enable row level security;
alter table public.mensagens enable row level security;

revoke all on public.perfis, public.pastas, public.membros_pasta, public.convites, public.mensagens
  from anon, authenticated;

-- Tabelas e funções criadas no futuro também nascem SEM acesso: cada
-- migração precisa liberar, de propósito, só o que for necessário
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon;

-- -----------------------------------------------------------------------------
-- FUNÇÕES DE APOIO DAS POLÍTICAS
-- `security definer`: leem `perfis` e `membros_pasta` sem cair nas próprias
-- políticas (evita recursão). Só devolvem sim/não ou o papel de QUEM ESTÁ
-- LOGADO, nunca dados de outra pessoa
-- -----------------------------------------------------------------------------
create function public.meu_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select role from public.perfis where id = auth.uid();
$$;

create function public.eh_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.meu_role() = 'admin', false);
$$;

-- Papel NA PASTA: a mãe precisa ser a DONA; escola e médico precisam ser
-- membros e ter esse role no perfil. Qualquer outra pessoa (inclusive o
-- admin e quem saiu da pasta) fica sem papel (null)
create function public.papel_na_pasta(p_pasta_id uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select m.papel
    from public.membros_pasta m
    join public.perfis p on p.id = m.usuario_id
    join public.pastas pa on pa.id = m.pasta_id
   where m.pasta_id = p_pasta_id
     and m.usuario_id = auth.uid()
     and p.role = m.papel
     and (m.papel <> 'mae' or pa.dono_id = m.usuario_id);
$$;

create function public.eh_membro(p_pasta_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.papel_na_pasta(p_pasta_id) is not null;
$$;

-- -----------------------------------------------------------------------------
-- PERFIS
-- -----------------------------------------------------------------------------
grant select, delete on public.perfis to authenticated;
-- Cadastro: a pessoa cria só a própria linha; `criado_em` é do servidor
grant insert (id, nome, email, role, dados_perfil) on public.perfis to authenticated;
-- Edição: SÓ nome e dados do perfil (ninguém muda `role`, nem o admin: o
-- papel na pasta e o autor no chat vêm dele)
grant update (nome, dados_perfil) on public.perfis to authenticated;

-- Cada um lê o próprio perfil; o admin lê todos (listagem do painel)
create policy "perfis: ler o próprio ou admin"
  on public.perfis for select to authenticated
  using (id = auth.uid() or public.eh_admin());

-- Ninguém se cadastra como admin; o e-mail é o mesmo da conta do Auth
create policy "perfis: criar o próprio"
  on public.perfis for insert to authenticated
  with check (
    id = auth.uid()
    and role in ('mae', 'escola', 'medico')
    and email = (auth.jwt() ->> 'email')
  );

-- O conteúdo é validado pelas restrições da tabela, conforme o role salvo
create policy "perfis: editar o próprio ou admin"
  on public.perfis for update to authenticated
  using (id = auth.uid() or public.eh_admin())
  with check (id = auth.uid() or public.eh_admin());

create policy "perfis: admin apaga"
  on public.perfis for delete to authenticated
  using (public.eh_admin());

-- -----------------------------------------------------------------------------
-- PASTAS (criação pela função criar_pasta, abaixo)
-- -----------------------------------------------------------------------------
grant select on public.pastas to authenticated;
grant update (nome_aluno) on public.pastas to authenticated;

-- Só membros leem. O admin NÃO lê (LGPD: acesso só por necessidade)
create policy "pastas: membros leem"
  on public.pastas for select to authenticated
  using (public.eh_membro(id));

-- A dona (que continua membro) só altera o nome da criança
create policy "pastas: dona edita o nome"
  on public.pastas for update to authenticated
  using (dono_id = auth.uid() and public.eh_membro(id))
  with check (dono_id = auth.uid());

-- TODO: exclusão da pasta a pedido da família (direito do titular na
-- LGPD) — definir o fluxo, inclusive o que acontece com as mensagens.
-- Sem política de delete: ninguém apaga pasta pelo app

-- -----------------------------------------------------------------------------
-- MEMBROS DA PASTA: só leitura pelos membros. Entrar e sair só pelas
-- funções aceitar_convite e remover_participante
-- -----------------------------------------------------------------------------
grant select on public.membros_pasta to authenticated;

create policy "membros: membros da pasta leem"
  on public.membros_pasta for select to authenticated
  using (public.eh_membro(pasta_id));

-- -----------------------------------------------------------------------------
-- CONVITES: criados e usados só pelas funções. Quem criou vê os próprios
-- e cancela os que ainda NÃO foram usados (o usado é o registro de quem
-- entrou e por qual link)
-- -----------------------------------------------------------------------------
grant select, delete on public.convites to authenticated;

create policy "convites: quem criou lê"
  on public.convites for select to authenticated
  using (criado_por = auth.uid());

create policy "convites: quem criou cancela o não usado"
  on public.convites for delete to authenticated
  using (criado_por = auth.uid() and usado_em is null);

-- -----------------------------------------------------------------------------
-- MENSAGENS: membros leem e escrevem; ninguém edita nem apaga (RN08)
-- -----------------------------------------------------------------------------
grant select on public.mensagens to authenticated;
grant insert (pasta_id, autor_id, autor_nome, autor_papel, texto) on public.mensagens to authenticated;

create policy "mensagens: membros leem"
  on public.mensagens for select to authenticated
  using (public.eh_membro(pasta_id));

-- O autor é quem está logado, com o nome do próprio perfil e o papel que
-- tem NA PASTA (a tela mostra o autor por ícone, cor e papel)
create policy "mensagens: membros escrevem como si mesmos"
  on public.mensagens for insert to authenticated
  with check (
    autor_id = auth.uid()
    and autor_papel = public.papel_na_pasta(pasta_id)
    and autor_nome = (select p.nome from public.perfis p where p.id = auth.uid())
  );

-- Chat em tempo real: o Realtime também respeita o RLS acima
alter publication supabase_realtime add table public.mensagens;

-- -----------------------------------------------------------------------------
-- FUNÇÕES CHAMADAS PELO APP (RPC)
-- Rodam com permissão do dono do banco, por isso conferem TUDO antes de
-- gravar. As mensagens de erro aparecem para o usuário.
-- LGPD: nada aqui registra dados da pasta ou do aluno em log
-- -----------------------------------------------------------------------------

-- A mãe cria a pasta e entra como dona e única membro inicial
create function public.criar_pasta(p_nome_aluno text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text;
  v_pasta uuid;
begin
  select nome into v_nome from public.perfis where id = v_uid and role = 'mae';
  if v_nome is null then
    raise exception 'Só a mãe ou o responsável pode criar a pasta.' using errcode = '42501';
  end if;
  if not public.texto_valido(p_nome_aluno) then
    raise exception 'Escreva o nome do aluno (até 100 letras).' using errcode = '22023';
  end if;

  insert into public.pastas (nome_aluno, dono_id) values (p_nome_aluno, v_uid)
    returning id into v_pasta;
  insert into public.membros_pasta (pasta_id, usuario_id, papel, nome)
    values (v_pasta, v_uid, 'mae', v_nome);
  return v_pasta;
end;
$$;

-- A dona gera um convite para a escola ou o médico. Devolve o token, que
-- vira o link /convite/<token>; o banco guarda só o hash
create function public.gerar_convite(p_pasta_id uuid, p_papel text)
returns table (token text, expira_em timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_token text;
  v_expira timestamptz := now() + interval '48 hours';
begin
  if p_papel is null or p_papel not in ('escola', 'medico') then
    raise exception 'Escolha se o convite é para a escola ou para o médico.' using errcode = '22023';
  end if;
  if public.papel_na_pasta(p_pasta_id) is distinct from 'mae' then
    raise exception 'Só a responsável pela pasta pode convidar.' using errcode = '42501';
  end if;

  -- 32 bytes aleatórios (impossível de adivinhar), em base64url: 43 letras
  v_token := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');

  insert into public.convites (token_hash, pasta_id, papel, criado_por, expira_em)
    values (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_pasta_id, p_papel, auth.uid(), v_expira);

  return query select v_token, v_expira;
end;
$$;

-- Escola ou médico aceita o convite e entra na pasta. O `for update`
-- trava o convite: se o link for aberto duas vezes ao mesmo tempo, só um
-- entra (uso único, RN02)
create function public.aceitar_convite(p_token text)
returns table (pasta_id uuid, nome_aluno text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_convite public.convites%rowtype;
  v_perfil public.perfis%rowtype;
  v_nome_aluno text;
  v_rotulo text;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'Este convite não existe ou foi cancelado.' using errcode = 'P0002';
  end if;

  select * into v_convite from public.convites
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;
  if not found then
    raise exception 'Este convite não existe ou foi cancelado.' using errcode = 'P0002';
  end if;
  if v_convite.usado_em is not null then
    raise exception 'Este convite já foi usado. Peça um novo link à mãe ou ao responsável pelo aluno.' using errcode = '22023';
  end if;
  if v_convite.expira_em < now() then
    raise exception 'Este convite expirou. Peça um novo link à mãe ou ao responsável pelo aluno.' using errcode = '22023';
  end if;

  -- O papel vem do perfil no banco (decisão travada 2), nunca do app.
  -- Isso também barra contas de mãe e de admin
  select * into v_perfil from public.perfis where id = v_uid;
  if v_perfil.role is distinct from v_convite.papel then
    v_rotulo := case v_convite.papel when 'escola' then 'escola' else 'médico' end;
    raise exception 'Este convite é para %. Entre com uma conta de % para aceitar.', v_rotulo, v_rotulo using errcode = '42501';
  end if;

  select pa.nome_aluno into v_nome_aluno from public.pastas pa where pa.id = v_convite.pasta_id;
  if v_nome_aluno is null then
    raise exception 'Esta pasta não existe mais.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.membros_pasta m where m.pasta_id = v_convite.pasta_id and m.usuario_id = v_uid) then
    raise exception 'Você já faz parte desta pasta.' using errcode = '23505';
  end if;

  -- Resumo que os outros membros veem: nome, papel e instituição.
  -- Dois convites da mesma pasta aceitos ao mesmo tempo pela mesma pessoa:
  -- o segundo cai aqui e recebe a mesma mensagem amigável
  begin
    insert into public.membros_pasta (pasta_id, usuario_id, papel, nome, detalhe)
      values (
        v_convite.pasta_id, v_uid, v_convite.papel, v_perfil.nome,
        case v_convite.papel
          when 'escola' then v_perfil.dados_perfil ->> 'nomeEscola'
          else v_perfil.dados_perfil ->> 'unidadeSUS'
        end
      );
  exception when unique_violation then
    raise exception 'Você já faz parte desta pasta.' using errcode = '23505';
  end;
  update public.convites set usado_em = now(), usado_por = v_uid where id = v_convite.id;

  return query select v_convite.pasta_id, v_nome_aluno;
end;
$$;

-- Tira alguém da pasta: a dona remove outra pessoa; escola/médico sai.
-- A dona não sai nem é removida (a pasta ficaria sem responsável).
-- Quem sai perde a leitura na hora, porque as políticas só deixam ler membros
create function public.remover_participante(p_pasta_id uuid, p_participante_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_dono uuid;
begin
  -- Mesma resposta para "pasta não existe" e "você não é membro": não
  -- revela a quem não participa se a pasta existe
  if not exists (select 1 from public.membros_pasta m where m.pasta_id = p_pasta_id and m.usuario_id = v_uid) then
    raise exception 'Você não faz parte desta pasta.' using errcode = '42501';
  end if;

  select dono_id into v_dono from public.pastas where id = p_pasta_id for update;
  if p_participante_id = v_dono then
    raise exception 'A responsável pela pasta não pode sair nem ser removida.' using errcode = '22023';
  end if;
  if v_uid <> v_dono and v_uid is distinct from p_participante_id then
    raise exception 'Só a responsável pela pasta pode remover outras pessoas.' using errcode = '42501';
  end if;

  delete from public.membros_pasta m where m.pasta_id = p_pasta_id and m.usuario_id = p_participante_id;
  if not found then
    raise exception 'Esta pessoa não faz parte da pasta.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- QUEM PODE CHAMAR AS FUNÇÕES
-- No Postgres, toda função nasce executável por todos: retiramos isso e
-- liberamos só para quem está logado
-- -----------------------------------------------------------------------------
revoke execute on function
  public.meu_role(), public.eh_admin(), public.papel_na_pasta(uuid), public.eh_membro(uuid),
  public.criar_pasta(text), public.gerar_convite(uuid, text), public.aceitar_convite(text),
  public.remover_participante(uuid, uuid)
  from public, anon;

grant execute on function
  public.meu_role(), public.eh_admin(), public.papel_na_pasta(uuid), public.eh_membro(uuid),
  public.criar_pasta(text), public.gerar_convite(uuid, text), public.aceitar_convite(text),
  public.remover_participante(uuid, uuid)
  to authenticated;
