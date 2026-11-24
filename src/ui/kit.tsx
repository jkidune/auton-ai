import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { AgentStatus, Person, Tone } from "../data/agents";
import type { Risk } from "../data/seed";
import { useStore } from "../state/store";
import { Icon, type IconName } from "./Icon";

/* ===================================================================== motion helpers */

/** Exit timings mirror --t-*-out in app.css. */
export const EXIT = { small: 140, panel: 190 } as const;

/**
 * Keeps an element mounted while it plays its exit animation.
 * `closing` adds the .is-closing class; the element unmounts after `exitMs`.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, exitMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return { mounted, closing };
}

/** Close on outside pointer-down or Escape. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, ref]);
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* ===================================================================== popover / menu */

export function Popover({
  open,
  onClose,
  trigger,
  children,
  align = "right",
  dropUp = false,
  width,
}: {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  dropUp?: boolean;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { mounted, closing } = usePresence(open, EXIT.small);
  useDismiss(ref, open, onClose);
  return (
    <div ref={ref} className="popover-anchor">
      {trigger}
      {mounted && (
        <div
          role="menu"
          className={`popover${align === "left" ? " from-left" : ""}${dropUp ? " drop-up" : ""}${closing ? " is-closing" : ""}`}
          style={{
            [align]: 0,
            ...(dropUp ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
            width,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger }: { icon?: IconName; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" className={`menu-item${danger ? " danger" : ""}`} onClick={onClick}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/* ===================================================================== modal / drawer */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const { mounted, closing } = usePresence(open, EXIT.panel);
  useEscape(open, onClose);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className={`overlay${closing ? " is-closing" : ""}`} onClick={onClose} />
      <div className="modal-wrap">
        <div role="dialog" aria-modal="true" aria-label={title} className={`modal${closing ? " is-closing" : ""}`} style={{ width }}>
          <div className="modal-head">
            <div className="col gap-4">
              <h2 className="t-18 ink-1">{title}</h2>
              {description && <p className="t-14 ink-4">{description}</p>}
            </div>
            <button type="button" className="icon-btn plain" aria-label="Close" onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      </div>
    </>,
    document.body,
  );
}

export function Drawer({ open, onClose, children, footer }: { open: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { mounted, closing } = usePresence(open, EXIT.panel);
  useEscape(open, onClose);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className={`overlay${closing ? " is-closing" : ""}`} onClick={onClose} style={{ background: "rgba(17,17,17,0.12)" }} />
      <aside role="dialog" aria-modal="true" className={`drawer${closing ? " is-closing" : ""}`}>
        <div className="row between" style={{ padding: "16px 16px 0 24px", height: 56 }}>
          <span className="eyebrow">Agent details</span>
          <button type="button" className="icon-btn plain" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}

/* ===================================================================== segmented control */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  counts,
  size = "md",
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  counts?: Partial<Record<T, number>>;
  size?: "sm" | "md";
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
    if (el) setBox({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, counts, options]);

  return (
    <div ref={wrap} className={`segmented${size === "sm" ? " segmented-sm" : ""}`} role="group">
      {box && <span className="segmented-indicator" style={{ width: box.w, transform: `translateX(${box.x}px)` }} />}
      {options.map((o) => (
        <button key={o} type="button" data-value={o} className="segmented-item" aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
          {counts && counts[o] !== undefined && <span className="count-pill">{counts[o]}</span>}
        </button>
      ))}
    </div>
  );
}

/* ===================================================================== small display pieces */

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" disabled={disabled} onClick={() => onChange(!checked)} />;
}

export function Avatar({ person, size = "md" }: { person: Pick<Person, "initials" | "tone">; size?: "md" | "lg" }) {
  return <span className={`avatar tone-${person.tone}${size === "lg" ? " avatar-lg" : ""}`}>{person.initials}</span>;
}

export const STATUS_TONE: Record<AgentStatus, Tone> = { Active: "blue", "Needs review": "amber", Paused: "gray", Revoked: "red" };
export const RISK_TONE: Record<Risk, Tone> = { High: "red", Medium: "amber", Low: "gray" };

export function StatusBadge({ status, small }: { status: AgentStatus; small?: boolean }) {
  return <span className={`badge tone-${STATUS_TONE[status]}${small ? " badge-sm" : ""}`}>{status}</span>;
}

export function Badge({ tone, children, small, dot }: { tone: Tone; children: ReactNode; small?: boolean; dot?: boolean }) {
  return (
    <span className={`badge tone-${tone}${small ? " badge-sm" : ""}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty anim-fade">
      <div className="empty-icon">
        <Icon name={icon} size={20} />
      </div>
      <p className="t-16 ink-1">{title}</p>
      {children && <div className="t-14 ink-4">{children}</div>}
    </div>
  );
}

/* ===================================================================== pagination */

function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 2) return [1, 2, 3, "…", pages];
  if (page === 3) return [1, 2, 3, 4, "…", pages];
  if (page >= pages - 2) return [1, "…", pages - 3, pages - 2, pages - 1, pages];
  return [1, "…", page - 1, page, page + 1, "…", pages];
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <div className="row gap-6">
      <button type="button" className="btn btn-secondary pager-btn" style={{ padding: "0 15px 0 13px" }} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <Icon name="chevronLeft" /> Previous
      </button>
      {pageList(page, pages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="row ink-4" style={{ width: 36, height: 36, justifyContent: "center" }}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`btn btn-square ${p === page ? "btn-secondary" : "btn-ghost"}`}
            style={{ color: p === page ? "#111" : "#666" }}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className="btn btn-secondary pager-btn" style={{ padding: "0 11px 0 15px" }} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next <Icon name="chevronRight" />
      </button>
    </div>
  );
}

/* ===================================================================== toasts */

export function Toasts() {
  const { toasts, actions } = useStore();
  return createPortal(
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.closing ? " is-closing" : ""}`} role="status">
          <span className={`toast-icon ${t.tone}`}>
            <Icon name={t.tone === "danger" ? "ban" : t.tone === "info" ? "bolt" : "check"} size={12} stroke={2.6} />
          </span>
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action!.run();
                actions.dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}

/* ===================================================================== stat strip */

export interface Stat {
  label: string;
  icon: IconName;
  value: string;
  delta?: { text: string; direction: "up" | "down"; good: boolean };
  note?: string;
  foot: [ReactNode, ReactNode];
}

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="stat-strip">
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <div className="row gap-8 ink-3">
            <Icon name={s.icon} size={16} stroke={2.25} style={{ color: "#141b34" }} />
            <span className="t-14">{s.label}</span>
          </div>
          <div className="col gap-12" style={{ position: "absolute", left: 16, top: 56 }}>
            <span className="t-28 ink-1 mono">{s.value}</span>
            <div className="row gap-4 t-14">
              {s.delta && (
                <span className={`row gap-4 ${s.delta.good ? "up" : "down"}`}>
                  <svg width="10" height="9" viewBox="0 0 10 9" aria-hidden="true">
                    <path transform={s.delta.direction === "up" ? undefined : "matrix(-1 0 0 -1 10 9)"} d="M5 0 L9.33013 6.75 L0.669873 6.75 L5 0 Z" fill="currentColor" />
                  </svg>
                  {s.delta.text}
                </span>
              )}
              {s.note && <span className="ink-3">{s.note}</span>}
            </div>
          </div>
          <div className="stat-rule" />
          <div className="stat-foot t-14">
            <span>{s.foot[0]}</span>
            <span>{s.foot[1]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
