import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PAGES, navigate } from "../router";
import { useStore } from "../state/store";
import { Icon, type IconName } from "../ui/Icon";
import { EXIT, StatusBadge, usePresence } from "../ui/kit";
import type { AgentStatus } from "../data/agents";

interface Item {
  id: string;
  group: "Pages" | "Actions" | "Agents";
  label: string;
  hint?: string;
  icon: IconName;
  status?: AgentStatus;
  run: () => void;
}

export function CommandPalette() {
  const { overlay, agents, actions } = useStore();
  const open = overlay === "palette";
  const { mounted, closing } = usePresence(open, EXIT.small);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIndex(0);
    }
  }, [open]);
  // Focus once the palette is actually in the DOM (usePresence mounts it a render later).
  useEffect(() => {
    if (open && mounted) inputRef.current?.focus();
  }, [open, mounted]);

  const items = useMemo<Item[]>(() => {
    const query = q.trim().toLowerCase();
    const match = (s: string) => !query || s.toLowerCase().includes(query);
    const pages: Item[] = PAGES.filter((p) => match(p.label) || match(p.blurb)).map((p) => ({
      id: `page-${p.id}`,
      group: "Pages",
      label: p.label,
      hint: p.blurb,
      icon: p.icon,
      run: () => navigate(p.id),
    }));
    const acts: Item[] = [
      { id: "act-register", group: "Actions" as const, label: "Register agent", icon: "plus" as const, run: () => actions.open("register") },
      { id: "act-policy", group: "Actions" as const, label: "New access policy", icon: "policies" as const, run: () => actions.open("policy") },
      { id: "act-invite", group: "Actions" as const, label: "Invite teammate", icon: "mail" as const, run: () => actions.open("invite") },
    ].filter((a) => match(a.label));
    const agentItems: Item[] = query
      ? agents
          .filter((a) => match(a.name) || match(a.team))
          .slice(0, 6)
          .map((a) => ({ id: `agent-${a.id}`, group: "Agents", label: a.name, hint: a.team, icon: a.icon, status: a.status, run: () => navigate("agents", a.id) }))
      : [];
    return [...agentItems, ...pages, ...acts];
  }, [q, agents, actions]);

  useEffect(() => setIndex(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!mounted) return null;

  const choose = (item?: Item) => {
    if (!item) return;
    actions.close();
    // Let the palette start its exit before a modal opens over it.
    window.setTimeout(item.run, item.group === "Actions" ? EXIT.small : 0);
  };

  let lastGroup = "";
  return createPortal(
    <>
      <div className={`overlay${closing ? " is-closing" : ""}`} onClick={actions.close} />
      <div className="modal-wrap" style={{ paddingTop: "14vh" }}>
        <div role="dialog" aria-modal="true" aria-label="Command palette" className={`palette${closing ? " is-closing" : ""}`}>
          <div style={{ position: "relative" }}>
            <Icon name="search" size={18} style={{ position: "absolute", left: 16, top: 17, color: "#777" }} />
            <input
              ref={inputRef}
              className="palette-input"
              placeholder="Search pages, agents and actions…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
                else if (e.key === "Enter") { e.preventDefault(); choose(items[index]); }
                else if (e.key === "Escape") { e.preventDefault(); actions.close(); }
              }}
              aria-activedescendant={items[index] ? `cmd-${items[index].id}` : undefined}
            />
          </div>
          <div ref={listRef} className="palette-list" role="listbox">
            {items.length === 0 && <p className="t-14 ink-5" style={{ padding: "20px 12px" }}>No results for “{q}”</p>}
            {items.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {header && <p className="menu-label">{header}</p>}
                  <button
                    id={`cmd-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={i === index}
                    data-index={i}
                    className={`menu-item${i === index ? " is-active" : ""}`}
                    style={{ height: 40 }}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => choose(item)}
                  >
                    <Icon name={item.icon} size={16} />
                    <span className="ink-1">{item.label}</span>
                    {item.hint && <span className="t-13 ink-5 truncate">{item.hint}</span>}
                    {item.status && <span style={{ marginLeft: "auto" }}><StatusBadge status={item.status} small /></span>}
                    {!item.status && i === index && <Icon name="arrowRight" size={14} style={{ marginLeft: "auto" }} />}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="row gap-16 t-12 ink-5" style={{ padding: "10px 14px", boxShadow: "inset 0 1px 0 0 #e2e4e5" }}>
            <span className="row gap-6"><span className="kbd">↑</span><span className="kbd">↓</span> to move</span>
            <span className="row gap-6"><span className="kbd">↵</span> to open</span>
            <span className="row gap-6"><span className="kbd">esc</span> to close</span>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
