/**
 * In-memory conversation store — the frontend-only investigation engine.
 *
 * Conversations live for the browser session (never persisted, never sent
 * anywhere). Questions are resolved against the local demo corpus:
 * safety rules first, then domain knowledge, then honest fallbacks —
 * the same evaluation order the UI copy describes.
 *
 * The security layer still applies: every question/title passes through
 * src/security validation at the call sites, and the corpus output is
 * plain rendered data. The delay/failure triggers give the UI observable
 * loading and error states without any backend.
 *
 * Failure triggers inside a question:
 *  - "fail" or "error" → temporary failure (error state demo)
 *  - "slow"            → multi-second latency (loading state demo)
 */
import {
  defaultLabFor,
  DOMAIN_MATCHERS,
  genericFullReport,
  NO_RESULTS,
  OUT_OF_DOMAIN,
  SAFETY_MATCHERS,
} from "@/mock/corpus";
import { enforceFullReportPolicy } from "@/security/reportValidation";
import type {
  HistoryItem,
  Investigation,
  InvestigationResult,
  Thread,
} from "@/types/investigation";

/** Session-scoped store (newest first), capped like a real history list. */
const store: Investigation[] = [];
const HISTORY_LIMIT = 60;
let idCounter = 0;

/**
 * Id of the conversation the user last had open — module-level so it
 * survives view unmounts (Investigate → History → Investigate resumes the
 * same chat instead of starting a new one). Session-only by design.
 */
let lastThreadId: string | null = null;

export function rememberThread(id: string | null): void {
  lastThreadId = id;
}

export function getLastThreadId(): string | null {
  return lastThreadId;
}

const FAILURE_PATTERN = /\b(fail|error)\b/i;
const SLOW_PATTERN = /\bslow\b/i;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function simulatedLatency(question: string): number {
  if (SLOW_PATTERN.test(question)) return 2600;
  return 850 + Math.floor(Math.random() * 500);
}

/**
 * Resolve a question against the demo corpus. Every resolved result passes
 * through the full-report validation policy before it is stored, so a
 * malformed report can never reach the render layer.
 *
 * `fullReportMode` (the composer's "Full report" toggle): when on, a
 * cybersecurity question without a specific corpus entry returns the
 * documented generic full report instead of NO_RESULTS, and every report is
 * completed with a derived lab so all 8 sections render. Safety refusals
 * and off-domain questions are unaffected — a report would be dishonest
 * there.
 */
function resolveResult(question: string, fullReportMode: boolean): InvestigationResult {
  const complete = (result: InvestigationResult): InvestigationResult => {
    const policyResult = enforceFullReportPolicy(result);
    if (fullReportMode && policyResult.kind === "report" && !policyResult.lab) {
      return { ...policyResult, lab: defaultLabFor(policyResult.attackChain) };
    }
    return policyResult;
  };
  for (const matcher of SAFETY_MATCHERS) {
    if (matcher.question.test(question)) return complete(matcher.build());
  }
  for (const matcher of DOMAIN_MATCHERS) {
    if (matcher.question.test(question)) return complete(matcher.build());
  }
  const cyberRelated = /\b(cyber|attack|malware|vulnerab|exploit|threat|actor|technique|mitre|cve|breach)\b/i.test(
    question,
  );
  if (fullReportMode && cyberRelated) {
    return complete(genericFullReport());
  }
  if (cyberRelated) {
    return NO_RESULTS;
  }
  return OUT_OF_DOMAIN;
}

/** Read the whole conversation for a thread id (oldest first). */
export function readThread(threadId: string): Thread | null {
  const anchor = store.find((item) => item.threadId === threadId || item.id === threadId);
  if (!anchor) return null;
  const rootId = anchor.threadId;
  const turns = store
    .filter((item) => item.threadId === rootId)
    .sort((a, b) => a.createdAt - b.createdAt);
  return {
    threadId: rootId,
    lastTurnId: turns[turns.length - 1]?.id ?? rootId,
    turns: turns.map((item) => ({
      id: item.id,
      question: item.question,
      createdAt: item.createdAt,
      result: item.result,
    })),
    createdAt: turns[0]?.createdAt ?? Date.now(),
    finishedAt: turns[turns.length - 1]?.createdAt ?? Date.now(),
  };
}

/**
 * Sidebar/history list: one entry per thread, represented by its newest turn.
 * Archived entries are included but flagged, so the UI can dim them and offer
 * an unarchive action instead of making them unreachable.
 */
