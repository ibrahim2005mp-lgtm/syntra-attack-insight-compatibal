/**
 * Backend registry — the single place where the active backend is chosen.
 *
 * Selection order:
 *   1. VITE_BACKEND_ID env var ("http" | "demo") — explicit configuration
 *      (or a build-time default baked by the Freebuff/Vly deployment).
 *   2. "http" when VITE_API_BASE_URL is set (a real backend was provided).
 *   3. "demo" otherwise — the app runs fully in-browser, no server required.
 *
 * The registry also supports custom adapters at runtime via registerBackend,
 * so integrations (e.g. a WebSocket transport or a vendor SDK) can be plugged
 * in from src/backend/custom.ts without touching any UI or hook code.
 */
import { createDemoBackend } from "./demoAdapter";
import { createHttpBackend } from "./httpAdapter";
import type { BackendAdapter } from "./types";

const backends = new Map<string, () => BackendAdapter>();

backends.set("demo", createDemoBackend);
backends.set("http", createHttpBackend);

/** Register a custom backend factory (call before first use at startup). */
export function registerBackend(id: string, factory: () => BackendAdapter): void {
  backends.set(id, factory);
}

/** Ids available for selection (useful for diagnostics / settings UI). */
export function availableBackendIds(): string[] {
  return [...backends.keys()];
}

function resolveBackendId(): string {
  const configured = import.meta.env.VITE_BACKEND_ID as string | undefined;
  if (configured && backends.has(configured)) return configured;
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (baseUrl && baseUrl.length > 0) return "http";
  return "demo";
}

let active: BackendAdapter | null = null;

/** The active backend adapter (created lazily, memoized for the session). */
export function getBackend(): BackendAdapter {
  if (active === null) active = backends.get(resolveBackendId())!();
  return active;
}

/**
 * The demo backend, independent of registry selection. Used when the user
 * explicitly enables Fake API mode from the sidebar so the simulated
 * latency/failure behavior is available regardless of configuration.
 */
let demoInstance: BackendAdapter | null = null;
export function getDemoBackend(): BackendAdapter {
  if (demoInstance === null) demoInstance = backends.get("demo")!();
  return demoInstance;
}

export type { BackendAdapter, BackendStatus } from "./types";
