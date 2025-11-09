import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { apiProviders } from "@/data/apiProviders";
import SandboxPanel from "@/components/SandboxPanel";
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";

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
      { label: "Create AI Automation", href: "/agent", cta: true },
      { label: "Agent Playground", href: "/agent" },
      { label: "Test sandbox", href: "#sandbox" },
      { label: "Add your API", href: "/list-api" },
    ],
    [docHome]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DashboardTopNav links={navLinks} />
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
  );
}
