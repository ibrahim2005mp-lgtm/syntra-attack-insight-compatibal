import { useSyncExternalStore } from "react";

/**
 * Session-only local identity. The frontend runs without any backend, so a
 * lightweight in-memory session gates the protected routes and gives the
 * Auth page a working (purely local) flow. Nothing is validated, persisted
 * or transmitted — swap this hook for a real identity provider when you
 * reconnect a backend; the UI (RequireAuth, Auth page, Sidebar) only
 * consumes this hook's return shape.
 *
 * Behavior:
 *  - starts signed-out (so RequireAuth redirects to /auth as designed)
 *  - password / guest sign-in creates the session immediately
 *  - email-OTP is two-step: requesting a code does NOT sign in; submitting
 *    the code does (matching the UI's code-entry step)
 */
interface SessionUser {
  id: string;
}

let session: SessionUser | null = null;
const listeners = new Set<() => void>();

function setSession(next: SessionUser | null): void {
  session = next;
  for (const listener of listeners) listener();
}

function getSnapshot(): SessionUser | null {
  return session;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getSnapshot);

  return {
    isLoading: false,
    isAuthenticated: user !== null,
    user,
    /**
     * Local sign-in: accepts the Auth page's (provider, params) call shape.
     * Every provider resolves to the same in-memory guest session; the
     * email-OTP first step (no code yet) intentionally signs nobody in.
     */
    signIn: async (provider?: string, params?: Record<string, unknown>) => {
      const code = params && "code" in params ? params.code : undefined;
      if (provider === "email-otp" && typeof code !== "string") {
        // Code requested but not verified yet — keep the session signed out
        // so the Auth page can show its code-entry step.
        return null;
      }
      const current = session;
      if (current !== null) return current;
      const next: SessionUser = { id: "guest" };
      setSession(next);
      return next;
    },
    signOut: async () => {
      setSession(null);
    },
  };
}
