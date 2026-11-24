import { useState } from "react";
import { navigate } from "../router";
import { usePeopleById, useStore } from "../state/store";
import { Icon } from "../ui/Icon";
import { Avatar, Badge, EXIT, Empty, RISK_TONE } from "../ui/kit";
import { timeAgo } from "../ui/format";

export function ApprovalsPage() {
  const { approvals, resolved, agents, actions } = useStore();
  const peopleById = usePeopleById();
  // Cards play their exit before the store removes them.
  const [leaving, setLeaving] = useState<Record<string, "Approved" | "Denied">>({});

  const decide = (id: string, decision: "Approved" | "Denied") => {
    setLeaving((l) => ({ ...l, [id]: decision }));
    window.setTimeout(() => {
      actions.decide(id, decision);
      setLeaving((l) => {
        const { [id]: _, ...rest } = l;
        return rest;
      });
    }, EXIT.panel);
  };

  return (
    <div className="page page-pad col gap-20">
      <div className="row between">
        <div className="col gap-4">
          <h2 className="t-18 ink-1">Waiting for you</h2>
          <p className="t-14 ink-5">Approving a request activates the agent with the requested scope. Denying keeps it as it is.</p>
        </div>
        <span className="count-pill" style={{ height: 22, fontSize: 13 }}>{approvals.length} open</span>
      </div>

      {approvals.length === 0 ? (
        <div className="card">
          <Empty icon="circleCheck" title="All caught up">New access requests from agents and teammates will show up here.</Empty>
        </div>
      ) : (
        <div className="col gap-12">
          {approvals.map((a, i) => {
            const requester = peopleById[a.requesterId];
            const agent = agents.find((x) => x.id === a.agentId);
            return (
              <article key={a.id} className={`card row gap-16 ${leaving[a.id] ? "is-leaving" : "anim-in"}`} style={{ padding: 20, alignItems: "flex-start", ["--i" as string]: i }}>
                <div className="empty-icon" style={{ width: 40, height: 40 }}>
                  <Icon name={agent?.icon ?? "agents"} size={18} stroke={1.8} />
                </div>
                <div className="col gap-8 grow">
                  <div className="row gap-8">
                    <button type="button" className="t-16 ink-1" style={{ border: 0, background: "none", padding: 0, cursor: "pointer" }} onClick={() => navigate("agents", a.agentId)}>
                      {a.agentId}
                    </button>
                    <Badge tone={RISK_TONE[a.risk]} small>{a.risk} risk</Badge>
                    {agent && <span className="chip chip-sm">{agent.environment}</span>}
                  </div>
                  <p className="t-14 ink-2">{a.title}</p>
                  <p className="t-14 ink-4" style={{ maxWidth: 640 }}>“{a.reason}”</p>
                  <div className="row gap-8 t-13 ink-5">
                    {requester && <Avatar person={requester} />}
                    <span>Requested by {requester?.isYou ? "you" : requester?.name ?? "someone"} · {timeAgo(a.requestedAt)}</span>
                  </div>
                </div>
                <div className="row gap-8">
                  <button type="button" className="btn btn-secondary" disabled={!!leaving[a.id]} onClick={() => decide(a.id, "Denied")}>Deny</button>
                  <button type="button" className="btn btn-primary" disabled={!!leaving[a.id]} onClick={() => decide(a.id, "Approved")}>
                    <Icon name="check" size={16} /> Approve
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="col gap-12" style={{ marginTop: 12 }}>
        <h2 className="t-16 ink-1">Recently resolved</h2>
        <div className="card" style={{ padding: 2 }}>
          {resolved.slice(0, 8).map((r, i) => {
            const isNew = Date.now() - r.decidedAt < 2000;
            return (
              <div key={r.id} className={`table-row${isNew ? " is-new" : ""}`} style={{ gridTemplateColumns: "1fr auto auto", minHeight: 56, padding: "10px 0", animationDelay: isNew ? `${i * 40}ms` : undefined }}>
                <div className="td" style={{ gap: 12 }}>
                  <span className="t-14 ink-1">{r.agentId}</span>
                  <span className="t-14 ink-4 truncate">{r.title}</span>
                </div>
                <div className="td"><Badge tone={r.decision === "Approved" ? "green" : "gray"} small dot>{r.decision}</Badge></div>
                <div className="td t-13 ink-5" style={{ width: 120, justifyContent: "flex-end" }}>{timeAgo(r.decidedAt)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
