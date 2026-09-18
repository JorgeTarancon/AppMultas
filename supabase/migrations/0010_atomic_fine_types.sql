-- Incremental fine-type commands.
create or replace function public.create_fine_type(p_team_id uuid, p_id uuid, p_description text, p_amount_cents integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  if p_description is null or length(trim(p_description)) not between 1 and 120 or p_amount_cents <= 0 then raise exception 'fine_type_invalid'; end if;
  if exists (select 1 from public.fine_types where id = p_id and team_id = p_team_id) then return; end if;
  insert into public.fine_types (id, team_id, description, amount_cents, created_by, updated_by)
  values (p_id, p_team_id, trim(p_description), p_amount_cents, auth.uid(), auth.uid());
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id) values (p_team_id, auth.uid(), 'create', 'fine_type', p_id);
end;
$$;

create or replace function public.update_fine_type(p_team_id uuid, p_id uuid, p_description text, p_amount_cents integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  if p_description is null or length(trim(p_description)) not between 1 and 120 or p_amount_cents <= 0 then raise exception 'fine_type_invalid'; end if;
  update public.fine_types set description = trim(p_description), amount_cents = p_amount_cents, updated_by = auth.uid(), updated_at = now()
  where id = p_id and team_id = p_team_id;
  if not found then raise exception 'fine_type_not_found'; end if;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id) values (p_team_id, auth.uid(), 'update', 'fine_type', p_id);
end;
$$;

create or replace function public.delete_fine_type(p_team_id uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  delete from public.fine_types where id = p_id and team_id = p_team_id;
  if not found then raise exception 'fine_type_not_found'; end if;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id) values (p_team_id, auth.uid(), 'delete', 'fine_type', p_id);
end;
$$;

revoke execute on function public.create_fine_type(uuid, uuid, text, integer) from public;
revoke execute on function public.update_fine_type(uuid, uuid, text, integer) from public;
revoke execute on function public.delete_fine_type(uuid, uuid) from public;
grant execute on function public.create_fine_type(uuid, uuid, text, integer) to authenticated;
grant execute on function public.update_fine_type(uuid, uuid, text, integer) to authenticated;
grant execute on function public.delete_fine_type(uuid, uuid) to authenticated;
