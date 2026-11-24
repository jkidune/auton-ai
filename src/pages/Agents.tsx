import { useEffect, useMemo, useRef, useState } from "react";
import type { Agent, AgentStatus, Environment } from "../data/agents";
import { navigate } from "../router";
import { usePeopleById, useStore } from "../state/store";
import { Icon } from "../ui/Icon";
import { Avatar, Drawer, Empty, MenuItem, Pagination, Popover, Segmented, StatStrip, StatusBadge, useNow, type Stat } from "../ui/kit";
import { countdown, minutesAgo, timeAgo } from "../ui/format";

const PAGE_SIZE = 9;
const FILTERS = ["All", "Active", "Needs review", "Paused", "Revoked"] as const;
type Filter = (typeof FILTERS)[number];
type SortKey = "name" | "owner" | "environment" | "ttl" | "lastActive" | "status";
const GRID = "minmax(200px,1.5fr) 160px 130px minmax(210px,1.5fr) 125px 110px 124px 56px";

const COLUMNS: { label: string; key?: SortKey }[] = [
  { label: "Agent", key: "name" },
  { label: "Owner", key: "owner" },
  { label: "Environment", key: "environment" },
  { label: "Access Scope" },
  { label: "Credential TTL", key: "ttl" },
  { label: "Last active", key: "lastActive" },
  { label: "Status", key: "status" },
  { label: "CTA" },
];

const STATUS_ORDER: Record<AgentStatus, number> = { "Needs review": 0, Active: 1, Paused: 2, Revoked: 3 };

