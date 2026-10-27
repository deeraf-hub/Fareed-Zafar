/**
 * Free-tier guard rails. Media stays in the browser, so these are mostly
 * about keeping the app responsive and IndexedDB usage sane. The cloud
 * limits apply only if media uploads are enabled in a future release.
 */
export const LIMITS = {
  /** Largest single file that can be imported into the local library. */
  maxImportFileBytes: 500 * 1024 * 1024,
  /** Maximum assets per project. */
  maxAssetsPerProject: 100,
  /** Maximum clips per project. */
  maxClipsPerProject: 400,
  /** Longest sequence that can be exported in one go. */
  maxExportSeconds: 10 * 60,
  /** Longest export resolution edge in pixels. */
  maxExportEdge: 1920,
  /** Maximum number of projects stored locally. */
  maxLocalProjects: 50,
  /** Maximum serialized project size we accept before refusing to save. */
  maxProjectJsonBytes: 2 * 1024 * 1024,

  // --- Reserved for a future cloud-upload feature (not used today) ---
  cloud: {
    maxUploadBytes: 100 * 1024 * 1024,
    maxStoragePerUserBytes: 1024 * 1024 * 1024,
    maxProjectsPerUser: 50,
    maxProcessingSeconds: 10 * 60,
  },
} as const;

export const MIN_CLIP_DURATION = 0.05;
export const SNAP_EPSILON = 1e-3;
