import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { Icon } from "../ui/Icon";
import { Segmented } from "../ui/kit";

const VIEWS = ["All", "Connected", "Available"] as const;

export function IntegrationsPage() {
  const { integrations, agents, actions } = useStore();
  const [view, setView] = useState<(typeof VIEWS)[number]>("All");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(null), 3000);
    return () => window.clearTimeout(t);
  }, [confirming]);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of agents) if (a.status !== "Revoked") m.set(a.scopes[0], (m.get(a.scopes[0]) ?? 0) + 1);
    return m;
  }, [agents]);

  const list = integrations.filter((i) => view === "All" || (view === "Connected" ? i.connected : !i.connected));
  const counts = { All: integrations.length, Connected: integrations.filter((i) => i.connected).length, Available: integrations.filter((i) => !i.connected).length };

  const toggle = (id: string, connected: boolean, inUse: number) => {
    if (connected && inUse > 0 && confirming !== id) {
      setConfirming(id);
      return;
    }
    setConfirming(null);
    if (connected) {
      actions.toggleIntegration(id);
      return;
    }
    // Connecting takes a beat (OAuth round-trip); show progress, then confirm.
    setBusy(id);
    window.setTimeout(() => {
      actions.toggleIntegration(id);
      setBusy(null);
    }, 700);
  };

  return (
    <div className="page page-pad col gap-20">
      <div className="row between">
        <div className="col gap-4">
          <h2 className="t-18 ink-1">Integrations</h2>
          <p className="t-14 ink-5">Agents can only reach tools that are connected here, and only with the scopes they were granted.</p>
        </div>
        <Segmented options={VIEWS} value={view} onChange={setView} counts={counts} />
      </div>

      <div key={view} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {list.map((i, idx) => {
          const inUse = usage.get(i.id) ?? 0;
          const isConfirming = confirming === i.id;
          return (
            <article key={i.id} className="card lift anim-in col gap-16" style={{ padding: 20, ["--i" as string]: idx }}>
              <div className="row gap-12">
                <span className="logo-tile" style={{ background: i.color }}>{i.name[0]}</span>
                <div className="col grow" style={{ minWidth: 0 }}>
                  <span className="t-16 ink-1">{i.name}</span>
                  <span className="t-13 ink-5">{i.category}</span>
                </div>
                {i.connected ? (
                  <span className="badge badge-sm tone-green"><span className="dot" />Connected</span>
                ) : (
                  <span className="badge badge-sm tone-gray">Not connected</span>
                )}
              </div>
              <p className="t-14 ink-4" style={{ minHeight: 40 }}>{i.description}</p>
              <div className="row between">
                <span className="t-13 ink-5">{i.connected ? `${inUse} agent${inUse === 1 ? "" : "s"} use this` : "No agents yet"}</span>
                <button
                  type="button"
                  className={`btn btn-sm ${i.connected ? (isConfirming ? "btn-danger-solid" : "btn-secondary") : "btn-primary"}`}
                  disabled={busy === i.id}
                  onClick={() => toggle(i.id, i.connected, inUse)}
                >
                  {busy === i.id ? (
                    <><Icon name="refresh" size={14} className="spin" /> Connecting</>
                  ) : i.connected ? (
                    isConfirming ? `Disconnect ${inUse} agents?` : "Disconnect"
                  ) : (
                    <><Icon name="plug" size={14} /> Connect</>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
