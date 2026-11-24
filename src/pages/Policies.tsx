import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { Icon } from "../ui/Icon";
import { Badge, Empty, RISK_TONE, Segmented, Switch } from "../ui/kit";
import { fmt } from "../ui/format";

const VIEWS = ["All", "On", "Off"] as const;

export function PoliciesPage() {
  const { policies, agents, actions } = useStore();
  const [view, setView] = useState<(typeof VIEWS)[number]>("All");

  const counts = { All: policies.length, On: policies.filter((p) => p.enabled).length, Off: policies.filter((p) => !p.enabled).length };
  const list = policies.filter((p) => view === "All" || (view === "On" ? p.enabled : !p.enabled));

  const reach = useMemo(() => {
    const prod = agents.filter((a) => a.environment === "Production" && a.status !== "Revoked").length;
    const staging = agents.filter((a) => a.environment === "Staging" && a.status !== "Revoked").length;
    return { Production: prod, Staging: staging };
  }, [agents]);

  return (
    <div className="page page-pad col gap-20">
      <div className="row between">
        <div className="col gap-4">
          <h2 className="t-18 ink-1">Access policies</h2>
          <p className="t-14 ink-5">Every agent request is checked against the policies that are on, in order of severity.</p>
        </div>
        <div className="row gap-8">
          <Segmented options={VIEWS} value={view} onChange={setView} counts={counts} />
          <button type="button" className="btn btn-primary" onClick={() => actions.open("policy")}>
            <Icon name="plus" size={16} stroke={2.25} /> New policy
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card"><Empty icon="policies" title={view === "Off" ? "Every policy is on" : "No policies yet"} /></div>
      ) : (
        <div key={view} className="col gap-12">
          {list.map((p, i) => {
            const affected = p.environments.reduce((s, e) => s + reach[e], 0);
            return (
              <article key={p.id} className="card anim-in row gap-16" style={{ padding: "18px 20px", ["--i" as string]: i, opacity: p.enabled ? 1 : undefined }}>
                <div className="empty-icon" style={{ width: 40, height: 40, color: p.enabled ? "#328ff9" : "#999", background: p.enabled ? "#ebf6ff" : "#f4f6f8", transition: "color var(--t-small) var(--ease-out)" }}>
                  <Icon name="policies" size={18} stroke={1.9} />
                </div>
                <div className="col gap-6 grow">
                  <div className="row gap-8">
                    <h3 className="t-16 ink-1">{p.name}</h3>
                    <Badge tone={RISK_TONE[p.severity]} small>{p.severity}</Badge>
                  </div>
                  <p className="t-14 ink-4">{p.description}</p>
                  <div className="row gap-12 t-13 ink-5" style={{ marginTop: 2 }}>
                    <span className="row gap-4">{p.environments.map((e) => <span key={e} className="chip chip-sm">{e}</span>)}</span>
                    <span>Covers {affected} agents</span>
                    <span>·</span>
                    <span className="mono">{fmt.format(p.hits)} hits this week</span>
                  </div>
                </div>
                <div className="col gap-6" style={{ alignItems: "flex-end" }}>
                  <Switch checked={p.enabled} label={`${p.name} ${p.enabled ? "on" : "off"}`} onChange={() => actions.togglePolicy(p.id)} />
                  <span className="t-12 ink-5" style={{ minWidth: 20, textAlign: "right" }}>{p.enabled ? "On" : "Off"}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
