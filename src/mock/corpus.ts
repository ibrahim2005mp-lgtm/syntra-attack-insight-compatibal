/**
 * Development mock dataset — SYNTRA dev corpus.
 *
 * This data simulates what a backend RAG pipeline over MITRE ATT&CK, CAPEC,
 * CVE/CWE and CTI reporting would return. It lives behind the backend
 * boundary (it is only ever read by backend functions), so the frontend has a
 * single, swappable API surface.
 *
 * Do NOT import this module from UI components.
 */
import type {
  AttackStage,
  DetectionItem,
  Entity,
  Evidence,
  EvidenceStatus,
  InvestigationResult,
  LabEnvironment,
  MitigationItem,
  Relationship,
  SourceRef,
} from "../types/investigation";

/* ------------------------------------------------------------------ */
/* APT3 — phishing → execution → discovery campaign (primary demo)     */
/* ------------------------------------------------------------------ */

const apt3Evidence: Evidence[] = [
  {
    id: "EV-1",
    refId: "T1566",
    status: "confirmed",
    sourceName: "MITRE ATT&CK — APT3 (G0022)",
    sourceUrl: "https://attack.mitre.org/groups/G0022/",
    excerpt:
      "APT3 has sent spearphishing emails containing a link that downloads malicious files. The group has used phishing emails with malicious attachments to gain initial access to victim networks.",
    provenance: "Direct source relationship",
  },
  {
    id: "EV-2",
    refId: "T1059",
    status: "confirmed",
    sourceName: "MITRE ATT&CK — APT3 (G0022)",
    sourceUrl: "https://attack.mitre.org/groups/G0022/",
    excerpt:
      "APT3 has used a variety of command-line scripting to execute payloads on victim machines, including batch scripts and Windows Command Shell execution.",
    provenance: "Direct source relationship",
  },
  {
    id: "EV-3",
    refId: "T1087",
    status: "supported",
    sourceName: "MITRE ATT&CK — APT3 (G0022)",
    sourceUrl: "https://attack.mitre.org/groups/G0022/",
    excerpt:
      "APT3 has used tools to enumerate account information on compromised hosts, consistent with Account Discovery behavior.",
    provenance: "Direct source relationship",
  },
  {
    id: "EV-4",
    refId: "T1018",
    status: "supported",
    sourceName: "CTI report — Threat group card: APT3",
    excerpt:
      "Reporting describes APT3 performing internal network reconnaissance after compromise, including remote system discovery on victim subnets.",
    provenance: "Corroborated by secondary reporting",
  },
  {
    id: "EV-5",
    refId: "T1021",
    status: "unverified",
    sourceName: "CTI report — Threat group card: APT3",
    excerpt:
      "One report notes possible use of remote services to move between hosts, but the underlying telemetry is not available to verify execution details.",
    provenance: "Single-source claim; not independently corroborated",
  },
];

const apt3Chain: AttackStage[] = [
  {
    techniqueId: "T1566",
    techniqueName: "Phishing",
    tactic: "Initial Access",
    status: "confirmed",
    evidenceIds: ["EV-1"],
    description:
      "The attacker gains initial access by tricking the target into interacting with malicious content such as an email link or attachment.",
    steps: [
      { text: "Craft a phishing email or message" },
      { text: "Deliver the message to the target" },
      { text: "Victim interacts with the content" },
      { text: "Initial access is established" },
    ],
    labAvailable: false,
  },
  {
    techniqueId: "T1059",
    techniqueName: "Command and Scripting Interpreter",
    tactic: "Execution",
    status: "confirmed",
    evidenceIds: ["EV-2"],
    description:
      "The attacker uses command-line or scripting environments to execute commands or scripts on the compromised system.",
    steps: [
      { text: "Execute a command or script" },
      { text: "Use native tools (cmd, bash, PowerShell)" },
      { text: "Download or run additional payloads" },
      { text: "Interact with the operating system" },
    ],
    labAvailable: true,
  },
  {
    techniqueId: "T1087",
    techniqueName: "Account Discovery",
    tactic: "Discovery",
    status: "supported",
    evidenceIds: ["EV-3"],
    description:
      "The attacker identifies accounts on the system, including local, domain, and cloud accounts, to map privilege opportunities.",
    steps: [
      { text: "Enumerate local accounts" },
      { text: "Enumerate domain accounts" },
      { text: "Collect account information" },
      { text: "Look for privileged accounts" },
    ],
    labAvailable: false,
  },
  {
    techniqueId: "T1018",
    techniqueName: "Remote System Discovery",
    tactic: "Discovery",
    status: "supported",
    evidenceIds: ["EV-4"],
    description:
      "The attacker identifies remote systems on the network that may be reachable and relevant for later movement.",
    steps: [
      { text: "Scan network for live hosts" },
      { text: "Identify remote systems" },
      { text: "Collect system information" },
      { text: "Map the internal environment" },
    ],
    labAvailable: false,
  },
  {
    techniqueId: "T1021",
    techniqueName: "Remote Services",
    tactic: "Lateral Movement",
    status: "unverified",
    evidenceIds: ["EV-5"],
    labAvailable: false,
  },
];

