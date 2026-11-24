import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { people as seedPeople, seedAgents, type Agent, type AgentIcon, type AgentStatus, type Environment, type Person, type Role } from "../data/agents";
import {
  seedApprovals,
  seedAuditLog,
  seedIntegrations,
  seedPolicies,
  seedResolved,
  seedSettings,
  type Approval,
  type AuditEvent,
  type AuditKind,
  type Integration,
  type Policy,
  type ResolvedApproval,
  type Settings,
} from "../data/seed";

export type ToastTone = "success" | "danger" | "info";
export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; run: () => void };
  closing?: boolean;
}

export interface NewAgentInput {
  name: string;
  team: string;
  icon: AgentIcon;
  ownerId: string;
  environment: Environment;
  tool: string;
  permission: string;
}

interface Data {
  agents: Agent[];
  people: Person[];
  approvals: Approval[];
  resolved: ResolvedApproval[];
  audit: AuditEvent[];
  policies: Policy[];
  integrations: Integration[];
  settings: Settings;
  /** agentId → time of the last change, drives the row flash. */
  changedAt: Record<string, number>;
}

type Overlay = null | "register" | "palette" | "invite" | "policy";

const TOAST_MS = 3600;
const TOAST_EXIT_MS = 190;

function useStoreValue() {
  const [data, setData] = useState<Data>({
    agents: seedAgents,
    people: seedPeople,
    approvals: seedApprovals,
    resolved: seedResolved,
    audit: seedAuditLog,
    policies: seedPolicies,
    integrations: seedIntegrations,
    settings: seedSettings,
    changedAt: {},
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const toastId = useRef(1);
  const eventId = useRef(1);

  /* ---------------------------------------------------------------- toasts */

  const dismissToast = useCallback((id: number) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), TOAST_EXIT_MS);
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success", action?: Toast["action"]) => {
      const id = toastId.current++;
      setToasts((ts) => [...ts.slice(-2), { id, message, tone, action }]);
      window.setTimeout(() => dismissToast(id), action ? TOAST_MS + 1800 : TOAST_MS);
    },
    [dismissToast],
  );

  /* ---------------------------------------------------------------- helpers */

  const event = (kind: AuditKind, action: string, target: string): AuditEvent => ({
    id: `live-${eventId.current++}`,
    at: Date.now(),
    actor: "You",
    action,
    target,
    kind,
  });

  const patchAgent = (d: Data, id: string, patch: Partial<Agent>): Data => ({
    ...d,
    agents: d.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    changedAt: { ...d.changedAt, [id]: Date.now() },
  });

  /* ---------------------------------------------------------------- agents */

  const setAgentStatus = useCallback(
    (id: string, status: AgentStatus, opts: { silent?: boolean } = {}) => {
      let previous: AgentStatus | undefined;
      let name = id;
      setData((d) => {
        const agent = d.agents.find((a) => a.id === id);
        if (!agent || agent.status === status) return d;
        previous = agent.status;
        name = agent.name;
        const verb = { Active: previous === "Needs review" ? "approved agent" : "resumed agent", Paused: "paused agent", Revoked: "revoked agent", "Needs review": "sent for review" }[status];
        let next = patchAgent(d, id, { status, lastActiveMin: status === "Active" ? 0 : agent.lastActiveMin });
        next = { ...next, audit: [event("agent", verb, agent.name), ...next.audit] };
        if (status === "Active" || status === "Revoked") {
          // Resolving the agent also resolves anything it had waiting in Approvals.
          const pending = next.approvals.filter((a) => a.agentId === id);
          if (pending.length) {
            next = {
              ...next,
              approvals: next.approvals.filter((a) => a.agentId !== id),
              resolved: [
                ...pending.map((p) => ({ ...p, decision: status === "Active" ? ("Approved" as const) : ("Denied" as const), decidedAt: Date.now() })),
                ...next.resolved,
              ],
            };
          }
        }
        return next;
      });
      if (opts.silent) return;
      // setData runs synchronously for the updater above, so previous/name are set here.
      window.setTimeout(() => {
        if (!previous) return;
        const prev = previous;
        if (status === "Revoked") toast(`${name} revoked. Its credential stops working now.`, "danger", { label: "Undo", run: () => setAgentStatus(id, prev, { silent: true }) });
        else if (status === "Paused") toast(`${name} paused`, "info", { label: "Undo", run: () => setAgentStatus(id, prev, { silent: true }) });
        else if (status === "Active") toast(prev === "Needs review" ? `${name} approved and active` : `${name} resumed`);
      }, 0);
    },
    [toast],
  );

  const rotateCredential = useCallback(
    (id: string) => {
      setData((d) => {
        const agent = d.agents.find((a) => a.id === id);
        if (!agent) return d;
        const next = patchAgent(d, id, { credential: { ...agent.credential, issuedAt: Date.now() } });
        return { ...next, audit: [event("credential", "rotated credential for", agent.name), ...next.audit] };
      });
      toast(`Credential rotated for ${id}`);
    },
    [toast],
  );

  const registerAgent = useCallback(
    (input: NewAgentInput) => {
      let needsReview = false;
      setData((d) => {
        needsReview = input.environment === "Production" && d.settings.requireApprovalProd;
        const agent: Agent = {
          id: input.name,
          name: input.name,
          team: input.team,
          icon: input.icon,
          ownerId: input.ownerId,
          environment: input.environment,
          scopes: [input.tool, input.permission],
          extraScopes: 0,
          ttlMin: d.settings.defaultTtl,
          lastActiveMin: 0,
          status: needsReview ? "Needs review" : "Active",
          credential: { type: input.tool === "AWS" ? "STS session" : "OAuth token", issuedAt: Date.now() },
        };
        const approval: Approval | null = needsReview
          ? {
              id: `apr-${Date.now()}`,
              agentId: agent.id,
              requesterId: "you",
              title: `${input.permission} access to ${input.tool} · ${input.environment}`,
              scopes: [input.tool, input.permission],
              risk: ["Write", "Deploy", "Admin", "Send", "Refund"].includes(input.permission) ? "High" : "Medium",
              reason: "New agent registration. Production access needs owner approval.",
              requestedAt: Date.now(),
            }
          : null;
        return {
          ...d,
          agents: [agent, ...d.agents],
          approvals: approval ? [approval, ...d.approvals] : d.approvals,
          audit: [event("agent", "registered agent", agent.name), ...d.audit],
          changedAt: { ...d.changedAt, [agent.id]: Date.now() },
        };
      });
      window.setTimeout(() => toast(needsReview ? `${input.name} registered and sent for approval` : `${input.name} registered`), 0);
    },
    [toast],
  );

  /* ---------------------------------------------------------------- approvals */

  const decide = useCallback(
    (approvalId: string, decision: "Approved" | "Denied") => {
      let label = "";
      setData((d) => {
        const ap = d.approvals.find((a) => a.id === approvalId);
        if (!ap) return d;
        label = ap.title;
        let next: Data = {
          ...d,
          approvals: d.approvals.filter((a) => a.id !== approvalId),
          resolved: [{ ...ap, decision, decidedAt: Date.now() }, ...d.resolved],
          audit: [event("access", decision === "Approved" ? "approved access for" : "denied access for", `${ap.agentId} · ${ap.scopes.join(" ")}`), ...d.audit],
        };
        const agent = d.agents.find((a) => a.id === ap.agentId);
        if (agent && decision === "Approved" && (agent.status === "Needs review" || agent.status === "Paused")) {
          next = patchAgent(next, agent.id, { status: "Active", lastActiveMin: 0 });
        }
        return next;
      });
      window.setTimeout(() => toast(decision === "Approved" ? `Approved: ${label}` : `Denied: ${label}`, decision === "Approved" ? "success" : "info"), 0);
    },
    [toast],
  );

  /* ---------------------------------------------------------------- policies, integrations */

  const togglePolicy = useCallback(
    (id: string) => {
      let msg = "";
      setData((d) => {
        const p = d.policies.find((x) => x.id === id);
        if (!p) return d;
        msg = `${p.name} ${p.enabled ? "turned off" : "turned on"}`;
        return {
          ...d,
          policies: d.policies.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
          audit: [event("policy", p.enabled ? "disabled policy" : "enabled policy", p.name), ...d.audit],
        };
      });
      window.setTimeout(() => toast(msg, "info"), 0);
    },
    [toast],
  );

  const addPolicy = useCallback(
    (p: Omit<Policy, "id" | "hits" | "enabled">) => {
      setData((d) => ({
        ...d,
        policies: [{ ...p, id: `pol-${Date.now()}`, hits: 0, enabled: true }, ...d.policies],
        audit: [event("policy", "created policy", p.name), ...d.audit],
      }));
      toast(`Policy created: ${p.name}`);
    },
    [toast],
  );

  const toggleIntegration = useCallback(
    (id: string) => {
      let msg = "";
      setData((d) => {
        const i = d.integrations.find((x) => x.id === id);
        if (!i) return d;
        msg = i.connected ? `${i.name} disconnected` : `${i.name} connected`;
        return {
          ...d,
          integrations: d.integrations.map((x) => (x.id === id ? { ...x, connected: !x.connected } : x)),
          audit: [event("integration", i.connected ? "disconnected integration" : "connected integration", i.name), ...d.audit],
        };
      });
      window.setTimeout(() => toast(msg, msg.endsWith("disconnected") ? "info" : "success"), 0);
    },
    [toast],
  );

  /* ---------------------------------------------------------------- team */

  const setRole = useCallback(
    (personId: string, role: Role) => {
      let name = "";
      setData((d) => {
        const p = d.people.find((x) => x.id === personId);
        if (!p || p.role === role) return d;
        name = p.name;
        return {
          ...d,
          people: d.people.map((x) => (x.id === personId ? { ...x, role } : x)),
          audit: [event("team", "changed role of", `${p.name} → ${role}`), ...d.audit],
        };
      });
      window.setTimeout(() => name && toast(`${name} is now ${role === "Admin" ? "an" : "a"} ${role}`), 0);
    },
    [toast],
  );

  const invite = useCallback(
    (email: string, role: Role) => {
      const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
      const name = local.replace(/\b\w/g, (c) => c.toUpperCase()) || email;
      const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      const tones = ["blue", "amber", "purple", "green", "red"] as const;
      setData((d) => ({
        ...d,
        people: [...d.people, { id: `p-${Date.now()}`, name, initials, tone: tones[d.people.length % tones.length], email, role, lastActiveMin: 0, invited: true }],
        audit: [event("team", "invited", `${email} as ${role}`), ...d.audit],
      }));
      toast(`Invitation sent to ${email}`);
    },
    [toast],
  );

  const removeMember = useCallback(
    (personId: string) => {
      let removed: Person | undefined;
      setData((d) => {
        removed = d.people.find((x) => x.id === personId);
        if (!removed) return d;
        return {
          ...d,
          people: d.people.filter((x) => x.id !== personId),
          audit: [event("team", "removed", removed.name), ...d.audit],
        };
      });
      window.setTimeout(() => {
        const p = removed;
        if (p) toast(`${p.name} removed from the workspace`, "info", { label: "Undo", run: () => setData((d) => ({ ...d, people: [...d.people, p] })) });
      }, 0);
    },
    [toast],
  );

  /* ---------------------------------------------------------------- settings */

  const saveSettings = useCallback(
    (s: Settings) => {
      setData((d) => ({ ...d, settings: s, audit: [event("policy", "updated workspace settings", s.workspaceName), ...d.audit] }));
      toast("Settings saved");
    },
    [toast],
  );

  const actions = useMemo(
    () => ({
      setAgentStatus,
      rotateCredential,
      registerAgent,
      decide,
      togglePolicy,
      addPolicy,
      toggleIntegration,
      setRole,
      invite,
      removeMember,
      saveSettings,
      toast,
      dismissToast,
      open: (o: Exclude<Overlay, null>) => setOverlay(o),
      close: () => setOverlay(null),
    }),
    [setAgentStatus, rotateCredential, registerAgent, decide, togglePolicy, addPolicy, toggleIntegration, setRole, invite, removeMember, saveSettings, toast, dismissToast],
  );

  return { ...data, toasts, overlay, actions };
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}

/* ---------------------------------------------------------------- derived helpers */

export function usePeopleById() {
  const { people } = useStore();
  return useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])) as Record<string, Person>, [people]);
}
