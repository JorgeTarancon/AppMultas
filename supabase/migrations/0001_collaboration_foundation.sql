create extension if not exists pgcrypto;

create type public.team_role as enum ('owner', 'editor', 'viewer');
create type public.fine_status as enum ('pending', 'paid');
create type public.transaction_type as enum ('income', 'expense');
create type public.balance_movement_type as enum ('deposit', 'consumption');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.team_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role public.team_role not null default 'editor',
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fine_types (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 120),
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id),
  description text not null check (length(trim(description)) between 1 and 160),
  base_amount_cents integer not null check (base_amount_cents > 0),
  date date not null,
  status public.fine_status not null default 'pending',
  surcharge_weeks integer not null default 0 check (surcharge_weeks >= 0),
  final_amount_cents integer check (final_amount_cents is null or final_amount_cents >= 0),
  paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
  paid_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.surcharge_applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  fine_id uuid not null references public.fines(id) on delete cascade,
  applied_at timestamptz not null default now(),
  amount_cents integer not null check (amount_cents >= 0),
  total_amount_cents integer not null check (total_amount_cents >= 0),
  created_by uuid not null references auth.users(id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type public.transaction_type not null,
  amount_cents integer not null check (amount_cents > 0),
  description text not null check (length(trim(description)) between 1 and 160),
  date date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.balance_movements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id),
  type public.balance_movement_type not null,
  amount_cents integer not null check (amount_cents > 0),
  description text not null check (length(trim(description)) between 1 and 160),
  date date not null,
  fine_id uuid references public.fines(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index team_members_user_idx on public.team_members(user_id);
create index players_team_idx on public.players(team_id);
create index fine_types_team_idx on public.fine_types(team_id);
create index fines_team_date_idx on public.fines(team_id, date desc);
create index transactions_team_date_idx on public.transactions(team_id, date desc);
create index balance_movements_team_date_idx on public.balance_movements(team_id, date desc);
create index audit_log_team_created_idx on public.audit_log(team_id, created_at desc);

create or replace function public.is_team_member(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = requested_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_team_role(requested_team_id uuid, allowed_roles public.team_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = requested_team_id and user_id = auth.uid() and role = any(allowed_roles)
  );
$$;

create or replace function public.create_team(team_name text)
returns public.teams
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_team public.teams;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  insert into public.teams (name, created_by) values (trim(team_name), auth.uid()) returning * into created_team;
  insert into public.team_members (team_id, user_id, role) values (created_team.id, auth.uid(), 'owner');
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id) values (created_team.id, auth.uid(), 'create', 'team', created_team.id);
  return created_team;
end;
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.players enable row level security;
alter table public.fine_types enable row level security;
alter table public.fines enable row level security;
alter table public.surcharge_applications enable row level security;
alter table public.transactions enable row level security;
alter table public.balance_movements enable row level security;
alter table public.audit_log enable row level security;

create policy teams_member_select on public.teams for select using (public.is_team_member(id));
create policy teams_owner_update on public.teams for update using (public.has_team_role(id, array['owner']::public.team_role[]));
create policy team_members_member_select on public.team_members for select using (public.is_team_member(team_id));
create policy team_members_owner_manage on public.team_members for all using (public.has_team_role(team_id, array['owner']::public.team_role[]));
create policy invitations_owner_manage on public.team_invitations for all using (public.has_team_role(team_id, array['owner']::public.team_role[]));
create policy players_member_read on public.players for select using (public.is_team_member(team_id));
create policy players_editor_write on public.players for all using (public.has_team_role(team_id, array['owner', 'editor']::public.team_role[]));
create policy fine_types_member_read on public.fine_types for select using (public.is_team_member(team_id));
create policy fine_types_editor_write on public.fine_types for all using (public.has_team_role(team_id, array['owner', 'editor']::public.team_role[]));
create policy fines_member_read on public.fines for select using (public.is_team_member(team_id));
create policy fines_editor_write on public.fines for all using (public.has_team_role(team_id, array['owner', 'editor']::public.team_role[]));
create policy surcharge_member_read on public.surcharge_applications for select using (public.is_team_member(team_id));
create policy surcharge_editor_write on public.surcharge_applications for all using (public.has_team_role(team_id, array['owner', 'editor']::public.team_role[]));
create policy transactions_member_read on public.transactions for select using (public.is_team_member(team_id));
create policy transactions_editor_write on public.transactions for all using (public.has_team_role(team_id, array['owner', 'editor']::public.team_role[]));
create policy balance_member_read on public.balance_movements for select using (public.is_team_member(team_id));
create policy balance_editor_write on public.balance_movements for all using (public.has_team_role(team_id, array['owner', 'editor']::public.team_role[]));
create policy audit_member_read on public.audit_log for select using (public.is_team_member(team_id));

alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.fine_types;
alter publication supabase_realtime add table public.fines;
alter publication supabase_realtime add table public.surcharge_applications;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.balance_movements;
