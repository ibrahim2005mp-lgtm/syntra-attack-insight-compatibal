/**
 * Contract → render-model mapping.
 *
 * The wire format (contract.ts) is the server's; the render model
 * (types/investigation.ts) is the UI's. Mapping lives here — and only here —
 * so visual components stay free of transport parsing, and every policy
 * invariant (description visibility, evidence categories, honest statuses,
 * referential integrity) is applied in exactly one place.
 *
 * Mapping never *invents* content: nullable fields stay absent, and any
 * breach of the render contract degrades to an honest state instead of a
 * fabricated one.
 */
import type {
  ContractChainStage,
  ContractDetectionItem,
  ContractEntity,
  ContractEvidenceItem,
  ContractLabEnvironment,
  ContractMitigationItem,
  QueryResponseBody,
  QueryResultItem,
} from "./contract";
import type {
  AttackStage,
  DetectionItem,
  Entity,
  Evidence,
  EvidenceCategory,
  EvidenceStatus,
  InvestigationReport,
  InvestigationResult,
  LabEnvironment,
  LabPlatform,
  MitigationItem,
  Relationship,
  SourceRef,
} from "@/types/investigation";

/* ------------------------------ primitives ------------------------------ */

const ENTITY_KINDS: Set<string> = new Set([
  "threat_actor",
  "campaign",
  "malware",
  "technique",
  "cve",
  "cwe",
  "capec",
  "report",
]);

const EVIDENCE_STATUSES: Set<string> = new Set([
  "confirmed",
  "supported",
  "unverified",
  "insufficient",
]);

const LAB_PLATFORMS: Set<string> = new Set(["windows", "linux", "android"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function strArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, max);
}

function mapEvidenceStatus(value: unknown): EvidenceStatus | null {
  return typeof value === "string" && EVIDENCE_STATUSES.has(value) ? (value as EvidenceStatus) : null;
}

/** Every evidence item is categorized — untagged defaults to source. */
function mapCategory(value: unknown): EvidenceCategory {
  return value === "lab" ? "lab" : "source";
}

/* ------------------------------ description policy ------------------------------ */

/**
 * Description visibility policy: render a description only when the server
 * marked it source-supported AND actually returned one. When
 * `description_status` is `not_available_in_validated_source`, the section
 * is omitted entirely — no internal missingness markers, no generated
 * replacement.
 */
function applyDescriptionPolicy(entity: ContractEntity): { detail?: string } {
  if (entity.description_status !== "source_supported") return {};
  const description = str(entity.description);
  return description ? { detail: description } : {};
}

/* ------------------------------ item mappers ------------------------------ */

function mapEvidenceItem(item: ContractEvidenceItem): Evidence | null {
  if (!isRecord(item)) return null;
  const id = str(item.evidence_id);
  const refId = str(item.ref_id);
  const status = mapEvidenceStatus(item.status);
  const text = str(item.text);
  const sourceName = str(item.source_name);
  if (!id || !refId || !status || !text || !sourceName) return null;
  return {
    id,
    refId,
    status,
    category: mapCategory(item.category),
    sourceName,
    sourceUrl: str(item.source_url) ?? undefined,
    excerpt: text,
    provenance: str(item.provenance_type) ?? "Source relationship",
  };
}

function mapEntity(entity: ContractEntity): Entity | null {
  if (!isRecord(entity)) return null;
  const id = str(entity.id);
  const name = str(entity.name);
  if (!id || !name) return null;
  const type = typeof entity.type === "string" && ENTITY_KINDS.has(entity.type) ? entity.type : "technique";
  return {
    id,
    kind: type as Entity["kind"],
    label: name,
    ...applyDescriptionPolicy(entity),
  };
}

function mapRelationship(rel: ContractResultRelationship): Relationship | null {
  if (!isRecord(rel)) return null;
  const from = str(rel.from_id);
  const to = str(rel.to_id);
  if (!from || !to) return null;
  return { from, to, label: str(rel.relation_type) ?? undefined };
}

