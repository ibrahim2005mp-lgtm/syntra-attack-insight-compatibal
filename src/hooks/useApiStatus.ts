/**
 * Frontend status for the sidebar "API Status" indicator. With no backend,
 * the UI is always self-served, so the probe reports healthy without any
 * network round-trip. If you reconnect a backend later, restore polling in
 * this hook — the sidebar consumes only the boolean.
 */
export function useApiStatus(): boolean {
  return true;
}
