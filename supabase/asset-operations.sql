-- Extensão operacional: importação/exportação, auditoria e limpeza segura.

alter table public.assets
  add column if not exists extra_data jsonb not null default '{}'::jsonb;

create index if not exists assets_extra_data_gin_idx on public.assets using gin (extra_data);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null check (action in ('login', 'logout', 'create', 'update', 'delete', 'import', 'export', 'clear')),
  entity_type text not null default 'system',
  entity_id uuid,
  asset_patrimonio text,
  details jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add column if not exists actor_email text;

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
on public.audit_logs for select to authenticated
using (private.is_admin());

drop policy if exists "Users can write own audit logs" on public.audit_logs;
create policy "Users can write own audit logs"
on public.audit_logs for insert to authenticated
with check (actor_id = auth.uid());

create or replace function private.log_asset_audit()
returns trigger
language plpgsql
security definer set search_path = public, private
as $$
declare
  changed jsonb;
  patrimony text;
  asset_id uuid;
begin
  if (tg_op = 'DELETE') then
    changed := jsonb_build_object('old', to_jsonb(old));
    patrimony := old.patrimonio;
    asset_id := old.id;
  elsif (tg_op = 'INSERT') then
    changed := jsonb_build_object('new', to_jsonb(new));
    patrimony := new.patrimonio;
    asset_id := new.id;
  else
    changed := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    patrimony := new.patrimonio;
    asset_id := new.id;
  end if;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, asset_patrimonio, details)
  values (auth.uid(), auth.jwt() ->> 'email', case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end, 'asset', asset_id, patrimony, changed);
  return coalesce(new, old);
end;
$$;

revoke all on function private.log_asset_audit() from public;
drop trigger if exists assets_audit_log on public.assets;
create trigger assets_audit_log
after insert or update or delete on public.assets
for each row execute procedure private.log_asset_audit();

create or replace function public.clear_assets()
returns bigint
language plpgsql
security definer set search_path = public, private
as $$
declare
  removed bigint;
begin
  if not private.is_admin() then
    raise exception 'Apenas administradores podem limpar a base de ativos';
  end if;
  delete from public.assets;
  get diagnostics removed = row_count;
  insert into public.audit_logs (actor_id, actor_email, action, entity_type, details)
  values (auth.uid(), auth.jwt() ->> 'email', 'clear', 'asset', jsonb_build_object('removed_count', removed));
  return removed;
end;
$$;

revoke all on function public.clear_assets() from public;
grant execute on function public.clear_assets() to authenticated;

create or replace function public.replace_assets(payload jsonb, source_file text default null)
returns bigint
language plpgsql
security definer set search_path = public, private
as $$
declare
  removed bigint;
  imported bigint;
begin
  if not private.is_admin() then
    raise exception 'Apenas administradores podem substituir a base de ativos';
  end if;
  if jsonb_typeof(payload) <> 'array' then
    raise exception 'O payload da importação deve ser uma lista de ativos';
  end if;

  delete from public.assets;
  get diagnostics removed = row_count;

  insert into public.assets (
    patrimonio, descricao, numero_serie, conta_cliente, local, status,
    conservacao, valor_aquisicao, observacoes, extra_data
  )
  select
    trim(item ->> 'patrimonio'),
    trim(item ->> 'descricao'),
    trim(item ->> 'numero_serie'),
    nullif(trim(item ->> 'conta_cliente'), ''),
    nullif(trim(item ->> 'local'), ''),
    coalesce(nullif(trim(item ->> 'status'), ''), 'Em estoque'),
    nullif(trim(item ->> 'conservacao'), ''),
    case
      when nullif(trim(item ->> 'valor_aquisicao'), '') is null then null
      else (item ->> 'valor_aquisicao')::numeric
    end,
    nullif(trim(item ->> 'observacoes'), ''),
    coalesce(item -> 'extra_data', '{}'::jsonb)
  from jsonb_array_elements(payload) as item;

  get diagnostics imported = row_count;
  insert into public.audit_logs (actor_id, actor_email, action, entity_type, details)
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    'import',
    'asset',
    jsonb_build_object(
      'source_file', source_file,
      'removed_count', removed,
      'imported_count', imported
    )
  );
  return imported;
end;
$$;

revoke all on function public.replace_assets(jsonb, text) from public;
grant execute on function public.replace_assets(jsonb, text) to authenticated;

