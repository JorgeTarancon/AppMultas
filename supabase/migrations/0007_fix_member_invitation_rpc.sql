-- Fix invitation RPC output naming and validation for projects where 0005 is already applied.
drop function if exists public.invite_team_member(uuid, text, public.team_role);

create or replace function public.invite_team_member(
  p_team_id uuid,
  p_email text,
  p_role public.team_role default 'editor'
)
returns table (
  invitation_id uuid,
  invited_email text,
  member_role public.team_role,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(trim(coalesce(p_email, '')));
  raw_token text := encode(gen_random_bytes(32), 'hex');
  invitation public.team_invitations;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if not public.has_team_role(p_team_id, array['owner']::public.team_role[]) then raise exception 'permission_denied'; end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'email_invalid'; end if;
  if p_role is null then raise exception 'role_invalid'; end if;
  if exists (
    select 1
    from public.team_members member
    join auth.users invited_user on invited_user.id = member.user_id
    where member.team_id = p_team_id and lower(invited_user.email) = normalized_email
  ) then raise exception 'already_member'; end if;

  insert into public.team_invitations (team_id, email, role, token_hash, invited_by, expires_at)
  values (p_team_id, normalized_email, p_role, encode(public.digest(raw_token, 'sha256'), 'hex'), current_user_id, now() + interval '7 days')
  returning * into invitation;

  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id, metadata)
  values (p_team_id, current_user_id, 'invite', 'team_member', invitation.id, jsonb_build_object('email', normalized_email, 'role', p_role));

  return query
    select invitation.id, invitation.email, invitation.role, raw_token, invitation.expires_at;
end;
$$;

create or replace function public.accept_team_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invitation public.team_invitations;
  target_team_id uuid;
begin
  if current_user_id is null or current_email = '' then raise exception 'authentication_required'; end if;
  select * into invitation
  from public.team_invitations
  where token_hash = encode(public.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now()
    and lower(email) = current_email
  for update;
  if not found then raise exception 'invitation_invalid_or_expired'; end if;

  target_team_id := invitation.team_id;
  insert into public.team_members (team_id, user_id, role)
  values (target_team_id, current_user_id, invitation.role)
  on conflict (team_id, user_id) do update set role = excluded.role;
  update public.team_invitations set accepted_at = now(), accepted_by = current_user_id where id = invitation.id;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id)
  values (target_team_id, current_user_id, 'accept', 'invitation', invitation.id);
  return target_team_id;
end;
$$;

revoke execute on function public.invite_team_member(uuid, text, public.team_role) from public;
grant execute on function public.invite_team_member(uuid, text, public.team_role) to authenticated;
revoke execute on function public.accept_team_invitation(text) from public;
grant execute on function public.accept_team_invitation(text) to authenticated;
