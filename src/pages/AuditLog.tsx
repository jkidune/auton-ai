import { useEffect, useMemo, useState } from "react";
import type { AuditKind } from "../data/seed";
import { useStore } from "../state/store";
import { Icon } from "../ui/Icon";
import { Empty, Pagination, Segmented } from "../ui/kit";
import { clock, dayLabel, timeAgo } from "../ui/format";
import { KIND_ICON } from "./Overview";

const PAGE_SIZE = 14;
const KINDS = ["All", "Agents", "Credentials", "Access", "Policies", "Team", "Integrations"] as const;
type KindFilter = (typeof KINDS)[number];
const KIND_OF: Record<Exclude<KindFilter, "All">, AuditKind> = {
  Agents: "agent",
  Credentials: "credential",
  Access: "access",
  Policies: "policy",
  Team: "team",
  Integrations: "integration",
};
const GRID = "110px minmax(160px, 0.8fr) minmax(280px, 2fr) 140px";

export function AuditLogPage() {
  const { audit, actions } = useStore();
  const [kind, setKind] = useState<KindFilter>("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return audit.filter(
      (e) => (kind === "All" || e.kind === KIND_OF[kind]) && (!q || `${e.actor} ${e.action} ${e.target}`.toLowerCase().includes(q)),
    );
  }, [audit, kind, query]);
  useEffect(() => setPage(1), [kind, query]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const rows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(list.map((e) => ({ ...e, at: new Date(e.at).toISOString() })), null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.json";
    a.click();
    URL.revokeObjectURL(url);
    actions.toast(`Exported ${list.length} events`);
  };

  let lastDay = "";
  return (
    <div className="page page-pad col gap-16">
      <div className="row between">
        <div className="col gap-4">
          <h2 className="t-18 ink-1">Audit log</h2>
          <p className="t-14 ink-5">Append-only. Every agent, credential and access change is recorded here.</p>
        </div>
        <div className="row gap-8">
          <div className="search-field" style={{ width: 240 }}>
            <Icon name="search" size={14} />
            <input className="input input-sm" placeholder="Actor, action or target" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={exportJson}>
            <Icon name="download" size={14} /> Export
          </button>
        </div>
      </div>

      <Segmented options={KINDS} value={kind} onChange={setKind} />

      <div className="card" style={{ padding: 2 }}>
        <div className="table-head" style={{ gridTemplateColumns: GRID }}>
          {["Time", "Actor", "Event", "Type"].map((h) => <span key={h} className="th">{h}</span>)}
        </div>
        {rows.length === 0 ? (
          <Empty icon="audit" title="No matching events" />
        ) : (
          <div key={`${kind}-${page}-${query}`}>
            {rows.map((e, i) => {
              const day = dayLabel(e.at);
              const header = day !== lastDay ? day : null;
              lastDay = day;
              const isNew = Date.now() - e.at < 2500 && e.actor === "You";
              return (
                <div key={e.id}>
                  {header && (
                    <div className="t-12 ink-5" style={{ padding: "12px 12px 6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{header}</div>
                  )}
                  <div className={`table-row ${isNew ? "is-new" : "anim-in"}`} style={{ gridTemplateColumns: GRID, minHeight: 52, padding: "8px 0 9px", ["--i" as string]: i }}>
                    <div className="td t-13 ink-4 mono" title={new Date(e.at).toLocaleString()}>{clock(e.at)}</div>
                    <div className="td t-14 ink-1">{e.actor}</div>
                    <div className="td t-14 ink-3" style={{ display: "block" }}>
                      <span className="truncate" style={{ display: "block" }}>{e.action} <span className="ink-1">{e.target}</span></span>
                    </div>
                    <div className="td t-13 ink-4" style={{ gap: 8 }}>
                      <Icon name={KIND_ICON[e.kind]} size={14} />
                      <span style={{ textTransform: "capitalize" }}>{e.kind}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="row between">
        <p className="t-14 ink-4">{list.length} events · newest {list[0] ? timeAgo(list[0].at) : "—"}</p>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
    </div>
  );
}
