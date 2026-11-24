import { seedAgents } from "./agents";

const NOW = Date.now();
const MIN = 60_000;

/* --------------------------------------------------------------- approvals */

export type Risk = "High" | "Medium" | "Low";

export interface Approval {
  id: string;
  agentId: string;
  requesterId: string;
  title: string;
  scopes: string[];
  risk: Risk;
  reason: string;
  requestedAt: number;
}

export interface ResolvedApproval extends Approval {
  decision: "Approved" | "Denied";
  decidedAt: number;
}

export const seedApprovals: Approval[] = [
  {
    id: "apr-1",
    agentId: "data-sync",
    requesterId: "sofia",
    title: "Write access to Snowflake · PROD_FINANCE",
    scopes: ["Snowflake", "Write"],
    risk: "High",
    reason: "Nightly reconciliation needs to upsert ledger rows instead of staging them for a human.",
    requestedAt: NOW - 12 * MIN,
  },
  {
    id: "apr-2",
    agentId: "data-sync-eu",
    requesterId: "sofia",
    title: "Write access to BigQuery · eu_events",
    scopes: ["BigQuery", "Write"],
    risk: "Medium",
    reason: "Backfill of EU event partitions after the schema migration on Friday.",
    requestedAt: NOW - 34 * MIN,
  },
  {
    id: "apr-3",
    agentId: "sales-copilot",
    requesterId: "priya",
    title: "Resume with Slack · Post",
    scopes: ["Slack", "Post"],
    risk: "Low",
    reason: "Paused during the pricing change. Copy has been updated and checked by legal.",
    requestedAt: NOW - 58 * MIN,
  },
];

export const seedResolved: ResolvedApproval[] = [
  {
    id: "apr-0",
    agentId: "deploy-agent",
    requesterId: "arjun",
    title: "Deploy to AWS · us-east-1",
    scopes: ["AWS", "Deploy"],
    risk: "High",
    reason: "Production rollout of the billing service.",
    requestedAt: NOW - 300 * MIN,
    decision: "Approved",
    decidedAt: NOW - 280 * MIN,
  },
  {
    id: "apr-00",
    agentId: "research-agent",
    requesterId: "daniel",
    title: "Read access to Drive · All shared drives",
    scopes: ["Drive", "Read"],
    risk: "High",
    reason: "Broader corpus for literature search.",
    requestedAt: NOW - 3000 * MIN,
    decision: "Denied",
    decidedAt: NOW - 2900 * MIN,
  },
];

/* --------------------------------------------------------------- audit log */

export type AuditKind = "agent" | "credential" | "access" | "policy" | "team" | "integration";

export interface AuditEvent {
  id: string;
  at: number;
  actor: string;
  action: string;
  target: string;
  kind: AuditKind;
}

function seedAudit(): AuditEvent[] {
  const names = seedAgents.map((a) => a.name);
  const templates: [AuditKind, string, string, (i: number) => string][] = [
    ["credential", "System", "rotated credential for", (i) => names[(i * 7) % names.length]],
    ["access", "Custodian", "flagged over-privileged scope on", () => "data-sync · Snowflake Write"],
    ["agent", "Priya Shah", "paused agent", () => "sales-copilot"],
    ["credential", "System", "rotated credential for", (i) => names[(i * 11 + 3) % names.length]],
    ["policy", "Maya Chen", "updated policy", () => "Production writes require approval"],
    ["access", "Sofia Ramos", "requested access for", () => "data-sync-eu · BigQuery Write"],
    ["integration", "Daniel Kim", "connected integration", () => "Okta"],
    ["agent", "Arjun Patel", "registered agent", (i) => names[(i * 5 + 9) % names.length]],
    ["team", "Maya Chen", "changed role of", () => "Noah Becker → Viewer"],
    ["access", "Maya Chen", "approved access for", () => "deploy-agent · AWS Deploy"],
    ["agent", "Daniel Kim", "revoked agent", () => "research-agent"],
    ["access", "Maya Chen", "denied access for", () => "research-agent · Drive Read"],
  ];
  const events: AuditEvent[] = [];
  let t = NOW - 2 * MIN;
  for (let i = 0; i < 48; i++) {
    const [kind, actor, action, target] = templates[i % templates.length];
    events.push({ id: `evt-${i}`, at: t, actor, action, target: target(i), kind });
    t -= (7 + ((i * 37) % 53)) * MIN;
  }
  return events;
}
export const seedAuditLog: AuditEvent[] = seedAudit();

/* --------------------------------------------------------------- policies */

export interface Policy {
  id: string;
  name: string;
  description: string;
  environments: ("Production" | "Staging")[];
  severity: Risk;
  enabled: boolean;
  /** How many times the policy blocked or rerouted a request this week. */
  hits: number;
}

