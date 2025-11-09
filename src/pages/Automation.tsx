import { useMemo } from "react";
import SiteFooter from "@/components/SiteFooter";
import { AutomationSandbox } from "@/components/automation/AutomationSandbox";
import { apiProviders } from "@/data/apiProviders";
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";

export default function Automation() {
  const docHome = useMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);

  const navLinks: DashboardNavLink[] = useMemo(
    () => [
      { label: "Explore API market place", href: "#marketplace" },
      { label: "Documentation", href: docHome },
      { label: "Create AI Automation", href: "/automation", cta: true },
      { label: "Agent Playground", href: "/agent" },
      { label: "Test sandbox", href: "#sandbox" },
      { label: "Add your API", href: "/list-api" },
    ],
    [docHome]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DashboardTopNav links={navLinks} />
      <main className="relative flex-1 px-4 py-10 sm:px-8 lg:px-12">
        <span id="marketplace" className="sr-only" aria-hidden="true" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Automation studio</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Build wallet-native AI workflows
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Describe what you want to automate, wire up nodes, and preview execution in one place.
            </p>
          </div>
          <div id="sandbox" className="rounded-3xl border border-border bg-secondary/30 p-4 shadow-glow">
            <AutomationSandbox />
          </div>
        </div>
      </main>
      <SiteFooter className="mt-12" />
    </div>
  );
}
