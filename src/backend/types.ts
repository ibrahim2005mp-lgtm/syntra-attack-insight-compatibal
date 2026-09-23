/**
 * Backend adapter contract.
 *
 * The frontend never talks to a specific backend implementation directly.
 * Everything flows through an adapter satisfying this interface, so the same
 * UI can run against the in-browser demo backend, a REST API, or any custom
 * integration registered at runtime (see ./index.ts).
 *
 * Adapters return raw payloads; `services/api.ts` owns validation,
 * sanitization and error normalization on top of them.
 */
import type { HistoryItem, Investigation, Thread } from "@/types/investigation";

export interface BackendStatus {
  ok: boolean;
  corpusEntries: number;
  safetyRules: number;
}

export interface BackendAdapter {
  /** Stable registry id, e.g. "demo" | "http". */
  readonly id: string;
  /** Human-readable name for diagnostics. */
  readonly label: string;
  /** Run an investigation (new thread when `threadId` is omitted). */
  investigate(question: string, threadId?: string): Promise<Investigation>;
  /** Load a full conversation; resolves null when the thread does not exist. */
  getThread(threadId: string): Promise<Thread | null>;
  /** Sidebar list: one entry per thread (newest turn as representative). */
  listThreads(): Promise<HistoryItem[]>;
  renameThread(id: string, title: string): Promise<void>;
  setThreadPinned(id: string, pinned: boolean): Promise<void>;
  setThreadArchived(id: string, archived: boolean): Promise<void>;
  deleteThread(id: string): Promise<void>;
  /** Lightweight health probe used by the API Status indicator. */
  status(): Promise<BackendStatus>;
}