/**
 * Isolated-lab definition for the APT3 report. The lab validates T1059 —
 * the highest-confidence execution technique — in a sandboxed VM.
 */
const apt3Lab: LabEnvironment = {
  id: "LAB-T1059",
  techniqueId: "T1059",
  techniqueName: "Command and Scripting Interpreter",
  available: true,
  labType: "Controlled Technique Validation",
  platform: "windows",
  runtimeEnvironment: "Windows Virtual Machine (VM)",
  networkMode: "Isolated Lab Network",
  validationSource: "SYNTRA Research Lab",
  objective:
    "Safely observe and validate the behavior associated with T1059 inside a controlled and isolated environment.",
  estimatedDuration: "10–15 Minutes",
  difficulty: "Intermediate",
  safetyBoundary:
    "The lab runs in an isolated environment and is not intended for use against external or unauthorized systems.",
  sessionSteps: [
    { text: "Review the scenario and objective." },
    { text: "Access the Windows VM and open the required tools." },
    { text: "Execute the provided commands or script in the lab environment." },
    { text: "Observe the expected behavior (processes, logs, artifacts)." },
    { text: "Collect evidence and compare with the expected results." },
    { text: "Complete the lab and view the validation result." },
  ],
  scenarioObjective:
    "Safely observe and validate the behavior associated with T1059 inside an isolated Windows virtual machine.",
};

const apt3Entities: Entity[] = [
  { id: "E-actor", kind: "threat_actor", label: "APT3", detail: "Also tracked as Gothic Panda, Buckshot. China-nexus intrusions since ~2010." },
  { id: "E-campaign", kind: "campaign", label: "Operation Clandestine Fox", detail: "2014–2015 campaign combining browser exploits with spearphishing delivery." },
  { id: "E-malware", kind: "malware", label: "DoublePulsar", detail: "Kernel-mode backdoor reported in later APT3-adjacent tooling." },
  { id: "E-t1566", kind: "technique", label: "T1566 — Phishing" },
  { id: "E-t1059", kind: "technique", label: "T1059 — Command and Scripting Interpreter" },
  { id: "E-t1087", kind: "technique", label: "T1087 — Account Discovery" },
  { id: "E-t1018", kind: "technique", label: "T1018 — Remote System Discovery" },
  { id: "E-report", kind: "report", label: "Threat group card: APT3", detail: "Public CTI profile consolidating multi-vendor reporting." },
];

const apt3Relationships: Relationship[] = [
  { from: "APT3", to: "Operation Clandestine Fox", label: "attributed to" },
  { from: "APT3", to: "T1566 — Phishing", label: "uses" },
  { from: "APT3", to: "T1059 — Command and Scripting Interpreter", label: "uses" },
  { from: "APT3", to: "T1087 — Account Discovery", label: "uses" },
  { from: "T1566 — Phishing", to: "T1059 — Command and Scripting Interpreter", label: "leads to" },
  { from: "T1059 — Command and Scripting Interpreter", to: "T1087 — Account Discovery", label: "enables" },
];

