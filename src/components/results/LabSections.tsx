import {
  Monitor,
  Play,
  ShieldCheck,
  Smartphone,
  Square,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LAB_PLATFORM_LABEL, type LabEnvironment, type LabPlatform } from "@/types/investigation";

const PLATFORM_ICON: Record<LabPlatform, typeof Monitor> = {
  windows: Monitor,
  linux: Terminal,
  android: Smartphone,
};

const SESSION_PHASES = ["Environment", "Lab Guide", "Execute", "Observe", "Results"] as const;

/** Which guided step maps to which phase marker on the stepper. */
function phaseForStep(stepIndex: number, total: number): number {
  if (total === 0) return 0;
  const pos = stepIndex / total;
  if (pos < 0.2) return 0;
  if (pos < 0.4) return 1;
  if (pos < 0.6) return 2;
  if (pos < 0.85) return 3;
  return 4;
}

/**
 * Section 7 — Lab Environment Overview: supported runtime platforms as
 * selectable buttons. Selection is user-controlled (defaults to the runtime
 * SYNTRA recommends for the technique).
 */
export function LabEnvironmentOverview({
  lab,
  selectedPlatform,
  onSelectPlatform,
}: {
  lab: LabEnvironment;
  /** Currently selected platform (already falls back to the recommendation). */
  selectedPlatform: LabPlatform;
  onSelectPlatform: (platform: LabPlatform) => void;
}) {
  return (
    <div className="syn-card p-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        SYNTRA provides multiple isolated lab environments to support practical validation
        of applicable techniques. The required runtime is selected automatically based on
        the technique — you can switch it below.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {(Object.keys(PLATFORM_ICON) as LabPlatform[]).map((platform) => {
          const Icon = PLATFORM_ICON[platform];
          const selected = platform === selectedPlatform;
          const recommended = platform === lab.platform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => onSelectPlatform(platform)}
              aria-pressed={selected}
              title={
                recommended
                  ? `${LAB_PLATFORM_LABEL[platform]} — recommended for ${lab.techniqueId}`
                  : `Run the lab in ${LAB_PLATFORM_LABEL[platform]}`
              }
              className={
                selected
                  ? "flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-[color-mix(in_oklab,var(--syntra-orange)_45%,var(--syntra-border))] bg-[var(--syntra-orange-soft)] p-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  : "flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-border bg-[var(--syntra-surface-soft)] p-3 transition-colors outline-none hover:border-[color-mix(in_oklab,var(--syntra-orange)_35%,var(--syntra-border))] hover:bg-[color-mix(in_oklab,var(--syntra-orange)_5%,var(--syntra-surface-soft))] focus-visible:ring-2 focus-visible:ring-ring/50"
              }
            >
              <Icon
                className={selected ? "size-5 text-[var(--syntra-orange)]" : "size-5 text-muted-foreground"}
                aria-hidden="true"
              />
              <span className="text-[11px] font-medium text-foreground">
                {LAB_PLATFORM_LABEL[platform]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {platform === "windows" ? "Windows VM" : platform === "linux" ? "Linux VM" : "Android Emulator"}
              </span>
              {recommended && (
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--syntra-orange)]">
                  Recommended
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Section 8 — Controlled Attack Validation: the lab fact sheet plus the
 * guided launch action. Everything is descriptive; nothing executes here.
 */
export function LabValidation({ lab, selectedPlatform }: { lab: LabEnvironment; selectedPlatform: LabPlatform }) {
  const [launched, setLaunched] = useState(false);

  const facts: [string, string][] = [
    ["Technique", `${lab.techniqueId} — ${lab.techniqueName}`],
    ["Lab Type", lab.labType],
    ["Selected Platform", `${LAB_PLATFORM_LABEL[selectedPlatform]}${selectedPlatform !== lab.platform ? " (manual selection)" : ""}`],
    ["Runtime Environment", lab.runtimeEnvironment],
    ["Network Mode", lab.networkMode],
    ["Validation Source", lab.validationSource],
    ["Objective", lab.objective],
    ["Estimated Duration", lab.estimatedDuration],
    ["Difficulty", lab.difficulty],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="syn-card p-4">
        <dl className="flex flex-col gap-2">
          {facts.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(112px,auto)_1fr] gap-3">
              <dt className="text-xs font-semibold text-foreground">{label}:</dt>
              <dd className="min-w-0 text-xs leading-relaxed text-muted-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {lab.safetyBoundary && (
          <div className="mt-3 grid grid-cols-[minmax(112px,auto)_1fr] gap-3 border-t border-border pt-3">
            <dt className="text-xs font-semibold text-foreground">Safety Boundary:</dt>
            <dd className="min-w-0 text-xs leading-relaxed text-muted-foreground">
              {lab.safetyBoundary}
            </dd>
          </div>
        )}
      </div>

      <div className="syn-card flex flex-col p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-[var(--syntra-success)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Supported Lab Environments</h3>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {(Object.keys(PLATFORM_ICON) as LabPlatform[]).map((platform) => {
            const Icon = PLATFORM_ICON[platform];
            return (
              <li
                key={platform}
                className="flex items-center gap-2 rounded-md border border-border bg-[var(--syntra-surface-soft)] px-2.5 py-1.5"
              >
                <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs font-medium text-foreground">
                  {LAB_PLATFORM_LABEL[platform]}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {platform === "windows"
                    ? "Windows Virtual Machine (VM)"
                    : platform === "linux"
                      ? "Linux Virtual Machine (VM)"
                      : "Android Emulator"}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Launch control — gated on confirmed backend orchestrator
            capability. Descriptive metadata alone never enables it. */}
        {lab.launchable === true ? (
          <button
            type="button"
            className="syn-btn-primary mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--syntra-orange)] px-4 text-sm font-semibold tracking-wide text-[color-mix(in_oklab,var(--syntra-orange)_20%,black)]"
            onClick={() => {
              setLaunched((v) => !v);
              toast(launched ? "Lab session ended" : "Lab session started", {
                description: launched
                  ? "The isolated lab environment was released."
                  : `${lab.techniqueId} validation is running inside the isolated ${LAB_PLATFORM_LABEL[selectedPlatform]} environment.`,
              });
              window.setTimeout(() => {
                const el = document.getElementById("syn-isolated-lab");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 60);
            }}
          >
            {launched ? (
              <>
                <Square className="size-4" aria-hidden="true" />
                END SESSION
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden="true" />
                LAUNCH ISOLATED LAB
              </>
            )}
          </button>
        ) : (
          <p
            className="mt-4 rounded-md border border-border bg-[var(--syntra-surface-soft)] px-3 py-2.5 text-center text-[11px] leading-relaxed text-muted-foreground"
            role="note"
          >
            Guided walkthrough only — no live lab is attached to this report.
          </p>
        )}
        <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
          SYNTRA automatically selects the required runtime environment based on the
          selected technique.
        </p>
      </div>
    </div>
  );
}

/**
 * Section 9 — Isolated Lab Environment: phase stepper, lab facts, a simulated
 * console panel, the guided step list, and the safety notice. The session is
 * a guided walkthrough — no live execution happens in the browser.
 */
export function IsolatedLab({ lab, selectedPlatform }: { lab: LabEnvironment; selectedPlatform: LabPlatform }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);
  const total = lab.sessionSteps.length;
  const activePhase = SESSION_PHASES[phaseForStep(currentStep, total)];

  const advance = () => {
    if (currentStep < total - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setRunning(false);
      toast.success("Walkthrough complete", {
        description: `${lab.techniqueId} guided steps finished — no live environment was attached.`,
      });
    }
  };

  return (
    <div className="syn-card overflow-hidden" id="syn-isolated-lab">
      {/* Header band */}
      <div className="border-b border-border bg-[var(--syntra-surface-soft)] px-4 py-4 text-center">
        <h3 className="text-base font-bold uppercase tracking-[0.08em] text-foreground">
          SYNTRA — Isolated Lab Environment
        </h3>
        <p className="syn-mono mt-1 text-xs text-[var(--syntra-orange)]">
          {lab.techniqueId} — {lab.techniqueName.toUpperCase()}
        </p>
      </div>

      {/* Phase stepper */}
      <ol className="flex items-start justify-between gap-1 border-b border-border px-4 py-3" aria-label="Lab phases">
        {SESSION_PHASES.map((phase, i) => {
          const active = SESSION_PHASES.indexOf(activePhase as (typeof SESSION_PHASES)[number]) === i;
          const done = SESSION_PHASES.indexOf(activePhase as (typeof SESSION_PHASES)[number]) > i;
          return (
            <li key={phase} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className={
                  done
                    ? "flex size-6 items-center justify-center rounded-full bg-[var(--syntra-success)] text-[10px] font-bold text-black"
                    : active
                      ? "flex size-6 items-center justify-center rounded-full bg-[var(--syntra-orange)] text-[10px] font-bold text-[color-mix(in_oklab,var(--syntra-orange)_20%,black)]"
                      : "flex size-6 items-center justify-center rounded-full border border-border bg-[var(--syntra-surface-soft)] text-[10px] font-bold text-muted-foreground"
                }
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={
                  active
                    ? "text-[10px] font-semibold text-foreground"
                    : "text-[10px] text-muted-foreground"
                }
              >
                {phase}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {/* Lab facts + objective */}
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-border bg-[var(--syntra-surface-soft)] p-3">
            <p className="syn-section-title">
              <Monitor className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />
              Lab Details
            </p>
            <dl className="mt-2.5 flex flex-col gap-1.5">
              {(
                [
                  ["Technique", lab.techniqueId],
                  ["Platform", LAB_PLATFORM_LABEL[selectedPlatform]],
                  ["Environment", selectedPlatform === "android" ? "Android Emulator" : lab.runtimeEnvironment],
                  ["Operating System", selectedPlatform === "windows" ? "Windows 10" : selectedPlatform === "linux" ? "Ubuntu LTS" : "Android"],
                  ["Network Mode", lab.networkMode],
                  ["Status", running ? "Connected" : "Ready"],
                  ["Estimated Duration", lab.estimatedDuration],
                  ["Difficulty", lab.difficulty],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(120px,auto)_1fr] gap-3">
                  <dt className="text-xs font-semibold text-foreground">{label}:</dt>
                  <dd className="min-w-0 text-xs text-muted-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-md border border-border bg-[var(--syntra-surface-soft)] p-3">
            <p className="syn-section-title">Objective</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {lab.scenarioObjective}
            </p>
          </div>
        </div>

        {/* Guided steps + safety */}
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-border bg-[var(--syntra-surface-soft)] p-3">
            <p className="syn-section-title">
              <Terminal className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />
              Lab Guide &amp; Steps
            </p>
            <ol className="mt-2.5 flex flex-col gap-2">
              {lab.sessionSteps.map((step, i) => {
                const active = running && i === currentStep;
                const done = running && i < currentStep;
                return (
                  <li key={`${lab.id}-step-${i}`} className="flex items-start gap-2.5">
                    <span
                      className={
                        done
                          ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--syntra-success)] text-[10px] font-bold text-black"
                          : active
                            ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--syntra-orange)] text-[10px] font-bold text-[color-mix(in_oklab,var(--syntra-orange)_20%,black)]"
                            : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-bold text-muted-foreground"
                      }
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={
                        active
                          ? "text-xs leading-relaxed text-foreground"
                          : "text-xs leading-relaxed text-muted-foreground"
                      }
                    >
                      {step.text}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex items-center gap-2">
              {!running ? (
                <button
                  type="button"
                  className="syn-btn-primary inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--syntra-orange)] px-3 text-xs font-semibold tracking-wide text-[color-mix(in_oklab,var(--syntra-orange)_20%,black)]"
                  onClick={() => {
                    setRunning(true);
                    setCurrentStep(0);
                    toast("Guided session started", {
                      description: "Follow the walkthrough steps for this technique.",
                    });
                  }}
                >
                  <Play className="size-3.5" aria-hidden="true" />
                  START LAB SESSION
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-[var(--syntra-orange)]"
                    onClick={advance}
                  >
                    {currentStep < total - 1 ? "NEXT STEP" : "FINISH LAB"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[color-mix(in_oklab,var(--syntra-danger)_45%,transparent)] px-3 text-xs font-semibold text-[var(--syntra-danger)] transition-colors hover:bg-[color-mix(in_oklab,var(--syntra-danger)_10%,transparent)]"
                    onClick={() => {
                      setRunning(false);
                      toast("Walkthrough ended", {
                        description: "The guided session was closed. No live environment was attached.",
                      });
                    }}
                  >
                    END SESSION
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border border-[color-mix(in_oklab,var(--syntra-danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--syntra-danger)_8%,transparent)] p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-[var(--syntra-danger)]">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              Safety Notice
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              This lab runs in a controlled and isolated environment. It is intended for
              educational and validation purposes only. Do not attempt to use any of the
              techniques outside this environment.
            </p>
          </div>

          <div className="rounded-md border border-[color-mix(in_oklab,var(--syntra-success)_30%,transparent)] bg-[color-mix(in_oklab,var(--syntra-success)_7%,transparent)] p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-[var(--syntra-success)]">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Lab Rules
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {[
                "No external targets",
                "Use only provided tools",
                "Follow instructions",
                "Do not modify network settings",
                "Session is monitored",
              ].map((rule) => (
                <li key={rule} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-[var(--syntra-success)]" aria-hidden="true">✓</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
