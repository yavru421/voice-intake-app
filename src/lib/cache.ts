export interface IntakeStepDraft {
  stepId: number;
  title: string;
  transcript: string;
  notes: string;
  audioBlobUrl?: string;
  updatedAt: string;
}

const DB_NAME = 'DondlingerIntakeCache';
const STORE_NAME = 'step_drafts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'stepId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStepDraft(draft: IntakeStepDraft): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(draft);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to LocalStorage', err);
    localStorage.setItem(`intake_step_${draft.stepId}`, JSON.stringify(draft));
  }
}

export async function loadAllDrafts(): Promise<Record<number, IntakeStepDraft>> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result: IntakeStepDraft[] = request.result || [];
        const map: Record<number, IntakeStepDraft> = {};
        result.forEach((d) => (map[d.stepId] = d));
        resolve(map);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB load failed, falling back to LocalStorage', err);
    const map: Record<number, IntakeStepDraft> = {};
    [1, 2, 3, 4].forEach((stepId) => {
      const raw = localStorage.getItem(`intake_step_${stepId}`);
      if (raw) {
        try {
          map[stepId] = JSON.parse(raw);
        } catch (e) {}
      }
    });
    return map;
  }
}

export async function clearAllDrafts(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (err) {
    [1, 2, 3, 4].forEach((stepId) => localStorage.removeItem(`intake_step_${stepId}`));
  }
}
