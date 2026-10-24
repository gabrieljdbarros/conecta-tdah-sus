-- =============================================================================
-- MENSAGENS DE VOZ (RF16, decisão travada 10) — CONECTA TDAH SUS
--
-- Voz é dado de saúde (fala sobre a criança e identifica quem fala):
--  - arquivo no Storage, num bucket PRIVADO, com política por pasta (só os
--    membros da pasta enviam e ouvem)
--  - nome do arquivo sem o nome da criança: <id da pasta>/<id aleatório>.m4a
--  - até 2 minutos e 1 MB por áudio (RNF02: baixo consumo de dados)
--  - ouvir só por link temporário, e só depois de registrar no log quem
--    ouviu e quando (RN09); sem o registro, o Storage não libera o link
--  - ninguém edita nem apaga (RN08); o arquivo é apagado pelo sistema
--    depois de 90 dias (política de retenção), e a mensagem continua no
--    chat com o aviso de áudio apagado
--
-- TODO (RN07): consentimento granular no cadastro, com caixa opcional para
-- gravar voz. Adiado até existir o texto dos termos; até lá, gravar é livre.
-- TODO (retenção, etapa 4d): além dos áudios com mais de 90 dias, apagar os
-- arquivos enviados que nunca viraram mensagem (órfãos), e pensar numa cota
-- por pessoa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- MENSAGENS: tipo texto ou áudio
-- -----------------------------------------------------------------------------
alter table public.mensagens
  add column tipo text not null default 'texto' check (tipo in ('texto', 'audio')),
  add column audio_caminho text unique,
  add column audio_duracao_s integer,
  -- Preenchido pelo sistema quando o arquivo é apagado (90 dias)
  add column audio_apagado_em timestamptz;

alter table public.mensagens alter column texto drop not null;
alter table public.mensagens drop constraint mensagens_texto_check;

-- Cada tipo com o seu conteúdo, e só ele
alter table public.mensagens add constraint conteudo_por_tipo check (
  (tipo = 'texto'
    and texto is not null and length(btrim(texto)) > 0 and length(texto) <= 2000
    and audio_caminho is null and audio_duracao_s is null and audio_apagado_em is null)
  or
  (tipo = 'audio'
    and texto is null
    and audio_duracao_s between 1 and 120
    -- Antes dos 90 dias tem o arquivo; depois, só a data em que foi apagado
    and ((audio_caminho is not null and audio_apagado_em is null)
         or (audio_caminho is null and audio_apagado_em is not null)))
);

-- O app grava também o tipo, o arquivo e a duração. `audio_apagado_em` não:
-- só o sistema mexe nele
grant insert (tipo, audio_caminho, audio_duracao_s) on public.mensagens to authenticated;

-- -----------------------------------------------------------------------------
-- FUNÇÕES DE APOIO
-- -----------------------------------------------------------------------------

-- Pasta de um arquivo de áudio, a partir do nome "<pasta>/<id>.m4a".
-- Nome fora desse formato (ex.: com o nome da criança) devolve null, e
-- tudo que depende dele é negado
create function public.pasta_do_audio(p_nome text)
returns uuid
language sql immutable
set search_path = ''
as $$
  select case
    when p_nome ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.m4a$'
      then split_part(p_nome, '/', 1)::uuid
  end;
$$;

