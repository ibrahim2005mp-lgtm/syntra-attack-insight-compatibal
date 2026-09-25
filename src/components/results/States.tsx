import { Compass, RefreshCcw, ShieldX, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InvestigationResult } from "@/types/investigation";

/**
 * Loading experience uses investigative language. It is a lightweight
 * indeterminate state — SYNTRA never fabricates technical progress it cannot
 * observe.
 */
export function LoadingState({
  question,
  compact = false,
  onCancel,
}: {
  question: string;
  compact?: boolean;
  onCancel?: () => void;
}) {
  if (compact) {
    return (
      <section aria-live="polite" aria-busy="true" className="syn-card syn-sweep flex items-center gap-3 p-4">
        <Compass className="size-4 shrink-0 text-[var(--syntra-orange)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{question}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Searching sources · Connecting evidence · Validating relationships
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Square className="size-3" aria-hidden="true" />
            Stop
          </button>
        )}
      </section>
    );
  }
  return (
    <section aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
      <div className="syn-card syn-sweep p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">Investigation Request</p>
        <p className="mt-1.5 text-sm font-medium text-foreground">{question}</p>
      </div>

      <div className="syn-card p-4">
        <div className="syn-section-title">
          <Compass className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />
          Searching Sources
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="syn-sweep h-3 rounded bg-[var(--syntra-surface-soft)]" style={{ width: `${92 - i * 18}%` }} />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Connecting evidence · Validating relationships · Building supported chain
        </p>
      </div>
    </section>
  );
}

/**
 * Polished error surface — never a stack trace or backend detail. The
 * optional hint names the failure category (validation, dependency down,
 * rate limit, server failure) so states stay distinguishable, matching the
 * API's explicit error semantics.
 */
export function ErrorState({
  message,
  hint,
  onRetry,
}: {
  message: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="syn-card p-6 text-center" role="alert">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {hint && (
        <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{hint}</p>
      )}
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCcw className="size-3.5" />
          Try again
        </Button>
      )}
    </section>
  );
}

/**
 * Safety response: calm, professional refusal with concrete safe
 * alternatives the user can follow immediately.
 */
export function SafetyResponse({
  result,
  onAlternative,
}: {
  result: Extract<InvestigationResult, { kind: "safety" }>;
  onAlternative?: (question: string) => void;
}) {
  return (
    <section className="syn-card p-5" aria-live="polite">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--syntra-danger)_14%,transparent)] text-[var(--syntra-danger)]">
          <ShieldX className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-foreground">REQUEST NOT SUPPORTED</h2>
          <p className="text-[11px] text-muted-foreground">Safety policy — defensive and educational analysis only</p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{result.message}</p>

      <div className="mt-4">
        <p className="syn-section-title">Safe Alternatives</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {result.alternatives.map((alt) => (
            <li key={alt}>
              {onAlternative ? (
                <button
                  type="button"
                  onClick={() => onAlternative(alt)}
                  className="w-full rounded-md border border-border bg-[var(--syntra-surface-soft)] px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:border-[var(--syntra-orange)]"
                >
                  {alt}
                </button>
              ) : (
                <span className="block rounded-md border border-border bg-[var(--syntra-surface-soft)] px-3 py-2 text-xs text-foreground/90">
                  {alt}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Generic centered notice for no-results / out-of-domain / insufficient. */
export function NoticeState({ message }: { message: string }) {
  return (
    <section className="syn-card p-6 text-center" role="status">
      <p className="text-sm leading-relaxed text-foreground/90">{message}</p>
    </section>
  );
}
