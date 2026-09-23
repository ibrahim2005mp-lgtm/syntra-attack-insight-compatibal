/**
 * REST auth backend — connect SYNTRA to your own identity API.
 *
 * Expected endpoints (all JSON, cookie/bearer session managed by your
 * server):
 *
 *   GET  /auth/session → { user } | { user: null } | 401
 *   POST /auth/sign-in { provider, ...params } → { user }
 *   POST /auth/sign-out → 204
 *
 * Enable it with VITE_AUTH_BACKEND_ID=rest.
 *
 * Token forwarding: the REST data adapter (src/backend/httpAdapter.ts) sends
 * whatever `getTokenProvider()` returns as its bearer token. If your data
 * API authenticates with the same session, implement `getTokenProvider`
 * to return that token and wire it via `setHttpTokenProvider` from
 * src/backend/httpAdapter.ts.
 */
import type { AuthBackend, AuthSignInParams, AuthProviderId, AuthUser } from "./types";

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

/** Optional hook your integration sets so the data adapter can attach tokens. */
export function getTokenProvider(): string | null {
  // Replace with real token retrieval for your identity system, e.g.:
  //   return window.localStorage.getItem("my-app.token");
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Incorrect email or password.");
    throw new Error("Sign-in could not be completed. Please try again.");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function toUser(raw: unknown): AuthUser {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Sign-in could not be completed. Please try again.");
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") {
    throw new Error("Sign-in could not be completed. Please try again.");
  }
  return {
    id: r.id,
    email: typeof r.email === "string" ? r.email : undefined,
    name: typeof r.name === "string" ? r.name : undefined,
  };
}

export function createRestAuthBackend(): AuthBackend {
  return {
    id: "rest",

    async getSession(): Promise<AuthUser | null> {
      try {
        const raw = await request<{ user: unknown }>("/auth/session");
        return raw.user === null ? null : toUser(raw.user);
      } catch {
        return null;
      }
    },

    async signIn(provider: AuthProviderId, params: AuthSignInParams = {}): Promise<AuthUser> {
      const raw = await request<{ user: unknown }>("/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ provider, ...params }),
      });
      return toUser(raw.user);
    },

    async signOut(): Promise<void> {
      await request<void>("/auth/sign-out", { method: "POST" });
    },
  };
}
