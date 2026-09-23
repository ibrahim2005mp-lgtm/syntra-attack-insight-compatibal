import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import {
  getAuthSnapshot,
  initAuthSession,
  signIn as authSignIn,
  signOut as authSignOut,
  subscribeToAuth,
} from "@/auth";

/**
 * Auth hook — the only auth surface UI components consume.
 *
 * Backed by the pluggable auth service (src/auth): the session is resolved
 * once at startup through the active AuthBackend (local guest session by
 * default, or any registered/selected provider). Swap backends via
 * VITE_AUTH_BACKEND_ID without touching this hook or any component.
 */
export function useAuth() {
  // Kick off session resolution (idempotent; resolves once per page load).
  useEffect(() => {
    initAuthSession();
  }, []);

  const snapshot = useSyncExternalStore(subscribeToAuth, getAuthSnapshot);

  const isLoading = snapshot.status === "loading";
  const isAuthenticated = snapshot.status === "ready" && snapshot.user !== null;
  const user = snapshot.status === "ready" ? snapshot.user : null;

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn: authSignIn,
    signOut: authSignOut,
  };
}
