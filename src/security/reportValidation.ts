/**
 * Full-report validation layer.
 *
 * A "full report" is SYNTRA's richest result kind: it claims an
 * evidence-grounded attack chain, evidence records, entities, detection and
 * mitigation guidance, and sources. Anything that claims `kind: "report"`
 * must actually satisfy that contract before the UI renders it — otherwise
 * a broken/hand-crafted result would render as an authoritative brief.
 *
 * Like every module in src/security, the input is treated as untrusted:
 * shapes, enums and cross-references are verified explicitly, and the
 * validator never throws — it returns a discriminated result.
 */
import type {
  AttackStage,
  InvestigationReport,
  InvestigationResult,
} from "@/types/investigation";

export type ReportValidation =
  | { valid: true; report: InvestigationReport }
  | { valid: false; reason: string };

const EVIDENCE_STATUSES = new Set(["confirmed", "supported", "unverified", "insufficient"]);
const SAFETY_STATUSES = new Set(["safe", "refused"]);
const EVIDENCE_CATEGORIES = new Set(["source", "lab"]);
const ENTITY_KINDS = new Set([
  "threat_actor",
  "campaign",
  "malware",
  "technique",
  "cve",
  "cwe",
  "capec",
  "report",
]);
const LAB_PLATFORMS = new Set(["windows", "linux", "android"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, max: number): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isStringArray(value: unknown, maxItems: number): boolean {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string")
  );
}

function isStatus(value: unknown): value is AttackStage["status"] {
  return typeof value === "string" && EVIDENCE_STATUSES.has(value);
}

/* ----------------------------- section checks ----------------------------- */

function validateStage(stage: unknown): boolean {
  if (!isRecord(stage)) return false;
  return (
    isNonEmptyString(stage.techniqueId, 40) &&
    isNonEmptyString(stage.techniqueName, 160) &&
    isNonEmptyString(stage.tactic, 80) &&
    isStatus(stage.status) &&
    isStringArray(stage.evidenceIds, 50)
  );
}

function validateEvidence(item: unknown): boolean {
  if (!isRecord(item)) return false;
  return (
    isNonEmptyString(item.id, 60) &&
    isNonEmptyString(item.refId, 60) &&
    isStatus(item.status) &&
    // Category is optional (defaults to source) but must be a valid enum.
    (item.category === undefined || (typeof item.category === "string" && EVIDENCE_CATEGORIES.has(item.category))) &&
    isNonEmptyString(item.sourceName, 160) &&
    isNonEmptyString(item.excerpt, 2000) &&
    isNonEmptyString(item.provenance, 160) &&
    (item.sourceUrl === undefined || typeof item.sourceUrl === "string")
  );
}

function validateEntity(entity: unknown): boolean {
  if (!isRecord(entity)) return false;
  return (
    isNonEmptyString(entity.id, 60) &&
    typeof entity.kind === "string" &&
    ENTITY_KINDS.has(entity.kind) &&
    isNonEmptyString(entity.label, 160)
  );
}

/**
 * Relationships are display edges: `from`/`to` render as plain text (they
 * may reference entities by id, label, or tactic name), so only shape and
 * bounds are enforced — not entity resolution.
 */
function validateRelationship(rel: unknown): boolean {
  if (!isRecord(rel)) return false;
  return (
    isNonEmptyString(rel.from, 160) &&
    isNonEmptyString(rel.to, 160) &&
    (rel.label === undefined || isNonEmptyString(rel.label, 80))
  );
}

function validateGuidanceItem(item: unknown, hasOptionalId: boolean): boolean {
  if (!isRecord(item)) return false;
  return (
    (!hasOptionalId || item.id === undefined || isNonEmptyString(item.id, 40)) &&
    isNonEmptyString(item.title, 200) &&
    isNonEmptyString(item.description, 1000)
  );
}

function validateSource(source: unknown): boolean {
  if (!isRecord(source)) return false;
  return (
    isNonEmptyString(source.id, 60) &&
    isNonEmptyString(source.name, 200) &&
    isNonEmptyString(source.kind, 60) &&
    (source.url === undefined || typeof source.url === "string")
  );
}

function validateLab(lab: unknown): boolean {
  if (!isRecord(lab)) return false;
  return (
    isNonEmptyString(lab.id, 40) &&
    isNonEmptyString(lab.techniqueId, 40) &&
    typeof lab.available === "boolean" &&
    // Launch capability is optional and must be boolean when present —
    // it is never inferred from metadata by the validator or UI.
    (lab.launchable === undefined || typeof lab.launchable === "boolean") &&
    typeof lab.platform === "string" &&
    LAB_PLATFORMS.has(lab.platform) &&
    Array.isArray(lab.sessionSteps) &&
    lab.sessionSteps.length <= 20
  );
}

