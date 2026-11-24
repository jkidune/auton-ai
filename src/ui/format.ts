export function minutesAgo(min: number): string {
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} h ago`;
  const d = Math.floor(min / 1440);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function timeAgo(at: number, now = Date.now()): string {
  return minutesAgo(Math.max(0, Math.floor((now - at) / 60_000)));
}

export function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(at: number, now = Date.now()): string {
  const d = new Date(at);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

/** mm:ss for a countdown in milliseconds. */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const fmt = new Intl.NumberFormat("en-US");
