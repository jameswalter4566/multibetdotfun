import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { apiProviders } from "@/data/apiProviders";
import SandboxPanel from "@/components/SandboxPanel";
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import LiveNowRail from "@/components/LiveNowRail";
import GridBackground from "@/components/GridBackground";

export default function Index() {
  const navigate = useNavigate();

  const docHome = useMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);

  const openDocs = useCallback(
    (slug: string) => {
      navigate(`/documentation/${slug}`);
    },
    [navigate]
  );

  const navLinks: DashboardNavLink[] = useMemo(
    () => [
      { label: "Explore API market place", href: "#marketplace" },
      { label: "Documentation", href: docHome },
      { label: "Create AI Automation (Beta)", href: "/agent", cta: true },
      { label: "Agent Playground", href: "/agent" },
      { label: "Test sandbox", href: "#sandbox" },
      { label: "Add your API", href: "/list-api" },
    ],
    [docHome]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DashboardTopNav links={navLinks} />

      {/* Ambient background */}
      <GridBackground />

      <main className="relative z-10 flex-1 px-4 py-10 sm:px-8 lg:px-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-secondary/40 p-8 md:p-12 shadow-glow">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#a855f7]/25 blur-3xl" aria-hidden />
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" aria-hidden />
          <div className="relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Instant access to top APIs
            </h1>
            <p className="mt-3 max-w-2xl text-base md:text-lg text-muted-foreground">
              One endpoint. No keys. Wallet-native billing powered by Hub X 402. Ship faster with unified docs and a live sandbox.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button className="rounded-full" onClick={() => navigate(docHome)}>View documentation</Button>
              <Button asChild variant="outline" className="rounded-full border-border/70">
                <a href="/marketplace">Explore marketplace</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Live Now */}
        <div className="mt-10">
          <LiveNowRail />
        </div>

        {/* Marketplace preview + Sandbox */}
        <div className="mt-8 max-w-7xl mx-auto space-y-10 xl:space-y-0 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] xl:gap-10">
          <section id="marketplace">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-extrabold tracking-tight">Featured providers</h2>
              <a href="/marketplace" className="text-sm underline text-muted-foreground hover:text-foreground">View all</a>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {apiProviders.slice(0,6).map((provider) => (
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
                    <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{provider.tagline}</div>
                  </div>

                  <div className="mt-auto pt-6">
                    <Button
                      type="button"
                      className="w-full rounded-xl bg-[#a855f7] px-4 py-5 text-sm font-semibold text-white shadow-[0_0_12px_rgba(168,85,247,0.6)] hover:bg-[#9333ea]"
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
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Live sandbox</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try marketplace endpoints with wallet sessions — no provider keys required.
              </p>
            </div>
            <SandboxPanel className="sticky top-24" />
            <div className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow space-y-4">
              <div className="text-lg font-semibold text-foreground">List your API</div>
              <p className="text-sm text-muted-foreground">
                Publish your endpoint to the marketplace and let builders call it instantly with Hub X 402 billing.
              </p>
              <Button
                className="w-full rounded-xl bg-[#a855f7] py-4 text-sm font-semibold text-white shadow-[0_0_12px_rgba(168,85,247,0.6)] hover:bg-[#9333ea]"
                onClick={() => navigate("/list-api")}
              >
                Get started
              </Button>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
