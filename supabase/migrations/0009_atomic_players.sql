-- Incremental player commands, avoiding full snapshot writes.
create or replace function public.create_player(
  p_team_id uuid,
  p_id uuid,
  p_name text
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
  if p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'player_invalid'; end if;
  if exists (select 1 from public.players where id = p_id and team_id = p_team_id) then return; end if;
  insert into public.players (id, team_id, name, active, created_by, updated_by)
  values (p_id, p_team_id, trim(p_name), true, current_user_id, current_user_id);
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id)
  values (p_team_id, current_user_id, 'create', 'player', p_id);
end;
$$;

create or replace function public.set_player_active(p_team_id uuid, p_player_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  update public.players set active = p_active, updated_by = auth.uid(), updated_at = now()
  where id = p_player_id and team_id = p_team_id;
  if not found then raise exception 'player_not_found'; end if;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id, metadata)
  values (p_team_id, auth.uid(), case when p_active then 'activate' else 'deactivate' end, 'player', p_player_id);
end;
$$;

create or replace function public.delete_player(p_team_id uuid, p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  if exists (select 1 from public.fines where team_id = p_team_id and player_id = p_player_id) then raise exception 'player_has_fines'; end if;
  delete from public.players where id = p_player_id and team_id = p_team_id;
  if not found then raise exception 'player_not_found'; end if;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id)
  values (p_team_id, auth.uid(), 'delete', 'player', p_player_id);
end;
$$;

revoke execute on function public.create_player(uuid, uuid, text) from public;
revoke execute on function public.set_player_active(uuid, uuid, boolean) from public;
revoke execute on function public.delete_player(uuid, uuid) from public;
grant execute on function public.create_player(uuid, uuid, text) to authenticated;
grant execute on function public.set_player_active(uuid, uuid, boolean) to authenticated;
grant execute on function public.delete_player(uuid, uuid) to authenticated;
