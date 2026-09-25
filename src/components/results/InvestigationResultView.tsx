import {
  ChevronDown,
  ClipboardList,
  Cpu,
  Fingerprint,
  Link2,
  MonitorCog,
  Users,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { AttackChain } from "./AttackChain";
import { Detection, Mitigation } from "./DefenseSections";
import { IdentifiedEntities } from "./IdentifiedEntities";
import { LabEnvironmentOverview, IsolatedLab, LabValidation } from "./LabSections";
import { TechniqueDetails } from "./TechniqueDetails";
import { SourceList } from "./SourceList";
import { EvidenceList } from "./EvidencePanel";
import type { InvestigationReport, LabPlatform } from "@/types/investigation";

/**
 * DOM id prefix for the Evidence & Sources section. Each result view
 * instance derives its own unique id from this, so a technique-name click
 * in one conversation turn scrolls to that turn's evidence section — not
 * to an older exchange's section that happens to share the id.
 */
const EVIDENCE_SECTION_ID_PREFIX = "syn-evidence-section";

function Section({
  num,
  icon,
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  sectionId,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  sectionId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const header = (
    <div className="syn-section-title">
      <span className="syn-section-num">{num}</span>
      {icon}
      <span className="transition-colors group-hover:text-foreground">{title}</span>
      {collapsible && (
        <span className="ml-auto">
          <ChevronDown className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
        </span>
      )}
    </div>
  );

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <section id={sectionId} className="flex flex-col gap-3 scroll-mt-4">
      {collapsible ? (
        <button
          type="button"
          className="group w-full rounded-md py-0.5 text-left"
          onClick={toggle}
          aria-expanded={open}
        >
          {header}
        </button>
      ) : (
        header
      )}
      {open && children}
    </section>
  );
}

export interface ResultViewCallbacks {
  onCopyTechniqueId: (id: string) => void;
  onDraftQuestion: (q: string) => void;
}

/**
 * Structured investigation report, laid out as a numbered intelligence
 * brief: what the evidence supports → who is involved → how the attack
 * connects → technique specifics → defense → provenance → lab validation.
 */
export function InvestigationResultView({
  report,
  callbacks,
}: {
  report: InvestigationReport;
  callbacks: ResultViewCallbacks;
}) {
  /** Unique, per-turn DOM id for this view's Evidence & Sources section. */
  const evidenceSectionId = `${EVIDENCE_SECTION_ID_PREFIX}-${useId()}`;
  /** Technique currently targeted by a name click — drives evidence highlight. */
  const [highlightedRefId, setHighlightedRefId] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);
  /** Lab platform chosen in the environment overview (defaults to recommendation). */
  const [labPlatform, setLabPlatform] = useState<LabPlatform | null>(null);

  /**
   * Jump to THIS turn's Evidence & Sources section and briefly highlight
   * the clicked technique's evidence records. The section is always
   * expanded, so only the scroll and highlight are needed.
   */
  const handleOpenStageEvidence = useCallback((stage: { techniqueId: string }) => {
    if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    setHighlightedRefId(stage.techniqueId);
    highlightTimer.current = window.setTimeout(() => {
      setHighlightedRefId(null);
      highlightTimer.current = null;
    }, 2400);

    document
      .getElementById(evidenceSectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [evidenceSectionId]);

  return (
    <div className="flex flex-col gap-8">
      {/* 01 — Summary */}
      <Section num="01" icon={<Fingerprint className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Summary">
        <div className="syn-card p-4">
          <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>
        </div>
      </Section>

      {/* 02 — Identified Entities */}
      <Section num="02" icon={<Users className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Identified Entities">
        <IdentifiedEntities entities={report.entities} relationships={report.relationships} />
      </Section>

      {/* 03 — Attack Chain Overview. Clicking a technique name jumps to the
          Evidence & Sources section and highlights that technique's records. */}
      <Section num="03" icon={<Link2 className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Attack Chain Overview">
        <div className="min-w-0 flex flex-col gap-3">
          <AttackChain stages={report.attackChain} onOpenEvidence={handleOpenStageEvidence} onCopyTechniqueId={callbacks.onCopyTechniqueId} />
          <div className="syn-card flex flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-3">
            <p className="syn-detail-label !mt-0">Chain Details</p>
            <span className="text-xs text-muted-foreground">
              Total Techniques:{" "}
              <span className="syn-mono font-semibold text-foreground">{report.attackChain.length}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Evidence Records:{" "}
              <span className="syn-mono font-semibold text-foreground">{report.evidence.length}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Sources:{" "}
              <span className="syn-mono font-semibold text-foreground">{report.sources.length}</span>
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-semibold text-[var(--syntra-success)]">
                Evidence-Grounded ✓
              </span>
            </span>
          </div>
        </div>
      </Section>

      {/* 04 — Technique Details & Steps */}
      <Section num="04" icon={<Cpu className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Technique Details & Steps">
        <TechniqueDetails
          stages={report.attackChain}
          evidence={report.evidence}
          onOpenEvidence={handleOpenStageEvidence}
          onCopyTechniqueId={callbacks.onCopyTechniqueId}
        />
      </Section>

      {/* 05 — Detection & Mitigation */}
      <Section num="05" icon={<MonitorCog className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Detection & Mitigation">
        <div className="grid gap-4 md:grid-cols-2">
          <Detection items={report.detection} />
          <Mitigation items={report.mitigation} />
        </div>
      </Section>

      {/* 06 — Evidence & Sources (always visible; scroll target for
          technique-name clicks) */}
      <Section
        sectionId={evidenceSectionId}
        num="06"
        icon={<ClipboardList className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />}
        title="Evidence & Sources"
      >
        <div className="flex flex-col gap-4">
          <EvidenceList items={report.evidence} highlightRefId={highlightedRefId} />
          <SourceList sources={report.sources} />
        </div>
      </Section>

      {/* 07/08 — Lab validation (only when the backend provides a lab) */}
      {report.lab && (
        <>
          <Section num="07" icon={<Cpu className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Controlled Attack Validation">
            <LabValidation lab={report.lab} selectedPlatform={labPlatform ?? report.lab.platform} />
          </Section>
          <Section num="08" icon={<MonitorCog className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Isolated Lab Environment">
            <div className="flex flex-col gap-4">
              <LabEnvironmentOverview
                lab={report.lab}
                selectedPlatform={labPlatform ?? report.lab.platform}
                onSelectPlatform={setLabPlatform}
              />
              <IsolatedLab lab={report.lab} selectedPlatform={labPlatform ?? report.lab.platform} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
