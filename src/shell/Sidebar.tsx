import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { PAGES, navigate, type PageId } from "../router";
import { useStore } from "../state/store";
import { Icon } from "../ui/Icon";

const FONT = "'Geist', ui-sans-serif, system-ui, sans-serif";
const trim = { textBox: "trim-both cap alphabetic" } as CSSProperties;

/* Decorative illustration + upgrade card, carried over from the Figma frame. */
const art: Record<string, CSSProperties> = {
  frame: { position: "relative", left: -19, width: 280, height: 247, flexShrink: 0 },
  bg: { position: "absolute", inset: 0, background: "url('https://ingotui.com/showcase/ae303b6c3e6fae384f56814a669c2459ff0fac06.webp') -72.72px -87.68px / 415.55px 419.93px no-repeat" },
  card: { position: "absolute", left: 52, top: 33, width: 173, height: 208, borderRadius: 12, background: "#fff", boxShadow: "inset 0 0 0 1px #eff1f2", overflow: "hidden" },
  head: { position: "absolute", left: 12, top: 16, width: 148, height: 43, display: "flex", gap: 8, alignItems: "center" },
  tile: { width: 43, height: 43, flexShrink: 0, borderRadius: 8, background: "#f4f6f8", boxShadow: "inset 0 0 0 1px #eff1f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#333" },
  title: { ...trim, margin: 0, fontFamily: FONT, fontSize: 16, color: "#222", lineHeight: 1.4, letterSpacing: "-0.02em", height: 11 },
  envPill: { height: 20, borderRadius: 12, background: "#f4f6f8", boxShadow: "inset 0 0 0 1px #eff1f2", display: "inline-flex", alignItems: "center", padding: "0 9px", alignSelf: "flex-start" },
  envText: { ...trim, margin: 0, fontFamily: FONT, fontSize: 10, color: "#444", height: 7 },
  item: { position: "absolute", left: 12, width: 149, height: 32, borderRadius: 8, background: "#f4f6f8", boxShadow: "inset 0 0 0 1px #eff1f2", display: "flex", alignItems: "center", gap: 8, padding: "0 8px" },
  itemText: { ...trim, margin: 0, fontFamily: FONT, fontSize: 12, color: "#444", height: 9 },
  itemMuted: { ...trim, margin: 0, fontFamily: FONT, fontSize: 12, color: "#555", height: 9 },
  promo: {
    position: "relative", width: 207, height: 142, flexShrink: 0, borderRadius: 12, overflow: "hidden",
    background: "radial-gradient(rgba(184, 235, 255, 0.72) 0%, rgba(194, 224, 255, 0.2) 68%, rgba(255, 255, 255, 0) 100%), radial-gradient(rgba(77, 235, 201, 0.68) 0%, rgba(166, 242, 237, 0.22) 62%, rgba(255, 255, 255, 0) 100%), linear-gradient(98.6deg, #8fe8e0 -5.1%, #d6f5fa 40.1%, #87b2fa 102.7%)",
    boxShadow: "inset 0 0 0 1px #ffffff, 0px 0px 20px 4px rgba(0, 0, 0, 0.01)",
  },
  promoText: { ...trim, position: "absolute", left: 16, top: 23, width: 172, margin: 0, fontFamily: FONT, fontSize: 16, color: "#000", lineHeight: 1.4, letterSpacing: "-0.02em", height: 33 },
};

const dotSvg = (
  <svg width={8} height={8} viewBox="0 0 24 24" style={{ color: "#333", flexShrink: 0 }} aria-hidden="true">
    <path fill="currentColor" d="M8 5.072a8 8 0 1 1 -3.995 7.213l-.005 -.285l.005 -.285a8 8 0 0 1 3.995 -6.643z" />
  </svg>
);

