import { useEffect, useState } from "react";
import type { IconName } from "./ui/Icon";

export type PageId = "overview" | "agents" | "policies" | "credentials" | "approvals" | "audit" | "integrations" | "team" | "settings";

export const PAGES: { id: PageId; label: string; icon: IconName; section: "Workspace" | "Manage"; blurb: string }[] = [
  { id: "overview", label: "Overview", icon: "overview", section: "Workspace", blurb: "Health of every agent at a glance" },
  { id: "agents", label: "Agents", icon: "agents", section: "Workspace", blurb: "Register, pause and revoke agents" },
  { id: "policies", label: "Access policies", icon: "policies", section: "Workspace", blurb: "Guardrails applied to every request" },
  { id: "credentials", label: "Credentials", icon: "credentials", section: "Workspace", blurb: "Short-lived credentials and rotation" },
  { id: "approvals", label: "Approvals", icon: "approvals", section: "Workspace", blurb: "Access requests waiting on you" },
  { id: "audit", label: "Audit log", icon: "audit", section: "Workspace", blurb: "Every action, who did it and when" },
  { id: "integrations", label: "Integrations", icon: "integrations", section: "Manage", blurb: "Connected tools agents can reach" },
  { id: "team", label: "Team", icon: "team", section: "Manage", blurb: "People and roles" },
  { id: "settings", label: "Settings", icon: "settings", section: "Manage", blurb: "Workspace defaults and notifications" },
];

export interface Route {
  page: PageId;
  param?: string;
}

function parse(hash: string): Route {
  const [, page, param] = hash.replace(/^#/, "").split("/");
  const known = PAGES.find((p) => p.id === page);
  return { page: known ? known.id : "agents", param: param ? decodeURIComponent(param) : undefined };
}

export function navigate(page: PageId, param?: string) {
  const next = `#/${page}${param ? `/${encodeURIComponent(param)}` : ""}`;
  if (window.location.hash !== next) window.location.hash = next;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