export function readHistory(): HistoryItem[] {
  const threads = new Map<string, { item: Investigation; turnCount: number }>();
  for (const item of store) {
    const key = item.threadId;
    const existing = threads.get(key);
    if (existing) {
      existing.turnCount += 1;
      continue; // store is newest-first; keep the newest as representative
    }
    threads.set(key, { item, turnCount: 1 });
  }
  return [...threads.values()]
    .sort((a, b) => {
      // Pinned conversations sort first, then newest.
      const pa = a.item.pinned === true ? 1 : 0;
      const pb = b.item.pinned === true ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.item.createdAt - a.item.createdAt;
    })
    .map(({ item, turnCount }) => ({
      id: item.id,
      threadId: item.threadId,
      question: item.title ?? item.question,
      createdAt: item.createdAt,
      evidenceStatus:
        item.result.kind === "report"
          ? item.result.evidenceStatus
          : item.result.kind === "safety"
            ? ("insufficient" as const)
            : ("unverified" as const),
      turnCount,
      pinned: item.pinned === true,
      archived: item.archived === true,
    }));
}

/** Notify subscribers that the store changed (sidebar/history refresh). */
const listeners = new Set<() => void>();
export function subscribeToConversationStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function notifyChanged(): void {
  for (const listener of listeners) listener();
}

/** Delay wrapper matching the old demo latency so loading states stay observable. */
async function runWithLatency(question: string): Promise<void> {
  await delay(simulatedLatency(question));
}

/**
 * Run an investigation. Appends to an existing conversation when
 * `threadId` is provided, otherwise opens a new one. Throws a plain
 * `Error("temporary")` on the "fail"/"error" trigger so the UI error
 * state exercises exactly like a transport failure did.
 */
export async function runInvestigation(
  question: string,
  threadId?: string,
  fullReportMode = true,
): Promise<Investigation> {
  await runWithLatency(question);

  if (FAILURE_PATTERN.test(question)) {
    throw new Error("temporary");
  }

  let resolvedThreadId: string;
  if (typeof threadId === "string" && threadId.length > 0) {
    const root = store.find((item) => item.id === threadId || item.threadId === threadId);
    if (!root) {
      throw new Error("not_found");
    }
    resolvedThreadId = root.threadId;
  } else {
    resolvedThreadId = "";
  }

  const id = `local-${Date.now()}-${++idCounter}`;
  const investigation: Investigation = {
    id,
    threadId: resolvedThreadId || id,
    question,
    createdAt: Date.now(),
    result: resolveResult(question, fullReportMode),
  };

  store.unshift(investigation);
  if (store.length > HISTORY_LIMIT) store.length = HISTORY_LIMIT;
  lastThreadId = investigation.threadId;
  notifyChanged();
  return investigation;
}

/* --------------------------- thread mutations --------------------------- */

/** Apply a mutation to every turn of a thread; returns false when not found. */
function mutateThread(threadId: string, mutate: (item: Investigation) => void): boolean {
  const root = store.find((item) => item.id === threadId || item.threadId === threadId);
  if (!root) return false;
  const rootId = root.threadId;
  for (const item of store) {
    if (item.threadId === rootId) mutate(item);
  }
  notifyChanged();
  return true;
}

/** Rename a conversation thread (all turns share the title). */
export function renameThread(threadId: string, title: string): boolean {
  return mutateThread(threadId, (item) => {
    item.title = title;
  });
}

/** Pin / unpin a conversation; pinned threads sort first in lists. */
export function setThreadPinned(threadId: string, pinned: boolean): boolean {
  return mutateThread(threadId, (item) => {
    item.pinned = pinned || undefined;
  });
}

/** Archive a conversation; archived threads are hidden from the Recent list. */
export function setThreadArchived(threadId: string, archived: boolean): boolean {
  return mutateThread(threadId, (item) => {
    item.archived = archived || undefined;
  });
}

/** Delete a conversation and every turn in it. */
export function deleteThread(threadId: string): boolean {
  const root = store.find((item) => item.id === threadId || item.threadId === threadId);
  if (!root) return false;
  const rootId = root.threadId;
  for (let i = store.length - 1; i >= 0; i -= 1) {
    if (store[i].threadId === rootId) store.splice(i, 1);
  }
  if (lastThreadId === rootId) lastThreadId = null;
  notifyChanged();
  return true;
}

