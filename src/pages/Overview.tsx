import { useMemo, useState, type ReactNode } from "react";
import { runsPerDay, type AuditKind } from "../data/seed";
import { navigate } from "../router";
import { useStore } from "../state/store";
import { Icon, type IconName } from "../ui/Icon";
import { Segmented, StatStrip, StatusBadge, type Stat } from "../ui/kit";
import { fmt, timeAgo } from "../ui/format";

export const KIND_ICON: Record<AuditKind, IconName> = {
  agent: "agents",
  credential: "credentials",
  access: "approvals",
  policy: "policies",
  team: "team",
  integration: "integrations",
};

export function OverviewPage() {
  const { agents, approvals, audit, policies } = useStore();

  const stats: Stat[] = useMemo(() => {
    const live = agents.filter((a) => a.status !== "Revoked" && a.status !== "Paused");
    const rotations = Math.round(live.reduce((s, a) => s + 1440 / a.ttlMin, 0));
    const blocks = policies.filter((p) => p.enabled && p.severity === "High").reduce((s, p) => s + p.hits, 0);
    const today = runsPerDay[runsPerDay.length - 1];
    const yesterday = runsPerDay[runsPerDay.length - 2];
    const change = ((today - yesterday) / yesterday) * 100;
    return [
      { label: "Agent runs today", icon: "pulse", value: fmt.format(today), delta: { text: `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}%`, direction: change >= 0 ? "up" : "down", good: change >= 0 }, note: "vs yesterday", foot: [`${live.length} agents running`, "14 day high"] },
      { label: "Waiting for approval", icon: "approvals", value: String(approvals.length), note: approvals.length ? "oldest " + timeAgo(Math.min(...approvals.map((a) => a.requestedAt))) : "all clear", foot: [`${approvals.filter((a) => a.risk === "High").length} high risk`, "Review →"] },
      { label: "Requests blocked", icon: "policies", value: String(blocks), delta: { text: "−9%", direction: "down", good: true }, note: "this week", foot: [`${policies.filter((p) => p.enabled).length} policies on`, `${policies.length} total`] },
      { label: "Credentials rotated", icon: "credentials", value: fmt.format(rotations), note: "per day at current TTLs", foot: ["Zero long-lived keys", "100%"] },
    ];
  }, [agents, approvals, policies]);

  const attention = useMemo(() => agents.filter((a) => a.status === "Needs review").slice(0, 5), [agents]);
  const overTarget = agents.filter((a) => a.status !== "Revoked" && a.ttlMin > 15).length;

  const byIntegration = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of agents) if (a.status !== "Revoked") counts.set(a.scopes[0], (counts.get(a.scopes[0]) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [agents]);
  const maxCount = byIntegration[0]?.[1] ?? 1;

  return (
    <div className="page">
      <StatStrip stats={stats} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20, padding: 20 }}>
        <div className="card anim-in" style={{ ["--i" as string]: 0 }}>
          <RunsChart />
        </div>

        <div className="card anim-in col" style={{ ["--i" as string]: 1 }}>
          <div className="card-head">
            <h2 className="t-16 ink-1">Needs attention</h2>
            <span className="count-pill">{attention.length + (approvals.length ? 1 : 0) + (overTarget ? 1 : 0)}</span>
          </div>
          <div className="col" style={{ padding: "0 8px 8px" }}>
            {approvals.length > 0 && (
              <AttentionItem icon="approvals" title={`${approvals.length} access request${approvals.length === 1 ? "" : "s"} waiting`} sub="Approvals" onClick={() => navigate("approvals")} />
            )}
            {overTarget > 0 && <AttentionItem icon="timer" title={`${overTarget} credentials above the 15 min TTL target`} sub="Credentials" onClick={() => navigate("credentials")} />}
            {attention.map((a) => (
              <AttentionItem key={a.id} icon={a.icon} title={a.name} sub={`${a.scopes.join(" ")} · ${a.environment}`} badge={<StatusBadge status={a.status} small />} onClick={() => navigate("agents", a.id)} />
            ))}
            {attention.length === 0 && approvals.length === 0 && (
              <p className="t-14 ink-5" style={{ padding: "12px 12px 16px" }}>Nothing needs you right now.</p>
            )}
          </div>
        </div>

        <div className="card anim-in" style={{ ["--i" as string]: 2 }}>
          <div className="card-head">
            <h2 className="t-16 ink-1">Recent activity</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("audit")}>
              View audit log <Icon name="arrowRight" size={14} />
            </button>
          </div>
          <ol className="col" style={{ listStyle: "none", margin: 0, padding: "0 20px 12px" }}>
            {audit.slice(0, 6).map((e, i) => (
              <li key={e.id} className="row gap-12" style={{ padding: "10px 0", boxShadow: i ? "inset 0 1px 0 0 #eff1f2" : undefined }}>
                <span className="empty-icon" style={{ width: 28, height: 28, borderRadius: 8 }}>
                  <Icon name={KIND_ICON[e.kind]} size={14} />
                </span>
                <span className="t-14 ink-2 grow truncate">
                  <span className="ink-1">{e.actor}</span> {e.action} <span className="ink-1">{e.target}</span>
                </span>
                <span className="t-13 ink-5" style={{ flexShrink: 0 }}>{timeAgo(e.at)}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card anim-in" style={{ ["--i" as string]: 3 }}>
          <div className="card-head">
            <h2 className="t-16 ink-1">Agents by integration</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("integrations")}>
              Manage <Icon name="arrowRight" size={14} />
            </button>
          </div>
          <div className="col gap-12" style={{ padding: "4px 20px 20px" }}>
            {byIntegration.map(([name, count], i) => (
              <div key={name} className="row gap-12">
                <span className="t-14 ink-2" style={{ width: 84 }}>{name}</span>
                <div className="grow" style={{ height: 8, borderRadius: 999, background: "#f4f6f8", overflow: "hidden" }}>
                  <div className="bar-fill" style={{ height: "100%", width: `${(count / maxCount) * 100}%`, borderRadius: 999, background: "#328ff9", ["--i" as string]: i }} />
                </div>
                <span className="t-13 ink-4 mono" style={{ width: 28, textAlign: "right" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttentionItem({ icon, title, sub, badge, onClick }: { icon: IconName; title: string; sub: string; badge?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="menu-item" style={{ height: "auto", padding: "10px 12px", gap: 12 }} onClick={onClick}>
      <span className="empty-icon" style={{ width: 32, height: 32, borderRadius: 8 }}>
        <Icon name={icon} size={16} />
      </span>
      <span className="col grow" style={{ minWidth: 0 }}>
        <span className="t-14 ink-1 truncate">{title}</span>
        <span className="t-13 ink-5 truncate">{sub}</span>
      </span>
      {badge ?? <Icon name="chevronRight" size={16} />}
    </button>
  );
}

/* =================================================================== chart */

const RANGES = ["7d", "14d", "30d"] as const;
const W = 640;
const H = 220;
const PAD = { l: 8, r: 8, t: 16, b: 28 };

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function RunsChart() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("14d");
  const [hover, setHover] = useState<number | null>(null);
  // The draw-in plays once, on arrival. Range changes cross-fade instead (feedback stays fast).
  const [draw, setDraw] = useState(true);
  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
  const data = runsPerDay.slice(-days);

  const { pts, line, area, min, max } = useMemo(() => {
    const max = Math.max(...data) * 1.08;
    const min = Math.min(...data) * 0.85;
    const pts = data.map((v, i): [number, number] => [
      PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r),
      PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b),
    ]);
    const line = smoothPath(pts);
    const area = `${line} L${pts[pts.length - 1][0]},${H - PAD.b} L${pts[0][0]},${H - PAD.b} Z`;
    return { pts, line, area, min, max };
  }, [data]);

  const total = data.reduce((s, v) => s + v, 0);
  const dateFor = (i: number) => new Date(Date.now() - (data.length - 1 - i) * 86_400_000);

  return (
    <div>
      <div className="card-head">
        <div className="col gap-4">
          <h2 className="t-16 ink-1">Agent runs</h2>
          <span className="t-14 ink-5">
            <span className="ink-1 mono">{fmt.format(total)}</span> in the last {days} days
          </span>
        </div>
        <Segmented size="sm" options={RANGES} value={range} onChange={(r) => { setRange(r); setHover(null); setDraw(false); }} />
      </div>
      <div style={{ position: "relative", padding: "0 12px 12px" }} onMouseLeave={() => setHover(null)}>
        <svg key={range} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} className={draw ? undefined : "anim-fade"} role="img" aria-label={`Agent runs per day over the last ${days} days`}>
          <defs>
            <linearGradient id="runs-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#328ff9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#328ff9" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} stroke="#eff1f2" />
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#e2e4e5" />
          <path d={area} fill="url(#runs-fill)" className={draw ? "chart-area" : undefined} />
          <path d={line} fill="none" stroke="#328ff9" strokeWidth={2} strokeLinecap="round" pathLength={1} className={draw ? "chart-line" : undefined} style={{ ["--len" as string]: 1 }} />
          {pts.map(([x], i) =>
            i % Math.ceil(data.length / 7) === 0 || i === data.length - 1 ? (
              <text key={i} x={x} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize="11" fill="#999">
                {dateFor(i).toLocaleDateString([], { month: "short", day: "numeric" })}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <g>
              <line x1={pts[hover][0]} x2={pts[hover][0]} y1={PAD.t} y2={H - PAD.b} stroke="#d8dadb" strokeDasharray="3 3" />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4.5} fill="#fff" stroke="#328ff9" strokeWidth={2} />
            </g>
          )}
          {pts.map(([x], i) => (
            <rect
              key={`hit-${i}`}
              x={x - (W - PAD.l - PAD.r) / (data.length - 1) / 2}
              y={0}
              width={(W - PAD.l - PAD.r) / (data.length - 1)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {hover !== null && (
          <div
            className="popover"
            style={{
              position: "absolute",
              top: 0,
              left: `calc(12px + (100% - 24px) * ${pts[hover][0] / W})`,
              transform: `translateX(${pts[hover][0] > W * 0.7 ? "calc(-100% - 12px)" : "12px"})`,
              minWidth: 0,
              padding: "8px 10px",
              pointerEvents: "none",
              animation: "none",
            }}
          >
            <div className="t-12 ink-5">{dateFor(hover).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</div>
            <div className="t-14 ink-1 mono">{fmt.format(data[hover])} runs</div>
          </div>
        )}
        <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Range {fmt.format(Math.round(min))} to {fmt.format(Math.round(max))}
        </span>
      </div>
    </div>
  );
}
