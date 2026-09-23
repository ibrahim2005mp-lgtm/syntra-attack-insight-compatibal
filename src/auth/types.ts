/**
 * Auth adapter contract + shared types.
 *
 * SYNTRA's UI (RequireAuth, Auth page, Sidebar) only depends on the
 * `useAuth()` hook, which reads the auth service selected in ./index.ts.
 * Implement `AuthBackend` to connect a different identity provider
 * (your own REST server, Firebase, Auth0, Cognito, …).
 */
export interface AuthUser {
  /** Stable user id. */
  id: string;
  /** Email — shown in the sidebar; empty for anonymous sessions. */
  email?: string;
  /** Display name when the provider supplies one. */
  name?: string;
}

export type AuthProviderId = "password" | "email-otp" | "anonymous";

/** Sign-in parameters per provider (the Auth page passes these verbatim). */
export type AuthSignInParams =
  | { flow: "signIn" | "signUp"; email: string; password: string } // password
  | { email: string; code?: string } // email-otp (code omitted on first call)
  | Record<string, never>; // anonymous

export interface AuthBackend {
  /** Stable registry id, e.g. "local" | "rest". */
  readonly id: string;
  /** Resolve the current session at startup: user or null. */
  getSession(): Promise<AuthUser | null>;
  /**
   * Sign in / up. Throws an `Error` with a user-safe message on failure —
   * the Auth page renders `error.message` directly.
   */
  signIn(provider: AuthProviderId, params?: AuthSignInParams): Promise<AuthUser>;
  signOut(): Promise<void>;
}
