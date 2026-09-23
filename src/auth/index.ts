/**
 * Auth service — the single place where the active auth backend is chosen,
 * plus a tiny reactive session store for React consumption.
 *
 * Selection:
 *   - VITE_AUTH_BACKEND_ID env var (e.g. "rest" for src/auth/restBackend.ts),
 *   - registerAuthBackend for custom providers at startup,
 *   - "local" (guest session) as the default.
 *
 * UI code uses `useAuth()` (src/hooks/use-auth.ts); it never imports an
 * auth backend directly.
 */
import { createLocalAuthBackend } from "./localBackend";
import { createRestAuthBackend } from "./restBackend";
import type { AuthBackend, AuthUser } from "./types";

const backends = new Map<string, () => AuthBackend>();

backends.set("local", createLocalAuthBackend);
backends.set("rest", createRestAuthBackend);

/** Register a custom auth backend factory (call at startup). */
export function registerAuthBackend(id: string, factory: () => AuthBackend): void {
  backends.set(id, factory);
}

function resolveAuthBackend(): AuthBackend {
  const configured = import.meta.env.VITE_AUTH_BACKEND_ID as string | undefined;
  if (configured && backends.has(configured)) return backends.get(configured)!();
  return backends.get("local")!();
}

let activeAuth: AuthBackend | null = null;
let activeAuthWarned = false;

/** The active auth backend (memoized). */
export function getAuthBackend(): AuthBackend {
  if (activeAuth === null) {
    const configured = import.meta.env.VITE_AUTH_BACKEND_ID as string | undefined;
    if (configured && !backends.has(configured) && !activeAuthWarned) {
      activeAuthWarned = true;
      console.warn(`[syntra] Unknown auth backend "${configured}" — using local sessions.`);
    }
    activeAuth = resolveAuthBackend();
  }
  return activeAuth;
}

/* --------------------------- reactive store --------------------------- */

type Listener = () => void;
type SessionState = { status: "loading" } | { status: "ready"; user: AuthUser | null };

let state: SessionState = { status: "loading" };
const listeners = new Set<Listener>();

function setState(next: SessionState): void {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Resolve the session once at startup (idempotent; safe in StrictMode). */
let sessionStarted = false;
export function initAuthSession(): void {
  if (sessionStarted) return;
  sessionStarted = true;
  const backend = getAuthBackend();
  backend
    .getSession()
    .then((user) => setState({ status: "ready", user }))
    .catch(() => setState({ status: "ready", user: null }));
}

/** Sign in through the active backend; updates the reactive store. */
export async function signIn(
  provider: Parameters<AuthBackend["signIn"]>[0],
  params?: Parameters<AuthBackend["signIn"]>[1],
): Promise<AuthUser> {
  const user = await getAuthBackend().signIn(provider, params);
  setState({ status: "ready", user });
  return user;
}

/** Sign out through the active backend; updates the reactive store. */
export async function signOut(): Promise<void> {
  await getAuthBackend().signOut();
  setState({ status: "ready", user: null });
}

/** Current snapshot for useSyncExternalStore. */
export function getAuthSnapshot(): SessionState {
  return state;
}

/** Subscribe helper used by the React hook. */
export function subscribeToAuth(listener: Listener): () => void {
  return subscribe(listener);
}

export type { AuthBackend, AuthUser } from "./types";
