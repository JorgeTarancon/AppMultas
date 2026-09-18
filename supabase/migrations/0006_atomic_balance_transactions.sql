-- Atomic, idempotent deposits and team transactions.
create or replace function public.create_balance_deposit(
  p_team_id uuid,
  p_id uuid,
  p_player_id uuid,
  p_amount_cents integer,
  p_description text,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  if p_amount_cents <= 0 or p_description is null or length(trim(p_description)) not between 1 and 160 then raise exception 'balance_deposit_invalid'; end if;
  if not exists (select 1 from public.players where id = p_player_id and team_id = p_team_id) then raise exception 'player_not_found'; end if;
  if exists (select 1 from public.balance_movements where id = p_id and team_id = p_team_id) then return; end if;

  insert into public.balance_movements (id, team_id, player_id, type, amount_cents, description, date, created_by)
  values (p_id, p_team_id, p_player_id, 'deposit'::public.balance_movement_type, p_amount_cents, trim(p_description), p_date, current_user_id);
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id, metadata)
  values (p_team_id, current_user_id, 'deposit', 'balance_movement', p_id, jsonb_build_object('player_id', p_player_id, 'amount_cents', p_amount_cents));
end;
$$;

create or replace function public.create_team_transaction(
  p_team_id uuid,
  p_id uuid,
  p_type public.transaction_type,
  p_amount_cents integer,
  p_description text,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  if p_amount_cents <= 0 or p_description is null or length(trim(p_description)) not between 1 and 160 then raise exception 'transaction_invalid'; end if;
  if exists (select 1 from public.transactions where id = p_id and team_id = p_team_id) then return; end if;

  insert into public.transactions (id, team_id, type, amount_cents, description, date, created_by)
  values (p_id, p_team_id, p_type, p_amount_cents, trim(p_description), p_date, current_user_id);
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id, metadata)
  values (p_team_id, current_user_id, 'create', 'transaction', p_id, jsonb_build_object('type', p_type, 'amount_cents', p_amount_cents));
end;
$$;

revoke execute on function public.create_balance_deposit(uuid, uuid, uuid, integer, text, date) from public;
revoke execute on function public.create_team_transaction(uuid, uuid, public.transaction_type, integer, text, date) from public;
grant execute on function public.create_balance_deposit(uuid, uuid, uuid, integer, text, date) to authenticated;
grant execute on function public.create_team_transaction(uuid, uuid, public.transaction_type, integer, text, date) to authenticated;
