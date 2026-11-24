import { useEffect, useMemo, useState } from "react";
import type { Agent } from "../data/agents";
import { navigate } from "../router";
import { useStore } from "../state/store";
import { Icon } from "../ui/Icon";
import { Empty, Pagination, Segmented, StatStrip, useNow, type Stat } from "../ui/kit";
import { countdown, fmt, timeAgo } from "../ui/format";

const PAGE_SIZE = 10;
const VIEWS = ["All", "Over target", "Expiring soon"] as const;
const GRID = "minmax(200px,1.4fr) 130px 140px 90px minmax(200px,1.4fr) 130px 120px";

export function CredentialsPage() {
  const { agents, actions } = useStore();
  const now = useNow(1000);
  const [view, setView] = useState<(typeof VIEWS)[number]>("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rotating, setRotating] = useState<Set<string>>(new Set());

  const live = useMemo(() => agents.filter((a) => a.status !== "Revoked"), [agents]);
  const remaining = (a: Agent) => {
    const ttl = a.ttlMin * 60_000;
    return ttl - ((now - a.credential.issuedAt) % ttl);
  };

  const list = live.filter(
    (a) =>
      (view === "All" || (view === "Over target" ? a.ttlMin > 15 : remaining(a) < 2 * 60_000)) &&
      (!query || a.name.includes(query.toLowerCase()) || a.scopes[0].toLowerCase().includes(query.toLowerCase())),
  );
  // "Expiring soon" changes every second; keep its order stable by sorting on time left.
  const sorted = view === "Expiring soon" ? [...list].sort((a, b) => remaining(a) - remaining(b)) : list;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => setPage(1), [view, query]);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const overTarget = live.filter((a) => a.ttlMin > 15).length;
  const avg = Math.round(live.reduce((s, a) => s + a.ttlMin, 0) / Math.max(1, live.length));
  const stats: Stat[] = [
    { label: "Live credentials", icon: "credentials", value: String(live.length), note: "all short-lived", foot: [`${agents.length - live.length} revoked`, "0 static keys"] },
    { label: "Avg TTL", icon: "timer", value: `${avg} min`, delta: { text: "−3 min", direction: "down", good: true }, note: "since Sep 1", foot: ["Target", "≤ 15 min"] },
    { label: "Over TTL target", icon: "alert", value: String(overTarget), note: "longer than 15 min", foot: ["Fix in agent settings", ""] },
    { label: "Renewals per day", icon: "refresh", value: fmt.format(Math.round(live.reduce((s, a) => s + 1440 / a.ttlMin, 0))), note: "automatic", foot: ["Last failure", "none in 30 days"] },
  ];

  const rotate = (id: string) => {
    setRotating((s) => new Set(s).add(id));
    window.setTimeout(() => {
      actions.rotateCredential(id);
      setRotating((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 600);
  };

  return (
    <div className="page">
      <StatStrip stats={stats} />
      <div className="row between" style={{ padding: "20px 20px 9px" }}>
        <div className="row gap-4">
          <h2 className="t-18 ink-1">Credentials</h2>
          <span className="count-pill">{live.length}</span>
        </div>
        <div className="row gap-8">
          <div className="search-field" style={{ width: 220 }}>
            <Icon name="search" size={14} />
            <input className="input input-sm" placeholder="Agent or provider" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Segmented options={VIEWS} value={view} onChange={setView} counts={{ All: live.length, "Over target": overTarget }} />
        </div>
      </div>

      <div className="card" style={{ margin: "0 20px", padding: 2 }}>
        <div className="table-head" style={{ gridTemplateColumns: GRID }}>
          {["Agent", "Provider", "Type", "TTL", "Renews in", "Issued", ""].map((h) => <span key={h || "a"} className="th">{h}</span>)}
        </div>
        {rows.length === 0 ? (
          <Empty icon="credentials" title="No credentials here">Nothing matches this view right now.</Empty>
        ) : (
          <div key={`${view}-${page}`}>
            {rows.map((a, i) => {
              const left = remaining(a);
              const frac = left / (a.ttlMin * 60_000);
              return (
                <div key={a.id} className="table-row anim-in is-clickable" style={{ gridTemplateColumns: GRID, ["--i" as string]: i }} onClick={() => navigate("agents", a.id)}>
                  <div className="td" style={{ gap: 12 }}>
                    <Icon name={a.icon} size={18} stroke={1.8} style={{ color: "#333840" }} />
                    <span className="t-14 ink-2 truncate">{a.name}</span>
                  </div>
                  <div className="td"><span className="chip">{a.scopes[0]}</span></div>
                  <div className="td t-14 ink-3">{a.credential.type}</div>
                  <div className="td t-14">
                    <span className={a.ttlMin > 15 ? "row gap-4" : "ink-2"} style={a.ttlMin > 15 ? { color: "#b26a00" } : undefined}>
                      {a.ttlMin > 15 && <Icon name="alert" size={14} />}
                      {a.ttlMin} min
                    </span>
                  </div>
                  <div className="td" style={{ gap: 12 }}>
                    <span className="t-14 ink-1 mono" style={{ width: 44 }}>{countdown(left)}</span>
                    <div className="progress grow">
                      <span style={{ background: left < 60_000 ? "#f14c43" : "#328ff9", transform: `scaleX(${frac})` }} />
                    </div>
                  </div>
                  <div className="td t-14 ink-4">{timeAgo(a.credential.issuedAt, now)}</div>
                  <div className="td" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={rotating.has(a.id)} onClick={() => rotate(a.id)}>
                      <Icon name="refresh" size={14} className={rotating.has(a.id) ? "spin" : undefined} />
                      {rotating.has(a.id) ? "Rotating" : "Rotate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="row between" style={{ padding: "16px 20px 0" }}>
        <p className="t-14 ink-4">
          {sorted.length ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length} credentials` : "No credentials to show"}
        </p>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
    </div>
  );
}
