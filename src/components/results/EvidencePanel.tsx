import { ExternalLink, FileText, FlaskConical, LinkIcon, ShieldQuestion, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { NeutralBadge, StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { validateExternalUrl, safeUrlLabel } from "@/security/urlValidation";
import type { Evidence } from "@/types/investigation";

/** Evidence provenance descriptor, rendered in white like the source row. */
function ProvenanceBadge({ provenance }: { provenance: string }) {
  return (
    <span className="syn-badge syn-badge-neutral !text-foreground">{provenance}</span>
  );
}

/**
 * Evidence category marker — Source Evidence and Observed Lab Evidence are
 * never ambiguous: distinct icon, label and badge style, applied to every
 * card so lab telemetry can never masquerade as historical reporting.
 */
function CategoryBadge({ category }: { category: NonNullable<Evidence["category"]> }) {
  if (category === "lab") {
    return (
      <span className="syn-badge syn-badge-lab" title="Observed Lab Evidence — telemetry from SYNTRA's isolated lab, not historical source reporting">
        <FlaskConical className="size-3" aria-hidden="true" />
        Lab Evidence
      </span>
    );
  }
  return (
    <span className="syn-badge syn-badge-source" title="Source Evidence — historical reporting from validated sources">
      <FileText className="size-3" aria-hidden="true" />
      Source Evidence
    </span>
  );
}

function EvidenceCard({ item, highlighted }: { item: Evidence; highlighted?: boolean }) {
  const urlCheck = validateExternalUrl(item.sourceUrl);
  return (
    <article className={cn("syn-card p-3", highlighted && "syn-evidence-highlight")}>
      <div className="flex flex-wrap items-center gap-2">
        {item.refId && <span className="syn-technique-id">{item.refId}</span>}
        <CategoryBadge category={item.category ?? "source"} />
        <span className="truncate text-xs font-medium text-foreground">{item.sourceName}</span>
        <span className="ml-auto shrink-0">
          <StatusBadge status={item.status} />
        </span>
      </div>

      <blockquote className="syn-excerpt mt-2.5">“{item.excerpt}”</blockquote>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-foreground">
        <span className="inline-flex items-center gap-1">
          <FileText className="size-3" aria-hidden="true" />
          Source
        </span>
        <span className="font-medium text-foreground">{item.sourceName}</span>
        {item.provenance && <ProvenanceBadge provenance={item.provenance} />}
        <span className="ml-auto">
          {urlCheck.ok ? (
            <a
              href={urlCheck.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 rounded font-medium text-[var(--syntra-orange)] hover:underline"
            >
              <ExternalLink className="size-3" aria-hidden="true" />
              View Source
            </a>
          ) : (
            <span className="inline-flex items-center gap-1" title="Link withheld: source is not on the verified allowlist">
              <LinkIcon className="size-3" aria-hidden="true" />
              {safeUrlLabel(item.sourceUrl ?? "")}
            </span>
          )}
        </span>
      </div>
    </article>
  );
}

interface EvidencePanelProps {
  title: string;
  items: Evidence[];
  onClose?: () => void;
}

/**
 * Evidence context for one attack-chain stage (or a selection). Desktop shows
 * a side context panel; on small screens the parent view renders it inline
 * below the chain (accordion pattern).
 */
export function EvidencePanel({ title, items, onClose, highlightRefId }: EvidencePanelProps & { highlightRefId?: string | null }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 3);

  if (items.length === 0) {
    return (
      <aside className="syn-card p-4" aria-label="Evidence">
        <div className="flex items-center gap-2">
          <ShieldQuestion className="size-4 text-[var(--syntra-amber)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {onClose && (
            <button type="button" onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Close evidence">
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          No evidence records are associated with this selection.
        </p>
      </aside>
    );
  }

  return (
    <aside className="syn-card p-4" aria-label="Evidence">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <NeutralBadge orange>{items.length}</NeutralBadge>
        {onClose && (
          <button type="button" onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Close evidence">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {visible.map((item) => (
          <EvidenceCard key={item.id} item={item} highlighted={highlightRefId != null && item.refId === highlightRefId} />
        ))}
      </div>

      {items.length > 3 && (
        <button
          type="button"
          className="mt-3 w-full rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--syntra-orange)] hover:text-foreground"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
        >
          {showAll ? "Show less" : `Show all ${items.length} evidence records`}
        </button>
      )}
    </aside>
  );
}

/** Inline, always-visible list used by the full Evidence section. */
export function EvidenceList({ items, highlightRefId }: { items: Evidence[]; highlightRefId?: string | null }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <Fragment key={item.id}>
          <EvidenceCard item={item} highlighted={highlightRefId != null && item.refId === highlightRefId} />
        </Fragment>
      ))}
    </div>
  );
}

/** Convenience hook-like helper kept internal to evidence rendering. */
export function useEvidenceCount(items: Evidence[]): number {
  return useMemo(() => items.length, [items]);
}
