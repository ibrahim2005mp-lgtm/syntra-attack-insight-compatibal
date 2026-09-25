/**
 * SYNTRA backend API contract — v1.
 *
 * Aligned to the frontend integration handoff: the browser consumes a
 * normalized, purpose-built API response and never needs to understand
 * internal ranking channels, caches, embedding details, or local file
 * paths. The contract distinguishes its answer from retrieved candidates,
 * and every evidence item carries stable identity and provenance.
 *
 * This module defines types ONLY. Transport (client.ts), contract→render
 * mapping (mapping.ts) and engine selection (adapter.ts) live beside it.
 * The wire shapes mirror the handoff's proposed query response and stay
 * deliberately conservative: nullable optional fields, explicit status
 * enums, and stable ids everywhere.
 */

/** API version prefix used by every route in this contract. */
export const API_VERSION = "v1";

/* ------------------------------ error model ------------------------------ */

/**
 * Explicit API failure semantics. The report forbids overloading
 * `results: []` to mean "no match", "backend unavailable" and "request
 * failed" — so each of those is its own machine-readable status.
 */
export type ApiErrorCode =
  | "invalid_input" // request failed client/server validation
  | "rate_limited" // too many requests; retry later
  | "dependency_unavailable" // retrieval/backend dependency is down
  | "not_found" // unknown entity/thread/turn id
  | "internal_error"; // unexpected server failure

export interface ApiError {
  error: true;
  code: ApiErrorCode;
  /** Human-readable, safe-to-render message (no stack traces). */
  message: string;
  /** Server-generated correlation id, when available. */
  request_id?: string;
  /** ISO-8601 timestamp. */
  generated_at?: string;
}

/* ------------------------------ health ------------------------------ */

export interface HealthResponse {
  status: "ok" | "degraded";
  /** Availability of the retrieval pipeline and its dependencies. */
  dependencies: {
    retrieval: boolean;
    /** Response generation may not exist yet — reported separately. */
    answer_generation: boolean;
    /** Lab orchestration may not exist yet — reported separately. */
    lab_orchestration: boolean;
  };
  retrieval_version?: string;
  generated_at: string;
}

/* ------------------------------ query ------------------------------ */

export interface QueryRequestBody {
  query: string;
  /** Server decides what full-report assembly means; the flag is advisory. */
  mode?: "standard" | "full_report";
}

/**
 * How the claim/evidence relate, as returned by the server. Values mirror
 * the canonical provenance types plus the honesty statuses the UI renders.
 */
export type ContractEvidenceStatus =
  | "confirmed"
  | "supported"
  | "unverified"
  | "insufficient";

/** Evidence category on the wire: historical source vs observed lab. */
export type ContractEvidenceCategory = "source" | "lab";

export interface ContractEvidenceItem {
  evidence_id: string;
  /** Technique/entity id this evidence supports, e.g. "T1059". */
  ref_id: string;
  status: ContractEvidenceStatus;
  category: ContractEvidenceCategory;
  /** Source-supported excerpt. The server applies description policy. */
  text: string;
  source_id: string | null;
  source_name: string;
  /** Public URL when one is allowlisted; null means reference-only. */
  source_url: string | null;
  /** Server-resolved reference (never a local filesystem path). */
  source_ref: string | null;
  evidence_ref: string | null;
  provenance_type: string;
}

export interface ContractEntity {
  id: string;
  type: string;
  name: string;
  taxonomy: string | null;
  /** Omitted server-side when description_status says unavailable. */
  description: string | null;
  description_status: "source_supported" | "not_available_in_validated_source";
}

/** A returned, evidence-backed relationship edge (never client-inferred). */
export interface ContractRelationship {
  relationship_id: string;
  from_id: string;
  relation_type: string;
  to_id: string;
  /** Evidentiary provenance preserved for detail views. */
  provenance_type: string;
}