function mapChainStage(stage: ContractChainStage): AttackStage | null {
  if (!isRecord(stage)) return null;
  const techniqueId = str(stage.technique_id);
  const techniqueName = str(stage.technique_name);
  const tactic = str(stage.tactic);
  const status = mapEvidenceStatus(stage.status);
  if (!techniqueId || !techniqueName || !tactic || !status) return null;
  const description = str(stage.description);
  return {
    techniqueId,
    techniqueName,
    tactic,
    status,
    evidenceIds: strArray(stage.evidence_ids, 50),
    // Description policy: only source-supported text is rendered.
    ...(description ? { description } : {}),
    steps: strArray(stage.steps, 20).map((text) => ({ text })),
    labAvailable: stage.lab_available === true,
  };
}

function mapLab(lab: ContractLabEnvironment): LabEnvironment | null {
  if (!isRecord(lab)) return null;
  const labId = str(lab.lab_id);
  const techniqueId = str(lab.technique_id);
  if (!labId || !techniqueId) return null;
  const platform =
    typeof lab.platform === "string" && LAB_PLATFORMS.has(lab.platform) ? (lab.platform as LabPlatform) : "windows";
  return {
    id: labId,
    techniqueId,
    techniqueName: str(lab.technique_name) ?? "Documented Technique",
    available: lab.available === true,
    // Capability gating: metadata presence never implies launchability.
    launchable: lab.launchable === true,
    labType: str(lab.lab_type) ?? "Controlled Technique Validation",
    platform,
    runtimeEnvironment: str(lab.runtime_environment) ?? "Isolated Virtual Machine",
    networkMode: str(lab.network_mode) ?? "Isolated Lab Network",
    validationSource: str(lab.validation_source) ?? "SYNTRA Research Lab",
    objective: str(lab.objective) ?? "",
    estimatedDuration: str(lab.estimated_duration) ?? "",
    difficulty: str(lab.difficulty) ?? "",
    safetyBoundary: str(lab.safety_boundary) ?? "",
    sessionSteps: strArray(lab.session_steps, 20).map((text) => ({ text })),
    scenarioObjective: str(lab.scenario_objective) ?? "",
  };
}

/** Deduplicated, server-resolved source list built from evidence items. */
function mapSources(items: ContractEvidenceItem[]): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const id = str(item.source_id);
    const name = str(item.source_name);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    sources.push({
      id,
      name,
      url: str(item.source_url) ?? undefined,
      kind: str(item.provenance_type) ?? "Source",
    });
  }
  return sources;
}

function mapDetection(items: ContractDetectionItem[]): DetectionItem[] {
  const mapped: DetectionItem[] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const title = str(item.title);
    const description = str(item.description);
    if (!title || !description) continue;
    mapped.push({ title, description });
  }
  return mapped;
}

function mapMitigation(items: ContractMitigationItem[]): MitigationItem[] {
  const mapped: MitigationItem[] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const title = str(item.title);
    const description = str(item.description);
    if (!title || !description) continue;
    const id = str(item.id);
    mapped.push(id ? { id, title, description } : { title, description });
  }
  return mapped;
}

/** Loosely-typed wire aliases for the result collections. */
type ContractResultRelationship = QueryResultItem["relationships"][number];

/** Roll stage statuses into the honest aggregate for the whole report. */
function aggregateStatus(stages: AttackStage[]): EvidenceStatus {
  const statuses = stages.map((s) => s.status);
  if (statuses.length === 0) return "insufficient";
  if (statuses.every((s) => s === "confirmed")) return "confirmed";
  if (statuses.some((s) => s === "confirmed" || s === "supported")) return "supported";
  if (statuses.every((s) => s === "insufficient")) return "insufficient";
  return "unverified";
}

/* ------------------------------ result assembly ------------------------------ */

const MAX_EVIDENCE = 200;
const MAX_STAGES = 30;
const MAX_RELATIONSHIPS = 200;

/**
 * Map one successful result item to a full report. Referential integrity is
 * enforced here: stages referencing evidence the result does not carry lose
 * those references and degrade to "unverified" — the chain never claims
 * support it cannot show. Returns null when the payload cannot ground an
 * honest report (no summary, no supported stages or no evidence).
 */
