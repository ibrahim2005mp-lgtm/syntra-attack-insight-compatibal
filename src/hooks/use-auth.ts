import { useSyncExternalStore } from "react";

/**
 * Session-only guest identity. The frontend runs without any backend, so a
 * lightweight in-memory session satisfies the protected-route guard for the
 * life of the page. Swap this hook for a real identity provider when you
 * reconnect a backend — the UI (RequireAuth, Auth page, Sidebar) only
 * consumes this hook's return shape.
 */
interface SessionUser {
  id: string;
}

let session: SessionUser | null | undefined;
const listeners = new Set<() => void>();

function getSession(): SessionUser | null {
  if (session === undefined) {
    // Guest session for this page load; nothing persisted or transmitted.
    session = { id: "guest" };
  }
  return session;
}

function getSnapshot(): SessionUser | null {
  return getSession();
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
     * Local session identity: accepts the Auth page's (provider, params)
     * call shape for API parity — every provider resolves to the same
     * in-memory guest session. Nothing is validated, stored or transmitted.
     */
    signIn: async (provider?: string, params?: Record<string, unknown>) => {
      void provider;
      void params;
      return getSession();
    },
    signOut: async () => undefined,
  };
}
