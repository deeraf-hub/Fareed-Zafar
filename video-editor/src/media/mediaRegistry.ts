/**
 * Runtime registry of media Blobs and their object URLs. Lives outside the
 * Zustand store because Blobs/URLs are not serialisable project data.
 */
export interface RegisteredMedia {
  blob: Blob;
  url: string;
}

const entries = new Map<string, RegisteredMedia>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export const mediaRegistry = {
  register(assetId: string, blob: Blob): RegisteredMedia {
    const existing = entries.get(assetId);
    if (existing) return existing;
    const entry = { blob, url: URL.createObjectURL(blob) };
    entries.set(assetId, entry);
    notify();
    return entry;
  },
  get(assetId: string): RegisteredMedia | undefined {
    return entries.get(assetId);
  },
  has(assetId: string): boolean {
    return entries.has(assetId);
  },
  release(assetId: string): void {
    const e = entries.get(assetId);
    if (e) {
      URL.revokeObjectURL(e.url);
      entries.delete(assetId);
      notify();
    }
  },
  clear(): void {
    for (const id of [...entries.keys()]) mediaRegistry.release(id);
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Snapshot for React's useSyncExternalStore. */
  version: 0,
};

listeners.add(() => {
  mediaRegistry.version++;
});
