-- Gestão de Ativos | Supabase schema
-- Execute este arquivo no SQL Editor do projeto Supabase.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'operador' check (role in ('admin', 'operador')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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

create index if not exists assets_patrimonio_idx on public.assets using gin (patrimonio gin_trgm_ops);
create index if not exists assets_numero_serie_idx on public.assets using gin (numero_serie gin_trgm_ops);
create index if not exists assets_status_idx on public.assets (status);
create index if not exists assets_cliente_idx on public.assets (conta_cliente);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
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

create or replace function public.is_admin()
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

alter table public.profiles enable row level security;
alter table public.assets enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

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
using (public.is_admin());

-- A view segura evita expor valor_aquisicao para operadores.
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
  case when public.is_admin() then valor_aquisicao else null end as valor_aquisicao,
  observacoes,
  created_at,
  updated_at
from public.assets;

-- Nunca exponha a tabela bruta via PostgREST: ela contém valor_aquisicao.
revoke select on public.assets from anon, authenticated;
grant insert, update, delete on public.assets to authenticated;
grant select on public.assets_inventory to authenticated;

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

-- Para o primeiro usuário, crie a conta pelo Auth do Supabase e promova manualmente a admin se necessário:
-- update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
