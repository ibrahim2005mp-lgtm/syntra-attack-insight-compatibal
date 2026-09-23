/**
 * Centralized API client for SYNTRA.
 *
 * All backend communication goes through this module — UI components never
 * touch backend adapters, transports or databases directly. One contract,
 * pluggable transports selected in src/backend:
 *
 *  - demo: in-browser backend with simulated latency and failure triggers
 *          (default when no real backend is configured)
 *  - http: REST adapter for custom backends (VITE_API_BASE_URL)
 *  - any custom adapter registered via `registerBackend` in src/backend
 *
 * Every payload passes through the frontend security layer before it leaves
 * the browser, and every response is sanitized before it is handed to the UI
 * (backend output is treated as untrusted data on every transport).
 *
 * Conversations: a question is either the start of a new thread or a
 * follow-up inside an existing one (pass `threadId`). The client never
 * fabricates thread membership — the backend resolves it.
 */
import { getBackend, getDemoBackend } from "@/backend";
import {
  clampDisplayText,
  validateInvestigationQuestion,
  validateInvestigationTitle,
} from "@/security/inputValidation";
import { sanitizeInvestigation, sanitizeThread } from "./responseSanitizers";
import type { HistoryItem, Investigation, Thread } from "@/types/investigation";
import { mapApiError } from "./apiErrors";
import { isFakeApiEnabled } from "./apiMode";

/**
 * Run an investigation. Validates the question through the frontend security
 * layer before sending; the backend re-validates independently. Pass
 * `threadId` to append the question to an existing conversation.
 */
export async function investigateQuestion(
  question: string,
  threadId?: string,
): Promise<Investigation> {
  const validation = validateInvestigationQuestion(question);
  if (!validation.valid) {
    const messages: Record<string, string> = {
      empty: "Please enter an investigation question.",
      too_short: "The question is too short to investigate.",
      too_long: "The question exceeds the maximum length of 600 characters.",
      invalid_characters: "The question contains characters that are not supported.",
      suspicious: "This input cannot be processed as a question.",
    };
    throw Object.assign(new Error(messages[validation.error ?? "empty"] ?? "Invalid input."), {
      kind: "validation",
    });
  }

  const cleaned = validation.value!;
  const continuation =
    typeof threadId === "string" && threadId.length > 0 ? threadId : undefined;

  try {
    // All transports share one pipeline; the demo transport additionally
    // provides simulated latency and failure triggers when explicitly
    // enabled from the sidebar.
    const backend = isFakeApiEnabled() ? getDemoBackend() : getBackend();
    const raw = await backend.investigate(cleaned, continuation);
    const investigation = sanitizeInvestigation(raw);
    if (investigation === null) {
      throw new Error("temporary");
    }
    return investigation;
  } catch (error) {
    throw mapApiError(error);
  }
}

/**
 * Load a full conversation thread (every turn, oldest first). Any turn id
 * works — the backend resolves it to the thread root.
 */
export async function getThread(threadId: string): Promise<Thread | null> {
  try {
    const backend = getBackend();
    const raw = await backend.getThread(threadId);
    if (raw === null) return null;
    return sanitizeThread(raw);
  } catch {
    // Malformed ids or missing records degrade to "not found", not errors.
    return null;
  }
}

/**
 * Rename a conversation thread. Validates through the frontend security
 * layer first; the backend re-validates independently.
 */
export async function renameThread(id: string, title: string): Promise<string> {
  const validation = validateInvestigationTitle(title);
  if (!validation.valid || validation.value === undefined) {
    const messages: Record<string, string> = {
      empty: "Please enter a title.",
      too_long: "Titles are limited to 120 characters.",
      invalid_characters: "The title contains characters that are not supported.",
      suspicious: "This input cannot be used as a title.",
    };
    throw Object.assign(
      new Error(messages[validation.error ?? "empty"] ?? "Invalid title."),
      { kind: "validation" },
    );
  }
  try {
    await getBackend().renameThread(id, validation.value);
    return validation.value;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function setThreadPinned(id: string, pinned: boolean): Promise<void> {
  try {
    await getBackend().setThreadPinned(id, pinned);
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function setThreadArchived(id: string, archived: boolean): Promise<void> {
  try {
    await getBackend().setThreadArchived(id, archived);
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function deleteThread(id: string): Promise<void> {
  try {
    await getBackend().deleteThread(id);
  } catch (error) {
    throw mapApiError(error);
  }
}

/**
 * Sidebar list: one entry per conversation thread, represented by its newest
 * turn. Follow-up questions update the existing entry instead of adding one.
 */
export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const rows: unknown[] = await getBackend().listThreads();
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row): HistoryItem | null => {
        if (typeof row !== "object" || row === null) return null;
        const r = row as Record<string, unknown>;
        if (typeof r.id !== "string" || typeof r.question !== "string") return null;
        return {
          id: r.id,
          threadId: typeof r.threadId === "string" ? r.threadId : r.id,
          question: clampDisplayText(r.question, 600),
          createdAt: typeof r.createdAt === "number" ? r.createdAt : 0,
          evidenceStatus:
            r.statusKind === "refused" ? "insufficient" : sanitizeThreadStatus(r.statusKind),
          turnCount: typeof r.turnCount === "number" ? r.turnCount : 1,
          pinned: r.pinned === true,
        };
      })
      .filter((item): item is HistoryItem => item !== null)
      .slice(0, 50);
  } catch {
    return [];
  }
}

/** Coarse status → evidence status for list rendering. */
function sanitizeThreadStatus(value: unknown) {
  switch (value) {
    case "confirmed":
      return "confirmed" as const;
    case "supported":
      return "supported" as const;
    case "unverified":
      return "unverified" as const;
    default:
      return "insufficient" as const;
  }
}

export interface ApiStatusInfo {
  ok: boolean;
  corpusEntries: number;
  safetyRules: number;
}

export async function getApiStatus(): Promise<ApiStatusInfo> {
  const status = await getBackend().status();
  return status;
}
