import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import UserBadge from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { apiProviders } from "@/data/apiProviders";
import SandboxPanel from "@/components/SandboxPanel";

export default function Index() {
  const navigate = useNavigate();

  const docHome = useMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);

  const openDocs = useCallback(
    (slug: string) => {
      navigate(`/documentation/${slug}`);
    },
    [navigate]
  );

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
          <img src="/HUBX402DESIGN.png" alt="Hub X 402" className="h-auto w-auto max-w-[220px]" />
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
        <div className="px-6 pb-8 text-xs text-muted-foreground/80">Powered by Hub X 402 — instant access for builders.</div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col sm:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3 sm:hidden">
            <a href="/" className="flex items-center gap-3">
              <img src="/HUBX402DESIGN.png" alt="Hub X 402" className="h-auto w-auto max-w-[160px]" />
            </a>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <UserBadge />
            <a
              href="https://x.com/hubdotapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground/90 underline-offset-4 hover:underline"
            >
              Follow us on X
            </a>
          </div>
        </header>

        <main className="flex-1 px-4 py-10 sm:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-10 xl:space-y-0 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:gap-10">
            <section id="marketplace">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
                    Explore API marketplace
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Connect to leading APIs instantly, bill usage through Hub X 402, and launch integrations without hunting for keys.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full border-border/70 px-6 py-2 text-sm font-medium"
                  onClick={() => navigate(docHome)}
                >
                  View documentation
                </Button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {apiProviders.map((provider) => (
                  <div
                    key={provider.slug}
                    role="link"
                    tabIndex={0}
                    aria-label={`View documentation for ${provider.name}`}
                    className="ios-card flex cursor-pointer flex-col p-6 transition-transform duration-200 hover:-translate-y-1"
                    onClick={() => openDocs(provider.slug)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDocs(provider.slug);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-secondary/50">
                        <img
                          src={provider.logo || "/placeholder.svg"}
                          alt={provider.name}
                          className="h-12 w-12 object-contain"
                          onError={(event) => {
                            (event.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      <div className="mt-4 text-lg font-semibold text-foreground">{provider.name}</div>
                      <div className="mt-2 text-sm text-muted-foreground">{provider.tagline}</div>
                    </div>

                    <div className="mt-auto pt-6">
                      <Button
                        type="button"
                        className="w-full rounded-xl bg-[#0ea5ff] px-4 py-5 text-sm font-semibold text-white shadow-[0_0_12px_rgba(14,165,255,0.6)] hover:bg-[#08b0ff]"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDocs(provider.slug);
                        }}
                      >
                        Test Endpoint now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside id="sandbox" className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Test sandbox</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Preview live responses from marketplace endpoints using wallet-backed session headers.
                </p>
              </div>
              <SandboxPanel className="sticky top-24" />
              <div className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow space-y-4">
                <div className="text-lg font-semibold text-foreground">Add your API</div>
                <p className="text-sm text-muted-foreground">
                  Publish your endpoint to the marketplace and let builders call it instantly with Hub X 402 billing.
                </p>
                <Button
                  className="w-full rounded-xl bg-[#0ea5ff] py-4 text-sm font-semibold text-white shadow-[0_0_12px_rgba(14,165,255,0.6)] hover:bg-[#08b0ff]"
                  onClick={() => navigate("/list-api")}
                >
                  Add your API
                </Button>
              </div>
            </aside>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
