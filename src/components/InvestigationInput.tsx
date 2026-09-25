import { FileText, Radar, Square } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { SECURITY_CONFIG } from "@/security/securityConfig";
import { cn } from "@/lib/utils";

interface InvestigationInputProps {
  onSubmit: (question: string) => void;
  onCancel?: () => void;
  pending: boolean;
  /** Prefill the composer (e.g. safety alternatives, history re-ask). */
  draft?: string;
  autoFocus?: boolean;
  /** Full-report mode: unanswered cyber questions return the generic brief. */
  fullReportMode?: boolean;
  /** Toggle for the full-report mode. */
  onToggleFullReport?: () => void;
}

/**
 * The primary interaction surface. Enter submits; Shift+Enter adds a line.
 * Validation happens on submit (security layer), with client-side guards
 * here only for immediate feedback — the same checks run again centrally.
 */
export function InvestigationInput({
  onSubmit,
  onCancel,
  pending,
  draft,
  autoFocus = false,
  fullReportMode = true,
  onToggleFullReport,
}: InvestigationInputProps) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();

  // Sync external draft changes into the composer during render (derived
  // state pattern) so effects stay free of cascading setState calls.
  const [lastDraft, setLastDraft] = useState<string | undefined>(undefined);
  if (draft !== lastDraft) {
    setLastDraft(draft);
    if (draft !== undefined) {
      setValue(draft);
    }
  }

  useEffect(() => {
    if (draft !== undefined) {
      textareaRef.current?.focus();
    }
  }, [draft]);

  const max = SECURITY_CONFIG.maxQuestionLength;
  const overBudget = value.length > max;

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setLocalError("Please enter an investigation question.");
      return;
    }
    if (trimmed.length > max) {
      setLocalError(`The question exceeds the maximum length of ${max} characters.`);
      return;
    }
    setLocalError(null);
    onSubmit(trimmed);
    // Chat-style behavior: the composer clears once the question is sent.
    // The question itself stays visible in the conversation above.
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!pending) submit();
    }
  };

  return (
    <form
      className="syn-input-shell p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) submit();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Investigation question
      </label>
      <textarea
        id={inputId}
        ref={textareaRef}
        rows={2}
        autoFocus={autoFocus}
        value={value}
        disabled={pending}
        onChange={(e) => {
          setValue(e.target.value);
          if (localError) setLocalError(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Investigate a cybersecurity event, technique, campaign, vulnerability, or attack relationship..."
        aria-describedby={`${inputId}-hint`}
      />

      <div className="mt-2 flex items-center gap-3">
        {onToggleFullReport && (
          <button
            type="button"
            role="switch"
            aria-checked={fullReportMode}
            title={
              fullReportMode
                ? "Full report: every investigation returns the complete evidence-grounded brief."
                : "Standard mode: unanswered questions return an honest no-results state."
            }
            onClick={onToggleFullReport}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium tracking-wide transition-colors",
              fullReportMode
                ? "border-[var(--syntra-orange)]/60 bg-[var(--syntra-orange-soft)] text-[var(--syntra-orange)]"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className="size-3.5" aria-hidden="true" />
            Full report
            <span
              aria-hidden="true"
              className={cn(
                "ml-0.5 size-1.5 rounded-full",
                fullReportMode ? "bg-[var(--syntra-orange)]" : "bg-muted-foreground/40",
              )}
            />
          </button>
        )}
        <span id={`${inputId}-hint`} className="text-[11px] text-muted-foreground">
          <span className={overBudget ? "text-[var(--syntra-danger)]" : undefined}>
            {value.length}/{max}
          </span>
          <span className="ml-2 hidden sm:inline">
            Press <kbd className="syn-kbd">Enter</kbd> to investigate
          </span>
        </span>

        <div className="ml-auto">
          {pending && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Square className="size-3.5" aria-hidden="true" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending || overBudget}
              className="syn-btn-primary inline-flex h-9 items-center gap-2 rounded-md bg-[var(--syntra-orange)] px-4 text-sm font-semibold tracking-wide text-[color-mix(in_oklab,var(--syntra-orange)_20%,black)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
            >
              <Radar className="size-4" aria-hidden="true" />
              INVESTIGATE
            </button>
          )}
        </div>
      </div>

      {localError && (
        <p role="alert" className="mt-2 text-xs text-[var(--syntra-danger)]">
          {localError}
        </p>
      )}
    </form>
  );
}
