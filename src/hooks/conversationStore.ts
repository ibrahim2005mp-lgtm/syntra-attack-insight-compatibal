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
  DOMAIN_MATCHERS,
  NO_RESULTS,
  OUT_OF_DOMAIN,
  SAFETY_MATCHERS,
} from "@/mock/corpus";
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

const FAILURE_PATTERN = /\b(fail|error)\b/i;
const SLOW_PATTERN = /\bslow\b/i;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function simulatedLatency(question: string): number {
  if (SLOW_PATTERN.test(question)) return 2600;
  return 850 + Math.floor(Math.random() * 500);
}

/** Resolve a question against the demo corpus. */
function resolveResult(question: string): InvestigationResult {
  for (const matcher of SAFETY_MATCHERS) {
    if (matcher.question.test(question)) return matcher.build();
  }
  for (const matcher of DOMAIN_MATCHERS) {
    if (matcher.question.test(question)) return matcher.build();
  }
  if (/\b(cyber|attack|malware|vulnerab|exploit|threat|actor|technique|mitre|cve|breach)\b/i.test(question)) {
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

/** Sidebar/history list: one entry per thread, represented by its newest turn. */
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
    .sort((a, b) => b.item.createdAt - a.item.createdAt)
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
    result: resolveResult(question),
  };

  store.unshift(investigation);
  if (store.length > HISTORY_LIMIT) store.length = HISTORY_LIMIT;
  notifyChanged();
  return investigation;
}

export function conversationStoreIsEmpty(): boolean {
  return store.length === 0;
}
