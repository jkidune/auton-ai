import { useEffect, useRef } from "react";
import { useRoute, type PageId } from "./router";
import { useStore } from "./state/store";
import { Sidebar } from "./shell/Sidebar";
import { Topbar } from "./shell/Topbar";
import { CommandPalette } from "./shell/CommandPalette";
import { GlobalModals } from "./shell/GlobalModals";
import { Toasts } from "./ui/kit";
import { AgentsPage } from "./pages/Agents";
import { OverviewPage } from "./pages/Overview";
import { PoliciesPage } from "./pages/Policies";
import { CredentialsPage } from "./pages/Credentials";
import { ApprovalsPage } from "./pages/Approvals";
import { AuditLogPage } from "./pages/AuditLog";
import { IntegrationsPage } from "./pages/Integrations";
import { TeamPage } from "./pages/Team";
import { SettingsPage } from "./pages/Settings";

function Page({ page, param }: { page: PageId; param?: string }) {
  switch (page) {
    case "overview": return <OverviewPage />;
    case "agents": return <AgentsPage selectedId={param} />;
    case "policies": return <PoliciesPage />;
    case "credentials": return <CredentialsPage />;
    case "approvals": return <ApprovalsPage />;
    case "audit": return <AuditLogPage />;
    case "integrations": return <IntegrationsPage />;
    case "team": return <TeamPage />;
    case "settings": return <SettingsPage />;
  }
}

export function App() {
  const route = useRoute();
  const { overlay, actions } = useStore();
  const content = useRef<HTMLElement>(null);

  // ⌘K / Ctrl+K toggles the command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (overlay === "palette") actions.close();
        else actions.open("palette");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, actions]);

  // New page starts at the top; opening the agent drawer keeps the list where it is.
  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
  }, [route.page]);

  return (
    <div className="app">
      <Sidebar active={route.page} />
      <div className="app-main">
        <Topbar page={route.page} />
        <main ref={content} className="app-content">
          <div key={route.page} className="anim-page">
            <Page page={route.page} param={route.param} />
          </div>
        </main>
      </div>
      <CommandPalette />
      <GlobalModals />
      <Toasts />
    </div>
  );
}
