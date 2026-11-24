import { useMemo, useState } from "react";
import { PAGES, navigate, type PageId } from "../router";
import { useStore } from "../state/store";
import { Icon } from "../ui/Icon";
import { MenuItem, Popover } from "../ui/kit";
import { timeAgo } from "../ui/format";

export function Topbar({ page }: { page: PageId }) {
  const { approvals, audit, actions } = useStore();
  const [menu, setMenu] = useState<null | "profile" | "notifications" | "create">(null);
  const [seenAt, setSeenAt] = useState(() => Date.now() - 60 * 60_000);
  const title = PAGES.find((p) => p.id === page)?.label ?? "";

  const notifications = useMemo(() => {
    const fromApprovals = approvals.map((a) => ({
      id: a.id,
      at: a.requestedAt,
      text: `${a.agentId} requests ${a.scopes.join(" ")}`,
      icon: "approvals" as const,
      go: () => navigate("approvals"),
    }));
    const fromAudit = audit
      .filter((e) => e.actor !== "You")
      .slice(0, 5)
      .map((e) => ({ id: e.id, at: e.at, text: `${e.actor} ${e.action} ${e.target}`, icon: "audit" as const, go: () => navigate("audit") }));
    return [...fromApprovals, ...fromAudit].sort((a, b) => b.at - a.at).slice(0, 6);
  }, [approvals, audit]);
  const unread = notifications.some((n) => n.at > seenAt);

  const close = () => setMenu(null);

  return (
    <header className="topbar">
      <h1 key={page} className="t-18 ink-1 anim-fade">
        {title}
      </h1>
      <div className="row gap-12">
        <button type="button" className="search-trigger" onClick={() => actions.open("palette")} aria-label="Search (Command K)">
          <Icon name="search" size={16} stroke={2.25} />
          Search
          <span className="kbd">
            <Icon name="command" size={11} stroke={3} />K
          </span>
        </button>

        <Popover
          open={menu === "profile"}
          onClose={close}
          width={220}
          trigger={
            <button
              type="button"
              className="row"
              aria-label="Account menu"
              aria-expanded={menu === "profile"}
              onClick={() => setMenu(menu === "profile" ? null : "profile")}
              style={{ position: "relative", width: 65, height: 36, borderRadius: 999, border: 0, background: "#fff", boxShadow: "inset 0 0 0 1px #e7e9eb", cursor: "pointer", padding: "0 4px 0 10px", gap: 5 }}
            >
              <Icon name="menu" size={18} />
              <span style={{ width: 28, height: 28, borderRadius: 999, background: "url('https://ingotui.com/showcase/e0ad708d7aafaf5b9391ffa4508aacc5f965e437.webp') center / cover no-repeat", boxShadow: "inset 0 0 0 1px #e7e9eb" }} />
            </button>
          }
        >
          <div className="col" style={{ padding: "8px 10px 10px" }}>
            <span className="t-14 ink-1">Alex Morgan</span>
            <span className="t-13 ink-5">alex@auton.dev · Owner</span>
          </div>
          <div className="menu-sep" />
          <MenuItem icon="team" onClick={() => { close(); navigate("team"); }}>Team</MenuItem>
          <MenuItem icon="settings" onClick={() => { close(); navigate("settings"); }}>Settings</MenuItem>
          <div className="menu-sep" />
          <MenuItem icon="logout" onClick={() => { close(); actions.toast("Signing out isn't wired up in this demo", "info"); }}>Sign out</MenuItem>
        </Popover>

        <Popover
          open={menu === "notifications"}
          onClose={close}
          width={340}
          trigger={
            <button
              type="button"
              className="icon-btn ringed"
              aria-label="Notifications"
              aria-expanded={menu === "notifications"}
              onClick={() => {
                setMenu(menu === "notifications" ? null : "notifications");
                setSeenAt(Date.now());
              }}
            >
              <Icon name="bell" size={16} stroke={2.25} />
              {unread && <span className="unread-dot" />}
            </button>
          }
        >
          <div className="row between" style={{ padding: "8px 10px" }}>
            <span className="t-14 ink-1">Notifications</span>
            <span className="t-12 ink-5">{approvals.length} waiting on you</span>
          </div>
          {notifications.map((n, i) => (
            <button key={n.id} type="button" className="menu-item anim-in" style={{ height: "auto", padding: "8px 10px", alignItems: "flex-start", ["--i" as string]: i }} onClick={() => { close(); n.go(); }}>
              <Icon name={n.icon} size={16} style={{ marginTop: 2 }} />
              <span className="col grow">
                <span className="t-13 ink-2" style={{ lineHeight: 1.35 }}>{n.text}</span>
                <span className="t-12 ink-5">{timeAgo(n.at)}</span>
              </span>
            </button>
          ))}
        </Popover>

        <Popover
          open={menu === "create"}
          onClose={close}
          width={220}
          trigger={
            <button
              type="button"
              className="icon-btn"
              aria-label="Create"
              aria-expanded={menu === "create"}
              onClick={() => setMenu(menu === "create" ? null : "create")}
              style={{ width: 36, height: 36, background: "#328ff9", color: "#fff", boxShadow: "inset 0 4px 7px rgba(255,255,255,0.5)" }}
            >
              <Icon name="plus" size={20} stroke={1.8} style={{ transition: "transform var(--t-small) var(--ease-out)", transform: menu === "create" ? "rotate(45deg)" : "none" }} />
            </button>
          }
        >
          <p className="menu-label">Create</p>
          <MenuItem icon="agents" onClick={() => { close(); actions.open("register"); }}>Register agent</MenuItem>
          <MenuItem icon="policies" onClick={() => { close(); actions.open("policy"); }}>New access policy</MenuItem>
          <MenuItem icon="mail" onClick={() => { close(); actions.open("invite"); }}>Invite teammate</MenuItem>
        </Popover>
      </div>
    </header>
  );
}
