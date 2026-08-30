-- NEXA Asset Operations | Security hardening
-- Migração idempotente para auditoria, perfis de operadores e RLS seguro.

create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- Coluna email na tabela profiles (caso ainda não exista)
alter table public.profiles add column if not exists email text;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

drop function if exists public.handle_new_user();

-- Tabela de Auditoria de Alterações
create table if not exists public.asset_audits (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete set null,
  patrimonio text not null,
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  user_email text,
  changes jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists asset_audits_patrimonio_idx on public.asset_audits (patrimonio);
create index if not exists asset_audits_asset_id_idx on public.asset_audits (asset_id);
create index if not exists asset_audits_user_id_idx on public.asset_audits (user_id);
create index if not exists asset_audits_created_at_idx on public.asset_audits (created_at desc);

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

-- Trigger automático de Auditoria
create or replace function private.record_asset_audit()
returns trigger
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_user_email text;
  v_diff jsonb := '{}'::jsonb;
begin
  if v_user_id is not null then
    select full_name, email into v_user_name, v_user_email from public.profiles where id = v_user_id;
  end if;

  if (TG_OP = 'INSERT') then
    insert into public.asset_audits (asset_id, patrimonio, action, user_id, user_name, user_email, changes, notes)
    values (
      NEW.id,
      NEW.patrimonio,
      'CREATE',
      v_user_id,
      coalesce(v_user_name, 'Operador'),
      v_user_email,
      jsonb_build_object(
        'status', jsonb_build_object('old', null, 'new', NEW.status),
        'local', jsonb_build_object('old', null, 'new', NEW.local),
        'conta_cliente', jsonb_build_object('old', null, 'new', NEW.conta_cliente),
        'descricao', jsonb_build_object('old', null, 'new', NEW.descricao)
      ),
      'Cadastro inicial do ativo'
    );
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    if (OLD.status is distinct from NEW.status) then
      v_diff := v_diff || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    end if;
    if (OLD.local is distinct from NEW.local) then
      v_diff := v_diff || jsonb_build_object('local', jsonb_build_object('old', OLD.local, 'new', NEW.local));
    end if;
    if (OLD.conta_cliente is distinct from NEW.conta_cliente) then
      v_diff := v_diff || jsonb_build_object('conta_cliente', jsonb_build_object('old', OLD.conta_cliente, 'new', NEW.conta_cliente));
    end if;
    if (OLD.conservacao is distinct from NEW.conservacao) then
      v_diff := v_diff || jsonb_build_object('conservacao', jsonb_build_object('old', OLD.conservacao, 'new', NEW.conservacao));
    end if;
    if (OLD.descricao is distinct from NEW.descricao) then
      v_diff := v_diff || jsonb_build_object('descricao', jsonb_build_object('old', OLD.descricao, 'new', NEW.descricao));
    end if;
    if (OLD.numero_serie is distinct from NEW.numero_serie) then
      v_diff := v_diff || jsonb_build_object('numero_serie', jsonb_build_object('old', OLD.numero_serie, 'new', NEW.numero_serie));
    end if;
    if (OLD.observacoes is distinct from NEW.observacoes) then
      v_diff := v_diff || jsonb_build_object('observacoes', jsonb_build_object('old', OLD.observacoes, 'new', NEW.observacoes));
    end if;

    if (v_diff != '{}'::jsonb) then
      insert into public.asset_audits (asset_id, patrimonio, action, user_id, user_name, user_email, changes, notes)
      values (
        NEW.id,
        NEW.patrimonio,
        'UPDATE',
        v_user_id,
        coalesce(v_user_name, 'Operador'),
        v_user_email,
        v_diff,
        'Atualização cadastral do ativo'
      );
    end if;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    insert into public.asset_audits (asset_id, patrimonio, action, user_id, user_name, user_email, changes, notes)
    values (
      OLD.id,
      OLD.patrimonio,
      'DELETE',
      v_user_id,
      coalesce(v_user_name, 'Administrador'),
      v_user_email,
      jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', 'Excluído')),
      'Exclusão de ativo pelo administrador'
    );
    return OLD;
  end if;
  return null;
end;
$$;

revoke all on function private.record_asset_audit() from public;
drop trigger if exists assets_audit_trigger on public.assets;
create trigger assets_audit_trigger
after insert or update or delete on public.assets
for each row execute procedure private.record_asset_audit();

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.asset_audits enable row level security;

drop policy if exists "Users can read profiles" on public.profiles;
create policy "Users can read profiles"
on public.profiles for select
to authenticated
using (id = auth.uid() or private.is_admin());

drop policy if exists "Users can update own profile name" on public.profiles;
create policy "Users can update own profile name"
on public.profiles for update
to authenticated
using (id = auth.uid() or private.is_admin())
with check (id = auth.uid() or private.is_admin());

drop policy if exists "Authenticated users can read asset_audits" on public.asset_audits;
create policy "Authenticated users can read asset_audits"
on public.asset_audits for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Authenticated users can insert asset_audits" on public.asset_audits;
create policy "Authenticated users can insert asset_audits"
on public.asset_audits for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Only admins can delete assets" on public.assets;
create policy "Only admins can delete assets"
on public.assets for delete
to authenticated
using (private.is_admin());

grant select, insert on public.asset_audits to authenticated;
grant select, update on public.profiles to authenticated;

drop function if exists public.is_admin();
