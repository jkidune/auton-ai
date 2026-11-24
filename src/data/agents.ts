export type Environment = "Production" | "Staging";
export type AgentStatus = "Active" | "Needs review" | "Paused" | "Revoked";
export type Tone = "blue" | "amber" | "purple" | "green" | "gray" | "red";
export type Role = "Owner" | "Admin" | "Editor" | "Viewer";
export type CredentialType = "OAuth token" | "STS session" | "API key";
export type AgentIcon = "document" | "rocket" | "database" | "headset" | "code" | "trend" | "shield" | "search";

export interface Person {
  id: string;
  name: string;
  initials: string;
  tone: Tone;
  email: string;
  role: Role;
  lastActiveMin: number;
  invited?: boolean;
  isYou?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  team: string;
  icon: AgentIcon;
  ownerId: string;
  environment: Environment;
  /** First entry is the integration, the rest are permissions, e.g. ["GitHub", "Deploy"]. */
  scopes: string[];
  extraScopes: number;
  /** Configured credential lifetime. Credentials auto-renew when they run out. */
  ttlMin: number;
  lastActiveMin: number;
  status: AgentStatus;
  credential: { type: CredentialType; issuedAt: number };
}

const NOW = Date.now();
const MIN = 60_000;

/* --------------------------------------------------------------- people */

export const people: Person[] = [
  { id: "you", name: "Alex Morgan", initials: "AM", tone: "gray", email: "alex@auton.dev", role: "Owner", lastActiveMin: 0, isYou: true },
  { id: "maya", name: "Maya Chen", initials: "MC", tone: "blue", email: "maya@auton.dev", role: "Admin", lastActiveMin: 4 },
  { id: "arjun", name: "Arjun Patel", initials: "AP", tone: "amber", email: "arjun@auton.dev", role: "Editor", lastActiveMin: 11 },
  { id: "sofia", name: "Sofia Ramos", initials: "SR", tone: "purple", email: "sofia@auton.dev", role: "Editor", lastActiveMin: 26 },
  { id: "leah", name: "Leah Novak", initials: "LN", tone: "green", email: "leah@auton.dev", role: "Editor", lastActiveMin: 63 },
  { id: "omar", name: "Omar Haddad", initials: "OH", tone: "gray", email: "omar@auton.dev", role: "Viewer", lastActiveMin: 140 },
  { id: "priya", name: "Priya Shah", initials: "PS", tone: "red", email: "priya@auton.dev", role: "Editor", lastActiveMin: 7 },
  { id: "daniel", name: "Daniel Kim", initials: "DK", tone: "blue", email: "daniel@auton.dev", role: "Admin", lastActiveMin: 320 },
  { id: "noah", name: "Noah Becker", initials: "NB", tone: "green", email: "noah@auton.dev", role: "Viewer", lastActiveMin: 2880 },
  { id: "aisha", name: "Aisha Bello", initials: "AB", tone: "amber", email: "aisha@auton.dev", role: "Editor", lastActiveMin: 95 },
];

/* --------------------------------------------------------------- the 9 agents from the design */

const designAgents: Omit<Agent, "credential">[] = [
  { id: "invoice-processor", name: "invoice-processor", team: "Finance", icon: "document", ownerId: "maya", environment: "Production", scopes: ["Gmail", "Read"], extraScopes: 2, ttlMin: 24, lastActiveMin: 2, status: "Active" },
  { id: "deploy-agent", name: "deploy-agent", team: "Platform", icon: "rocket", ownerId: "arjun", environment: "Production", scopes: ["GitHub", "Deploy"], extraScopes: 1, ttlMin: 12, lastActiveMin: 0, status: "Active" },
  { id: "data-sync", name: "data-sync", team: "Data", icon: "database", ownerId: "sofia", environment: "Production", scopes: ["Snowflake", "Write"], extraScopes: 2, ttlMin: 8, lastActiveMin: 5, status: "Needs review" },
  { id: "data-sync-eu", name: "data-sync-eu", team: "Data", icon: "database", ownerId: "sofia", environment: "Staging", scopes: ["BigQuery", "Write"], extraScopes: 1, ttlMin: 10, lastActiveMin: 18, status: "Needs review" },
  { id: "support-assistant", name: "support-assistant", team: "Support", icon: "headset", ownerId: "leah", environment: "Production", scopes: ["Gmail", "Reply"], extraScopes: 0, ttlMin: 15, lastActiveMin: 1, status: "Active" },
  { id: "code-reviewer", name: "code-reviewer", team: "Engineering", icon: "code", ownerId: "omar", environment: "Staging", scopes: ["GitHub", "Read"], extraScopes: 0, ttlMin: 30, lastActiveMin: 9, status: "Active" },
  { id: "sales-copilot", name: "sales-copilot", team: "Sales", icon: "trend", ownerId: "priya", environment: "Production", scopes: ["Slack", "Post"], extraScopes: 1, ttlMin: 20, lastActiveMin: 60, status: "Paused" },
  { id: "security-triage", name: "security-triage", team: "Security", icon: "shield", ownerId: "maya", environment: "Production", scopes: ["AWS", "Read"], extraScopes: 4, ttlMin: 5, lastActiveMin: 3, status: "Active" },
  { id: "research-agent", name: "research-agent", team: "Engineering", icon: "search", ownerId: "daniel", environment: "Production", scopes: ["Drive", "Read"], extraScopes: 3, ttlMin: 15, lastActiveMin: 2880, status: "Revoked" },
];

