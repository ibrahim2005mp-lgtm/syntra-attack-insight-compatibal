/// <reference types="vite/client" />

/**
 * Frontend environment variables. Only VITE_-prefixed values are exposed to
 * the browser — server secrets (retrieval, LLM, database credentials) must
 * never be placed here; they belong to the backend service.
 */
interface ImportMetaEnv {
  /**
   * Base URL of the SYNTRA backend API (e.g. "https://api.example.com").
   * When unset, the app runs on the local session engine and no network
   * calls are made.
   */
  readonly VITE_API_BASE_URL?: string;
  /** Optional webhook endpoint for fire-and-forget welcome notifications. */
  readonly VITE_WELCOME_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