const apt3Sources: SourceRef[] = [
  { id: "S-1", name: "MITRE ATT&CK — Group G0022 (APT3)", url: "https://attack.mitre.org/groups/G0022/", kind: "MITRE ATT&CK" },
  { id: "S-2", name: "MITRE ATT&CK — T1566 Phishing", url: "https://attack.mitre.org/techniques/T1566/", kind: "MITRE ATT&CK" },
  { id: "S-3", name: "MITRE ATT&CK — T1059 Command and Scripting Interpreter", url: "https://attack.mitre.org/techniques/T1059/", kind: "MITRE ATT&CK" },
  { id: "S-4", name: "Threat group card: APT3", kind: "CTI Report" },
];

/* ------------------------------------------------------------------ */
/* SQL injection via CVE-2019-0708-style web app exposure (secondary)  */
/* ------------------------------------------------------------------ */

const sqliEvidence: Evidence[] = [
  {
    id: "EV-10",
    refId: "T1190",
    status: "confirmed",
    sourceName: "MITRE ATT&CK — T1190 Exploit Public-Facing Application",
    sourceUrl: "https://attack.mitre.org/techniques/T1190/",
    excerpt:
      "Adversaries may attempt to exploit a weakness in an Internet-facing host or system to initially access a network. Vulnerable web applications are a common initial access vector.",
    provenance: "Direct source relationship",
  },
  {
    id: "EV-11",
    refId: "CVE-2021-44228",
    status: "confirmed",
    sourceName: "NVD — CVE-2021-44228",
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2021-44228",
    excerpt:
      "Apache Log4j2 versions 2.0-beta9 through 2.15.0 permit remote code execution when attacker-controlled log messages trigger JNDI lookups (CWE-502: Deserialization of Untrusted Data).",
    provenance: "Direct source relationship",
  },
  {
    id: "EV-12",
    refId: "CWE-502",
    status: "confirmed",
    sourceName: "CWE — CWE-502",
    sourceUrl: "https://cwe.mitre.org/data/definitions/502.html",
    excerpt:
      "The product deserializes untrusted data without sufficiently verifying that the resulting data will be valid, enabling code execution when crafted objects are instantiated.",
    provenance: "Direct source relationship",
  },
  {
    id: "EV-13",
    refId: "T1059.004",
    status: "supported",
    sourceName: "CTI advisory — Log4Shell exploitation patterns",
    excerpt:
      "Multiple intrusion sets have been observed dropping Unix shell payloads on vulnerable hosts following successful JNDI injection.",
    provenance: "Corroborated by secondary reporting",
  },
  {
    id: "EV-14",
    refId: "T1078",
    status: "unverified",
    sourceName: "CTI advisory — Log4Shell exploitation patterns",
    excerpt:
      "Some incidents suggest post-exploitation use of valid accounts, but reporting does not confirm credential material was obtained through this vector.",
    provenance: "Single-source claim; not independently corroborated",
  },
];

const sqliChain: AttackStage[] = [
  {
    techniqueId: "T1190",
    techniqueName: "Exploit Public-Facing Application",
    tactic: "Initial Access",
    status: "confirmed",
    evidenceIds: ["EV-10"],
  },
  {
    techniqueId: "T1059.004",
    techniqueName: "Unix Shell",
    tactic: "Execution",
    status: "supported",
    evidenceIds: ["EV-13"],
  },
  {
    techniqueId: "T1078",
    techniqueName: "Valid Accounts",
    tactic: "Defense Evasion",
    status: "unverified",
    evidenceIds: ["EV-14"],
  },
];

const sqliEntities: Entity[] = [
  { id: "E-cve", kind: "cve", label: "CVE-2021-44228", detail: "Log4Shell — critical RCE in Apache Log4j2 (CVSS 10.0). Listed in CISA KEV." },
  { id: "E-cwe", kind: "cwe", label: "CWE-502", detail: "Deserialization of Untrusted Data." },
  { id: "E-capec", kind: "capec", label: "CAPEC-77", detail: "Manipulating User-Controlled Variables." },
  { id: "E-t1190", kind: "technique", label: "T1190 — Exploit Public-Facing Application" },
  { id: "E-t1059-4", kind: "technique", label: "T1059.004 — Unix Shell" },
];

