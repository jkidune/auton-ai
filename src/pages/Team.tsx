import { useMemo, useState } from "react";
import type { Role } from "../data/agents";
import { useStore } from "../state/store";
import { Icon } from "../ui/Icon";
import { Avatar, Badge, MenuItem, Popover } from "../ui/kit";
import { minutesAgo } from "../ui/format";

const ROLES: Role[] = ["Admin", "Editor", "Viewer"];
const GRID = "minmax(260px, 2fr) 140px 120px 140px 56px";

export function TeamPage() {
  const { people, agents, actions } = useStore();
  const [menu, setMenu] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const owned = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of agents) m.set(a.ownerId, (m.get(a.ownerId) ?? 0) + 1);
    return m;
  }, [agents]);

  const list = people.filter((p) => !query || `${p.name} ${p.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="page page-pad col gap-20">
      <div className="row between">
        <div className="col gap-4">
          <h2 className="t-18 ink-1">Team</h2>
          <p className="t-14 ink-5">{people.length} people · Admins approve access, Editors run their own agents, Viewers can look.</p>
        </div>
        <div className="row gap-8">
          <div className="search-field" style={{ width: 220 }}>
            <Icon name="search" size={14} />
            <input className="input input-sm" placeholder="Name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => actions.open("invite")}>
            <Icon name="mail" size={16} /> Invite
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 2 }}>
        <div className="table-head" style={{ gridTemplateColumns: GRID }}>
          {["Member", "Role", "Agents", "Last active", ""].map((h, i) => <span key={i} className="th">{h}</span>)}
        </div>
        {list.map((p, i) => (
          <div key={p.id} className="table-row anim-in" style={{ gridTemplateColumns: GRID, ["--i" as string]: i }}>
            <div className="td" style={{ gap: 12 }}>
              <Avatar person={p} size="lg" />
              <div className="col" style={{ minWidth: 0 }}>
                <span className="row gap-8 t-14 ink-1">
                  {p.name}
                  {p.isYou && <span className="t-12 ink-5">(you)</span>}
                  {p.invited && <Badge tone="amber" small>Invited</Badge>}
                </span>
                <span className="t-13 ink-5 truncate">{p.email}</span>
              </div>
            </div>
            <div className="td">
              {p.role === "Owner" ? (
                <span className="t-14 ink-2 row gap-6"><Icon name="lock" size={14} /> Owner</span>
              ) : (
                <select className="input input-sm" style={{ width: 120 }} value={p.role} aria-label={`Role for ${p.name}`} onChange={(e) => actions.setRole(p.id, e.target.value as Role)}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              )}
            </div>
            <div className="td t-14 ink-3 mono">{owned.get(p.id) ?? 0}</div>
            <div className="td t-14 ink-4">{p.invited ? "Pending" : minutesAgo(p.lastActiveMin)}</div>
            <div className="td">
              {!p.isYou && (
                <Popover
                  open={menu === p.id}
                  onClose={() => setMenu(null)}
                  dropUp={i >= list.length - 2 && list.length > 3}
                  width={200}
                  trigger={
                    <button type="button" className="icon-btn plain" aria-label={`Actions for ${p.name}`} onClick={() => setMenu(menu === p.id ? null : p.id)}>
                      <Icon name="dots" size={22} stroke={1.5} />
                    </button>
                  }
                >
                  {p.invited && <MenuItem icon="mail" onClick={() => { setMenu(null); actions.toast(`Invite re-sent to ${p.email}`); }}>Resend invite</MenuItem>}
                  <MenuItem icon="mail" onClick={() => { setMenu(null); navigator.clipboard?.writeText(p.email); actions.toast("Email copied"); }}>Copy email</MenuItem>
                  <div className="menu-sep" />
                  <MenuItem icon="trash" danger onClick={() => { setMenu(null); actions.removeMember(p.id); }}>
                    {(owned.get(p.id) ?? 0) > 0 ? `Remove (${owned.get(p.id)} agents keep running)` : "Remove from workspace"}
                  </MenuItem>
                </Popover>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
