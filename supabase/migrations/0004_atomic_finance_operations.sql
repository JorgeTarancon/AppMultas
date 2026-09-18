-- Atomic and idempotent financial commands for collaborative teams.
create or replace function public.create_fine_with_balance(
  p_team_id uuid,
  p_fine_id uuid,
  p_player_id uuid,
  p_description text,
  p_base_amount_cents integer,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  available_cents integer;
  consumed_cents integer;
  weekly_surcharge_cents integer;
  inserted_fine public.fines;
begin
  if current_user_id is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then
    raise exception 'permission_denied';
  end if;
  if p_description is null or length(trim(p_description)) not between 1 and 160 or p_base_amount_cents <= 0 then
    raise exception 'fine_invalid';
  end if;
  if exists (select 1 from public.fines where id = p_fine_id and team_id = p_team_id) then
    return;
  end if;
  if not exists (select 1 from public.players where id = p_player_id and team_id = p_team_id) then
    raise exception 'player_not_found';
  end if;

  select coalesce((settings ->> 'weeklySurchargeCents')::integer, 0)
    into weekly_surcharge_cents
    from public.teams where id = p_team_id;

  select coalesce(sum(case when type = 'deposit' then amount_cents else -amount_cents end), 0)
    into available_cents
    from public.balance_movements
    where team_id = p_team_id and player_id = p_player_id;
  available_cents := greatest(available_cents, 0);
  consumed_cents := least(available_cents, p_base_amount_cents);

  insert into public.fines (id, team_id, player_id, description, base_amount_cents, date, status, paid_amount_cents, final_amount_cents, paid_at, created_by, updated_by)
  values (
    p_fine_id, p_team_id, p_player_id, trim(p_description), p_base_amount_cents,
    p_date, (case when consumed_cents = p_base_amount_cents then 'paid' else 'pending' end)::public.fine_status,
    consumed_cents, case when consumed_cents = p_base_amount_cents then p_base_amount_cents else null end,
    case when consumed_cents = p_base_amount_cents then p_date else null end,
    current_user_id, current_user_id
  ) returning * into inserted_fine;

  if consumed_cents > 0 then
    insert into public.balance_movements (team_id, player_id, type, amount_cents, description, date, fine_id, created_by)
    values (p_team_id, p_player_id, 'consumption', consumed_cents, 'Aplicado a multa: ' || trim(p_description), p_date, p_fine_id, current_user_id);
  end if;

  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id, metadata)
  values (p_team_id, current_user_id, 'create', 'fine', p_fine_id, jsonb_build_object('consumed_cents', consumed_cents));
end;
$$;

create or replace function public.mark_fine_paid(p_team_id uuid, p_fine_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target public.fines;
  weekly_surcharge_cents integer;
  applied_cents integer;
  final_cents integer;
begin
  if current_user_id is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  select * into target from public.fines where id = p_fine_id and team_id = p_team_id for update;
  if not found then raise exception 'fine_not_found'; end if;
  if target.status = 'paid' then return; end if;
  select coalesce((settings ->> 'weeklySurchargeCents')::integer, 0) into weekly_surcharge_cents from public.teams where id = p_team_id;
  select coalesce(sum(amount_cents), 0) into applied_cents from public.surcharge_applications where fine_id = p_fine_id and team_id = p_team_id;
  final_cents := greatest(0, target.base_amount_cents + target.surcharge_weeks * weekly_surcharge_cents + applied_cents);
  update public.fines
    set status = 'paid', paid_amount_cents = final_cents, final_amount_cents = final_cents, paid_at = current_date, updated_by = current_user_id, updated_at = now()
    where id = p_fine_id and team_id = p_team_id;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id) values (p_team_id, current_user_id, 'pay', 'fine', p_fine_id);
end;
$$;

create or replace function public.apply_fine_surcharge(p_team_id uuid, p_fine_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target public.fines;
  settings_json jsonb;
  enabled boolean;
  surcharge_cents integer;
  period_days integer;
  last_applied timestamptz;
  total_cents integer;
  application_id uuid := gen_random_uuid();
begin
  if current_user_id is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  select * into target from public.fines where id = p_fine_id and team_id = p_team_id for update;
  if not found then raise exception 'fine_not_found'; end if;
  if target.status = 'paid' then return; end if;
  select settings into settings_json from public.teams where id = p_team_id;
  enabled := coalesce((settings_json ->> 'lateFeesEnabled')::boolean, false);
  surcharge_cents := coalesce((settings_json ->> 'weeklySurchargeCents')::integer, 0);
  period_days := coalesce((settings_json ->> 'surchargePeriodDays')::integer, 7);
  select max(applied_at) into last_applied from public.surcharge_applications where fine_id = p_fine_id and team_id = p_team_id;
  if not enabled or surcharge_cents <= 0 or current_date < coalesce(last_applied::date, target.date) + period_days then return; end if;
  total_cents := target.base_amount_cents + target.surcharge_weeks * surcharge_cents + coalesce((select sum(amount_cents) from public.surcharge_applications where fine_id = p_fine_id), 0) + surcharge_cents;
  insert into public.surcharge_applications (id, team_id, fine_id, amount_cents, total_amount_cents, created_by)
  values (application_id, p_team_id, p_fine_id, surcharge_cents, total_cents, current_user_id);
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id) values (p_team_id, current_user_id, 'surcharge', 'fine', p_fine_id);
end;
$$;

revoke execute on function public.create_fine_with_balance(uuid, uuid, uuid, text, integer, date) from public;
revoke execute on function public.mark_fine_paid(uuid, uuid) from public;
revoke execute on function public.apply_fine_surcharge(uuid, uuid) from public;
grant execute on function public.create_fine_with_balance(uuid, uuid, uuid, text, integer, date) to authenticated;
grant execute on function public.mark_fine_paid(uuid, uuid) to authenticated;
grant execute on function public.apply_fine_surcharge(uuid, uuid) to authenticated;
