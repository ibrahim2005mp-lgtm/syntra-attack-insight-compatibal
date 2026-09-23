/**
 * Demo prompt for showing how the SYNTRA frontend responds.
 *
 * A demonstration entry point only: it maps to the full-report response
 * state produced by the development corpus. It appears on the empty
 * investigation screen as clearly labeled demo data — never as fabricated
 * results or promotional example content.
 */
import { FileText, type LucideIcon } from "lucide-react";

export interface DemoPrompt {
  id: string;
  /** Short chip label. */
  label: "Full report";
  /** The literal question the demo runs. */
  question: string;
  /** One-line description of what the demo demonstrates. */
  hint: string;
  icon: LucideIcon;
}

export const DEMO_PROMPTS: DemoPrompt[] = [
  {
    id: "demo-full",
    label: "Full report",
    question: "Investigate APT3 campaign techniques",
    hint: "Confirmed chain with evidence, entities, detection and missing evidence.",
    icon: FileText,
  },
];

/** Group heading shown above the demo strip. */
export const DEMO_HEADING = "See how SYNTRA responds";
/** Small print clarifying this is a sample entry point, not a canned result. */
export const DEMO_NOTE =
  "Demo data — the sample runs a real investigation against the development corpus.";
