import { useState, type ReactNode } from "react";
import type { Settings } from "../data/seed";
import { useStore } from "../state/store";
import { EXIT, Switch, usePresence } from "../ui/kit";

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="card anim-in" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32, padding: 24 }}>
      <div className="col gap-4">
        <h3 className="t-16 ink-1">{title}</h3>
        <p className="t-14 ink-5">{description}</p>
      </div>
      <div className="col gap-20">{children}</div>
    </section>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row between gap-16">
      <div className="col gap-2">
        <span className="t-14 ink-1">{label}</span>
        <span className="t-13 ink-5">{hint}</span>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function SettingsPage() {
  const { settings, actions } = useStore();
  const [draft, setDraft] = useState<Settings>(settings);
  const dirty = (Object.keys(draft) as (keyof Settings)[]).some((k) => draft[k] !== settings[k]);
  const bar = usePresence(dirty, EXIT.panel);
  const nameError = draft.workspaceName.trim() ? "" : "Workspace name can't be empty";

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="page page-pad col gap-16" style={{ paddingBottom: 96 }}>
      <div className="col gap-4">
        <h2 className="t-18 ink-1">Settings</h2>
        <p className="t-14 ink-5">Defaults that apply to every new agent in this workspace.</p>
      </div>

      <Section title="Workspace" description="Shown in the sidebar and on invites.">
        <label className="field" style={{ maxWidth: 360 }}>
          <span className="field-label">Workspace name</span>
          <input className={`input${nameError ? " has-error" : ""}`} value={draft.workspaceName} onChange={(e) => set("workspaceName", e.target.value)} />
          {nameError && <span className="field-error">{nameError}</span>}
        </label>
      </Section>

      <Section title="Credentials" description="Short-lived credentials limit the damage a leaked token can do.">
        <div className="field" style={{ maxWidth: 420 }}>
          <div className="row between">
            <span className="field-label">Default credential TTL</span>
            <span className="t-14 ink-1 mono">{draft.defaultTtl} min</span>
          </div>
          <input
            type="range"
            className="range"
            min={5}
            max={60}
            step={5}
            value={draft.defaultTtl}
            aria-label="Default credential TTL in minutes"
            onChange={(e) => set("defaultTtl", Number(e.target.value))}
          />
          <span className="field-hint" style={draft.defaultTtl > 15 ? { color: "#b26a00" } : undefined}>
            {draft.defaultTtl > 15 ? "Above the 15 minute target. New agents will show as over target." : "Within the 15 minute target."}
          </span>
        </div>
        <label className="field" style={{ maxWidth: 240 }}>
          <span className="field-label">Revoke idle agents after</span>
          <select className="input" value={draft.autoRevokeDays} onChange={(e) => set("autoRevokeDays", Number(e.target.value))}>
            {[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
      </Section>

      <Section title="Access" description="Who has to sign off before an agent touches production.">
        <ToggleRow
          label="Require approval for production"
          hint="New production agents wait in Approvals until an admin signs off."
          checked={draft.requireApprovalProd}
          onChange={(v) => set("requireApprovalProd", v)}
        />
      </Section>

      <Section title="Notifications" description="Where approval requests and incidents reach you.">
        <ToggleRow label="Email" hint="Approval requests and revoked credentials." checked={draft.notifyEmail} onChange={(v) => set("notifyEmail", v)} />
        <ToggleRow label="Slack" hint="Posts to #agent-ops." checked={draft.notifySlack} onChange={(v) => set("notifySlack", v)} />
        <ToggleRow label="Weekly digest" hint="Monday summary of runs, blocks and rotations." checked={draft.weeklyDigest} onChange={(v) => set("weeklyDigest", v)} />
      </Section>

      {bar.mounted && (
        <div className={`save-bar${bar.closing ? " is-closing" : ""}`} role="region" aria-label="Unsaved changes">
          <span className="t-14">You have unsaved changes</span>
          <div className="row gap-8">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(settings)}>Discard</button>
            <button type="button" className="btn btn-sm" style={{ background: "#fff", color: "#111" }} disabled={!!nameError} onClick={() => actions.saveSettings({ ...draft, workspaceName: draft.workspaceName.trim() })}>
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
