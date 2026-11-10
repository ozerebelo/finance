-- Casa a Dois: run this once in Supabase → SQL Editor.
-- One household, two (or more) people, all data in `records` as JSON.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Casa a Dois',
  created_at timestamptz not null default now()
);

-- Who may open a household. user_id is filled in when the invited e-mail first logs in.
create table if not exists public.memberships (
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (household_id, email)
);

create table if not exists public.records (
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, kind, id)
);
create index if not exists records_household_kind on public.records (household_id, kind);

create or replace function public.is_member(h uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from memberships where household_id = h and user_id = auth.uid());
$$;

alter table public.households enable row level security;
alter table public.memberships enable row level security;
alter table public.records enable row level security;

drop policy if exists "members read household" on public.households;
create policy "members read household" on public.households for select using (public.is_member(id));
drop policy if exists "members rename household" on public.households;
create policy "members rename household" on public.households for update using (public.is_member(id));

drop policy if exists "members see memberships" on public.memberships;
create policy "members see memberships" on public.memberships for select using (public.is_member(household_id));
drop policy if exists "members invite" on public.memberships;
create policy "members invite" on public.memberships for insert with check (public.is_member(household_id));
drop policy if exists "members remove" on public.memberships;
create policy "members remove" on public.memberships for delete using (public.is_member(household_id));

drop policy if exists "members use records" on public.records;
create policy "members use records" on public.records for all
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- First login: create a household owned by the caller.
create or replace function public.create_household(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into households (name) values (coalesce(nullif(p_name, ''), 'Casa a Dois')) returning id into h;
  insert into memberships (household_id, email, user_id) values (h, lower(auth.jwt() ->> 'email'), auth.uid());
  return h;
end $$;

-- Every login: accept pending invitations for this e-mail, return the household (if any).
create or replace function public.my_household() returns uuid
language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then return null; end if;
  update memberships set user_id = auth.uid()
    where lower(email) = lower(auth.jwt() ->> 'email') and user_id is null;
  select household_id into h from memberships where user_id = auth.uid() order by created_at limit 1;
  return h;
end $$;

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.my_household() to authenticated;

-- Live updates between the two of you.
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;