export function AgentsPage({ selectedId }: { selectedId?: string }) {
  const { agents, changedAt, actions } = useStore();
  const peopleById = usePeopleById();

  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [env, setEnv] = useState<"All" | Environment>("All");
  const [team, setTeam] = useState("All");
  const [filterMenu, setFilterMenu] = useState(false);
  const [viewMenu, setViewMenu] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ---------------------------------------------------------------- derived */

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { All: agents.length, Active: 0, "Needs review": 0, Paused: 0, Revoked: 0 };
    for (const a of agents) c[a.status]++;
    return c;
  }, [agents]);

  const stats: Stat[] = useMemo(() => {
    const live = agents.filter((a) => a.status !== "Revoked");
    const avgTtl = Math.round(live.reduce((s, a) => s + a.ttlMin, 0) / Math.max(1, live.length));
    const running = counts.Active + counts["Needs review"];
    return [
      { label: "Registered agents", icon: "robot", value: String(agents.length), delta: { text: "+6.1%", direction: "up", good: true }, note: "since Sep 1", foot: [`${agents.length} registered`, "150 licensed"] },
      { label: "Running now", icon: "pulse", value: String(running), delta: { text: "+12.3%", direction: "up", good: true }, note: "since Sep 1", foot: [`${running} running`, `${counts.Paused + counts.Revoked} idle`] },
      { label: "Over privileged", icon: "alert", value: String(counts["Needs review"]).padStart(3, "0"), delta: { text: "−22.2%", direction: "down", good: false }, note: "since Sep 1", foot: [`${counts["Needs review"]} flagged`, "by Custodian"] },
      { label: "Avg credential TTL", icon: "timer", value: `${avgTtl} min`, delta: { text: "−3 min", direction: "down", good: false }, note: "since Sep 1", foot: ["Target", "≤ 15 min"] },
    ];
  }, [agents, counts]);

  const teams = useMemo(() => ["All", ...Array.from(new Set(agents.map((a) => a.team))).sort()], [agents]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = agents.filter(
      (a) =>
        (filter === "All" || a.status === filter) &&
        (env === "All" || a.environment === env) &&
        (team === "All" || a.team === team) &&
        (!q || a.name.includes(q) || a.team.toLowerCase().includes(q) || (peopleById[a.ownerId]?.name.toLowerCase().includes(q) ?? false)),
    );
    if (sort) {
      const val = (a: Agent): string | number =>
        sort.key === "name" ? a.name
        : sort.key === "owner" ? peopleById[a.ownerId]?.name ?? ""
        : sort.key === "environment" ? a.environment
        : sort.key === "ttl" ? a.ttlMin
        : sort.key === "lastActive" ? a.lastActiveMin
        : STATUS_ORDER[a.status];
      list = [...list].sort((x, y) => {
        const a = val(x), b = val(y);
        return (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))) * sort.dir;
      });
    }
    return list;
  }, [agents, filter, env, team, query, sort, peopleById]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  useEffect(() => setPage(1), [filter, env, team, query, sort]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const rows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = (env !== "All" ? 1 : 0) + (team !== "All" ? 1 : 0);

  const selected = selectedId ? agents.find((a) => a.id === selectedId) : undefined;

  /* ---------------------------------------------------------------- actions */

  const toggleSort = (key: SortKey) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  const exportCsv = () => {
    const header = ["name", "team", "owner", "environment", "scopes", "ttl_min", "last_active", "status"];
    const lines = visible.map((a) =>
      [a.name, a.team, peopleById[a.ownerId]?.name ?? "", a.environment, `${a.scopes.join(" ")}${a.extraScopes ? ` +${a.extraScopes}` : ""}`, a.ttlMin, minutesAgo(a.lastActiveMin), a.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const url = URL.createObjectURL(new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `agents-${filter.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    actions.toast(`Exported ${visible.length} agents`);
  };

  return (
    <div className="page">
      <StatStrip stats={stats} />

      {/* toolbar */}
      <div className="row between" style={{ padding: "20px 20px 9px", height: 65 }}>
        <div className="row gap-4">
          <h2 className="t-18 ink-1">All agents</h2>
          <span className="count-pill">{counts.All}</span>
        </div>
        <div className="row gap-8">
          <Segmented options={FILTERS} value={filter} onChange={setFilter} counts={counts} />

          <div className="row" style={{ position: "relative" }}>
            {searchOpen && (
              <div className="search-field anim-fade" style={{ width: 200, marginRight: 8 }}>
                <Icon name="search" size={14} />
                <input
                  ref={searchRef}
                  className="input input-sm"
                  placeholder="Agent, team or owner"
                  value={query}
                  autoFocus
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setQuery(""); setSearchOpen(false); } }}
                />
              </div>
            )}
            <button
              type="button"
              className={`icon-btn${searchOpen || query ? " is-active" : ""}`}
              aria-label={searchOpen ? "Close search" : "Search agents"}
              onClick={() => {
                if (searchOpen) { setQuery(""); setSearchOpen(false); }
                else setSearchOpen(true);
              }}
            >
              <Icon name={searchOpen ? "x" : "search"} size={16} stroke={2.25} />
            </button>
          </div>

          <Popover
            open={filterMenu}
            onClose={() => setFilterMenu(false)}
            width={260}
            trigger={
              <button type="button" className={`icon-btn${activeFilters ? " is-active" : ""}`} aria-label="Filter agents" aria-expanded={filterMenu} onClick={() => setFilterMenu((o) => !o)}>
                <Icon name="filter" size={16} stroke={2.25} />
              </button>
            }
          >
            <div className="col gap-12" style={{ padding: 8 }}>
              <div className="field">
                <span className="field-label">Environment</span>
                <Segmented size="sm" options={["All", "Production", "Staging"] as const} value={env} onChange={setEnv} />
              </div>
              <label className="field">
                <span className="field-label">Team</span>
                <select className="input input-sm" value={team} onChange={(e) => setTeam(e.target.value)}>
                  {teams.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", paddingLeft: 0 }} disabled={!activeFilters} onClick={() => { setEnv("All"); setTeam("All"); }}>
                Clear filters
              </button>
            </div>
          </Popover>

          <Popover
            open={viewMenu}
            onClose={() => setViewMenu(false)}
            width={220}
            trigger={
              <button type="button" className={`icon-btn${viewMenu ? " is-active" : ""}`} aria-label="View options" aria-expanded={viewMenu} onClick={() => setViewMenu((o) => !o)}>
                <Icon name="sliders" size={16} stroke={2.25} />
              </button>
            }
          >
            <div className="menu-label">Sort by</div>
            <MenuItem icon="sort" onClick={() => { setSort({ key: "lastActive", dir: 1 }); setViewMenu(false); }}>Most recently active</MenuItem>
            <MenuItem icon="timer" onClick={() => { setSort({ key: "ttl", dir: -1 }); setViewMenu(false); }}>Longest credential TTL</MenuItem>
            <MenuItem icon="alert" onClick={() => { setSort({ key: "status", dir: 1 }); setViewMenu(false); }}>Needs review first</MenuItem>
            <div className="menu-sep" />
            <MenuItem icon="download" onClick={() => { setViewMenu(false); exportCsv(); }}>Export CSV</MenuItem>
          </Popover>

          <button type="button" className="btn btn-primary" style={{ padding: "0 14px 0 12px" }} onClick={() => actions.open("register")}>
            <Icon name="plus" size={16} stroke={2.25} /> Register agent
          </button>
        </div>
      </div>

      {/* table */}
      <div className="card" style={{ margin: "0 20px", padding: 2, minHeight: 642 }}>
        <div className="table-head" style={{ gridTemplateColumns: GRID }}>
          {COLUMNS.map((c) =>
            c.key ? (
              <button
                key={c.label}
                type="button"
                className={`th${sort?.key === c.key ? ` is-sorted${sort.dir === -1 ? " is-desc" : ""}` : ""}`}
                onClick={() => toggleSort(c.key!)}
                aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
              >
                {c.label}
                <Icon name="chevronUp" size={14} className="sort-arrow" />
              </button>
            ) : (
              <span key={c.label || "cta"} className="th">{c.label}</span>
            ),
          )}
        </div>

        {rows.length === 0 ? (
          <Empty icon="search" title="No agents match">
            Try another status, or{" "}
            <button type="button" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", padding: "0 4px", color: "#328ff9" }} onClick={() => { setFilter("All"); setQuery(""); setEnv("All"); setTeam("All"); }}>
              clear all filters
            </button>
          </Empty>
        ) : (
          <div key={`${page}-${filter}-${env}-${team}`}>
            {rows.map((a, i) => (
              <AgentRow
                key={a.id}
                agent={a}
                index={i}
                dropUp={i >= rows.length - 3 && rows.length > 4}
                selected={a.id === selectedId}
                flash={changedAt[a.id] !== undefined && Date.now() - changedAt[a.id] < 1200 ? changedAt[a.id] : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div className="row between" style={{ padding: "16px 20px 0" }}>
        <p className="t-14 ink-4">
          {visible.length ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, visible.length)} of ${visible.length} agents` : "No agents to show"}
        </p>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>

      <AgentDrawer agent={selected} onClose={() => navigate("agents")} />
    </div>
  );
}

/* =================================================================== row */

function AgentRow({ agent, index, dropUp, selected, flash }: { agent: Agent; index: number; dropUp: boolean; selected: boolean; flash?: number }) {
  const { actions } = useStore();
  const owner = usePeopleById()[agent.ownerId];
  const [menu, setMenu] = useState(false);
  const run = (fn: () => void) => () => { setMenu(false); fn(); };

  return (
    <div
      className={`table-row is-clickable anim-in${selected ? " is-selected" : ""}`}
      style={{ gridTemplateColumns: GRID, height: 65, ["--i" as string]: index }}
      onClick={() => navigate("agents", agent.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") navigate("agents", agent.id); }}
      aria-label={`${agent.name}, ${agent.status}`}
    >
      {flash && <span key={flash} className="row-flash" />}
      <div className="td" style={{ gap: 12 }}>
        <Icon name={agent.icon} size={20} stroke={1.8} style={{ color: "#333840" }} />
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <span className="t-14 ink-2 truncate">{agent.name}</span>
          <span className="t-14 ink-5">{agent.team}</span>
        </div>
      </div>
      <div className="td" style={{ gap: 8 }}>
        {owner && <Avatar person={owner} />}
        <span className="t-14 ink-2 truncate">{owner?.name ?? "Unassigned"}</span>
      </div>
      <div className="td"><span className="chip">{agent.environment}</span></div>
      <div className="td">
        {agent.scopes.map((s) => <span key={s} className="chip">{s}</span>)}
        {agent.extraScopes > 0 && <span className="chip">+{agent.extraScopes}</span>}
      </div>
      <div className="td t-14">{agent.status === "Revoked" ? <span className="ink-4">Expired</span> : <span className="ink-2">{agent.ttlMin} min</span>}</div>
      <div className="td t-14 ink-4">{minutesAgo(agent.lastActiveMin)}</div>
      <div className="td"><StatusBadge status={agent.status} /></div>
      <div className="td" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Popover
          open={menu}
          onClose={() => setMenu(false)}
          dropUp={dropUp}
          width={210}
          trigger={
            <button type="button" className="icon-btn plain" aria-label={`Actions for ${agent.name}`} aria-expanded={menu} onClick={() => setMenu((m) => !m)} style={{ color: "#141b34" }}>
              <Icon name="dots" size={24} stroke={1.5} />
            </button>
          }
        >
          <MenuItem icon="external" onClick={run(() => navigate("agents", agent.id))}>View details</MenuItem>
          {agent.status === "Needs review" && <MenuItem icon="check" onClick={run(() => actions.setAgentStatus(agent.id, "Active"))}>Approve</MenuItem>}
          {agent.status === "Active" && <MenuItem icon="pause" onClick={run(() => actions.setAgentStatus(agent.id, "Paused"))}>Pause</MenuItem>}
          {agent.status === "Paused" && <MenuItem icon="play" onClick={run(() => actions.setAgentStatus(agent.id, "Active"))}>Resume</MenuItem>}
          {agent.status !== "Revoked" && <MenuItem icon="refresh" onClick={run(() => actions.rotateCredential(agent.id))}>Rotate credential</MenuItem>}
          <div className="menu-sep" />
          {agent.status !== "Revoked" ? (
            <MenuItem icon="ban" danger onClick={run(() => actions.setAgentStatus(agent.id, "Revoked"))}>Revoke access</MenuItem>
          ) : (
            <MenuItem icon="refresh" onClick={run(() => actions.setAgentStatus(agent.id, "Paused"))}>Restore as paused</MenuItem>
          )}
        </Popover>
      </div>
    </div>
  );
}

/* =================================================================== drawer */

function AgentDrawer({ agent, onClose }: { agent?: Agent; onClose: () => void }) {
  // Keep the last agent around so the drawer can animate out with its content.
  const last = useRef<Agent | undefined>(agent);
  if (agent) last.current = agent;
  const a = agent ?? last.current;
  return (
    <Drawer open={!!agent} onClose={onClose} footer={a ? <DrawerActions agent={a} /> : undefined}>
      {a && <AgentDetail agent={a} />}
    </Drawer>
  );
}

function AgentDetail({ agent }: { agent: Agent }) {
  const { audit, actions } = useStore();
  const owner = usePeopleById()[agent.ownerId];
  const now = useNow(1000);
  const [rotating, setRotating] = useState(false);

  const ttlMs = agent.ttlMin * 60_000;
  const remaining = ttlMs - ((now - agent.credential.issuedAt) % ttlMs);
  const activity = audit.filter((e) => e.target.startsWith(agent.name)).slice(0, 5);

  const rotate = () => {
    setRotating(true);
    window.setTimeout(() => {
      actions.rotateCredential(agent.id);
      setRotating(false);
    }, 600);
  };

  return (
    <div className="col gap-20 anim-fade" key={agent.id}>
      <div className="row gap-12">
        <div className="empty-icon" style={{ width: 48, height: 48 }}>
          <Icon name={agent.icon} size={22} stroke={1.6} />
        </div>
        <div className="col gap-4 grow">
          <h2 className="t-18 ink-1">{agent.name}</h2>
          <span className="t-14 ink-5">{agent.team} · {agent.environment}</span>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          ["Owner", owner ? <span className="row gap-8"><Avatar person={owner} />{owner.name}</span> : "Unassigned"],
          ["Environment", agent.environment],
          ["Credential TTL", `${agent.ttlMin} min`],
          ["Last active", minutesAgo(agent.lastActiveMin)],
        ].map(([label, value]) => (
          <div key={label as string} className="col gap-6" style={{ padding: 12, borderRadius: 12, background: "#fafafa", boxShadow: "inset 0 0 0 1px #eff1f2" }}>
            <span className="t-12 ink-5">{label}</span>
            <span className="t-14 ink-1">{value}</span>
          </div>
        ))}
      </div>

      <section className="col gap-8">
        <span className="eyebrow">Access scope</span>
        <div className="row gap-4" style={{ flexWrap: "wrap" }}>
          {agent.scopes.map((s) => <span key={s} className="chip">{s}</span>)}
          {agent.extraScopes > 0 && <span className="chip ink-5">+{agent.extraScopes} more</span>}
        </div>
      </section>

      <section className="col gap-8">
        <span className="eyebrow">Credential</span>
        <div className="col gap-12" style={{ padding: 14, borderRadius: 12, boxShadow: "inset 0 0 0 1px #e7e9eb" }}>
          <div className="row between">
            <div className="col gap-4">
              <span className="t-14 ink-1">{agent.credential.type}</span>
              <span className="t-13 ink-5">
                {agent.status === "Revoked" ? "Revoked. No credential is issued." : `Renews in ${countdown(remaining)} · issued ${timeAgo(agent.credential.issuedAt, now)}`}
              </span>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" disabled={rotating || agent.status === "Revoked"} onClick={rotate}>
              <Icon name="refresh" size={14} className={rotating ? "spin" : undefined} />
              {rotating ? "Rotating…" : "Rotate now"}
            </button>
          </div>
          {agent.status !== "Revoked" && (
            <div className="progress">
              <span style={{ background: remaining < 60_000 ? "#f14c43" : "#328ff9", transform: `scaleX(${remaining / ttlMs})` }} />
            </div>
          )}
        </div>
      </section>

      <section className="col gap-8">
        <span className="eyebrow">Recent activity</span>
        {activity.length === 0 ? (
          <p className="t-14 ink-5">Nothing logged for this agent yet.</p>
        ) : (
          <ol className="col" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {activity.map((e, i) => (
              <li key={e.id} className="row gap-12 anim-in" style={{ padding: "8px 0", boxShadow: i ? "inset 0 1px 0 0 #eff1f2" : undefined, ["--i" as string]: i }}>
                <span className="t-13 ink-5 mono" style={{ width: 72, flexShrink: 0 }}>{timeAgo(e.at, now)}</span>
                <span className="t-14 ink-2">{e.actor} {e.action}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function DrawerActions({ agent }: { agent: Agent }) {
  const { actions } = useStore();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = window.setTimeout(() => setConfirm(false), 3000);
    return () => window.clearTimeout(t);
  }, [confirm]);
  useEffect(() => setConfirm(false), [agent.id, agent.status]);

  const set = (s: AgentStatus) => actions.setAgentStatus(agent.id, s);

  return (
    <>
      {agent.status === "Needs review" && <button type="button" className="btn btn-primary" onClick={() => set("Active")}><Icon name="check" size={16} /> Approve</button>}
      {agent.status === "Active" && <button type="button" className="btn btn-secondary" onClick={() => set("Paused")}><Icon name="pause" size={16} /> Pause</button>}
      {agent.status === "Paused" && <button type="button" className="btn btn-primary" onClick={() => set("Active")}><Icon name="play" size={16} /> Resume</button>}
      {agent.status === "Revoked" ? (
        <button type="button" className="btn btn-secondary" onClick={() => set("Paused")}><Icon name="refresh" size={16} /> Restore as paused</button>
      ) : (
        <button
          type="button"
          className={`btn ${confirm ? "btn-danger-solid" : "btn-danger"}`}
          style={{ marginLeft: "auto" }}
          onClick={() => (confirm ? set("Revoked") : setConfirm(true))}
        >
          <Icon name="ban" size={16} /> {confirm ? "Confirm revoke" : "Revoke access"}
        </button>
      )}
    </>
  );
}
