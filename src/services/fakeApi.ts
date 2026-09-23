/**
 * Fake API — an in-browser test double for frontend testing.
 *
 * Serves the exact response contract of a real backend (and is sanitized
 * through the same pipeline), but adds:
 *  - simulated network latency (so loading states are observable)
 *  - deterministic failure triggers for error-state testing
 *  - an in-memory per-session thread store
 *
 * Failure triggers inside a question:
 *  - "fail" or "error" → temporary backend failure
 *  - "slow"            → multi-second latency
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
import { sanitizeInvestigation, sanitizeThread } from "./responseSanitizers";

/** Session-scoped thread store (never persisted — demo data only). */
const threadStore: Investigation[] = [];
let idCounter = 0;

const HISTORY_LIMIT = 60;
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
 * Resolve a question against the dev corpus — mirrors the backend resolver
 * (safety rules first, then domain knowledge, then honest fallbacks).
 */
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

function statusKindOf(result: InvestigationResult): string {
  if (result.kind === "report") return result.evidenceStatus;
  if (result.kind === "safety") return "refused";
  return "no_results";
}

export async function fakeInvestigateQuestion(
  question: string,
  threadId?: string,
): Promise<Investigation> {
  await delay(simulatedLatency(question));

  if (FAILURE_PATTERN.test(question)) {
    // Thrown through the same error normalization as a real transport failure.
    throw new Error("temporary");
  }

  // Resolve thread membership the way the backend does: from stored data,
  // never from client claims about conversation shape.
  let resolvedThreadId: string;
  if (typeof threadId === "string" && threadId.length > 0) {
    const root = threadStore.find((item) => item.id === threadId);
    if (!root) {
      throw new Error("not_found");
    }
    resolvedThreadId = root.threadId ?? root.id;
  } else {
    resolvedThreadId = "";
  }

  const id = `fake-${Date.now()}-${++idCounter}`;
  const investigation: Investigation = {
    id,
    threadId: resolvedThreadId || id,
    question,
    createdAt: Date.now(),
    result: resolveResult(question),
  };

  threadStore.unshift(investigation);
  if (threadStore.length > HISTORY_LIMIT) threadStore.length = HISTORY_LIMIT;

  return sanitizeInvestigation(investigation) as Investigation;
}

/**
 * Load a full conversation thread. Any turn id works — resolved to the
 * thread root exactly like the backend.
 */
export async function fakeGetThread(id: string): Promise<Thread | null> {
  await delay(250);
  const anchor = threadStore.find((item) => item.id === id);
  if (!anchor) return null;
  const threadId = anchor.threadId ?? anchor.id;
  const turns = threadStore
    .filter((item) => (item.threadId ?? item.id) === threadId)
    .sort((a, b) => a.createdAt - b.createdAt);
  return sanitizeThread(turns);
}

/**
 * Sidebar list: one entry per thread, represented by its newest turn.
 */
export async function fakeGetHistory(): Promise<HistoryItem[]> {
  await delay(200);
  const threads = new Map<
    string,
    { item: Investigation; turnCount: number }
  >();
  for (const item of threadStore) {
    if (item.archived === true) continue;
    const key = item.threadId ?? item.id;
    const existing = threads.get(key);
    if (existing) {
      existing.turnCount += 1;
      continue; // store is newest-first; keep the newest as representative
    }
    threads.set(key, { item, turnCount: 1 });
  }

  return [...threads.values()]
    .sort((a, b) => {
      const pa = a.item.pinned === true ? 1 : 0;
      const pb = b.item.pinned === true ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.item.createdAt - a.item.createdAt;
    })
    .map(({ item, turnCount }) => ({
      id: item.id,
      threadId: item.threadId ?? item.id,
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
    }));
}

/** Thread-wide organization flags, mirroring the backend schema. */
interface FakeFlags {
  title?: string;
  pinned?: boolean;
  archived?: boolean;
}

function findFake(id: string): (Investigation & FakeFlags) | undefined {
  return threadStore.find((item) => item.id === id);
}

/** Collect every turn of the thread the given id belongs to. */
function threadTurns(id: string): (Investigation & FakeFlags)[] {
  const anchor = findFake(id);
  if (!anchor) return [];
  const rootId = anchor.threadId ?? anchor.id;
  return threadStore.filter((item) => (item.threadId ?? item.id) === rootId);
}

export async function fakeRenameThread(
  id: string,
  title: string,
): Promise<{ id: string; title: string }> {
  await delay(180);
  const turns = threadTurns(id);
  if (turns.length === 0) throw new Error("not_found");
  for (const turn of turns) turn.title = title;
  return { id: turns[0].threadId ?? turns[0].id, title };
}

export async function fakeSetThreadPinned(
  id: string,
  pinned: boolean,
): Promise<{ id: string; pinned: boolean }> {
  await delay(140);
  const turns = threadTurns(id);
  if (turns.length === 0) throw new Error("not_found");
  for (const turn of turns) turn.pinned = pinned || undefined;
  return { id: turns[0].threadId ?? turns[0].id, pinned };
}

export async function fakeSetThreadArchived(
  id: string,
  archived: boolean,
): Promise<{ id: string; archived: boolean }> {
  await delay(140);
  const turns = threadTurns(id);
  if (turns.length === 0) throw new Error("not_found");
  for (const turn of turns) turn.archived = archived || undefined;
  return { id: turns[0].threadId ?? turns[0].id, archived };
}

export async function fakeDeleteThread(id: string): Promise<{ id: string }> {
  await delay(160);
  const turns = threadTurns(id);
  if (turns.length === 0) throw new Error("not_found");
  const ids = new Set(turns.map((turn) => turn.id));
  for (let i = threadStore.length - 1; i >= 0; i -= 1) {
    if (ids.has(threadStore[i].id)) threadStore.splice(i, 1);
  }
  return { id: turns[0].threadId ?? turns[0].id };
}

export async function fakeApiStatus(): Promise<{
  ok: boolean;
  corpusEntries: number;
  safetyRules: number;
}> {
  await delay(120);
  return {
    ok: true,
    corpusEntries: DOMAIN_MATCHERS.length,
    safetyRules: SAFETY_MATCHERS.length,
  };
}

export { statusKindOf as fakeStatusKindOf };
