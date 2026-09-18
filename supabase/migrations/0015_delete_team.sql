-- Allow only a team owner to permanently delete the team and all its data.
create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_team_role(p_team_id, array['owner']::public.team_role[]) then
    raise exception 'team_owner_required';
  end if;

  delete from public.balance_movements where team_id = p_team_id;
  delete from public.surcharge_applications where team_id = p_team_id;
  delete from public.fines where team_id = p_team_id;
  delete from public.transactions where team_id = p_team_id;
  delete from public.team_invitations where team_id = p_team_id;
  delete from public.audit_log where team_id = p_team_id;
  delete from public.fine_types where team_id = p_team_id;
  delete from public.players where team_id = p_team_id;
  delete from public.team_members where team_id = p_team_id;
  delete from public.teams where id = p_team_id;
end;
$$;

revoke execute on function public.delete_team(uuid) from public;
grant execute on function public.delete_team(uuid) to authenticated;
