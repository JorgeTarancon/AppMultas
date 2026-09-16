export type Settings = {
  teamName: string;
  lateFeesEnabled: boolean;
  weeklySurchargeCents: number;
};

export type Player = { id: string; name: string; active: boolean };
export type FineType = { id: string; description: string; amountCents: number };
export type Fine = {
  id: string;
  playerId: string;
  description: string;
  baseAmountCents: number;
  date: string;
  status: 'pending' | 'paid';
  surchargeWeeks: number;
  finalAmountCents?: number;
  paidAt?: string;
};

export type AppData = { settings: Settings; players: Player[]; fineTypes: FineType[]; fines: Fine[] };

export const defaultData = (): AppData => ({
  settings: { teamName: 'Mi equipo', lateFeesEnabled: true, weeklySurchargeCents: 200 },
  players: [],
  fineTypes: [],
  fines: [],
});

export const today = () => new Date().toISOString().slice(0, 10);
export const euros = (cents: number) => `${(cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
export const parseAmount = (value: string) => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized || !Number.isFinite(Number(normalized)) || Number(normalized) <= 0) return null;
  return Math.round(Number(normalized) * 100);
};
export const formatDate = (value: string) => new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

export const weeksDue = (fineDate: string, reference = today()) => {
  const start = new Date(`${fineDate}T12:00:00`).getTime();
  const end = new Date(`${reference}T12:00:00`).getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000 / 7));
};

export const currentAmount = (fine: Fine, settings: Settings, reference = today()) => {
  if (fine.status === 'paid' && fine.finalAmountCents !== undefined) return fine.finalAmountCents;
  const weeks = settings.lateFeesEnabled && fine.status === 'pending' ? weeksDue(fine.date, reference) : fine.surchargeWeeks;
  return fine.baseAmountCents + Math.max(fine.surchargeWeeks, weeks) * settings.weeklySurchargeCents;
};

export const refreshSurcharges = (data: AppData, reference = today()): AppData => ({
  ...data,
  fines: data.fines.map((fine) => ({
    ...fine,
    surchargeWeeks: fine.status === 'pending' && data.settings.lateFeesEnabled
      ? Math.max(fine.surchargeWeeks, weeksDue(fine.date, reference))
      : fine.surchargeWeeks,
  })),
});

export const summary = (data: AppData) => {
  const activeFines = data.fines;
  const pending = activeFines.filter((fine) => fine.status === 'pending');
  const paid = activeFines.filter((fine) => fine.status === 'paid');
  const ranking = data.players.map((player) => ({
    player,
    amount: paid.filter((fine) => fine.playerId === player.id).reduce((sum, fine) => sum + currentAmount(fine, data.settings), 0),
  })).filter((entry) => entry.amount > 0).sort((a, b) => b.amount - a.amount);
  return {
    pendingCents: pending.reduce((sum, fine) => sum + currentAmount(fine, data.settings), 0),
    paidCents: paid.reduce((sum, fine) => sum + currentAmount(fine, data.settings), 0),
    ranking,
  };
};

export const whatsappMessage = (data: AppData) => {
  const pending = data.fines.filter((fine) => fine.status === 'pending');
  const grouped = data.players.map((player) => ({
    player,
    fines: pending.filter((fine) => fine.playerId === player.id).sort((a, b) => a.date.localeCompare(b.date)),
  })).filter((group) => group.fines.length > 0).sort((a, b) => a.player.name.localeCompare(b.player.name));
  const lines = [`*${data.settings.teamName} · multas pendientes*`, ''];
  for (const group of grouped) {
    const total = group.fines.reduce((sum, fine) => sum + currentAmount(fine, data.settings), 0);
    lines.push(`*${group.player.name}*`);
    group.fines.forEach((fine) => lines.push(`- ${formatDate(fine.date)} · ${fine.description}: ${euros(currentAmount(fine, data.settings))}`));
    lines.push(`Total ${group.player.name}: ${euros(total)}`, '');
  }
  const totals = summary(data);
  lines.push(`*Total pendiente: ${euros(totals.pendingCents)}*`, `Total recaudado históricamente: ${euros(totals.paidCents)}`);
  return lines.join('\n');
};

export const uid = () => crypto.randomUUID();