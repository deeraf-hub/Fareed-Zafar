/**
 * IndexedDB storage (via `idb`). Two concerns live here:
 *  - `projects`: project JSON for local mode and as the autosave/recovery
 *    cache in cloud mode.
 *  - `media`: imported file Blobs keyed by asset id. This is what keeps
 *    "your media never leaves the browser" true while still surviving a
 *    page reload.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project } from '@/types/project';

interface StoredProject {
  id: string;
  data: Project;
  updatedAt: number;
  /** Set when the local copy has changes the cloud has not received. */
  dirty: boolean;
  ownerId: string | null;
}

interface StoredMedia {
  id: string;
  blob: Blob;
  name: string;
  size: number;
  type: string;
}

interface FramewrightDB extends DBSchema {
  projects: { key: string; value: StoredProject; indexes: { 'by-updated': number } };
  media: { key: string; value: StoredMedia };
  kv: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<FramewrightDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<FramewrightDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FramewrightDB>('framewright', 1, {
      upgrade(db) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('by-updated', 'updatedAt');
        db.createObjectStore('media', { keyPath: 'id' });
        db.createObjectStore('kv');
      },
    });
  }
  return dbPromise;
}

export const localDb = {
  async putProject(project: Project, opts: { dirty?: boolean; ownerId?: string | null } = {}): Promise<void> {
    const db = await getDb();
    const existing = await db.get('projects', project.id);
    await db.put('projects', {
      id: project.id,
      data: project,
      updatedAt: project.updatedAt,
      dirty: opts.dirty ?? existing?.dirty ?? false,
      ownerId: opts.ownerId ?? existing?.ownerId ?? null,
    });
  },
  async getProject(id: string): Promise<StoredProject | undefined> {
    const db = await getDb();
    return db.get('projects', id);
  },
  async listProjects(): Promise<StoredProject[]> {
    const db = await getDb();
    const all = await db.getAll('projects');
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteProject(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('projects', id);
  },
  async markClean(id: string): Promise<void> {
    const db = await getDb();
    const row = await db.get('projects', id);
    if (row && row.dirty) await db.put('projects', { ...row, dirty: false });
  },

  async putMedia(id: string, blob: Blob, name: string): Promise<void> {
    const db = await getDb();
    await db.put('media', { id, blob, name, size: blob.size, type: blob.type });
  },
  async getMedia(id: string): Promise<StoredMedia | undefined> {
    const db = await getDb();
    return db.get('media', id);
  },
  async deleteMedia(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('media', id);
  },
  async listMediaKeys(): Promise<string[]> {
    const db = await getDb();
    return db.getAllKeys('media');
  },
  async mediaUsage(): Promise<number> {
    const db = await getDb();
    let total = 0;
    let cursor = await db.transaction('media').store.openCursor();
    while (cursor) {
      total += cursor.value.size;
      cursor = await cursor.continue();
    }
    return total;
  },

  async getKv<T>(key: string): Promise<T | undefined> {
    const db = await getDb();
    return (await db.get('kv', key)) as T | undefined;
  },
  async setKv(key: string, value: unknown): Promise<void> {
    const db = await getDb();
    await db.put('kv', value, key);
  },
};

export type { StoredProject, StoredMedia };