export function Sidebar({ active }: { active: PageId }) {
  const { approvals, actions } = useStore();
  const navRef = useRef<HTMLDivElement>(null);
  const [y, setY] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(`[data-page="${active}"]`);
    if (el) setY(el.offsetTop + (el.offsetHeight - 32) / 2);
  }, [active]);

  // Badge bumps when the approvals count changes (feedback, not decoration).
  const [bump, setBump] = useState(0);
  const prevCount = useRef(approvals.length);
  useEffect(() => {
    if (prevCount.current !== approvals.length) setBump((b) => b + 1);
    prevCount.current = approvals.length;
  }, [approvals.length]);

  const sections = ["Workspace", "Manage"] as const;

  return (
    <aside className="sidebar">
      <div className="row between" style={{ height: 60, flexShrink: 0, padding: "0 19px 0 16px", boxShadow: "inset 0 -1px 0 0 #e7e9eb" }}>
        <button type="button" className="row" onClick={() => navigate("overview")} style={{ border: 0, background: "none", padding: 0, cursor: "pointer" }} aria-label="Auton home">
          <span style={{ width: 16, height: 16, borderRadius: 999, boxShadow: "inset 0 0 0 1.33px #212121" }} />
          <span style={{ width: 16, height: 16, borderRadius: 999, background: "#212121", marginLeft: -8 }} />
          <span style={{ marginLeft: 8, fontSize: 20, color: "#444", letterSpacing: "-0.06em", lineHeight: 1.1 }}>Auton</span>
        </button>
        <span className="ink-3" aria-hidden="true">
          <Icon name="collapse" size={18} stroke={1.6} />
        </span>
      </div>

      <div ref={navRef} className="nav-list" style={{ padding: "22px 16px 0", gap: 24 }}>
        {y !== null && <span className="nav-indicator" style={{ left: 16, right: 16, transform: `translateY(${y}px)` }} />}
        {sections.map((section) => (
          <nav key={section} className="col gap-12" aria-label={section}>
            <p className="eyebrow">{section}</p>
            <div className="col">
              {PAGES.filter((p) => p.section === section).map((p) => (
                <a
                  key={p.id}
                  href={`#/${p.id}`}
                  data-page={p.id}
                  className={`nav-item${p.id === active ? " is-active" : ""}`}
                  aria-current={p.id === active ? "page" : undefined}
                >
                  <Icon name={p.icon} size={16} stroke={p.id === "overview" || p.id === "integrations" ? 2.25 : 1.95} />
                  <span>{p.label}</span>
                  {p.id === "approvals" && approvals.length > 0 && (
                    <span key={bump} className={`nav-badge${bump ? " bump" : ""}`}>
                      {approvals.length}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </nav>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />

      <div className="col" style={{ padding: "0 16px 28px", flexShrink: 0 }}>
        <div className="sidebar-illustration" style={art.frame} aria-hidden="true">
          <div style={art.bg} />
          <div style={art.card}>
            <div style={art.head}>
              <div style={art.tile}>
                <Icon name="shieldKey" size={24} stroke={1.5} />
              </div>
              <div className="col" style={{ gap: 12, width: 97 }}>
                <p style={art.title}>deploy-agent</p>
                <span style={art.envPill}>
                  <span style={art.envText}>Production</span>
                </span>
              </div>
            </div>
            <svg style={{ position: "absolute", left: 12, top: 75 }} width="149" height="1" viewBox="0 0 149 1">
              <path d="M0 0L149 0" fill="none" stroke="#ced0d1" strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round" />
            </svg>
            <div style={{ ...art.item, top: 86 }}>
              <span style={{ width: 21, height: 21, flexShrink: 0, background: "url('https://ingotui.com/showcase/9606064a2714f05904aa80f7a34774ee2491a3b4.webp') center / cover no-repeat" }} />
              <span className="row gap-4">
                <span style={art.itemText}>GitHub</span>
                {dotSvg}
                <span style={art.itemMuted}>Read</span>
              </span>
            </div>
            <div style={{ ...art.item, top: 126 }}>
              <span style={{ width: 26, height: 16, flexShrink: 0, background: "url('https://ingotui.com/showcase/dfd4513aa7260aa3aa00ae30cea8f90091e13079.webp') -1.22px 0px / 28.44px 16px no-repeat" }} />
              <span className="row gap-4">
                <span style={art.itemText}>AWS</span>
                {dotSvg}
                <span style={art.itemMuted}>Deploy</span>
              </span>
            </div>
            <div style={{ ...art.item, top: 166, boxShadow: "inset 0 0 0 1px #f0f2f1" }}>
              <span style={{ color: "#07bc6d" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" style={{ display: "block" }}>
                  <path fill="currentColor" d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" />
                </svg>
              </span>
              <span style={art.itemText}>Scoped access</span>
            </div>
          </div>
        </div>

        <div style={art.promo}>
          <p style={art.promoText}>Upgrade to Pro to get the Latest Scopara</p>
          <button
            type="button"
            className="btn"
            style={{ position: "absolute", left: 16, top: 86, width: 175, height: 40, borderRadius: 8, background: "#fff", color: "#222", gap: 4, letterSpacing: "-0.02em" }}
            onClick={() => actions.toast("Upgrade isn't wired up in this demo", "info")}
          >
            <Icon name="bolt" size={20} stroke={0} style={{ color: "#328ff9", fill: "currentColor" }} />
            Upgrade to Pro
          </button>
        </div>
      </div>
    </aside>
  );
}
