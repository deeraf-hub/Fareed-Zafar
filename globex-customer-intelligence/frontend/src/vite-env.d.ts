/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API (no trailing slash). Empty means relative "/api" requests. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
