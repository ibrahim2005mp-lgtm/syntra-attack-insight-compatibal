/**
 * Credential validation — frontend hardening layer.
 *
 * Client-side checks give fast, user-friendly feedback before a network
 * round trip. They are convenience checks only: the backend (the active
 * `Password` provider) re-validates the password policy and hashes the
 * secret server-side with Scrypt; the frontend never sees or stores it.
 */
import { SECURITY_CONFIG } from "./securityConfig";

const PASSWORD_POLICY = SECURITY_CONFIG.password;

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

/** Reject control characters that have no place in a typed credential. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export interface CredentialValidation {
  valid: boolean;
  /** Normalized, safe-to-use value (trimmed; passwords are never trimmed). */
  value?: string;
  error?:
    | "empty"
    | "email"
    | "too_long"
    | "too_short"
    | "weak"
    | "mismatch";
}

/** Standardized, non-revealing credential error messages. */
export const CREDENTIAL_ERRORS: Record<
  NonNullable<CredentialValidation["error"]>,
  string
> = {
  empty: "Please fill in all fields.",
  email: "Please enter a valid email address.",
  too_long: "That value is too long.",
  too_short: `Password must be at least ${PASSWORD_POLICY.minLength} characters.`,
  weak: "Password needs at least one uppercase letter, one lowercase letter and one digit.",
  mismatch: "Passwords do not match.",
};

function validateEmail(raw: unknown): CredentialValidation {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { valid: false, error: "empty" };
  }
  const value = raw.trim().toLowerCase();
  if (value.length > 254 || !EMAIL_RE.test(value) || CONTROL_CHARS.test(value)) {
    return { valid: false, error: "email" };
  }
  return { valid: true, value };
}

function validatePassword(raw: unknown): CredentialValidation {
  if (typeof raw !== "string" || raw.length === 0) {
    return { valid: false, error: "empty" };
  }
  if (raw.length > PASSWORD_POLICY.maxLength) {
    return { valid: false, error: "too_long" };
  }
  if (raw.length < PASSWORD_POLICY.minLength) {
    return { valid: false, error: "too_short" };
  }
  if (
    PASSWORD_POLICY.requireMixedCaseAndDigit &&
    (!/[a-z]/.test(raw) || !/[A-Z]/.test(raw) || !/[0-9]/.test(raw))
  ) {
    return { valid: false, error: "weak" };
  }
  return { valid: true, value: raw };
}

export function validateEmailCredential(raw: unknown): CredentialValidation {
  return validateEmail(raw);
}

export function validatePasswordCredential(raw: unknown): CredentialValidation {
  return validatePassword(raw);
}
