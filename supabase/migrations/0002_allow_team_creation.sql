-- Allow the authenticated owner to bootstrap a team through create_team.
create policy teams_authenticated_insert on public.teams
  for insert
  with check (created_by = auth.uid());

create policy team_members_bootstrap_owner_insert on public.team_members
  for insert
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.teams
      where id = team_id and created_by = auth.uid()
    )
  );

create policy audit_authenticated_insert on public.audit_log
  for insert
  with check (
    user_id = auth.uid()
    and public.is_team_member(team_id)
  );