const sqliRelationships: Relationship[] = [
  { from: "CVE-2021-44228", to: "CWE-502", label: "weakness" },
  { from: "CWE-502", to: "CAPEC-77", label: "attack pattern" },
  { from: "CVE-2021-44228", to: "CISA KEV", label: "listed in" },
  { from: "T1190 — Exploit Public-Facing Application", to: "CVE-2021-44228", label: "exploits" },
  { from: "CVE-2021-44228", to: "T1059.004 — Unix Shell", label: "enables" },
];

const sqliSources: SourceRef[] = [
  { id: "S-10", name: "NVD — CVE-2021-44228", url: "https://nvd.nist.gov/vuln/detail/CVE-2021-44228", kind: "NVD" },
  { id: "S-11", name: "CISA — Log4j advisory", url: "https://www.cisa.gov/news-events/alerts/2021/12/11/apache-log4j2-recommended-mitigation-measures", kind: "CISA Advisory" },
  { id: "S-12", name: "CWE — CWE-502", url: "https://cwe.mitre.org/data/definitions/502.html", kind: "CWE" },
  { id: "S-13", name: "CTI advisory — Log4Shell exploitation patterns", kind: "CTI Report" },
];

/* ------------------------------------------------------------------ */
/* No-results / thin-evidence corpus entry                             */
/* ------------------------------------------------------------------ */

const scarceEvidence: Evidence[] = [
  {
    id: "EV-20",
    refId: "T1071.001",
    status: "supported",
    sourceName: "MITRE ATT&CK — T1071.001 Web Protocols",
    sourceUrl: "https://attack.mitre.org/techniques/T1071/001/",
    excerpt:
      "Adversaries may communicate using application layer protocols associated with web traffic to avoid detection and blend in with existing network traffic.",
    provenance: "Technique definition only — no actor attribution",
  },
];

const scarceChain: AttackStage[] = [
  {
    techniqueId: "T1071.001",
    techniqueName: "Web Protocols",
    tactic: "Command and Control",
    status: "supported",
    evidenceIds: ["EV-20"],
  },
];

/* ------------------------------------------------------------------ */
/* Builder helpers                                                     */
/* ------------------------------------------------------------------ */

function reportResult(args: {
  summary: string;
  chain: AttackStage[];
  evidence: Evidence[];
  entities: Entity[];
  relationships: Relationship[];
  detection: DetectionItem[];
  mitigation: MitigationItem[];
  missingEvidence: string[];
  sources: SourceRef[];
  lab?: LabEnvironment;
}): InvestigationResult {
  const statuses = args.chain.map((s) => s.status);
  const evidenceStatus: EvidenceStatus = statuses.every((s) => s === "confirmed")
    ? "confirmed"
    : statuses.some((s) => s === "confirmed")
      ? "supported"
      : statuses.every((s) => s === "insufficient")
        ? "insufficient"
        : "unverified";
  return {
    kind: "report",
    summary: args.summary,
    entities: args.entities,
    attackChain: args.chain,
    evidence: args.evidence,
    relationships: args.relationships,
    detection: args.detection,
    mitigation: args.mitigation,
    missingEvidence: args.missingEvidence,
    sources: args.sources,
    evidenceStatus,
    safetyStatus: "safe",
    lab: args.lab ?? defaultLabFor(args.chain),
  };
}

/**
 * Every full report exposes the lab sections (07/08). When a report does not
 * define a bespoke lab, derive one for the report's primary (first chain)
 * technique so the validation sections are always present.
 */
