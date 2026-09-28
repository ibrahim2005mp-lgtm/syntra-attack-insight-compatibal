import { BookOpen, Eye, Radar, ShieldCheck, Workflow } from "lucide-react";
import { WorkspacePage } from "@/components/WorkspacePage";
import { SyntraLogo } from "@/components/Logo";

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Evidence before explanation",
    body: "Every claim in a SYNTRA result is backed by an inspectable evidence record: the source, the passage, and how the claim relates to it. If the corpus does not support a stage, SYNTRA says so instead of inventing it.",
  },
  {
    icon: Workflow,
    title: "Structured attack analysis",
    body: "Results are organized as summary, identified entities, attack chain, technique details with steps, detection, mitigation, evidence and sources — the structure defenders and analysts actually use.",
  },
  {
    icon: ShieldCheck,
    title: "Honest uncertainty",
    body: "Unverified and insufficient-evidence stages are always labeled. The attack chain stops at 'No Verified Evidence' rather than continuing speculatively.",
  },
  {
    icon: BookOpen,
    title: "Defensive orientation",
    body: "SYNTRA supports investigation, detection and mitigation analysis. Requests for operational attack assistance are refused with safe alternatives.",
  },
];

export default function About() {
  return (
    <WorkspacePage title="About" scope="SYNTRA — Offensive Cyber Attack RAG">
      <div className="syn-card p-5">
        <SyntraLogo size={32} withSubtitle />
        <p className="mt-4 text-sm leading-relaxed text-foreground/90">
          SYNTRA is an evidence-first investigation system for offensive cybersecurity
          analysis. It answers questions about attacks, techniques, campaigns and
          vulnerabilities by retrieving and connecting cybersecurity sources — MITRE
          ATT&CK, CAPEC, CVE/CWE and CTI reporting — and presenting only what the
          evidence supports.
        </p>
      </div>

      <h2 className="syn-section-title mt-8">How SYNTRA works</h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        {[
          "Your question is validated and scoped to cybersecurity sources.",
          "Relevant evidence is retrieved and ranked from the source corpus.",
          "Relationships between entities, techniques and vulnerabilities are validated.",
          "An attack chain is built only from stages the evidence supports.",
          "Detection and mitigation guidance is attached for defenders.",
        ].map((step, i) => (
          <li key={i} className="syn-card flex items-start gap-3 p-3.5">
            <span className="syn-section-num syn-mono mt-0.5 text-xs">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-xs leading-relaxed text-foreground/90">{step}</span>
          </li>
        ))}
      </ol>

      <h2 className="syn-section-title mt-8">Principles</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="syn-card p-4">
            <p.icon className="size-4 text-[var(--syntra-orange)]" aria-hidden="true" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">{p.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-lg border border-dashed border-[color-mix(in_oklab,var(--syntra-amber)_45%,var(--syntra-border))] bg-[color-mix(in_oklab,var(--syntra-amber)_6%,transparent)] p-4">
        <Radar className="mt-0.5 size-4 shrink-0 text-[var(--syntra-amber)]" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-foreground/85">
          Disclaimer — SYNTRA is an educational research instrument, not an attack tool. All
          techniques are described for defensive understanding, every lab is a guided
          simulation inside an isolated sandbox, and no capability here connects to or
          affects real systems. Running any technique against infrastructure you do not
          own — or lack explicit written authorization to test — is illegal in most
          jurisdictions and contrary to the purpose of this project.
        </p>
      </div>
    </WorkspacePage>
  );
}
