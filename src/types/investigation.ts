/** Shared SYNTRA domain types (frontend render model). */

export type EvidenceStatus =
  | "confirmed"
  | "supported"
  | "unverified"
  | "insufficient";

export type SafetyStatus = "safe" | "refused";

/** Result-state categories the UI renders as polished states. */
export type InvestigationResultKind =
  | "report" // full evidence-grounded report
  | "safety" // request not supported (policy)
  | "no_results"
  | "insufficient_evidence"
  | "out_of_domain";

export interface Evidence {
  id: string;
  /** Technique / claim this evidence supports, e.g. "T1059". */
  refId: string;
  status: EvidenceStatus;
  sourceName: string;
  sourceUrl?: string;
  /** Quote or extract from the source — rendered as plain text. */
  excerpt: string;
  /** How the claim relates to the source, e.g. "Direct source relationship". */
  provenance: string;
}

/** One concrete attacker step inside a technique. */
export interface TechniqueStep {
  text: string;
}

export interface AttackStage {
  /** MITRE-style technique identifier, e.g. "T1566". */
  techniqueId: string;
  techniqueName: string;
  /** Tactic / stage label, e.g. "Initial Access". */
  tactic: string;
  status: EvidenceStatus;
  /** Ordered evidence ids referencing Evidence.id. */
  evidenceIds: string[];
  /** One-line attacker behavior description for the detail cards. */
  description?: string;
  /** Ordered attacker steps (numbered in the render). */
  steps?: TechniqueStep[];
  /** Whether SYNTRA's lab can validate this technique in isolation. */
  labAvailable?: boolean;
}

export interface Entity {
  id: string;
  kind:
    | "threat_actor"
    | "campaign"
    | "malware"
    | "technique"
    | "cve"
    | "cwe"
    | "capec"
    | "report";
  label: string;
  detail?: string;
}

export interface Relationship {
  from: string;
  to: string;
  /** Edge label, e.g. "exploits", "uses". */
  label?: string;
}

export interface DetectionItem {
  /** What defenders should monitor, e.g. a log source or event pattern. */
  title: string;
  description: string;
}

export interface MitigationItem {
  /** Defensive action, often mapped to a MITRE mitigation (M...) id. */
  id?: string;
  title: string;
  description: string;
}

export interface SourceRef {
  id: string;
  name: string;
  url?: string;
  /** e.g. "MITRE ATT&CK", "CISA Advisory", "CTI Report". */
  kind: string;
}

/* ------------------------------ Lab model ------------------------------ */

export type LabPlatform = "windows" | "linux" | "android";

export interface LabSessionStep {
  /** Actor instruction, e.g. "Review the scenario and objective." */
  text: string;
}

export interface LabEnvironment {
  /** Lab id, e.g. "LAB-T1059". */
  id: string;
  /** Technique the lab validates, e.g. "T1059". */
  techniqueId: string;
  /** Technique the lab validates, e.g. "Command and Scripting Interpreter". */
  techniqueName: string;
  /** True when a lab exists for this technique. */
  available: boolean;
  /** e.g. "Controlled Technique Validation". */
  labType: string;
  /** Initially selected platform. */
  platform: LabPlatform;
  /** Human-readable runtime, e.g. "Windows Virtual Machine (VM)". */
  runtimeEnvironment: string;
  networkMode: string;
  validationSource: string;
  /** Objective sentence — safe, educational framing only. */
  objective: string;
  /** e.g. "10–15 Minutes". */
  estimatedDuration: string;
  difficulty: string;
  /** Safety boundary statement shown under the objective. */
  safetyBoundary: string;
  /** Ordered guided steps (1..6). */
  sessionSteps: LabSessionStep[];
  /** One-line scenario objective shown in the lab panel. */
  scenarioObjective: string;
}

export interface InvestigationReport {
  kind: "report";
  summary: string;
  entities: Entity[];
  attackChain: AttackStage[];
  evidence: Evidence[];
  relationships: Relationship[];
  detection: DetectionItem[];
  mitigation: MitigationItem[];
  missingEvidence: string[];
  sources: SourceRef[];
  evidenceStatus: EvidenceStatus;
  safetyStatus: SafetyStatus;
  /** Optional isolated-lab metadata for the validation sections. */
  lab?: LabEnvironment;
}

export type InvestigationResult =
  | InvestigationReport
  | { kind: "safety"; message: string; alternatives: string[]; safetyStatus: "refused" }
  | { kind: "no_results"; message: string }
  | { kind: "insufficient_evidence"; message: string }
  | { kind: "out_of_domain"; message: string };

/** One question + answer exchange inside a conversation thread. */
export interface Turn {
  /** Investigation document id (one per question). */
  id: string;
  question: string;
  createdAt: number;
  result: InvestigationResult;
}

/**
 * A conversation: one or more turns that share a thread id. Follow-up
 * questions asked in the workspace append to the same thread instead of
 * creating a new one.
 */
export interface Thread {
  /** Root thread id — every turn shares it; also the sidebar entry key. */
  threadId: string;
  /** Id of the newest turn (what the sidebar entry represents). */
  lastTurnId: string;
  turns: Turn[];
  createdAt: number;
  finishedAt: number;
}

export interface Investigation {
  id: string;
  /** Conversation thread this investigation belongs to. */
  threadId: string;
  question: string;
  createdAt: number;
  result: InvestigationResult;
  /** Sidebar title override (user rename). */
  title?: string;
  /** User-pinned investigations sort first in the sidebar. */
  pinned?: boolean;
  /** Archived investigations are hidden from the sidebar list. */
  archived?: boolean;
}

/**
 * Sidebar / History entry: represents one conversation thread by its newest
 * turn, so follow-up questions never duplicate the entry.
 */
export interface HistoryItem {
  /** Representative turn id (newest in the thread). */
  id: string;
  /** Stable thread key — restoring uses this. */
  threadId: string;
  question: string;
  createdAt: number;
  evidenceStatus: EvidenceStatus;
  /** Number of turns in the conversation (>= 1). */
  turnCount: number;
  /** True when the user pinned this conversation. */
  pinned?: boolean;
  /** True when the user archived this conversation. */
  archived?: boolean;
}

export const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  confirmed: "Confirmed",
  supported: "Supported",
  unverified: "Unverified",
  insufficient: "Insufficient Evidence",
};

export const ENTITY_KIND_LABEL: Record<Entity["kind"], string> = {
  threat_actor: "Threat Actor",
  campaign: "Campaign",
  malware: "Malware",
  technique: "Technique",
  cve: "CVE",
  cwe: "CWE",
  capec: "CAPEC",
  report: "CTI Report",
};

export const LAB_PLATFORM_LABEL: Record<LabPlatform, string> = {
  windows: "Windows",
  linux: "Linux",
  android: "Android",
};
