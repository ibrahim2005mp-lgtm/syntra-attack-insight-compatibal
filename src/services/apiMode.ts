/**
 * API mode selection.
 *
 * "real" → requests go to the configured backend adapter (default).
 * "fake" → requests are forced through the in-browser demo backend with
 *          simulated latency, history and failure cases, for testing.
 *
 * The flag is a non-sensitive UI preference, so localStorage use here is
 * acceptable under the security layer's storage rules.
 */
const STORAGE_KEY = "syntra.apiMode";

export function isFakeApiEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "fake";
  } catch {
    return false;
  }
}

export function setFakeApiEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "fake" : "real");
  } catch {
    // Storage unavailable (e.g. private mode): mode applies to this session only.
  }
}
