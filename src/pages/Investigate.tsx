import { MessageSquarePlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { InvestigationInput } from "@/components/InvestigationInput";
import { WorkspacePage } from "@/components/WorkspacePage";
import { NeutralBadge, StatusBadge } from "@/components/StatusBadge";
import { ErrorState, LoadingState, NoticeState, SafetyResponse } from "@/components/results/States";
import { InvestigationResultView } from "@/components/results/InvestigationResultView";
import { useInvestigation } from "@/hooks/useInvestigation";
import { getLastThreadId } from "@/hooks/conversationStore";
import type { Turn } from "@/types/investigation";

interface InvestigateProps {
  /** Router location state carrying a history-restore request. */
  locationState?: { restoreId?: string; restoreNonce?: number } | null;
}

function formatTimestamp(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

/**
 * Investigation workspace — SYNTRA's home base and conversation surface.
 * Every question asked while a conversation is open appends to that
 * conversation; a new conversation starts only from the empty screen or via
 * "New conversation". Conversations live for the browser session.
 */
export default function Investigate({ locationState }: InvestigateProps) {
  const {
    phase,
    thread,
    pendingQuestion,
    error,
    ask,
    retry,
    restore,
    reset,
    cancel,
  } = useInvestigation();
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  // Auto-resume runs at most once per mount so it never interrupts an
  // active exchange.
  const autoResumedRef = useRef(false);

  const restoreId = locationState?.restoreId;
  const restoreNonce = locationState?.restoreNonce;
  // Shared links carry ?id=<thread turn id> and restore the whole thread.
  const shareId = searchParams.get("id");

  useEffect(() => {
    if (restoreId) {
      void restore(restoreId);
    }
  }, [restoreId, restoreNonce, restore]);

  useEffect(() => {
    if (shareId) {
      void restore(shareId);
      // Consume the param so refresh/back behave predictably.
      setSearchParams({}, { replace: true });
      return;
    }
    // Fresh mount with no explicit restore request: resume the conversation
    // the user last had open so navigating Investigate → History →
    // Investigate continues the same chat instead of starting a new one.
    const lastId = getLastThreadId();
    if (!autoResumedRef.current && restoreId === undefined && lastId !== null) {
      autoResumedRef.current = true;
      void restore(lastId, { silent: true });
    }
  }, [shareId, restoreId, restore, setSearchParams]);

  // Tell the shell which conversation is open so the sidebar can highlight
  // it; clears when the workspace resets or unmounts.
  const activeThreadId = thread?.threadId ?? null;
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("syntra:active-thread", { detail: activeThreadId }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("syntra:active-thread", { detail: null }),
      );
    };
  }, [activeThreadId]);

  // The composer continues the open conversation.
  const activeThreadIdForAsk = thread?.threadId;
  const handleAsk = useCallback(
    (question: string) => {
      setDraft(undefined);
      void ask(question, activeThreadIdForAsk);
    },
    [ask, activeThreadIdForAsk],
  );

  const handleNewConversation = useCallback(() => {
    reset();
    setDraft("");
  }, [reset]);

  const pending = phase === "loading";
  const turns = thread?.turns ?? [];

  return (
    <WorkspacePage
      title="Investigate"
      scope="Evidence-grounded attack analysis"
      actions={
        phase !== "idle" ? (
          <button
            type="button"
            onClick={handleNewConversation}
            className="syn-btn-primary inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--syntra-orange)] px-3 text-xs font-semibold tracking-wide text-[color-mix(in_oklab,var(--syntra-orange)_20%,black)]"
          >
            <MessageSquarePlus className="size-3.5" aria-hidden="true" />
            New conversation
          </button>
        ) : undefined
      }
    >
      {phase === "idle" && (
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 pt-10 md:pt-16">
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Investigate what the evidence actually supports
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Ask about a cybersecurity event, technique, campaign or vulnerability.
              SYNTRA returns an evidence-grounded analysis — not speculation. Follow-up
              questions continue the same conversation.
            </p>
          </div>
          <div className="w-full">
            <InvestigationInput onSubmit={handleAsk} pending={pending} draft={draft} />
          </div>
        </div>
      )}

      {phase === "loading" && turns.length === 0 && (
        <div className="flex flex-col gap-6">
          <LoadingState question={pendingQuestion} />
        </div>
      )}

      {phase === "error" && turns.length === 0 && (
        <div className="flex flex-col gap-6">
          <ErrorState message={error ?? "The investigation could not be completed."} onRetry={retry} />
        </div>
      )}

      {(phase === "done" || ((phase === "loading" || phase === "error") && turns.length > 0)) && (
        <div className="flex flex-col gap-8 pb-2">
          {turns.map((turn) => (
            <TurnView key={turn.id} turn={turn} onDraftQuestion={setDraft} />
          ))}

          {phase === "loading" && (
            <LoadingState question={pendingQuestion} compact onCancel={cancel} />
          )}

          {phase === "error" && (
            <ErrorState message={error ?? "The investigation could not be completed."} onRetry={retry} />
          )}

          <div className="pb-2">
            <InvestigationInput
              onSubmit={handleAsk}
              pending={pending}
              draft={draft}
            />
            {turns.length > 0 && !pending && (
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Exchange {turns.length + 1} continues this conversation · start a new
                one with “New conversation”
              </p>
            )}
          </div>
        </div>
      )}

      {phase === "done" && thread && turns.length === 0 && (
        <NoticeState message="This conversation has no stored exchanges." />
      )}
    </WorkspacePage>
  );
}

/**
 * One exchange inside the conversation: the question header with its
 * evidence verdict, followed by the structured result.
 */
function TurnView({
  turn,
  onDraftQuestion,
}: {
  turn: Turn;
  onDraftQuestion: (question: string) => void;
}) {
  const result = turn.result;
  return (
    <section className="flex flex-col gap-4" aria-label={`Exchange: ${turn.question}`}>
      <div className="syn-card p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
            {turn.question}
          </p>
          {result.kind === "report" ? (
            <StatusBadge status={result.evidenceStatus} />
          ) : result.kind === "safety" ? (
            <StatusBadge status="insufficient" refused />
          ) : (
            <NeutralBadge>No Result</NeutralBadge>
          )}
          <span className="syn-mono text-[11px] text-muted-foreground">
            {formatTimestamp(turn.createdAt)}
          </span>
        </div>
      </div>

      {result.kind === "report" && (
        <InvestigationResultView
          report={result}
          callbacks={{ onCopyTechniqueId: () => undefined, onDraftQuestion: onDraftQuestion }}
        />
      )}
      {result.kind === "safety" && (
        <SafetyResponse result={result} onAlternative={onDraftQuestion} />
      )}
      {(result.kind === "no_results" ||
        result.kind === "insufficient_evidence" ||
        result.kind === "out_of_domain") && <NoticeState message={result.message} />}
    </section>
  );
}

