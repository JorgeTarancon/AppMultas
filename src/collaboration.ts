import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type TeamRole = 'owner' | 'editor' | 'viewer';
export type Team = { id: string; name: string; settings: Record<string, unknown>; created_by: string; created_at: string; updated_at: string };
export type TeamMember = { team_id: string; user_id: string; role: TeamRole; created_at: string };
export type AuditEvent = { id: number; team_id: string; user_id: string; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: string };

const requireClient = () => {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
};

export const listTeams = async () => {
  const client = requireClient();
  const { data, error } = await client.from('teams').select('*').order('created_at');
  if (error) throw error;
  return data as Team[];
};

export const createTeam = async (name: string) => {
  const client = requireClient();
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Introduce un nombre de equipo');
  const { data, error } = await client.rpc('create_team', { team_name: normalizedName });
  if (error) throw error;
  if (!data) throw new Error('Supabase no devolvió el equipo creado');
  return data as Team;
};

export const deleteTeam = async (teamId: string) => {
  const { error } = await requireClient().rpc('delete_team', { p_team_id: teamId });
  if (error) throw error;
};

export const listTeamMembers = async (teamId: string) => {
  const client = requireClient();
  const { data, error } = await client.from('team_members').select('*').eq('team_id', teamId);
  if (error) throw error;
  return data as TeamMember[];
};

export const listAuditEvents = async (teamId: string, limit = 40) => {
  const { data, error } = await requireClient().from('audit_log').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data as AuditEvent[];
};

export const inviteTeamMember = async (teamId: string, email: string, role: TeamRole = 'editor') => {
  const { data, error } = await requireClient().rpc('invite_team_member', { p_team_id: teamId, p_email: email, p_role: role });
  if (error) throw error;
  const invitation = (data as Array<{ invitation_id: string; invited_email: string; member_role: TeamRole; token: string; expires_at: string }>)[0];
  if (!invitation?.token) throw new Error('Supabase no devolvió el token de invitación');
  return invitation;
};

export const acceptTeamInvitation = async (token: string) => {
  const { data, error } = await requireClient().rpc('accept_team_invitation', { p_token: token });
  if (error) throw error;
  return data as string;
};

export const changeTeamMemberRole = async (teamId: string, userId: string, role: TeamRole) => {
  const { error } = await requireClient().rpc('change_team_member_role', { p_team_id: teamId, p_user_id: userId, p_role: role });
  if (error) throw error;
};

export const removeTeamMember = async (teamId: string, userId: string) => {
  const { error } = await requireClient().rpc('remove_team_member', { p_team_id: teamId, p_user_id: userId });
  if (error) throw error;
};

export const subscribeToTeamChanges = (teamId: string, onChange: (payload: unknown) => void): (() => void) => {
  const client = requireClient();
  const channel: RealtimeChannel = client
    .channel(`team:${teamId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fine_types', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fines', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'surcharge_applications', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'balance_movements', filter: `team_id=eq.${teamId}` }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
};
