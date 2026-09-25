import { describe, expect, it } from "vitest";
import { isFullReport, validateFullReport } from "@/security/reportValidation";
import { DOMAIN_MATCHERS, SAFETY_MATCHERS } from "@/mock/corpus";
import { mapQueryResponse } from "@/api/v1/mapping";
import type { QueryResponseBody, QueryResultItem } from "@/api/v1/contract";
import type { InvestigationReport } from "@/types/investigation";

function okResponse(results: QueryResultItem[]): QueryResponseBody {
  return {
    request_id: "req-1",
    query: "test",
    status: "ok",
    outcome: "ok",
    answer: null,
    uncertainty: null,
    results,
    refusal: null,
    meta: { retrieval_version: "test-1", generated_at: "2026-09-25T00:00:00Z" },
  };
}

function validResultItem(): QueryResultItem {
  return {
    rank: 1,
    entity: {
      id: "T1059",
      type: "technique",
      name: "Command and Scripting Interpreter",
      taxonomy: "MITRE ATT&CK",
      description: null,
      description_status: "not_available_in_validated_source",
    },
    evidence: [
      {
        evidence_id: "EV-1",
        ref_id: "T1059",
        status: "confirmed",
        category: "source",
        text: "Adversaries may abuse command and script interpreters to execute commands.",
        source_id: "S-1",
        source_name: "MITRE ATT&CK — T1059",
        source_url: "https://attack.mitre.org/techniques/T1059/",
        source_ref: "attack/T1059",
        evidence_ref: null,
        provenance_type: "source-derived",
      },
    ],
    relationships: [],
    attack_chain: [
      {
        technique_id: "T1059",
        technique_name: "Command and Scripting Interpreter",
        tactic: "Execution",
        status: "confirmed",
        evidence_ids: ["EV-1"],
        description: null,
        steps: ["Execute a command or script"],
        lab_available: false,
      },
    ],
    detection: [{ title: "Command-line telemetry", description: "Monitor process creation events." }],
    mitigation: [{ id: "M1038", title: "Execution Prevention", description: "Deny execution of unauthorized interpreters." }],
    missing_evidence: ["No attribution evidence available."],
    summary: "Evidence confirms command and scripting interpreter usage.",
    lab: null,
  };
}

describe("full-report validation against the demo corpus", () => {
  it("accepts every corpus report", () => {
    const results = [...SAFETY_MATCHERS, ...DOMAIN_MATCHERS].map((m) => m.build());
    const reports = results.filter((r) => r.kind === "report");
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      expect(isFullReport(report), validateFullReport(report).valid ? "" : (validateFullReport(report) as { reason: string }).reason).toBe(true);
    }
  });

  it("rejects a report with a dangling evidence reference", () => {
    const report = DOMAIN_MATCHERS.map((m) => m.build()).find((r) => r.kind === "report");
    if (!report || report.kind !== "report") return;
    const broken = { ...report, attackChain: [{ ...report.attackChain[0], evidenceIds: ["NOPE"] }] };
    expect(validateFullReport(broken)).toMatchObject({ valid: false, reason: "dangling_evidence_reference" });
  });

  it("accepts evidence with a valid category and rejects an unknown one", () => {
    const report = DOMAIN_MATCHERS.map((m) => m.build()).find((r) => r.kind === "report");
    if (!report || report.kind !== "report") return;
    const labCategorized = {
      ...report,
      evidence: report.evidence.map((e) => ({ ...e, category: "lab" as const })),
    };
    expect(isFullReport(labCategorized)).toBe(true);
    const invalidCategory = {
      ...report,
      evidence: [{ ...report.evidence[0], category: "rumor" }],
    };
    expect(validateFullReport(invalidCategory).valid).toBe(false);
  });
});

describe("query response mapping (contract → render model)", () => {
  it("maps a valid ok response into a full report with stable identity", () => {
    const result = mapQueryResponse(okResponse([validResultItem()]));
    expect(result.kind).toBe("report");
    if (result.kind !== "report") return;
    expect(result.attackChain[0].techniqueId).toBe("T1059");
    expect(result.evidence[0].id).toBe("EV-1");
    expect(result.sources.some((s) => s.id === "S-1")).toBe(true);
  });

  it("omits descriptions when description_status is not source-supported", () => {
    const result = mapQueryResponse(okResponse([validResultItem()]));
    if (result.kind !== "report") return;
    expect(result.entities[0].detail).toBeUndefined();
    expect(result.attackChain[0].description).toBeUndefined();
  });

  it("renders source-supported descriptions", () => {
    const item = validResultItem();
    item.entity.description = "Adversaries abuse interpreters.";
    item.entity.description_status = "source_supported";
    item.attack_chain[0].description = "Interpreter execution observed.";
    const result = mapQueryResponse(okResponse([item]));
    if (result.kind !== "report") return;
    expect(result.entities[0].detail).toBe("Adversaries abuse interpreters.");
    expect(result.attackChain[0].description).toBe("Interpreter execution observed.");
  });

  it("keeps lab evidence categorically distinct from source evidence", () => {
    const item = validResultItem();
    item.evidence.push({
      evidence_id: "LABEV-1",
      ref_id: "T1059",
      status: "confirmed",
      category: "lab",
      text: "Isolated lab telemetry shows interpreter spawning a child process.",
      source_id: "LAB-S-1",
      source_name: "SYNTRA Isolated Lab",
      source_url: null,
      source_ref: null,
      evidence_ref: null,
      provenance_type: "observed-lab-evidence",
    });
    const result = mapQueryResponse(okResponse([item])) as InvestigationReport;
    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0].category).toBe("source");
    expect(result.evidence[1].category).toBe("lab");
    expect(result.evidence[1].sourceName).not.toBe(result.evidence[0].sourceName);
  });

  it("degrades chain stages whose evidence references are missing", () => {
    const item = validResultItem();
    item.attack_chain[0].evidence_ids = ["EV-MISSING"];
    const result = mapQueryResponse(okResponse([item]));
    if (result.kind !== "report") return;
    expect(result.attackChain[0].status).toBe("unverified");
    expect(result.attackChain[0].evidenceIds).toHaveLength(0);
  });

  it("degrades ok responses without a usable payload to insufficient_evidence", () => {
    const item = validResultItem();
    item.summary = null; // no server summary — a client-built one would be fabrication
    const result = mapQueryResponse(okResponse([item]));
    expect(result.kind).toBe("insufficient_evidence");
  });

  it("maps empty outcomes to their distinct honest states", () => {
    for (const outcome of ["no_results", "out_of_domain", "insufficient_evidence"] as const) {
      const response = okResponse([]);
      response.outcome = outcome;
      response.status = "empty";
      const result = mapQueryResponse(response);
      expect(result.kind).toBe(outcome);
    }
  });

  it("maps safety refusals with fallback alternatives", () => {
    const response = okResponse([]);
    response.outcome = "safety_refused";
    response.refusal = { message: "SYNTRA cannot assist with that request.", alternatives: [] };
    const result = mapQueryResponse(response);
    expect(result.kind).toBe("safety");
    if (result.kind !== "safety") return;
    expect(result.message).toContain("cannot assist");
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it("preserves provenance on evidence and sources", () => {
    const result = mapQueryResponse(okResponse([validResultItem()]));
    if (result.kind !== "report") return;
    expect(result.evidence[0].provenance).toBe("source-derived");
    expect(result.sources[0].url).toBe("https://attack.mitre.org/techniques/T1059/");
  });
});