-- Atualiza a view segura para expor campos extras sem expor o valor a operadores.
drop view if exists public.assets_inventory;
create view public.assets_inventory
with (security_invoker = false)
as
select
  id, patrimonio, descricao, numero_serie, conta_cliente, local, status,
  conservacao,
  case when private.is_admin() then valor_aquisicao else null end as valor_aquisicao,
  observacoes, extra_data, created_at, updated_at
from public.assets;

revoke all on public.assets_inventory from anon;
grant select on public.assets_inventory to authenticated;

-- Hardening pós-advisors: mantém SECURITY DEFINER apenas no schema privado.
create or replace function private.asset_acquisition(asset_id uuid)
returns numeric
language sql
stable
security definer set search_path = public, private
as $$
  select case
    when private.is_admin() then (
      select valor_aquisicao from public.assets where id = asset_id
    )
    else null
  end;
$$;

revoke all on function private.asset_acquisition(uuid) from public, anon;
grant execute on function private.asset_acquisition(uuid) to authenticated;

create or replace function private.clear_assets_internal()
returns bigint
language plpgsql
security definer set search_path = public, private
as $$
declare removed bigint;
begin
  if not private.is_admin() then raise exception 'Apenas administradores podem limpar a base de ativos'; end if;
  delete from public.assets;
  get diagnostics removed = row_count;
  insert into public.audit_logs (actor_id, actor_email, action, entity_type, details)
  values (auth.uid(), auth.jwt() ->> 'email', 'clear', 'asset', jsonb_build_object('removed_count', removed));
  return removed;
end;
$$;

revoke all on function private.clear_assets_internal() from public, anon;
grant execute on function private.clear_assets_internal() to authenticated;

create or replace function public.clear_assets()
returns bigint
language sql
security invoker set search_path = public, private
as $$ select private.clear_assets_internal(); $$;

revoke all on function public.clear_assets() from public, anon;
grant execute on function public.clear_assets() to authenticated;

create or replace function private.replace_assets_internal(payload jsonb, source_file text default null)
returns bigint
language plpgsql
security definer set search_path = public, private
as $$
declare removed bigint; imported bigint;
begin
  if not private.is_admin() then raise exception 'Apenas administradores podem substituir a base de ativos'; end if;
  if jsonb_typeof(payload) <> 'array' then raise exception 'O payload da importação deve ser uma lista de ativos'; end if;
  delete from public.assets;
  get diagnostics removed = row_count;
  insert into public.assets (patrimonio, descricao, numero_serie, conta_cliente, local, status, conservacao, valor_aquisicao, observacoes, extra_data)
  select trim(item ->> 'patrimonio'), trim(item ->> 'descricao'), trim(item ->> 'numero_serie'), nullif(trim(item ->> 'conta_cliente'), ''), nullif(trim(item ->> 'local'), ''), coalesce(nullif(trim(item ->> 'status'), ''), 'Em estoque'), nullif(trim(item ->> 'conservacao'), ''), case when nullif(trim(item ->> 'valor_aquisicao'), '') is null then null else (item ->> 'valor_aquisicao')::numeric end, nullif(trim(item ->> 'observacoes'), ''), coalesce(item -> 'extra_data', '{}'::jsonb)
  from jsonb_array_elements(payload) as item;
  get diagnostics imported = row_count;
  insert into public.audit_logs (actor_id, actor_email, action, entity_type, details)
  values (auth.uid(), auth.jwt() ->> 'email', 'import', 'asset', jsonb_build_object('source_file', source_file, 'removed_count', removed, 'imported_count', imported));
  return imported;
end;
$$;

revoke all on function private.replace_assets_internal(jsonb, text) from public, anon;
grant execute on function private.replace_assets_internal(jsonb, text) to authenticated;

create or replace function public.replace_assets(payload jsonb, source_file text default null)
returns bigint
language sql
security invoker set search_path = public, private
as $$ select private.replace_assets_internal(payload, source_file); $$;

revoke all on function public.replace_assets(jsonb, text) from public, anon;
grant execute on function public.replace_assets(jsonb, text) to authenticated;

drop view if exists public.assets_inventory;
create view public.assets_inventory
with (security_invoker = true)
as
select
  id, patrimonio, descricao, numero_serie, conta_cliente, local, status,
  conservacao, private.asset_acquisition(id) as valor_aquisicao,
  observacoes, extra_data, created_at, updated_at
from public.assets;

revoke select on public.assets from anon, authenticated;
grant select (id, patrimonio, descricao, numero_serie, conta_cliente, local, status, conservacao, observacoes, extra_data, created_at, updated_at)
on public.assets to authenticated;
revoke all on public.assets_inventory from anon;
grant select on public.assets_inventory to authenticated;
