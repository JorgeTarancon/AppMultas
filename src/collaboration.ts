import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type TeamRole = 'owner' | 'editor' | 'viewer';
export type Team = { id: string; name: string; settings: Record<string, unknown>; created_by: string; created_at: string; updated_at: string };
export type TeamMember = { team_id: string; user_id: string; role: TeamRole; created_at: string };

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
  const { data, error } = await client.rpc('create_team', { team_name: name.trim() }).single();
  if (error) throw error;
  return data as Team;
};

export const listTeamMembers = async (teamId: string) => {
  const client = requireClient();
  const { data, error } = await client.from('team_members').select('*').eq('team_id', teamId);
  if (error) throw error;
  return data as TeamMember[];
};

export const subscribeToTeamChanges = (teamId: string, onChange: (payload: unknown) => void): (() => void) => {
  const client = requireClient();
  const channel: RealtimeChannel = client
    .channel(`team:${teamId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fine_types', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fines', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'surcharge_applications', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'balance_movements', filter: `team_id=eq.${teamId}` }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
};
