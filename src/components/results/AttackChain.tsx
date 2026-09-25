import { ArrowDown, ArrowLeft, ArrowRight, Ban, Check, Copy } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import type { AttackStage } from "@/types/investigation";

interface AttackChainProps {
  stages: AttackStage[];
  /** Jump to the Evidence & Sources section, highlighting this technique's evidence. */
  onOpenEvidence: (stage: AttackStage) => void;
  onCopyTechniqueId?: (id: string) => void;
}

/** Cards per serpentine row (matches the 4-card column template in CSS). */
const CARDS_PER_ROW = 4;

/** Grid column (1-indexed) of the k-th card in a row. Cards sit on odd columns. */
function cardColumn(rowIndex: number, k: number): number {
  // Even rows flow left→right (cols 1,3,5,7); odd rows right→left (cols 7,5,3,1).
  return rowIndex % 2 === 0 ? 2 * k + 1 : 2 * (CARDS_PER_ROW - 1 - k) + 1;
}

/** Grid column of the arrow between the k-th and (k+1)-th card of a row. */
function arrowColumn(rowIndex: number, k: number): number {
  return rowIndex % 2 === 0 ? 2 * k + 2 : 2 * (CARDS_PER_ROW - 1 - k);
}

type ChainNode =
  | { kind: "stage"; key: string; stage: AttackStage }
  | { kind: "terminal"; key: string };

function StageCard({
  stage,
  onOpenEvidence,
  onCopyTechniqueId,
}: {
  stage: AttackStage;
  onOpenEvidence: (s: AttackStage) => void;
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
    <div className="syn-chain-stage" data-status={stage.status}>
      <div className="flex items-center justify-between gap-2">
        <span className="syn-technique-id">{stage.techniqueId}</span>
        {onCopyTechniqueId && (
          <button
            type="button"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`Copy technique ID ${stage.techniqueId}`}
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3 text-[var(--syntra-success)]" /> : <Copy className="size-3" />}
          </button>
        )}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {stage.tactic}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onOpenEvidence(stage)}
        className="mt-auto text-left text-[13px] font-medium leading-snug text-foreground transition-colors hover:text-[var(--syntra-orange)]"
        title={`Jump to evidence for ${stage.techniqueId}`}
        aria-label={`${stage.techniqueName} — view evidence`}
      >
        {stage.techniqueName}
      </button>
      <StatusBadge status={stage.status} />
    </div>
  );
}

/** Terminal node rendered when evidence does not support further stages. */
function TerminalNode() {
  return (
    <div className="syn-chain-stage" data-status="terminal">
      <Ban className="size-4 shrink-0" aria-hidden="true" />
      <span>No Verified Evidence</span>
    </div>
  );
}

/**
 * The attack chain is SYNTRA's core analytical visual: it shows how far the
 * evidence actually supports the attack. On desktop the chain flows as a
 * serpentine ("snake"): up to 4 stages left→right, a down connector under the
 * row's last card, then the next row continues right→left, and so on — the
 * rows fold back on themselves so the sequence always reads as one flow.
 * Unsupported stages never continue the chain past a "No Verified Evidence"
 * terminal. On mobile it falls back to a simple top-to-bottom list.
 */
export function AttackChain({ stages, onOpenEvidence, onCopyTechniqueId }: AttackChainProps) {
  const display = useMemo(() => {
    const verified = stages.filter((s) => s.status !== "unverified" && s.status !== "insufficient");
    const unverified = stages.filter((s) => s.status === "unverified" || s.status === "insufficient");
    // Linear evidence-ordered node sequence, chunked into serpentine rows.
    const nodes: ChainNode[] = verified.map((stage) => ({
      kind: "stage" as const,
      key: stage.techniqueId,
      stage,
    }));
    if (unverified.length > 0) nodes.push({ kind: "terminal", key: "__terminal__" });
    const rows: ChainNode[][] = [];
    for (let i = 0; i < nodes.length; i += CARDS_PER_ROW) {
      rows.push(nodes.slice(i, i + CARDS_PER_ROW));
    }
    return { verified, unverified, rows };
  }, [stages]);

  if (stages.length === 0) return null;

  const hasUnverified = display.unverified.length > 0;

  return (
    <>
      {/* Desktop: serpentine chain (row 1 →, drop down, row 2 ←, drop down, …) */}
      <div className="syn-chain hidden lg:grid" role="list" aria-label="Attack chain">
        {display.rows.map((row, rowIndex) => {
          const rtl = rowIndex % 2 === 1;
          const gridRow = 2 * rowIndex + 1;
          return (
            <Fragment key={`row-${rowIndex}`}>
              {row.map((node, k) => (
                <Fragment key={node.key}>
                  {k > 0 && (
                    <div
                      className="syn-chain-arrow"
                      style={{ gridRow, gridColumn: arrowColumn(rowIndex, k - 1) }}
                      aria-hidden="true"
                    >
                      {rtl ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
                    </div>
                  )}
                  <div className="syn-chain-cell" style={{ gridRow, gridColumn: cardColumn(rowIndex, k) }} role="listitem">
                    {node.kind === "stage" ? (
                      <StageCard stage={node.stage} onOpenEvidence={onOpenEvidence} onCopyTechniqueId={onCopyTechniqueId} />
                    ) : (
                      <TerminalNode />
                    )}
                  </div>
                </Fragment>
              ))}
              {rowIndex < display.rows.length - 1 && (
                <div
                  className="syn-chain-arrow syn-chain-drop"
                  style={{ gridRow: gridRow + 1, gridColumn: cardColumn(rowIndex, row.length - 1) }}
                  aria-hidden="true"
                >
                  <ArrowDown className="size-4" />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Mobile/tablet: vertical chain */}
      <div className="syn-chain-vertical lg:hidden" role="list" aria-label="Attack chain, top to bottom">
        {display.verified.map((stage, i) => (
          <div key={stage.techniqueId} role="listitem" className="contents">
            <StageCard stage={stage} onOpenEvidence={onOpenEvidence} onCopyTechniqueId={onCopyTechniqueId} />
            {i < display.verified.length - 1 || hasUnverified ? (
              <div className="syn-chain-arrow" aria-hidden="true">
                <ArrowDown className="size-4" />
              </div>
            ) : null}
          </div>
        ))}
        {hasUnverified && <TerminalNode />}
        {/* Keep unverified-but-documented stages visible below the terminal */}
        {hasUnverified && (
          <div className="mt-2 flex flex-col gap-1.5" aria-label="Reported but unverified stages">
            {display.unverified.map((stage) => (
              <div key={stage.techniqueId} className="flex items-center gap-2">
                <span className="syn-technique-id">{stage.techniqueId}</span>
                <span className="text-xs text-muted-foreground">{stage.techniqueName}</span>
                <span className="ml-auto">
                  <StatusBadge status={stage.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
