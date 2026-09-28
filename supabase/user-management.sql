-- Gestão de Ativos | Usuários e cargos
alter table public.profiles add column if not exists email text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'gestor', 'usuario', 'operador'));

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.email, case when new.raw_user_meta_data ->> 'user_type' in ('admin', 'gestor', 'usuario') then new.raw_user_meta_data ->> 'user_type' else 'operador' end)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
to authenticated
using (private.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

grant select on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;
