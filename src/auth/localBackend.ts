/**
 * Local auth backend — minimal session auth for standalone frontend use.
 *
 * The frontend is designed for backend pluggability: when no real identity
 * provider is configured, this backend keeps a lightweight guest session in
 * sessionStorage so the protected workspace works out of the box. All
 * providers are accepted as local sessions; no credentials are stored or
 * transmitted anywhere.
 *
 * Replace it via VITE_AUTH_BACKEND_ID (e.g. "rest" for your own server, or
 * register a custom AuthBackend in src/auth/index.ts) when you wire a real
 * identity provider.
 */
import type { AuthBackend, AuthUser } from "./types";

const SESSION_KEY = "syntra.auth.session";

let cachedSession: AuthUser | null | undefined;

function readSession(): AuthUser | null {
  if (cachedSession !== undefined) return cachedSession;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    cachedSession = raw === null ? null : (JSON.parse(raw) as AuthUser);
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

function writeSession(user: AuthUser | null): void {
  cachedSession = user;
  try {
    if (user === null) window.sessionStorage.removeItem(SESSION_KEY);
    else window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // Storage unavailable: session applies to this page load only.
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `guest-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
}

export function createLocalAuthBackend(): AuthBackend {
  return {
    id: "local",

    async getSession(): Promise<AuthUser | null> {
      return readSession();
    },

    async signIn(): Promise<AuthUser> {
      // Local session: any provider is accepted as-is. A backend that
      // verifies credentials would validate its `params` here and throw a
      // user-safe Error on failure.
      const existing = readSession();
      if (existing) return existing;
      const user: AuthUser = { id: newId() };
      writeSession(user);
      return user;
    },

    async signOut(): Promise<void> {
      writeSession(null);
    },
  };
}
