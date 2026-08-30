-- Gestão de Ativos | Supabase schema
-- Execute este arquivo no SQL Editor do projeto Supabase.

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- Tabela de Perfis de Usuários (Operadores e Admins)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'operador' check (role in ('admin', 'operador')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Tabela de Ativos
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  patrimonio text not null unique,
  descricao text not null,
  numero_serie text not null unique,
  conta_cliente text,
  local text,
  status text not null default 'Em estoque' check (status in ('Entregue', 'Em estoque', 'Ativo', 'Defeito')),
  conservacao text,
  valor_aquisicao numeric(12,2),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_patrimonio_idx on public.assets using gin (patrimonio extensions.gin_trgm_ops);
create index if not exists assets_numero_serie_idx on public.assets using gin (numero_serie extensions.gin_trgm_ops);
create index if not exists assets_status_idx on public.assets (status);
create index if not exists assets_cliente_idx on public.assets (conta_cliente);

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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at
before update on public.assets
for each row execute procedure public.set_updated_at();

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

-- Função auxiliar is_admin
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

-- Trigger automático de Auditoria no Postgres
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

-- Policies para Profiles
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

-- Policies para Assets
drop policy if exists "Authenticated users can read assets" on public.assets;
create policy "Authenticated users can read assets"
on public.assets for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Authenticated users can insert assets" on public.assets;
create policy "Authenticated users can insert assets"
on public.assets for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update assets" on public.assets;
create policy "Authenticated users can update assets"
on public.assets for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "Only admins can delete assets" on public.assets;
create policy "Only admins can delete assets"
on public.assets for delete
to authenticated
using (private.is_admin());

-- Policies para Asset Audits
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

-- View Segura
drop view if exists public.assets_inventory;
create view public.assets_inventory
with (security_invoker = true)
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

-- Permissões
revoke select on public.assets from anon, authenticated;
grant insert, update, delete on public.assets to authenticated;
grant select on public.assets_inventory to authenticated;
grant select, insert on public.asset_audits to authenticated;
grant select, update on public.profiles to authenticated;

-- Dados Iniciais de Ativos
insert into public.assets (patrimonio, descricao, numero_serie, conta_cliente, local, status, conservacao, valor_aquisicao, observacoes)
values
  ('MR PAY 0001', 'PIN PAD Ingenico Lane/3000', '7200032211011635', 'SEFAZ', 'São Paulo / SP', 'Ativo', 'Bom', 389.90, 'Alocado no guichê 04; última conferência sem ressalvas.'),
  ('MR PAY 0002', 'PIN PAD Ingenico Lane/3000', '7200032211011642', 'SEFAZ', 'São Paulo / SP', 'Ativo', 'Bom', 389.90, 'Alocado no guichê 07.'),
  ('TOTEM 0012', 'Totem de autoatendimento 24 pol.', 'TOT-2024-00012', 'Banco do Brasil', 'Brasília / DF', 'Em estoque', 'Novo', 6840.00, 'Aguardando instalação no ponto Norte.'),
  ('TOTEM 0008', 'Totem de autoatendimento 24 pol.', 'TOT-2024-00008', 'Detran SP', 'Campinas / SP', 'Entregue', 'Bom', 6840.00, 'Entregue ao operador logístico em 14/08/2026.'),
  ('DESK 0148', 'Desktop Dell OptiPlex 7010', '8XK3PZ4', 'SEFAZ', 'São Paulo / SP', 'Ativo', 'Regular', 3290.00, 'Estação de retaguarda do atendimento.'),
  ('DESK 0151', 'Desktop Lenovo ThinkCentre M70s', 'PC1A7K29', 'Prefeitura de Santos', 'Santos / SP', 'Defeito', 'Ruim', 2980.00, 'Falha intermitente no SSD; aguardando RMA.'),
  ('MR PAY 0007', 'PIN PAD Verifone VX 690', 'VX690-0098712', 'Caixa Econômica Federal', 'Belo Horizonte / MG', 'Em estoque', 'Novo', 512.50, 'Reserva técnica lacrada.'),
  ('TOTEM 0015', 'Totem de autoatendimento 32 pol.', 'TOT-2025-00015', 'Poupatempo', 'Guarulhos / SP', 'Ativo', 'Bom', 8920.00, 'Operando no saguão principal.'),
  ('DESK 0132', 'Desktop HP ProDesk 400 G7', 'BRHPD400G7-0132', 'Hospital Regional', 'Ribeirão Preto / SP', 'Entregue', 'Bom', 3110.00, 'Recebido pelo time de infraestrutura local.'),
  ('MR PAY 0014', 'PIN PAD Ingenico AXIUM DX8000', 'AXD8-2026-0014', 'Mercado Livre', 'Osasco / SP', 'Defeito', 'Regular', 1190.00, 'Tela sem resposta após atualização de firmware.'),
  ('TOTEM 0003', 'Totem de autoatendimento 24 pol.', 'TOT-2023-00003', 'Poupatempo', 'São José dos Campos / SP', 'Ativo', 'Regular', 6420.00, 'Em operação com pequeno desgaste no gabinete.'),
  ('DESK 0164', 'Desktop Dell OptiPlex 7020', '9QZ6ML2', 'Receita Federal', 'Curitiba / PR', 'Em estoque', 'Novo', 3550.00, 'Kit completo separado para expedição.')
on conflict (patrimonio) do nothing;
