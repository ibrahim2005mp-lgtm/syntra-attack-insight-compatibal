/**
 * REST adapter — the reference HTTP backend implementation.
 *
 * Talks to any server implementing the SYNTRA REST contract below. Point it
 * at your backend with VITE_API_BASE_URL and an optional bearer token via
 * VITE_API_TOKEN (both standard Vite env vars, read once at module load).
 *
 * REST contract (all JSON):
 *
 *   POST /investigations            { question, threadId? } → Investigation
 *   GET  /threads/:threadId         → Thread | 404 (thread not found)
 *   GET  /threads                   → HistoryItem[]
 *   PATCH /threads/:id              { title? } → 204
 *   DELETE /threads/:id             → 204
 *   POST /threads/:id/pin           { pinned: boolean } → 204
 *   POST /threads/:id/archive       { archived: boolean } → 204
 *   GET  /status                    → { ok, corpusEntries, safetyRules }
 *
 * Auth: the token from VITE_API_TOKEN (or the pluggable auth service, if
 * registered) is sent as `Authorization: Bearer <token>`.
 */
import type { BackendAdapter, BackendStatus } from "./types";
import type { HistoryItem, Investigation, Thread } from "@/types/investigation";

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
const STATIC_TOKEN: string | undefined = import.meta.env.VITE_API_TOKEN as string | undefined;

/** Optional dynamic token provider wired by the pluggable auth service. */
let dynamicTokenProvider: (() => string | null) | null = null;

/** Register a token provider (used by the pluggable auth service). */
export function setHttpTokenProvider(provider: () => string | null): void {
  dynamicTokenProvider = provider;
}

export class HttpApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = dynamicTokenProvider?.() ?? STATIC_TOKEN ?? null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    // Network failure (offline, CORS, DNS) → same normalization as 5xx.
    throw new HttpApiError(0, "temporary");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new HttpApiError(response.status, "authentication required");
    }
    if (response.status === 404) {
      throw new HttpApiError(404, "not_found");
    }
    throw new HttpApiError(response.status, "temporary");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function assertObject(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new HttpApiError(0, `Malformed ${what} payload`);
  }
  return value as Record<string, unknown>;
}

export function createHttpBackend(): BackendAdapter {
  return {
    id: "http",
    label: "REST API",

    async investigate(question, threadId) {
      const raw = assertObject(
        await request<unknown>("/investigations", {
          method: "POST",
          body: JSON.stringify({ question, threadId }),
        }),
        "investigation",
      );
      if (typeof raw.id !== "string" || typeof raw.threadId !== "string") {
        throw new HttpApiError(0, "Malformed investigation payload");
      }
      return raw as unknown as Investigation;
    },

    async getThread(threadId) {
      try {
        const raw = assertObject(
          await request<unknown>(`/threads/${encodeURIComponent(threadId)}`),
          "thread",
        );
        return raw as unknown as Thread;
      } catch (error) {
        if (error instanceof HttpApiError && error.status === 404) return null;
        throw error;
      }
    },

    async listThreads() {
      const rows = await request<unknown[]>("/threads");
      if (!Array.isArray(rows)) return [];
      return rows.filter(
        (row): row is HistoryItem =>
          typeof row === "object" &&
          row !== null &&
          typeof (row as Record<string, unknown>).id === "string" &&
          typeof (row as Record<string, unknown>).threadId === "string",
      );
    },

    async renameThread(id, title) {
      await request<void>(`/threads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
    },

    async setThreadPinned(id, pinned) {
      await request<void>(`/threads/${encodeURIComponent(id)}/pin`, {
        method: "POST",
        body: JSON.stringify({ pinned }),
      });
    },

    async setThreadArchived(id, archived) {
      await request<void>(`/threads/${encodeURIComponent(id)}/archive`, {
        method: "POST",
        body: JSON.stringify({ archived }),
      });
    },

    async deleteThread(id) {
      await request<void>(`/threads/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async status(): Promise<BackendStatus> {
      try {
        const raw = assertObject(await request<unknown>("/status"), "status");
        return {
          ok: raw.ok === true,
          corpusEntries: typeof raw.corpusEntries === "number" ? raw.corpusEntries : 0,
          safetyRules: typeof raw.safetyRules === "number" ? raw.safetyRules : 0,
        };
      } catch {
        return { ok: false, corpusEntries: 0, safetyRules: 0 };
      }
    },
  };
}
