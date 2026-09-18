-- Incremental team settings update.
create or replace function public.update_team_settings(
  p_team_id uuid,
  p_name text,
  p_settings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'team_name_invalid'; end if;
  update public.teams set name = trim(p_name), settings = p_settings, updated_at = now() where id = p_team_id;
  if not found then raise exception 'team_not_found'; end if;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id, metadata)
  values (p_team_id, auth.uid(), 'update', 'team', p_team_id, p_settings);
end;
$$;

revoke execute on function public.update_team_settings(uuid, text, jsonb) from public;
grant execute on function public.update_team_settings(uuid, text, jsonb) to authenticated;
