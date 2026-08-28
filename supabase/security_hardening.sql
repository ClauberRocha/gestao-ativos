-- NEXA Asset Operations | Security hardening
-- Migração idempotente para remover funções SECURITY DEFINER do schema exposto.

create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

drop function if exists public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

 drop policy if exists "Only admins can delete assets" on public.assets;
create policy "Only admins can delete assets"
on public.assets for delete
to authenticated
using (private.is_admin());

drop view if exists public.assets_inventory;
create view public.assets_inventory
with (security_invoker = false)
as
select
  id,
  patrimonio,
  descricao,
  numero_serie,
  conta_cliente,
  local,
  status,
  conservacao,
  case when private.is_admin() then valor_aquisicao else null end as valor_aquisicao,
  observacoes,
  created_at,
  updated_at
from public.assets;

revoke select on public.assets from anon, authenticated;
grant select (id) on public.assets to authenticated;
grant insert, update, delete on public.assets to authenticated;
grant select on public.assets_inventory to authenticated;

drop function if exists public.is_admin();