/**
 * Validate that a result is a well-formed full report. Any result whose kind
 * is not "report" fails with reason "not_a_report" — use `ensureFullReport`
 * for the policy decision of what to do about that.
 */
export function validateFullReport(result: unknown): ReportValidation {
  if (!isRecord(result)) return { valid: false, reason: "not_an_object" };
  if (result.kind !== "report") return { valid: false, reason: "not_a_report" };

  const report = result as unknown as InvestigationReport;

  if (!isNonEmptyString(report.summary, 2000)) {
    return { valid: false, reason: "missing_summary" };
  }
  if (!Array.isArray(report.attackChain) || report.attackChain.length === 0) {
    return { valid: false, reason: "empty_attack_chain" };
  }
  if (report.attackChain.length > 30 || !report.attackChain.every(validateStage)) {
    return { valid: false, reason: "invalid_attack_chain" };
  }
  if (!Array.isArray(report.evidence) || report.evidence.length === 0) {
    return { valid: false, reason: "empty_evidence" };
  }
  if (report.evidence.length > 200 || !report.evidence.every(validateEvidence)) {
    return { valid: false, reason: "invalid_evidence" };
  }

  // Referential integrity: every chain stage must reference real evidence.
  const evidenceIds = new Set(report.evidence.map((e) => e.id));
  const referenced = new Set(report.attackChain.flatMap((s) => s.evidenceIds));
  for (const id of referenced) {
    if (!evidenceIds.has(id)) return { valid: false, reason: "dangling_evidence_reference" };
  }

  if (
    !Array.isArray(report.entities) ||
    report.entities.length === 0 ||
    report.entities.length > 100 ||
    !report.entities.every(validateEntity)
  ) {
    return { valid: false, reason: "invalid_entities" };
  }

  if (
    !Array.isArray(report.relationships) ||
    report.relationships.length > 200 ||
    !report.relationships.every(validateRelationship)
  ) {
    return { valid: false, reason: "invalid_relationships" };
  }

  if (
    !Array.isArray(report.detection) ||
    report.detection.length === 0 ||
    report.detection.length > 50 ||
    !report.detection.every((item) => validateGuidanceItem(item, false))
  ) {
    return { valid: false, reason: "invalid_detection" };
  }
  if (
    !Array.isArray(report.mitigation) ||
    report.mitigation.length === 0 ||
    report.mitigation.length > 50 ||
    !report.mitigation.every((item) => validateGuidanceItem(item, true))
  ) {
    return { valid: false, reason: "invalid_mitigation" };
  }
  if (
    !Array.isArray(report.missingEvidence) ||
    report.missingEvidence.length > 50 ||
    !report.missingEvidence.every((m) => typeof m === "string")
  ) {
    return { valid: false, reason: "invalid_missing_evidence" };
  }
  if (
    !Array.isArray(report.sources) ||
    report.sources.length === 0 ||
    report.sources.length > 50 ||
    !report.sources.every(validateSource)
  ) {
    return { valid: false, reason: "invalid_sources" };
  }
  if (!EVIDENCE_STATUSES.has(report.evidenceStatus) || !SAFETY_STATUSES.has(report.safetyStatus)) {
    return { valid: false, reason: "invalid_status" };
  }
  if (report.lab !== undefined && !validateLab(report.lab)) {
    return { valid: false, reason: "invalid_lab" };
  }

  return { valid: true, report };
}

/** Quick boolean check for call sites that only need pass/fail. */
export function isFullReport(result: unknown): result is InvestigationReport {
  return validateFullReport(result).valid;
}

/**
 * Policy: results claiming to be full reports must validate, otherwise they
 * degrade to an honest "insufficient evidence" state — never a broken brief.
 * Non-report kinds (safety refusals, out-of-domain, …) pass through intact.
 */
export function enforceFullReportPolicy(result: InvestigationResult): InvestigationResult {
  if (result.kind !== "report") return result;
  const check = validateFullReport(result);
  if (check.valid) return check.report;
  if (import.meta.env.DEV) {
    console.warn(`[security] report rejected (${check.reason}); degrading to insufficient_evidence.`);
  }
  return {
    kind: "insufficient_evidence",
    message:
      "The investigation could not be assembled into a complete evidence-grounded report. Try rephrasing the question.",
  };
}
