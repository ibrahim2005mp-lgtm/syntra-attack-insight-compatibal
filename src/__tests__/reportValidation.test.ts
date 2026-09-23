import { describe, expect, it } from "vitest";
import { isFullReport, validateFullReport } from "@/security/reportValidation";
import { DOMAIN_MATCHERS, SAFETY_MATCHERS } from "@/mock/corpus";

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
});
