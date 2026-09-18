-- Bootstrap team creation must not depend on policies that require membership
-- before the owner membership row exists.
create or replace function public.create_team(team_name text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  created_team public.teams;
  current_user_id uuid := auth.uid();
  normalized_name text := trim(team_name);
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;
  if length(normalized_name) not between 1 and 120 then
    raise exception 'team_name_invalid';
  end if;

  insert into public.teams (name, created_by)
  values (normalized_name, current_user_id)
  returning * into created_team;

  insert into public.team_members (team_id, user_id, role)
  values (created_team.id, current_user_id, 'owner');

  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id)
  values (created_team.id, current_user_id, 'create', 'team', created_team.id);

  return created_team;
end;
$$;

revoke execute on function public.create_team(text) from public;
grant execute on function public.create_team(text) to authenticated;