export const seedPolicies: Policy[] = [
  { id: "pol-1", name: "Production writes require approval", description: "Any agent requesting a write scope in Production waits for an owner or admin to approve it.", environments: ["Production"], severity: "High", enabled: true, hits: 31 },
  { id: "pol-2", name: "Credential TTL ≤ 15 minutes", description: "Short-lived credentials renew automatically before they expire. Longer TTLs are flagged.", environments: ["Production", "Staging"], severity: "Medium", enabled: true, hits: 412 },
  { id: "pol-3", name: "Block wildcard scopes", description: "Deny scopes such as *:* or admin grants on third-party integrations.", environments: ["Production", "Staging"], severity: "High", enabled: true, hits: 6 },
  { id: "pol-4", name: "Auto-revoke idle agents", description: "Revoke credentials for agents with no activity in the idle window set in Settings.", environments: ["Production", "Staging"], severity: "Low", enabled: false, hits: 0 },
  { id: "pol-5", name: "PII access logging", description: "Log every read of a table tagged PII with the requesting agent and prompt hash.", environments: ["Production"], severity: "Medium", enabled: true, hits: 1288 },
  { id: "pol-6", name: "Staging isolation", description: "Staging agents cannot reach production data sources or production secrets.", environments: ["Staging"], severity: "High", enabled: true, hits: 14 },
];

/* --------------------------------------------------------------- integrations */

export interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  connected: boolean;
}

export const seedIntegrations: Integration[] = [
  { id: "GitHub", name: "GitHub", category: "Code", description: "Repositories, pull requests and deployments.", color: "#24292f", connected: true },
  { id: "AWS", name: "AWS", category: "Cloud", description: "Short-lived STS sessions scoped per agent.", color: "#e8890c", connected: true },
  { id: "Slack", name: "Slack", category: "Messaging", description: "Post and read in approved channels.", color: "#4a154b", connected: true },
  { id: "Gmail", name: "Gmail", category: "Email", description: "Read, reply and send from shared inboxes.", color: "#d93025", connected: true },
  { id: "Snowflake", name: "Snowflake", category: "Data", description: "Warehouse reads and writes with row policies.", color: "#29b5e8", connected: true },
  { id: "BigQuery", name: "BigQuery", category: "Data", description: "Datasets and partitioned tables.", color: "#4285f4", connected: true },
  { id: "Drive", name: "Google Drive", category: "Files", description: "Shared drives and documents.", color: "#0f9d58", connected: true },
  { id: "Stripe", name: "Stripe", category: "Payments", description: "Charges, refunds and invoices.", color: "#635bff", connected: true },
  { id: "Salesforce", name: "Salesforce", category: "CRM", description: "Accounts, leads and opportunities.", color: "#00a1e0", connected: true },
  { id: "Jira", name: "Jira", category: "Work", description: "Issues and sprint boards.", color: "#0052cc", connected: true },
  { id: "Zendesk", name: "Zendesk", category: "Support", description: "Tickets and macros.", color: "#03363d", connected: true },
  { id: "Okta", name: "Okta", category: "Identity", description: "Groups and app assignments.", color: "#007dc1", connected: true },
  { id: "Notion", name: "Notion", category: "Docs", description: "Pages and databases.", color: "#191919", connected: false },
  { id: "Linear", name: "Linear", category: "Work", description: "Issues, projects and cycles.", color: "#5e6ad2", connected: false },
  { id: "PagerDuty", name: "PagerDuty", category: "On-call", description: "Incidents and escalation policies.", color: "#06ac38", connected: false },
];

/* --------------------------------------------------------------- settings */

export interface Settings {
  workspaceName: string;
  defaultTtl: number;
  requireApprovalProd: boolean;
  autoRevokeDays: number;
  notifyEmail: boolean;
  notifySlack: boolean;
  weeklyDigest: boolean;
}

export const seedSettings: Settings = {
  workspaceName: "Auton",
  defaultTtl: 15,
  requireApprovalProd: true,
  autoRevokeDays: 14,
  notifyEmail: true,
  notifySlack: true,
  weeklyDigest: false,
};

/* --------------------------------------------------------------- overview chart */

/** Agent runs per day, oldest first (30 days). */
export const runsPerDay: number[] = Array.from({ length: 30 }, (_, i) => {
  const base = 9800 + i * 140;
  const weekly = Math.sin((i / 7) * Math.PI * 2) * 900;
  const noise = ((i * 7919) % 13) * 85;
  const weekend = i % 7 === 5 || i % 7 === 6 ? -2600 : 0;
  return Math.round(base + weekly + noise + weekend);
});
