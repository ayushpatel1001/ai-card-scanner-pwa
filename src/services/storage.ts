import type { AppSettings, StoredContact } from '../types/contact';

const DB_NAME = 'CardToContactDB';
const DB_VERSION = 1;
const STORE_CONTACTS = 'contacts';
const SETTINGS_KEY = 'card_to_contact_settings_v2';

const DEFAULT_SETTINGS: AppSettings = {
  openRouterApiKey: '',
  modelId: 'google/gemini-2.5-flash',
  theme: 'dark',
  autoCropAvatar: true,
  avatarSize: 360,
  targetCompressionKb: 500,
  appendCompanyToName: true, // Enabled by default as requested to make incoming calls recognizable
  appendDesignationToName: false,
  nameDisplayFormat: 'parentheses',
};

/**
 * Opens or initializes the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported by your browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
        const store = db.createObjectStore(STORE_CONTACTS, { keyPath: 'id' });
        store.createIndex('fullName', 'fullName', { unique: false });
        store.createIndex('company', 'company', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves or updates a contact in IndexedDB
 */
export async function saveContact(contact: StoredContact): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite');
    const store = tx.objectStore(STORE_CONTACTS);
    const req = store.put(contact);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves multiple contacts in a single transaction
 */
export async function saveContactsBatch(contacts: StoredContact[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite');
    const store = tx.objectStore(STORE_CONTACTS);

    for (const c of contacts) {
      store.put(c);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves all saved contacts, ordered newest first
 */
export async function getAllContacts(): Promise<StoredContact[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readonly');
    const store = tx.objectStore(STORE_CONTACTS);
    const req = store.getAll();

    req.onsuccess = () => {
      const results: StoredContact[] = req.result || [];
      results.sort((a, b) => (b.savedAt || b.createdAt) - (a.savedAt || a.createdAt));
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes a single contact by ID
 */
export async function deleteContact(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite');
    const store = tx.objectStore(STORE_CONTACTS);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clears all stored contacts
 */
export async function clearAllContacts(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite');
    const store = tx.objectStore(STORE_CONTACTS);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Searches stored contacts in real time
 */
export function searchContacts(contacts: StoredContact[], query: string): StoredContact[] {
  const q = query.toLowerCase().trim();
  if (!q) return contacts;

  return contacts.filter((c) => {
    const nameMatch = c.fullName?.toLowerCase().includes(q);
    const compMatch = c.company?.toLowerCase().includes(q);
    const desMatch = c.designation?.toLowerCase().includes(q);
    const emailMatch = c.emails?.some((e) => e.email.toLowerCase().includes(q));
    const phoneMatch = c.phones?.some((p) => p.number.includes(q));
    const notesMatch = c.notes?.toLowerCase().includes(q);

    return nameMatch || compMatch || desMatch || emailMatch || phoneMatch || notesMatch;
  });
}

/**
 * Settings persistence via localStorage
 */
export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('Could not load settings from localStorage:', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}
