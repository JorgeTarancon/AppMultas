import { AppData, defaultData, Fine, SurchargeApplication } from './domain';
import { supabase } from './supabase';

type Row = Record<string, any>;

type TeamSettings = Partial<AppData['settings']>;

const requireClient = () => {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
};

const requireUserId = async () => {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('La sesión ha caducado');
  return data.user.id;
};

const query = async (teamId: string, table: string) => {
  const { data, error } = await requireClient().from(table).select('*').eq('team_id', teamId);
  if (error) throw error;
  return (data ?? []) as Row[];
};

const toSettings = (value: unknown, teamName: string): AppData['settings'] => {
  const defaults = defaultData().settings;
  const settings = (value && typeof value === 'object' ? value : {}) as TeamSettings;
  return {
    teamName,
    lateFeesEnabled: typeof settings.lateFeesEnabled === 'boolean' ? settings.lateFeesEnabled : defaults.lateFeesEnabled,
    weeklySurchargeCents: Number.isInteger(settings.weeklySurchargeCents) ? settings.weeklySurchargeCents! : defaults.weeklySurchargeCents,
    surchargePeriodDays: Number.isInteger(settings.surchargePeriodDays) ? settings.surchargePeriodDays! : defaults.surchargePeriodDays,
  };
};

export const loadRemoteData = async (teamId: string): Promise<AppData> => {
  const client = requireClient();
  const [teamResult, players, fineTypes, fines, applications, transactions, balanceMovements] = await Promise.all([
    client.from('teams').select('name,settings').eq('id', teamId).single(),
    query(teamId, 'players'),
    query(teamId, 'fine_types'),
    query(teamId, 'fines'),
    query(teamId, 'surcharge_applications'),
    query(teamId, 'transactions'),
    query(teamId, 'balance_movements'),
  ]);
  if (teamResult.error) throw teamResult.error;
  const applicationsByFine = new Map<string, SurchargeApplication[]>();
  for (const application of applications) {
    const list = applicationsByFine.get(application.fine_id) ?? [];
    list.push({ id: application.id, appliedAt: application.applied_at, amountCents: application.amount_cents, totalAmountCents: application.total_amount_cents });
    applicationsByFine.set(application.fine_id, list);
  }
  return {
    settings: toSettings(teamResult.data.settings, teamResult.data.name),
    players: players.map((player) => ({ id: player.id, name: player.name, active: player.active })),
    fineTypes: fineTypes.map((type) => ({ id: type.id, description: type.description, amountCents: type.amount_cents })),
    fines: fines.map((fine): Fine => ({
      id: fine.id,
      playerId: fine.player_id,
      description: fine.description,
      baseAmountCents: fine.base_amount_cents,
      date: fine.date,
      status: fine.status,
      surchargeWeeks: fine.surcharge_weeks,
      surchargeApplications: applicationsByFine.get(fine.id) ?? [],
      ...(fine.final_amount_cents === null ? {} : { finalAmountCents: fine.final_amount_cents }),
      paidAmountCents: fine.paid_amount_cents,
      ...(fine.paid_at ? { paidAt: fine.paid_at.slice(0, 10) } : {}),
    })),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amountCents: transaction.amount_cents,
      description: transaction.description,
      date: transaction.date,
      createdAt: transaction.created_at,
    })),
    balanceMovements: balanceMovements.map((movement) => ({
      id: movement.id,
      playerId: movement.player_id,
      type: movement.type,
      amountCents: movement.amount_cents,
      description: movement.description,
      date: movement.date,
      createdAt: movement.created_at,
      ...(movement.fine_id ? { fineId: movement.fine_id } : {}),
    })),
  };
};

const deleteMissing = async (teamId: string, table: string, ids: string[]) => {
  const existing = await query(teamId, table);
  const keep = new Set(ids);
  for (const row of existing) {
    if (!keep.has(row.id)) {
      const { error } = await requireClient().from(table).delete().eq('team_id', teamId).eq('id', row.id);
      if (error) throw error;
    }
  }
};

export const saveRemoteData = async (teamId: string, data: AppData) => {
  const client = requireClient();
  const userId = await requireUserId();
  const { error: teamError } = await client.from('teams').update({ name: data.settings.teamName, settings: data.settings, updated_at: new Date().toISOString() }).eq('id', teamId);
  if (teamError) throw teamError;

  await Promise.all([
    deleteMissing(teamId, 'surcharge_applications', data.fines.flatMap((fine) => fine.surchargeApplications.map((application) => application.id))),
    deleteMissing(teamId, 'balance_movements', data.balanceMovements.map((movement) => movement.id)),
    deleteMissing(teamId, 'fines', data.fines.map((fine) => fine.id)),
    deleteMissing(teamId, 'transactions', data.transactions.map((transaction) => transaction.id)),
    deleteMissing(teamId, 'fine_types', data.fineTypes.map((type) => type.id)),
    deleteMissing(teamId, 'players', data.players.map((player) => player.id)),
  ]);

  const writes = [
    client.from('players').upsert(data.players.map((player) => ({ id: player.id, team_id: teamId, name: player.name, active: player.active, updated_at: new Date().toISOString() }))),
    client.from('fine_types').upsert(data.fineTypes.map((type) => ({ id: type.id, team_id: teamId, description: type.description, amount_cents: type.amountCents, updated_at: new Date().toISOString() }))),
    client.from('fines').upsert(data.fines.map((fine) => ({ id: fine.id, team_id: teamId, player_id: fine.playerId, description: fine.description, base_amount_cents: fine.baseAmountCents, date: fine.date, status: fine.status, surcharge_weeks: fine.surchargeWeeks, final_amount_cents: fine.finalAmountCents ?? null, paid_amount_cents: fine.paidAmountCents ?? 0, paid_at: fine.paidAt ?? null, created_by: userId, updated_by: userId, updated_at: new Date().toISOString() }))),
    client.from('surcharge_applications').upsert(data.fines.flatMap((fine) => fine.surchargeApplications.map((application) => ({ id: application.id, team_id: teamId, fine_id: fine.id, applied_at: application.appliedAt, amount_cents: application.amountCents, total_amount_cents: application.totalAmountCents, created_by: userId })))),
    client.from('transactions').upsert(data.transactions.map((transaction) => ({ id: transaction.id, team_id: teamId, type: transaction.type, amount_cents: transaction.amountCents, description: transaction.description, date: transaction.date, created_by: userId, created_at: transaction.createdAt }))),
    client.from('balance_movements').upsert(data.balanceMovements.map((movement) => ({ id: movement.id, team_id: teamId, player_id: movement.playerId, type: movement.type, amount_cents: movement.amountCents, description: movement.description, date: movement.date, fine_id: movement.fineId ?? null, created_by: userId, created_at: movement.createdAt }))),
  ];
  const results = await Promise.all(writes);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
};
