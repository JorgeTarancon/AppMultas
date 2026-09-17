export type Settings = {
  teamName: string;
  lateFeesEnabled: boolean;
  weeklySurchargeCents: number;
  surchargePeriodDays: number;
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
  surchargeApplications: SurchargeApplication[];
  finalAmountCents?: number;
  paidAt?: string;
};

export type SurchargeApplication = {
  appliedAt: string;
  amountCents: number;
  totalAmountCents: number;
};

export type AppData = { settings: Settings; players: Player[]; fineTypes: FineType[]; fines: Fine[] };

export const defaultData = (): AppData => ({
  settings: { teamName: 'Mi equipo', lateFeesEnabled: true, weeklySurchargeCents: 200, surchargePeriodDays: 7 },
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
export const formatDate = (value: string) => new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateAtUtcNoon(value));

export const weeksDue = (fineDate: string, reference = today()) => {
  const start = new Date(`${fineDate}T12:00:00`).getTime();
  const end = new Date(`${reference}T12:00:00`).getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000 / 7));
};

const dateOnly = (value: string) => value.slice(0, 10);
const dateAtUtcNoon = (value: string) => new Date(`${dateOnly(value)}T12:00:00Z`);

export const daysElapsed = (start: string, end = today()) => {
  const startTime = dateAtUtcNoon(start).getTime();
  const endTime = dateAtUtcNoon(end).getTime();
  return Math.max(0, Math.floor((endTime - startTime) / 86_400_000));
};

export const surchargeCount = (fine: Fine) => fine.surchargeWeeks + fine.surchargeApplications.length;
export const lastSurchargeDate = (fine: Fine) => fine.surchargeApplications.at(-1)?.appliedAt ?? fine.date;
export const isSurchargeDue = (fine: Fine, settings: Settings, reference = today()) => (
  fine.status === 'pending'
  && settings.lateFeesEnabled
  && Number.isInteger(settings.surchargePeriodDays)
  && settings.surchargePeriodDays > 0
  && daysElapsed(lastSurchargeDate(fine), reference) >= settings.surchargePeriodDays
);

export const currentAmount = (fine: Fine, settings: Settings, reference = today()) => {
  if (fine.status === 'paid' && fine.finalAmountCents !== undefined) return fine.finalAmountCents;
  const appliedAmount = fine.surchargeApplications.reduce((sum, application) => sum + application.amountCents, 0);
  return fine.baseAmountCents + fine.surchargeWeeks * settings.weeklySurchargeCents + appliedAmount;
};

export const refreshSurcharges = (data: AppData): AppData => data;

export const applySurcharge = (data: AppData, fineId: string, appliedAt = new Date().toISOString()): AppData | null => {
  const fine = data.fines.find((entry) => entry.id === fineId);
  if (!fine || !isSurchargeDue(fine, data.settings, dateOnly(appliedAt))) return null;
  const amountCents = data.settings.weeklySurchargeCents;
  const application: SurchargeApplication = {
    appliedAt,
    amountCents,
    totalAmountCents: currentAmount(fine, data.settings) + amountCents,
  };
  return {
    ...data,
    fines: data.fines.map((entry) => entry.id === fineId
      ? { ...entry, surchargeApplications: [...entry.surchargeApplications, application] }
      : entry),
  };
};

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