import { useEffect, useState, type FormEvent } from "react";
import { TEAMS, TOOL_PERMISSIONS, type Environment, type Role } from "../data/agents";
import type { Risk } from "../data/seed";
import { navigate } from "../router";
import { useStore } from "../state/store";
import { Modal, Segmented } from "../ui/kit";

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function RegisterAgentModal() {
  const { overlay, actions, agents, people, settings, integrations } = useStore();
  const open = overlay === "register";
  const tools = integrations.filter((i) => i.connected && TOOL_PERMISSIONS[i.id]).map((i) => i.id);

  const [name, setName] = useState("");
  const [team, setTeam] = useState(TEAMS[0].team);
  const [ownerId, setOwnerId] = useState("you");
  const [environment, setEnvironment] = useState<Environment>("Staging");
  const [tool, setTool] = useState(tools[0] ?? "GitHub");
  const [permission, setPermission] = useState(TOOL_PERMISSIONS[tool]?.[0] ?? "Read");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setTouched(false);
      setEnvironment("Staging");
    }
  }, [open]);
  useEffect(() => setPermission(TOOL_PERMISSIONS[tool]?.[0] ?? "Read"), [tool]);

  const error = !name
    ? "Give the agent a name"
    : !NAME_RE.test(name)
      ? "Use lowercase letters, numbers and single dashes, e.g. invoice-router"
      : agents.some((a) => a.name === name)
        ? `${name} already exists`
        : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    const icon = TEAMS.find((t) => t.team === team)?.icon ?? "code";
    actions.registerAgent({ name, team, icon, ownerId, environment, tool, permission });
    actions.close();
    navigate("agents");
  };

  const needsApproval = environment === "Production" && settings.requireApprovalProd;

  return (
    <Modal
      open={open}
      onClose={actions.close}
      title="Register agent"
      description="Agents get a scoped, short-lived credential. You can widen access later."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={actions.close}>Cancel</button>
          <button type="submit" form="register-agent" className="btn btn-primary">
            {needsApproval ? "Register and request approval" : "Register agent"}
          </button>
        </>
      }
    >
      <form id="register-agent" className="col gap-16" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field-label">Name</span>
          <input
            className={`input${touched && error ? " has-error" : ""}`}
            value={name}
            placeholder="e.g. invoice-router"
            autoFocus
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            onBlur={() => name && setTouched(true)}
          />
          {touched && error ? <span className="field-error">{error}</span> : <span className="field-hint">Lowercase with dashes. Shown in logs and approvals.</span>}
        </label>
        <div className="row gap-12">
          <label className="field grow">
            <span className="field-label">Team</span>
            <select className="input" value={team} onChange={(e) => setTeam(e.target.value)}>
              {TEAMS.map((t) => <option key={t.team}>{t.team}</option>)}
            </select>
          </label>
          <label className="field grow">
            <span className="field-label">Owner</span>
            <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {people.filter((p) => !p.invited).map((p) => <option key={p.id} value={p.id}>{p.isYou ? `${p.name} (you)` : p.name}</option>)}
            </select>
          </label>
        </div>
        <div className="field">
          <span className="field-label">Environment</span>
          <Segmented options={["Staging", "Production"] as const} value={environment} onChange={setEnvironment} />
        </div>
        <div className="row gap-12">
          <label className="field grow">
            <span className="field-label">Integration</span>
            <select className="input" value={tool} onChange={(e) => setTool(e.target.value)}>
              {tools.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="field grow">
            <span className="field-label">Permission</span>
            <select className="input" value={permission} onChange={(e) => setPermission(e.target.value)}>
              {(TOOL_PERMISSIONS[tool] ?? ["Read"]).map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <p className="t-13 ink-4" style={{ background: "#f4f6f8", borderRadius: 10, padding: "10px 12px" }}>
          Credential TTL: <span className="ink-1">{settings.defaultTtl} min</span> (workspace default).{" "}
          {needsApproval ? "Production agents wait for an owner to approve them." : "Staging agents start right away."}
        </p>
      </form>
    </Modal>
  );
}

function PolicyModal() {
  const { overlay, actions } = useStore();
  const open = overlay === "policy";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Risk>("Medium");
  const [scope, setScope] = useState<"All" | "Production" | "Staging">("All");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) { setName(""); setDescription(""); setSeverity("Medium"); setScope("All"); setTouched(false); }
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    actions.addPolicy({
      name: name.trim(),
      description: description.trim() || "No description yet.",
      severity,
      environments: scope === "All" ? ["Production", "Staging"] : [scope],
    });
    actions.close();
    navigate("policies");
  };

  return (
    <Modal
      open={open}
      onClose={actions.close}
      title="New access policy"
      description="Policies run on every request an agent makes."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={actions.close}>Cancel</button>
          <button type="submit" form="new-policy" className="btn btn-primary">Create policy</button>
        </>
      }
    >
      <form id="new-policy" className="col gap-16" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field-label">Name</span>
          <input className={`input${touched && !name.trim() ? " has-error" : ""}`} value={name} autoFocus placeholder="e.g. No email sends after hours" onChange={(e) => setName(e.target.value)} />
          {touched && !name.trim() && <span className="field-error">Give the policy a name</span>}
        </label>
        <label className="field">
          <span className="field-label">What it does</span>
          <textarea className="input" value={description} placeholder="Describe the rule in one sentence." onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="row gap-20">
          <div className="field">
            <span className="field-label">Applies to</span>
            <Segmented options={["All", "Production", "Staging"] as const} value={scope} onChange={setScope} />
          </div>
          <div className="field">
            <span className="field-label">Severity</span>
            <Segmented options={["Low", "Medium", "High"] as const} value={severity} onChange={setSeverity} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function InviteModal() {
  const { overlay, actions, people } = useStore();
  const open = overlay === "invite";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Editor");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) { setEmail(""); setRole("Editor"); setTouched(false); }
  }, [open]);

  const error = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? "Enter a valid email address"
    : people.some((p) => p.email.toLowerCase() === email.toLowerCase())
      ? "That person is already in the workspace"
      : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    actions.invite(email.trim(), role);
    actions.close();
    navigate("team");
  };

  return (
    <Modal
      open={open}
      onClose={actions.close}
      title="Invite teammate"
      description="They'll get an email with a link to join this workspace."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={actions.close}>Cancel</button>
          <button type="submit" form="invite" className="btn btn-primary">Send invite</button>
        </>
      }
    >
      <form id="invite" className="col gap-16" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field-label">Email</span>
          <input className={`input${touched && error ? " has-error" : ""}`} type="email" value={email} autoFocus placeholder="name@company.com" onChange={(e) => setEmail(e.target.value)} />
          {touched && error && <span className="field-error">{error}</span>}
        </label>
        <div className="field">
          <span className="field-label">Role</span>
          <Segmented options={["Viewer", "Editor", "Admin"] as const} value={role === "Owner" ? "Admin" : role} onChange={setRole} />
          <span className="field-hint">
            {role === "Viewer" ? "Can see agents and logs." : role === "Editor" ? "Can register and pause agents they own." : "Can approve access and change policies."}
          </span>
        </div>
      </form>
    </Modal>
  );
}

export function GlobalModals() {
  return (
    <>
      <RegisterAgentModal />
      <PolicyModal />
      <InviteModal />
    </>
  );
}