/* --------------------------------------------------------------- deterministic generator */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(139);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const between = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1));

export const TOOL_PERMISSIONS: Record<string, string[]> = {
  Gmail: ["Read", "Reply", "Send"],
  GitHub: ["Read", "Write", "Deploy"],
  Slack: ["Read", "Post"],
  Snowflake: ["Read", "Write"],
  BigQuery: ["Read", "Write"],
  AWS: ["Read", "Deploy"],
  Drive: ["Read", "Write"],
  Stripe: ["Read", "Refund"],
  Zendesk: ["Read", "Reply"],
  Jira: ["Read", "Write"],
  Salesforce: ["Read", "Write"],
  Okta: ["Read", "Admin"],
};

export const TEAMS: { team: string; icon: AgentIcon; words: string[]; tools: string[] }[] = [
  { team: "Finance", icon: "document", words: ["invoice", "expense", "ledger", "payroll", "tax", "billing", "forecast", "refund"], tools: ["Gmail", "Stripe", "Snowflake", "Drive"] },
  { team: "Platform", icon: "rocket", words: ["deploy", "release", "infra", "cost", "incident", "oncall", "build", "cache"], tools: ["GitHub", "AWS", "Slack"] },
  { team: "Data", icon: "database", words: ["etl", "schema", "metrics", "warehouse", "lineage", "quality", "backfill"], tools: ["Snowflake", "BigQuery", "AWS"] },
  { team: "Support", icon: "headset", words: ["ticket", "triage", "feedback", "faq", "escalation", "csat"], tools: ["Gmail", "Zendesk", "Slack"] },
  { team: "Engineering", icon: "code", words: ["test", "docs", "pr", "lint", "migration", "bug", "changelog"], tools: ["GitHub", "Jira", "Drive"] },
  { team: "Sales", icon: "trend", words: ["lead", "pipeline", "quote", "renewal", "outreach", "forecast"], tools: ["Salesforce", "Slack", "Gmail"] },
  { team: "Security", icon: "shield", words: ["vuln", "access", "secrets", "phishing", "compliance", "audit"], tools: ["AWS", "GitHub", "Okta"] },
];
const SUFFIXES = ["agent", "bot", "sync", "router", "summarizer", "watcher", "classifier", "assistant", "scanner", "reporter"];
const REGIONS = ["eu", "us", "apac", "2"];
const TTLS = [5, 8, 10, 10, 12, 12, 14, 15, 15, 20, 24];

function credentialTypeFor(tool: string): CredentialType {
  if (tool === "AWS") return "STS session";
  if (["Gmail", "Drive", "Slack", "Salesforce", "Okta"].includes(tool)) return "OAuth token";
  return "API key";
}

function generate(): Agent[] {
  // 130 generated + 9 designed = 139; statuses land on the design's totals (121 / 7 / 7 / 4).
  const statuses: AgentStatus[] = [
    ...Array<AgentStatus>(116).fill("Active"),
    ...Array<AgentStatus>(5).fill("Needs review"),
    ...Array<AgentStatus>(6).fill("Paused"),
    ...Array<AgentStatus>(3).fill("Revoked"),
  ];
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }

  const taken = new Set(designAgents.map((a) => a.name));
  const owners = people.filter((p) => !p.isYou);
  const out: Agent[] = designAgents.map((a) => ({
    ...a,
    credential: { type: credentialTypeFor(a.scopes[0]), issuedAt: NOW - between(0, a.ttlMin - 1) * MIN - between(0, 59) * 1000 },
  }));

  for (const status of statuses) {
    const t = pick(TEAMS);
    let name = `${pick(t.words)}-${pick(SUFFIXES)}`;
    for (let r = 0; taken.has(name); r++) name = `${name.replace(/-(eu|us|apac|2)$/, "")}-${REGIONS[r % REGIONS.length]}`;
    taken.add(name);

    const tool = pick(t.tools);
    const ttlMin = pick(TTLS);
    const lastActiveMin =
      status === "Active" ? (rand() < 0.7 ? between(0, 59) : between(60, 600))
      : status === "Needs review" ? between(1, 120)
      : status === "Paused" ? between(60, 4320)
      : between(1440, 20160);

    out.push({
      id: name,
      name,
      team: t.team,
      icon: t.icon,
      ownerId: pick(owners).id,
      environment: rand() < 0.75 ? "Production" : "Staging",
      scopes: [tool, pick(TOOL_PERMISSIONS[tool])],
      extraScopes: rand() < 0.55 ? between(1, 4) : 0,
      ttlMin,
      lastActiveMin,
      status,
      credential: { type: credentialTypeFor(tool), issuedAt: NOW - between(0, ttlMin - 1) * MIN - between(0, 59) * 1000 },
    });
  }
  return out;
}

export const seedAgents: Agent[] = generate();
