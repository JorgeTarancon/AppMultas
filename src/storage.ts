import { AppData, BalanceMovement, defaultData, Fine, Player, FineType, Settings, SurchargeApplication, Transaction } from './domain';

const DB_NAME = 'cuenta-clara';
const STORE = 'app';

const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const load = async (): Promise<AppData> => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get('data');
    request.onsuccess = () => resolve(normalizeData(request.result));
    request.onerror = () => reject(request.error);
  });
};

export const save = async (data: AppData) => {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, 'data');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const positiveInteger = (value: unknown, fallback: number) => Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
const nonNegativeInteger = (value: unknown, fallback: number) => Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;

const normalizeApplication = (value: unknown): SurchargeApplication | null => {
  if (!isRecord(value) || typeof value.appliedAt !== 'string') return null;
  const amountCents = nonNegativeInteger(value.amountCents, -1);
  const totalAmountCents = nonNegativeInteger(value.totalAmountCents, -1);
  return amountCents >= 0 && totalAmountCents >= 0 ? { id: typeof value.id === 'string' ? value.id : crypto.randomUUID(), appliedAt: value.appliedAt, amountCents, totalAmountCents } : null;
};

const normalizeFine = (value: unknown): Fine | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.playerId !== 'string' || typeof value.description !== 'string' || typeof value.date !== 'string') return null;
  if (value.status !== 'pending' && value.status !== 'paid') return null;
  const baseAmountCents = nonNegativeInteger(value.baseAmountCents, -1);
  if (baseAmountCents < 0) return null;
  const applications = Array.isArray(value.surchargeApplications) ? value.surchargeApplications.map(normalizeApplication).filter((entry): entry is SurchargeApplication => entry !== null) : [];
  return {
    id: value.id,
    playerId: value.playerId,
    description: value.description,
    baseAmountCents,
    date: value.date,
    status: value.status,
    surchargeWeeks: nonNegativeInteger(value.surchargeWeeks, 0),
    surchargeApplications: applications,
    ...(typeof value.finalAmountCents === 'number' ? { finalAmountCents: value.finalAmountCents } : {}),
    ...(typeof value.paidAmountCents === 'number' ? { paidAmountCents: value.paidAmountCents } : {}),
    ...(typeof value.paidAt === 'string' ? { paidAt: value.paidAt } : {}),
  };
};

const normalizeTransaction = (value: unknown): Transaction | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || (value.type !== 'income' && value.type !== 'expense') || typeof value.description !== 'string' || typeof value.date !== 'string' || typeof value.createdAt !== 'string') return null;
  const amountCents = nonNegativeInteger(value.amountCents, -1);
  return amountCents > 0 && value.description.trim()
    ? { id: value.id, type: value.type, amountCents, description: value.description.trim(), date: value.date, createdAt: value.createdAt }
    : null;
};

const normalizeData = (value: unknown): AppData => {
  const defaults = defaultData();
  if (!isRecord(value)) return defaults;
  const rawSettings = isRecord(value.settings) ? value.settings : {};
  const settings: Settings = {
    teamName: typeof rawSettings.teamName === 'string' ? rawSettings.teamName : defaults.settings.teamName,
    lateFeesEnabled: typeof rawSettings.lateFeesEnabled === 'boolean' ? rawSettings.lateFeesEnabled : defaults.settings.lateFeesEnabled,
    weeklySurchargeCents: nonNegativeInteger(rawSettings.weeklySurchargeCents, defaults.settings.weeklySurchargeCents),
    surchargePeriodDays: positiveInteger(rawSettings.surchargePeriodDays, defaults.settings.surchargePeriodDays),
  };
  const players = Array.isArray(value.players) ? value.players as Player[] : [];
  const fineTypes = Array.isArray(value.fineTypes) ? value.fineTypes as FineType[] : [];
  const fines = Array.isArray(value.fines) ? value.fines.map(normalizeFine).filter((entry): entry is Fine => entry !== null) : [];
  const transactions = Array.isArray(value.transactions) ? value.transactions.map(normalizeTransaction).filter((entry): entry is Transaction => entry !== null) : [];
  const balanceMovements = Array.isArray(value.balanceMovements) ? value.balanceMovements.map(normalizeBalanceMovement).filter((entry): entry is BalanceMovement => entry !== null) : [];
  return { settings, players, fineTypes, fines, transactions, balanceMovements };
};

const normalizeBalanceMovement = (value: unknown): BalanceMovement | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.playerId !== 'string' || (value.type !== 'deposit' && value.type !== 'consumption') || typeof value.description !== 'string' || typeof value.date !== 'string' || typeof value.createdAt !== 'string') return null;
  const amountCents = nonNegativeInteger(value.amountCents, -1);
  if (amountCents <= 0 || !value.description.trim()) return null;
  return { id: value.id, playerId: value.playerId, type: value.type, amountCents, description: value.description.trim(), date: value.date, createdAt: value.createdAt, ...(typeof value.fineId === 'string' ? { fineId: value.fineId } : {}) };
};