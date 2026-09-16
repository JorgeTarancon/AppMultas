import { AppData, defaultData } from './domain';

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
    request.onsuccess = () => resolve(request.result ?? defaultData());
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