function defaultLabFor(chain: AttackStage[]): LabEnvironment {
  const stage = chain[0];
  const techniqueId = stage?.techniqueId ?? "T0000";
  const techniqueName = stage?.techniqueName ?? "Documented Technique";
  return {
    id: `LAB-${techniqueId}`,
    techniqueId,
    techniqueName,
    available: true,
    labType: "Controlled Technique Validation",
    platform: "windows",
    runtimeEnvironment: "Windows Virtual Machine (VM)",
    networkMode: "Isolated Lab Network",
    validationSource: "SYNTRA Research Lab",
    objective: `Safely observe and validate the behavior associated with ${techniqueId} inside a controlled and isolated environment.`,
    estimatedDuration: "10–15 Minutes",
    difficulty: "Intermediate",
    safetyBoundary:
      "The lab runs in an isolated environment and is not intended for use against external or unauthorized systems.",
    sessionSteps: [
      { text: "Review the scenario and objective." },
      { text: "Access the Windows VM and open the required tools." },
      { text: "Execute the provided commands or script in the lab environment." },
      { text: `Observe the expected ${techniqueId} behavior (processes, logs, artifacts).` },
      { text: "Collect evidence and compare with the expected results." },
      { text: "Complete the lab and view the validation result." },
    ],
    scenarioObjective: `Safely observe and validate the behavior associated with ${techniqueId} inside an isolated Windows virtual machine.`,
  };
}

const SAFETY_ALTERNATIVES = [
  "Defensive analysis of the technique",
  "Detection opportunities and indicators",
  "Recommended mitigations and controls",
  "Controlled lab validation guidance",
  "Educational explanation of the attack concept",
];

function safetyResult(message: string): InvestigationResult {
  return {
    kind: "safety",
    message,
    alternatives: SAFETY_ALTERNATIVES,
    safetyStatus: "refused",
  };
}

const NO_RESULTS: InvestigationResult = {
  kind: "no_results",
  message: "No relevant evidence was found in the available cybersecurity sources.",
};

const OUT_OF_DOMAIN: InvestigationResult = {
  kind: "out_of_domain",
  message: "This question is outside the supported cybersecurity scope.",
};

/* ------------------------------------------------------------------ */
/* Question matchers (development only)                                */
/* ------------------------------------------------------------------ */

export interface CorpusMatch {
  question: RegExp;
  build: () => InvestigationResult;
}

export const SAFETY_MATCHERS: CorpusMatch[] = [
  {
    question:
      /\b(write|create|generate|give me|provide|craft)\b.*\b(phishing\s+email|malware|ransomware|keylogger|botnet|exploit\s+code|payload)\b/i,
    build: () =>
      safetyResult(
        "SYNTRA supports defensive investigation and analysis. SYNTRA cannot help develop malware, craft phishing content, or produce operational exploitation code.",
      ),
  },
  {
    question: /\b(steal|hijack|crack|bruteforce|brute\s*force)\b.*\b(password|credential|token|session)s?\b/i,
    build: () =>
      safetyResult(
        "SYNTRA cannot assist with unauthorized credential theft or access. SYNTRA can analyze how credential-access techniques work and how defenders detect them.",
      ),
  },
  {
    question: /\b(hack|compromise|breach|get\s+into|break\s+into)\b.*\b(system|server|network|account|website|company|school)\b/i,
    build: () =>
      safetyResult(
        "SYNTRA supports investigation of attacks, not planning them. SYNTRA can help you analyze the techniques, evidence and defenses relevant to real incidents.",
      ),
  },
  {
    question: /\b(ddos|wipe|encrypt)\b.*\b(target|victim|network|server|files|database)\b/i,
    build: () =>
      safetyResult(
        "SYNTRA cannot assist with destructive or disruptive activity. SYNTRA can provide defensive guidance for impact techniques such as T1486 or T1489.",
      ),
  },
];

