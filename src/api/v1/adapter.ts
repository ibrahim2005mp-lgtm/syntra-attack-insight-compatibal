/**
 * Investigation engine adapter.
 *
 * The UI talks to exactly one engine surface: `askEngine`, plus the
 * conversation store for session history. When `VITE_API_BASE_URL` is set,
 * questions go to the versioned backend (`POST /api/v1/query`) and the
 * response is mapped through mapping.ts; otherwise the local session engine
 * (conversationStore) resolves them against the dev corpus.
 *
 * Capability flags come from the backend health endpoint when remote, so
 * controls like lab launch are gated on real backend capability — never on
 * local assumptions about static metadata.
 */
import { ApiRequestError, fetchHealth, isRemoteApiConfigured, submitQuery } from "@/api/v1/client";
import { mapQueryResponse } from "@/api/v1/mapping";
import type { ApiErrorCode, QueryRequestBody, QueryResponseBody } from "@/api/v1/contract";
import { runInvestigation } from "@/hooks/conversationStore";
import type { InvestigationResult } from "@/types/investigation";

/* ------------------------------ capability flags ------------------------------ */

/**
 * First-release capability set. Answer generation, graph/chain APIs and lab
 * orchestration are absent in the repository today, so the defaults are all
 * false — the UI must not promise what the backend has not confirmed.
 */
export interface EngineCapabilities {
  /** A validated response-generation service exists (grounded answers). */
  answerGeneration: boolean;
  /** A lab orchestrator with audited launch exists. */
  labLaunch: boolean;
  /** Entity detail endpoints are available. */
  entityDetail: boolean;
}

export const DEFAULT_CAPABILITIES: EngineCapabilities = {
  answerGeneration: false,
  labLaunch: false,
  entityDetail: false,
};

/** Last-known health flags; refreshed lazily by `refreshCapabilities`. */
let cachedCapabilities: EngineCapabilities | null = null;

/** Refresh capability flags from the backend health endpoint. */
export async function refreshCapabilities(): Promise<EngineCapabilities> {
  if (!isRemoteApiConfigured()) {
    cachedCapabilities = DEFAULT_CAPABILITIES;
    return cachedCapabilities;
  }
  try {
    const health = await fetchHealth();
    cachedCapabilities = {
      answerGeneration: health.dependencies.answer_generation === true,
      labLaunch: health.dependencies.lab_orchestration === true,
      entityDetail: true,
    };
  } catch {
    // Health failure is itself a capability signal: expose nothing extra.
    cachedCapabilities = DEFAULT_CAPABILITIES;
  }
  return cachedCapabilities;
}

/** Current capability flags (cached; kicks off a refresh when unset). */
export function getCapabilities(): EngineCapabilities {
  if (cachedCapabilities === null) {
    void refreshCapabilities().catch(() => undefined);
    return DEFAULT_CAPABILITIES;
  }
  return cachedCapabilities;
}

/* ------------------------------ engine errors ------------------------------ */

/**
 * Normalized engine failure. The UI maps these codes to distinct states —
 * validation, dependency-down, rate limit, not found and internal failure
 * are never merged into one generic blank error.
 */
export type EngineError = {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
};

export function toEngineError(error: unknown): EngineError {
  if (error instanceof ApiRequestError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }
  if (error instanceof Error) {
    if (error.message === "not_found") {
      return { code: "not_found", message: "That conversation could not be found.", retryable: false };
    }
    return { code: "internal_error", message: "The investigation could not be completed. Please try again.", retryable: true };
  }
  return { code: "internal_error", message: "The investigation could not be completed. Please try again.", retryable: true };
}

/* ------------------------------ ask surface ------------------------------ */

/**
 * Result of an engine "ask": the canonical turn payload the conversation
 * store persists, plus honest provenance about where the result came from.
 */
export interface EngineTurn {
  /** Server request id (remote) or the local investigation id. */
  id: string;
  /** Conversation key for the session store (server request or local thread). */
  threadId: string;
  question: string;
  createdAt: number;
  result: InvestigationResult;
  /** Which engine produced this result. */
  source: "remote" | "local";
  /** Server retrieval version, when the backend reported one. */
  retrievalVersion?: string;
}

/**
 * Ask the active engine. Remote mode validates the wire response and maps
 * it; local mode delegates to the session conversation store. Both paths
 * run the same downstream validation (the caller applies the report policy)
 * so the render layer is identical whichever engine served the question.
 */
export async function askEngine(
  question: string,
  threadId: string | undefined,
  fullReportMode: boolean,
  runInvestigationLocal: typeof runInvestigation,
): Promise<EngineTurn> {
  if (isRemoteApiConfigured()) {
    const body: QueryRequestBody = { query: question, mode: fullReportMode ? "full_report" : "standard" };
    let response: QueryResponseBody;
    try {
      response = await submitQuery(body);
    } catch (error) {
      throw toEngineError(error);
    }
    const result = mapQueryResponse(response);
    return {
      id: response.request_id,
      // The v1 query contract is stateless per request, so each remote
      // exchange is its own conversation in the session store.
      threadId: response.request_id,
      question,
      createdAt: Date.parse(response.meta.generated_at) || Date.now(),
      result,
      source: "remote",
      retrievalVersion: response.meta.retrieval_version,
    };
  }

  // Local session engine — same signature as before, preserving the
  // conversation-store grouping behavior (threadId continuation).
  const investigation = await runInvestigationLocal(question, threadId, fullReportMode);
  return {
    id: investigation.id,
    threadId: investigation.threadId,
    question: investigation.question,
    createdAt: investigation.createdAt,
    result: investigation.result,
    source: "local",
  };
}
