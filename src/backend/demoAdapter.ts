/**
 * Demo adapter — the in-browser backend used when no real backend is
 * configured. Wraps the existing fake API (simulated latency, failure
 * triggers, session-scoped thread store) behind the BackendAdapter contract,
 * so the full UI works out of the box and can be swapped for a real backend
 * without touching any UI code.
 *
 * Failure triggers inside a question:
 *  - "fail" or "error" → temporary backend failure
 *  - "slow"            → multi-second latency
 */
import {
  fakeApiStatus,
  fakeDeleteThread,
  fakeGetHistory,
  fakeGetThread,
  fakeInvestigateQuestion,
  fakeRenameThread,
  fakeSetThreadArchived,
  fakeSetThreadPinned,
} from "@/services/fakeApi";
import type { BackendAdapter, BackendStatus } from "./types";

export function createDemoBackend(): BackendAdapter {
  return {
    id: "demo",
    label: "In-browser demo backend",

    investigate: (question, threadId) => fakeInvestigateQuestion(question, threadId),
    getThread: (threadId) => fakeGetThread(threadId),
    listThreads: () => fakeGetHistory(),
    renameThread: (id, title) => fakeRenameThread(id, title).then(() => undefined),
    setThreadPinned: (id, pinned) => fakeSetThreadPinned(id, pinned).then(() => undefined),
    setThreadArchived: (id, archived) => fakeSetThreadArchived(id, archived).then(() => undefined),
    deleteThread: (id) => fakeDeleteThread(id).then(() => undefined),
    status: (): Promise<BackendStatus> => fakeApiStatus(),
  };
}