export const DOMAIN_MATCHERS: CorpusMatch[] = [
  {
    question: /\bapt3\b|\bgothic\s*panda\b|\bclandestine\s*fox\b/i,
    build: () =>
      reportResult({
        summary:
          "Reported evidence consistently describes APT3 as a threat group that gains initial access through spearphishing, executes payloads with command and scripting interpreters, and performs account and remote-system discovery. Evidence for lateral movement via remote services exists but is not sufficiently corroborated to present as fact.",
        chain: apt3Chain,
        evidence: apt3Evidence,
        entities: apt3Entities,
        relationships: apt3Relationships,
        detection: [
          {
            title: "Phishing delivery telemetry",
            description: "Monitor email gateway logs for spearphishing patterns: unsolicited attachments and links to newly registered domains.",
          },
          {
            title: "Suspicious command-line activity",
            description: "Alert on process creation events showing cmd.exe or wscript.exe spawning from office applications or temp directories (Sysmon Event ID 1).",
          },
          {
            title: "Enumeration behavior",
            description: "Watch for rapid sequences of account and host discovery commands (net.exe, nltest.exe) executed shortly after execution events.",
          },
        ],
        mitigation: [
          {
            id: "M1049",
            title: "Antivirus / Antimalware",
            description: "Deploy endpoint protection capable of detecting APT3 tooling signatures and behavior.",
          },
          {
            id: "M1030",
            title: "Network Segmentation",
            description: "Segment networks to limit the reach of discovery and any subsequent lateral movement.",
          },
          {
            id: "M1017",
            title: "User Training",
            description: "Train users to recognize and report spearphishing attempts with attachments or links.",
          },
        ],
        missingEvidence: [
          "No verified evidence was found for lateral movement (T1021) — the available sources assert it without corroborating telemetry.",
          "No evidence establishes a C2 infrastructure mapping for this campaign in the available sources.",
        ],
        sources: apt3Sources,
        lab: apt3Lab,
      }),
  },
  {
    question: /\bcve[-\s]*2021[-\s]*44228\b|\blog4j\b|\blog4shell\b/i,
    build: () =>
      reportResult({
        summary:
          "CVE-2021-44228 (Log4Shell) is a confirmed, CISA KEV-listed remote code execution weakness in Apache Log4j2, rooted in CWE-502 deserialization of untrusted data. Evidence confirms exploitation as an initial access vector and supports shell-based execution afterward; post-exploitation use of valid accounts is reported but unverified.",
        chain: sqliChain,
        evidence: sqliEvidence,
        entities: sqliEntities,
        relationships: sqliRelationships,
        detection: [
          {
            title: "JNDI lookup patterns in logs",
            description: "Search application logs for suspicious JNDI strings such as ${jndi:ldap://} in user-controlled fields.",
          },
          {
            title: "Outbound LDAP/RMI connections",
            description: "Alert on unexpected outbound LDAP or RMI connections from application servers immediately following deserialization-rich requests.",
          },
          {
            title: "Post-exploitation shells",
            description: "Monitor for shell process creation under Java/application-server parent processes.",
          },
        ],
        mitigation: [
          {
            id: "M1051",
            title: "Update Software",
            description: "Upgrade Log4j2 to a patched release (≥ 2.17.0) and rebuild dependent applications.",
          },
          {
            id: "M1050",
            title: "Exploit Protection",
            description: "Restrict egress from application servers and disable JNDI lookups where supported.",
          },
          {
            id: "M1054",
            title: "Software Configuration",
            description: "Set com.sun.jndi.ldap.object.trustURLCodebase=false on affected JVMs.",
          },
        ],
        missingEvidence: [
          "No verified evidence ties exploitation of this CVE to credential harvesting (T1078) — reported only in a single source.",
          "No evidence was found on exfiltration volumes or targets in the available sources.",
        ],
        sources: sqliSources,
      }),
  },
  {
    question: /\bsql\s*injection\b|\bcwe[-\s]*89\b|\bcapec[-\s]*66\b/i,
    build: () =>
      reportResult({
        summary:
          "Available evidence establishes SQL injection as a well-defined exploitation pattern (CWE-89, CAPEC-66) against web applications that fail to separate code from data in queries. The corpus documents the weakness and its detection surface but does not contain a complete attack chain for a specific campaign.",
        chain: [
          {
            techniqueId: "T1190",
            techniqueName: "Exploit Public-Facing Application",
            tactic: "Initial Access",
            status: "supported",
            evidenceIds: ["EV-10"],
          },
        ],
        evidence: [
          sqliEvidence[0],
          {
            id: "EV-15",
            refId: "CWE-89",
            status: "confirmed",
            sourceName: "CWE — CWE-89",
            sourceUrl: "https://cwe.mitre.org/data/definitions/89.html",
            excerpt:
              "The product constructs all or part of an SQL command using externally-influenced input from an upstream component, but it does not neutralize special elements that could modify the intended SQL command.",
            provenance: "Direct source relationship",
          },
          {
            id: "EV-16",
            refId: "CAPEC-66",
            status: "confirmed",
            sourceName: "CAPEC — CAPEC-66 SQL Injection",
            sourceUrl: "https://capec.mitre.org/data/definitions/66.html",
            excerpt:
              "An adversary manipulates SQL query construction through unvalidated input to extract or modify data from the database behind the application.",
            provenance: "Direct source relationship",
          },
        ],
        entities: [
          { id: "E-cwe89", kind: "cwe", label: "CWE-89", detail: "Improper Neutralization of Special Elements used in an SQL Command." },
          { id: "E-capec66", kind: "capec", label: "CAPEC-66", detail: "SQL Injection attack pattern." },
          { id: "E-t1190b", kind: "technique", label: "T1190 — Exploit Public-Facing Application" },
        ],
        relationships: [
          { from: "CWE-89", to: "CAPEC-66", label: "attack pattern" },
          { from: "CAPEC-66", to: "T1190 — Exploit Public-Facing Application", label: "maps to" },
        ],
        detection: [
          {
            title: "Anomalous query errors",
            description: "Monitor application and database logs for SQL syntax errors, unusually frequent 500 responses, and concatenation-heavy query patterns.",
          },
          {
            title: "Input-shape anomalies",
            description: "Alert on request parameters containing SQL control tokens (quotes, comments, UNION SELECT) arriving from untrusted sources.",
          },
        ],
        mitigation: [
          {
            id: "M1002",
            title: "Parameterized Queries",
            description: "Use prepared statements / bound parameters for all database access.",
          },
          {
            id: "M1001",
            title: "Input Validation",
            description: "Validate and canonicalize all user-controlled input server-side before use in queries.",
          },
          {
            id: "M1009",
            title: "Least Privilege",
            description: "Run application database accounts with the minimum required permissions.",
          },
        ],
        missingEvidence: [
          "The available sources do not contain a named threat actor or campaign using SQL injection as its initial access vector.",
          "No post-exploitation stages beyond initial access are supported by the available evidence.",
        ],
        sources: [
          { id: "S-15", name: "CWE — CWE-89", url: "https://cwe.mitre.org/data/definitions/89.html", kind: "CWE" },
          { id: "S-16", name: "CAPEC — CAPEC-66", url: "https://capec.mitre.org/data/definitions/66.html", kind: "CAPEC" },
          { id: "S-17", name: "MITRE ATT&CK — T1190", url: "https://attack.mitre.org/techniques/T1190/", kind: "MITRE ATT&CK" },
        ],
      }),
  },
  {
    question: /\bc2\b|\bcommand\s*and\s*control\b|\bcommand\s*&\s*control\b|\bexfiltration\s+over\s+web\b/i,
    build: () =>
      reportResult({
        summary:
          "The available evidence supports that adversaries commonly use web protocols for command and control to blend with legitimate traffic. Reporting in the corpus is limited to technique-level evidence; no specific campaign, actor or infrastructure mapping is supported by the available sources.",
        chain: scarceChain,
        evidence: scarceEvidence,
        entities: [
          { id: "E-t1071", kind: "technique", label: "T1071.001 — Web Protocols" },
        ],
        relationships: [
          { from: "T1071.001 — Web Protocols", to: "Command and Control", label: "tactic" },
        ],
        detection: [
          {
            title: "Beaconing patterns",
            description: "Detect periodic, similar-sized outbound HTTP requests to low-reputation domains from individual hosts.",
          },
          {
            title: "Protocol misuse",
            description: "Alert on HTTP traffic where the User-Agent, headers, or payload entropy diverge from known-good application baselines.",
          },
        ],
        mitigation: [
          {
            id: "M1054",
            title: "Software Configuration",
            description: "Configure egress rules and proxy allowlists so only approved destinations are reachable from the enterprise network.",
          },
          {
            id: "M1021",
            title: "Restrict Web-Based Content",
            description: "Limit web traffic from enterprise hosts to allowlisted categories and destinations.",
          },
        ],
        missingEvidence: [
          "No verified evidence links this technique to a specific threat actor in the available sources.",
          "No evidence was found describing malware families observed using this channel.",
        ],
        sources: [
          { id: "S-20", name: "MITRE ATT&CK — T1071.001", url: "https://attack.mitre.org/techniques/T1071/001/", kind: "MITRE ATT&CK" },
        ],
      }),
  },
  {
    question: /\bwhat\s+is\b.*\bphishing\b|\bphishing\s+technique\b|\bt1566\b/i,
    build: () =>
      reportResult({
        summary:
          "MITRE ATT&CK defines Phishing (T1566) as adversaries sending deceptive messages to elicit information or deliver payloads that provide initial access. The technique is documented across its sub-techniques (spearphishing attachment, link, and service) with confirmed detection and mitigation guidance.",
        chain: [
          {
            techniqueId: "T1566",
            techniqueName: "Phishing",
            tactic: "Initial Access",
            status: "confirmed",
            evidenceIds: ["EV-1"],
          },
        ],
        evidence: [
          apt3Evidence[0],
          {
            id: "EV-6",
            refId: "T1566",
            status: "confirmed",
            sourceName: "MITRE ATT&CK — T1566 Phishing",
            sourceUrl: "https://attack.mitre.org/techniques/T1566/",
            excerpt:
              "Adversaries may send phishing messages to gain access to victim systems. All forms of phishing are electronically delivered social engineering.",
            provenance: "Direct source relationship",
          },
        ],
        entities: [
          { id: "E-t1566b", kind: "technique", label: "T1566 — Phishing" },
          { id: "E-apt3b", kind: "threat_actor", label: "APT3", detail: "Documented user of T1566 in confirmed reporting." },
        ],
        relationships: [
          { from: "APT3", to: "T1566 — Phishing", label: "uses" },
        ],
        detection: [
          {
            title: "Email filtering telemetry",
            description: "Monitor for quarantined attachments, rewritten URLs, and user report-mailbox submissions.",
          },
        ],
        mitigation: [
          {
            id: "M1049",
            title: "Antivirus / Antimalware",
            description: "Automatically scan and quarantine attachments at the gateway and endpoint.",
          },
          {
            id: "M1017",
            title: "User Training",
            description: "Educate users on identifying and reporting phishing messages.",
          },
        ],
        missingEvidence: [
          "Technique-level question: no campaign-specific chain is available beyond documented actor usage.",
        ],
        sources: [
          { id: "S-2", name: "MITRE ATT&CK — T1566 Phishing", url: "https://attack.mitre.org/techniques/T1566/", kind: "MITRE ATT&CK" },
          { id: "S-1", name: "MITRE ATT&CK — Group G0022 (APT3)", url: "https://attack.mitre.org/groups/G0022/", kind: "MITRE ATT&CK" },
        ],
      }),
  },
];

export { NO_RESULTS, OUT_OF_DOMAIN, reportResult, safetyResult };

/**
 * Generic full report for Full-report mode: when a cybersecurity question has
 * no specific corpus entry, the documented phishing-technique brief is the
 * closest evidence-grounded coverage, so it is returned instead of an empty
 * state. (Off-domain questions still return out_of_domain — a report would
 * be dishonest there.)
 */
export function genericFullReport(): InvestigationResult {
  const t1566 = DOMAIN_MATCHERS.find((m) => m.question.test("what is the phishing technique T1566"));
  return t1566 ? t1566.build() : NO_RESULTS;
}
