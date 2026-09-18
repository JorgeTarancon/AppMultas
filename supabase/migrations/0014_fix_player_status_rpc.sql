-- Fix player activation RPC to match the original players schema.
create or replace function public.set_player_active(p_team_id uuid, p_player_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  update public.players set active = p_active, updated_at = now()
  where id = p_player_id and team_id = p_team_id;
  if not found then raise exception 'player_not_found'; end if;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id)
  values (p_team_id, auth.uid(), case when p_active then 'activate' else 'deactivate' end, 'player', p_player_id);
end;
$$;