-- -----------------------------------------------------------------------------
-- MENSAGEM DE ÁUDIO: o arquivo precisa existir, ser da mesma pasta e ter sido
-- enviado pela própria pessoa (ninguém "reaproveita" o áudio de outro)
-- -----------------------------------------------------------------------------
create function public.audio_enviado_por_mim(p_caminho text, p_pasta_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.pasta_do_audio(p_caminho) = p_pasta_id
     and exists (
       select 1 from storage.objects o
        where o.bucket_id = 'audios'
          and o.name = p_caminho
          and o.owner_id = auth.uid()::text
     );
$$;

drop policy "mensagens: membros escrevem como si mesmos" on public.mensagens;

-- O autor é quem está logado, com o nome do próprio perfil e o papel que
-- tem NA PASTA. Áudio: só com um arquivo que a própria pessoa enviou
create policy "mensagens: membros escrevem como si mesmos"
  on public.mensagens for insert to authenticated
  with check (
    autor_id = auth.uid()
    and autor_papel = public.papel_na_pasta(pasta_id)
    and autor_nome = (select p.nome from public.perfis p where p.id = auth.uid())
    and (tipo = 'texto' or public.audio_enviado_por_mim(audio_caminho, pasta_id))
  );

-- -----------------------------------------------------------------------------
-- LOG DOS ÁUDIOS (RN09, LGPD art. 37): quem ENVIOU e quem OUVIU cada áudio,
-- e quando. Guarda também o nome e o papel da pessoa naquele momento, para o
-- registro continuar legível mesmo que o perfil ou a mensagem sejam apagados
-- depois. Ninguém lê nem altera pelo app: só as funções abaixo gravam.
-- TODO: consulta do log para auditoria (painel de operação ou RPC restrita)
-- -----------------------------------------------------------------------------
create table public.log_audios (
  id uuid primary key default gen_random_uuid(),
  acao text not null check (acao in ('enviou', 'ouviu')),
  mensagem_id uuid references public.mensagens (id) on delete set null,
  pasta_id uuid,
  audio_caminho text not null,
  usuario_id uuid references public.perfis (id) on delete set null,
  usuario_nome text not null,
  usuario_papel text not null,
  registrado_em timestamptz not null default now()
);
create index log_audios_ouviu_recente on public.log_audios (usuario_id, audio_caminho, registrado_em desc) where acao = 'ouviu';

alter table public.log_audios enable row level security;
revoke all on public.log_audios from anon, authenticated;

-- Envio: registrado automaticamente quando a mensagem de áudio entra
create function public.registrar_envio_audio()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.log_audios (acao, mensagem_id, pasta_id, audio_caminho, usuario_id, usuario_nome, usuario_papel)
    values ('enviou', new.id, new.pasta_id, new.audio_caminho, new.autor_id, new.autor_nome, new.autor_papel);
  return new;
end;
$$;

create trigger log_envio_audio
  after insert on public.mensagens
  for each row when (new.tipo = 'audio')
  execute function public.registrar_envio_audio();

/**
 * Para ouvir um áudio: confere se a pessoa é membro da pasta, registra o
 * acesso e devolve o caminho do arquivo. Com ele, o app pede ao Storage um
 * link que vale poucos minutos (o Storage só libera com o registro feito).
 * Limite conhecido: um registro libera links por 5 minutos, e cada link
 * vale mais 5 minutos para quem o tiver. Quem ouve já é membro e o acesso
 * já ficou registrado; o app não repassa o link
 */
create function public.registrar_acesso_audio(p_mensagem_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_mensagem public.mensagens%rowtype;
  v_papel text;
begin
  select * into v_mensagem from public.mensagens where id = p_mensagem_id;
  v_papel := case when found then public.papel_na_pasta(v_mensagem.pasta_id) end;
  -- Mesma resposta para "não existe" e "não é da sua pasta"
  if v_papel is null then
    raise exception 'Não foi possível abrir este áudio.' using errcode = '42501';
  end if;
  if v_mensagem.tipo <> 'audio' then
    raise exception 'Esta mensagem não é um áudio.' using errcode = '22023';
  end if;
  if v_mensagem.audio_caminho is null then
    raise exception 'Este áudio foi apagado depois de 90 dias (prazo de guarda).' using errcode = 'P0002';
  end if;

  insert into public.log_audios (acao, mensagem_id, pasta_id, audio_caminho, usuario_id, usuario_nome, usuario_papel)
    values ('ouviu', v_mensagem.id, v_mensagem.pasta_id, v_mensagem.audio_caminho, auth.uid(),
            (select p.nome from public.perfis p where p.id = auth.uid()), v_papel);
  return v_mensagem.audio_caminho;
end;
$$;

-- O Storage pergunta isto antes de liberar o link: esta pessoa registrou
-- que ia ouvir este arquivo nos últimos 5 minutos?
create function public.acesso_audio_registrado(p_caminho text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.log_audios l
     where l.acao = 'ouviu'
       and l.usuario_id = auth.uid()
       and l.audio_caminho = p_caminho
       and l.registrado_em > now() - interval '5 minutes'
  );
$$;

revoke execute on function
  public.audio_enviado_por_mim(text, uuid), public.registrar_acesso_audio(uuid), public.acesso_audio_registrado(text),
  public.registrar_envio_audio()
  from public, anon;
grant execute on function
  public.audio_enviado_por_mim(text, uuid), public.registrar_acesso_audio(uuid), public.acesso_audio_registrado(text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- STORAGE: bucket privado (nunca público), até 1 MB, só áudio
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audios', 'audios', false, 1048576, array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac']);

-- Enviar: só membro da pasta, na pasta dele, com o nome no formato certo
create policy "audios: membros enviam na própria pasta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'audios'
    and public.papel_na_pasta(public.pasta_do_audio(name)) is not null
  );

-- Ouvir (link temporário ou download): só membro da pasta E com o acesso
-- registrado no log há pouco (RN09). Sem o registro, nada feito
create policy "audios: membros ouvem com o acesso registrado"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'audios'
    and public.eh_membro(public.pasta_do_audio(name))
    and public.acesso_audio_registrado(name)
  );

-- Sem políticas de update e delete: ninguém troca nem apaga um áudio pelo
-- app (RN08). Só o sistema apaga, depois de 90 dias