function mapReport(item: QueryResultItem): InvestigationReport | null {
  const summary = str(item.summary);
  if (!summary) return null; // A brief without a server-provided summary would be fabrication.

  const evidence: Evidence[] = [];
  if (Array.isArray(item.evidence)) {
    for (const raw of item.evidence) {
      if (evidence.length >= MAX_EVIDENCE) break;
      const mapped = mapEvidenceItem(raw);
      if (mapped) evidence.push(mapped);
    }
  }
  if (evidence.length === 0) return null;
  const evidenceIds = new Set(evidence.map((e) => e.id));

  const stages: AttackStage[] = [];
  if (Array.isArray(item.attack_chain)) {
    for (const raw of item.attack_chain) {
      if (stages.length >= MAX_STAGES) break;
      const mapped = mapChainStage(raw);
      if (!mapped) continue;
      const supported = mapped.evidenceIds.filter((id) => evidenceIds.has(id));
      if (mapped.evidenceIds.length > 0 && supported.length === 0) {
        // Stage claims evidence the result does not carry: degrade honestly.
        stages.push({ ...mapped, status: "unverified", evidenceIds: [] });
        continue;
      }
      stages.push({ ...mapped, evidenceIds: supported });
    }
  }
  if (stages.length === 0) return null;

  const entity = isRecord(item.entity) ? mapEntity(item.entity) : null;
  const entities: Entity[] = entity ? [entity] : [];

  const relationships: Relationship[] = [];
  if (Array.isArray(item.relationships)) {
    for (const raw of item.relationships) {
      if (relationships.length >= MAX_RELATIONSHIPS) break;
      const mapped = mapRelationship(raw);
      if (mapped) relationships.push(mapped);
    }
  }

  const lab = isRecord(item.lab) ? mapLab(item.lab) : null;

  return {
    kind: "report",
    summary,
    entities,
    attackChain: stages,
    evidence,
    relationships,
    detection: mapDetection(Array.isArray(item.detection) ? item.detection : []),
    mitigation: mapMitigation(Array.isArray(item.mitigation) ? item.mitigation : []),
    missingEvidence: strArray(item.missing_evidence, 50),
    sources: mapSources(Array.isArray(item.evidence) ? item.evidence : []),
    evidenceStatus: aggregateStatus(stages),
    safetyStatus: "safe",
    ...(lab ? { lab } : {}),
  };
}

/* ------------------------------ response mapping ------------------------------ */

/** Safe-alternative fallbacks for refusals returned without suggestions. */
const SAFETY_ALTERNATIVE_FALLBACKS = [
  "Defensive analysis of the technique",
  "Detection opportunities and indicators",
  "Recommended mitigations and controls",
];

/**
 * Map a full query response to the render result. The outcome enum decides
 * the rendered kind; `ok` responses without a usable report degrade to
 * `insufficient_evidence` rather than fabricating one.
 */
export function mapQueryResponse(response: QueryResponseBody): InvestigationResult {
  switch (response.outcome) {
    case "safety_refused": {
      const refusal = isRecord(response.refusal) ? response.refusal : null;
      const message = refusal ? str(refusal.message) : null;
      if (!message) {
        return { kind: "out_of_domain", message: "This request cannot be processed." };
      }
      const alternatives = strArray(refusal?.alternatives, 8);
      return {
        kind: "safety",
        message,
        alternatives: alternatives.length > 0 ? alternatives : SAFETY_ALTERNATIVE_FALLBACKS,
        safetyStatus: "refused",
      };
    }
    case "no_results":
      return {
        kind: "no_results",
        message: "No relevant evidence was found in the available cybersecurity sources.",
      };
    case "out_of_domain":
      return {
        kind: "out_of_domain",
        message: "This question is outside the supported cybersecurity scope.",
      };
    case "insufficient_evidence":
      return {
        kind: "insufficient_evidence",
        message: "The available evidence is not sufficient to ground a complete report.",
      };
    case "ok":
    default: {
      const results = Array.isArray(response.results) ? response.results : [];
      const first = results.find((r) => isRecord(r));
      const report = first ? mapReport(first as QueryResultItem) : null;
      if (!report) {
        return {
          kind: "insufficient_evidence",
          message: "The backend reported success but returned no usable result payload.",
        };
      }
      return report;
    }
  }
}
