import { Check, Copy, FlaskConical, FlaskConicalOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import type { AttackStage, Evidence } from "@/types/investigation";

/**
 * Technique Details & Steps — one card per chain stage with the attacker
 * behavior description, ordered typical steps, and the evidence verdict with
 * numbered source references. Cards wrap responsively like the report grid.
 */
export function TechniqueDetails({
  stages,
  evidence,
  onOpenEvidence,
  onCopyTechniqueId,
}: {
  stages: AttackStage[];
  evidence: Evidence[];
  onOpenEvidence: (stage: AttackStage) => void;
  onCopyTechniqueId?: (id: string) => void;
}) {
  if (stages.length === 0) return null;

  const sourceNumberById = new Map<string, number>();
  let counter = 0;
  for (const stage of stages) {
    for (const evId of stage.evidenceIds) {
      const ev = evidence.find((e) => e.id === evId);
      if (ev && !sourceNumberById.has(ev.id)) {
        counter += 1;
        sourceNumberById.set(ev.id, counter);
      }
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stages.map((stage) => (
        <TechniqueCard
          key={stage.techniqueId}
          stage={stage}
          evidence={stage.evidenceIds
            .map((id) => evidence.find((e) => e.id === id))
            .filter((e): e is Evidence => e !== undefined)}
          sourceNumberById={sourceNumberById}
          onOpenEvidence={onOpenEvidence}
          onCopyTechniqueId={onCopyTechniqueId}
        />
      ))}
    </div>
  );
}

function TechniqueCard({
  stage,
  evidence,
  sourceNumberById,
  onOpenEvidence,
  onCopyTechniqueId,
}: {
  stage: AttackStage;
  evidence: Evidence[];
  sourceNumberById: Map<string, number>;
  onOpenEvidence: (stage: AttackStage) => void;
  onCopyTechniqueId?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
    void navigator.clipboard?.writeText(stage.techniqueId).then(() => {
      toast.success(`Copied ${stage.techniqueId}`, {
        description: "Technique ID copied to clipboard.",
      });
    }).catch(() => {
      setCopied(false);
      toast.error("Copy failed", { description: "Clipboard access was denied." });
    });
    onCopyTechniqueId?.(stage.techniqueId);
  };

  return (
    <article className="syn-card flex flex-col gap-3 p-4">
      <header>
        <div className="flex items-center gap-2">
          <span className="syn-technique-id">{stage.techniqueId}</span>
          {onCopyTechniqueId && (
            <button
              type="button"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Copy technique ID ${stage.techniqueId}`}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-3 text-[var(--syntra-success)]" />
              ) : (
                <Copy className="size-3" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenEvidence(stage)}
            className="ml-auto rounded-md border border-border bg-[var(--syntra-surface-soft)] px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-[var(--syntra-orange)] hover:text-foreground"
            title="Open the evidence records for this technique"
          >
            {stage.tactic}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onOpenEvidence(stage)}
          className="mt-2 block w-full text-left text-sm font-semibold leading-snug text-foreground transition-colors hover:text-[var(--syntra-orange)]"
          title={`Jump to evidence for ${stage.techniqueId}`}
          aria-label={`${stage.techniqueName} — view evidence`}
        >
          {stage.techniqueId} — {stage.techniqueName}
        </button>
      </header>

      {stage.description && (
        <div>
          <p className="syn-detail-label">Description:</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {stage.description}
          </p>
        </div>
      )}

      {stage.steps && stage.steps.length > 0 && (
        <div>
          <p className="syn-detail-label">Typical Steps:</p>
          <ol className="mt-1 flex flex-col gap-0.5">
            {stage.steps.map((step, i) => (
              <li key={`${stage.techniqueId}-step-${i}`} className="text-xs leading-relaxed text-muted-foreground">
                <span className="syn-mono mr-1.5 text-[10px] text-[var(--syntra-orange)]">
                  {i + 1}.
                </span>
                {step.text}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div>
        <p className="syn-detail-label">Evidence:</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {evidence.length > 0
            ? evidence
                .map((e) =>
                  e.status === "confirmed"
                    ? "Confirmed"
                    : e.status === "supported"
                      ? "Supported"
                      : "Reported but unverified",
                )
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .join(" · ") + " by CTI evidence documenting this technique."
            : "No evidence records are associated with this technique."}
        </p>
      </div>

      {evidence.length > 0 && (
        <div>
          <p className="syn-detail-label">Sources:</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {evidence.map((e) => {
              const num = sourceNumberById.get(e.id);
              return (
                <li key={e.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="syn-mono text-[var(--syntra-orange)]">[{num}]</span>
                  <span className="truncate">{e.sourceName}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={stage.status} />
        </div>
        {typeof stage.labAvailable === "boolean" && (
          <div
            className={
              stage.labAvailable
                ? "syn-lab-availability syn-lab-availability-ok"
                : "syn-lab-availability"
            }
          >
            {stage.labAvailable ? (
              <>
                <FlaskConical className="size-3.5 text-[var(--syntra-success)]" aria-hidden="true" />
                <span>Lab Available</span>
              </>
            ) : (
              <>
                <FlaskConicalOff className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span>No Lab Available</span>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
