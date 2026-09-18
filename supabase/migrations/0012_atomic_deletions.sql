-- Incremental deletions for collaborative data.
create or replace function public.delete_fine(p_team_id uuid, p_fine_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_fine public.fines;
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  delete from public.balance_movements where team_id = p_team_id and fine_id = p_fine_id;
  delete from public.fines where id = p_fine_id and team_id = p_team_id returning * into deleted_fine;
  if not found then raise exception 'fine_not_found'; end if;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id)
  values (p_team_id, auth.uid(), 'delete', 'fine', p_fine_id);
end;
$$;

create or replace function public.delete_team_transaction(p_team_id uuid, p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_team_role(p_team_id, array['owner', 'editor']::public.team_role[]) then raise exception 'permission_denied'; end if;
  delete from public.transactions where id = p_transaction_id and team_id = p_team_id;
  if not found then raise exception 'transaction_not_found'; end if;
  insert into public.audit_log (team_id, user_id, action, entity_type, entity_id)
  values (p_team_id, auth.uid(), 'delete', 'transaction', p_transaction_id);
end;
$$;

revoke execute on function public.delete_fine(uuid, uuid) from public;
revoke execute on function public.delete_team_transaction(uuid, uuid) from public;
grant execute on function public.delete_fine(uuid, uuid) to authenticated;
grant execute on function public.delete_team_transaction(uuid, uuid) to authenticated;
