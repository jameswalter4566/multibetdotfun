import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import UserBadge from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { AutomationSandbox } from "@/components/automation/AutomationSandbox";
import { apiProviders } from "@/data/apiProviders";

export default function Automation() {
  const navigate = useNavigate();
  const docHome = useMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);

  const sideLinks = useMemo(
    () => [
      { label: "Explore API market place", href: "#marketplace" },
      { label: "Documentation", href: docHome },
      { label: "Create AI Automation", href: "/automation", cta: true },
      { label: "Test sandbox", href: "#sandbox" },
      { label: "Add your API", href: "/list-api" },
    ],
    [docHome]
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden sm:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border bg-background/95 backdrop-blur">
        <a href="/" className="flex flex-col gap-4 px-6 pt-8 pb-4">
          <img src="/marketx-logo.png" alt="x402 marketplace" className="h-auto w-auto max-w-[220px]" />
        </a>
        <nav className="mt-6 flex-1 px-6">
          <ul className="flex flex-col gap-3 text-sm font-medium text-foreground/90">
            {sideLinks.map((item) => (
              <li key={item.label}>
                {item.cta ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0ea5ff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(14,165,255,0.3)] transition-colors hover:bg-[#08b0ff]"
                    onClick={() => navigate(item.href)}
                  >
                    <span>{item.label}</span>
                    <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] tracking-wide">BETA</span>
                  </button>
                ) : item.href.startsWith("#") ? (
                  <a
                    href={item.href}
                    className="flex items-center justify-between rounded-xl border border-transparent px-4 py-2 transition-colors hover:border-border/70 hover:bg-accent/10"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-muted-foreground">&rsaquo;</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-transparent px-4 py-2 text-left transition-colors hover:border-border/70 hover:bg-accent/10"
                    onClick={() => navigate(item.href)}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-muted-foreground">&rsaquo;</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-6 pb-8 text-xs text-muted-foreground/80">Powered by x402 — instant access for builders.</div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col sm:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3 sm:hidden">
            <a href="/" className="flex items-center gap-3">
              <img src="/marketx-logo.png" alt="x402 marketplace" className="h-auto w-auto max-w-[160px]" />
            </a>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <UserBadge />
            <a
              href="https://x.com/marketx402"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground/90 underline-offset-4 hover:underline"
            >
              Follow us on X
            </a>
          </div>
        </header>

        <main className="flex-1 px-4 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
            <AutomationSandbox />
          </div>
        </main>

        <SiteFooter className="mt-12" />
      </div>
    </div>
  );
}