/** One supported attack-chain stage with its evidence references. */
export interface ContractChainStage {
  technique_id: string;
  technique_name: string;
  tactic: string;
  status: ContractEvidenceStatus;
  /** Ordered evidence ids into the result's evidence array. */
  evidence_ids: string[];
  description: string | null;
  steps: string[];
  /** Whether the backend has a lab catalog entry for this technique. */
  lab_available: boolean;
}

export interface ContractDetectionItem {
  title: string;
  description: string;
}

export interface ContractMitigationItem {
  id: string | null;
  title: string;
  description: string;
}

export interface ContractLabEnvironment {
  lab_id: string;
  technique_id: string;
  technique_name: string;
  /** Catalog entry exists. */
  available: boolean;
  /**
   * True ONLY when the backend confirms an authorized, isolated, ready
   * target supporting audited launch. Static metadata alone never sets it.
   */
  launchable: boolean;
  lab_type: string;
  platform: "windows" | "linux" | "android";
  runtime_environment: string;
  network_mode: string;
  validation_source: string;
  objective: string;
  estimated_duration: string;
  difficulty: string;
  safety_boundary: string;
  session_steps: string[];
  scenario_objective: string;
}

/**
 * One ranked result. `rank` gives stable ordering; ids remain stable while
 * evidence/details expand or collapse.
 */
export interface QueryResultItem {
  rank: number;
  entity: ContractEntity;
  evidence: ContractEvidenceItem[];
  /** Returned, evidence-backed edges only (may be empty). */
  relationships: ContractRelationship[];
  /** Returned, evidence-supported chain stages (may be a partial chain). */
  attack_chain: ContractChainStage[];
  detection: ContractDetectionItem[];
  mitigation: ContractMitigationItem[];
  /** Explicit "what the evidence does not support" statements. */
  missing_evidence: string[];
  /** Summary assembled server-side from supported evidence. */
  summary: string | null;
  /** Optional lab metadata. `available` does not imply `launchable`. */
  lab: ContractLabEnvironment | null;
}

/** Honest no-result states, each distinct from errors. */
export type QueryOutcome =
  | "ok" // full result payload present
  | "no_results" // query was in scope but nothing matched
  | "out_of_domain" // query is outside the cybersecurity scope
  | "insufficient_evidence" // matched but evidence cannot ground a brief
  | "safety_refused"; // controlled-use policy refusal

export interface QueryResponseBody {
  request_id: string;
  query: string;
  status: "ok" | "empty";
  outcome: QueryOutcome;
  /**
   * Grounded narrative answer from a validated generation service.
   * `null` is preferable to invented prose when no such service exists —
   * the UI must not assemble one from snippets.
   */
  answer: string | null;
  /** Honest uncertainty statement, when the server returns one. */
  uncertainty: string | null;
  /** Populated when outcome === "ok"; otherwise empty. */
  results: QueryResultItem[];
  /** Refusal message + safe alternatives when outcome === "safety_refused". */
  refusal: { message: string; alternatives: string[] } | null;
  meta: {
    retrieval_version: string;
    generated_at: string;
  };
}

/* ------------------------------ entity detail ------------------------------ */

export interface EntityDetailResponse {
  request_id: string;
  entity: ContractEntity;
  /** Server-resolved source objects for citations. */
  sources: Array<{
    source_id: string;
    name: string;
    url: string | null;
    kind: string;
  }>;
  provenance: Array<{
    provenance_id: string;
    provenance_type: string;
    source_name: string;
    source_ref: string | null;
    source_url: string | null;
    version_or_date: string | null;
  }>;
  /** Supported relationships involving this entity (with direction). */
  relationships: ContractRelationship[];
  generated_at: string;
}

/* ------------------------------ lab catalog ------------------------------ */

/** Catalog availability/state — never a launch authorization. */
export interface LabCatalogItem {
  lab_id: string;
  technique_id: string;
  technique_name: string;
  available: boolean;
  launchable: boolean;
  platform: "windows" | "linux" | "android";
  validation_source: string;
}

export interface LabCatalogResponse {
  labs: LabCatalogItem[];
  generated_at: string;
}
