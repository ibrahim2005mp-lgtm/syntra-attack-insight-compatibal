/**
 * SYNTRA frontend security configuration.
 *
 * This layer is a HARDENING layer only. It reduces common client-side risks
 * (XSS, dangerous URLs, malformed input). It does NOT replace backend
 * security: authentication, authorization, rate limiting and server-side
 * validation are enforced by the backend (the active backend adapter).
 */

export const SECURITY_CONFIG = {
  /** Max characters accepted for an investigation question. */
  maxQuestionLength: 600,
  /** Minimum useful question length. */
  minQuestionLength: 4,
  /** Max evidence excerpt length rendered anywhere in the UI. */
  maxExcerptLength: 600,
  /** Max stored/displayed question length (defense against oversized fields). */
  maxDisplayLength: 2000,
  /** Password policy for local (email + password) accounts. */
  password: {
    minLength: 8,
    maxLength: 128,
    /** Must contain at least one lowercase letter, one uppercase letter and one digit. */
    requireMixedCaseAndDigit: true,
  },
} as const;

/**
 * Allowlist of external domains SYNTRA may link to as evidence sources.
 * Anything outside this list is not rendered as a clickable link.
 * Keep this list in sync with real source registries (MITRE, CISA, NVD...).
 */
export const ALLOWED_SOURCE_DOMAINS: readonly string[] = [
  "attack.mitre.org",
  "cve.mitre.org",
  "nvd.nist.gov",
  "cisa.gov",
  "www.cisa.gov",
  "capec.mitre.org",
  "cwe.mitre.org",
  "first.org",
  "mitre.org",
  "mandiant.com",
  "crowdstrike.com",
  "recordedfuture.com",
];

/** Internal route prefixes the app may navigate to. */
export const INTERNAL_ROUTES: readonly string[] = [
  "/",
  "/investigate",
  "/history",
  "/about",
  "/technical",
  "/auth",
  "/dashboard",
];
