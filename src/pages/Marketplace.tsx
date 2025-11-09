import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiProviders } from "@/data/apiProviders";
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import { Input } from "@/components/ui/input";

export default function Marketplace() {
  const navigate = useNavigate();
  const docHome = useMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);
  const navLinks: DashboardNavLink[] = useMemo(
    () => [
      { label: "Explore API market place", href: "/marketplace" },
      { label: "Documentation", href: docHome },
      { label: "Create AI Automation (Beta)", href: "/agent", cta: true },
      { label: "Agent Playground", href: "/agent" },
      { label: "Test sandbox", href: "#sandbox" },
      { label: "Add your API", href: "/list-api" },
    ],
    [docHome]
  );

  const openDocs = useCallback(
    (slug: string) => {
      navigate(`/documentation/${slug}`);
    },
    [navigate]
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categoryOf = (slug: string): string => {
    if (["openai", "claude"].includes(slug)) return "ai";
    if (["stripe", "paypal"].includes(slug)) return "payments";
    if (["google-sheets", "youtube"].includes(slug)) return "data";
    if (["twilio"].includes(slug)) return "comms";
    return "other";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apiProviders.filter((p) => {
      const matchesQuery = !q ||
        p.name.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q);
      const cat = categoryOf(p.slug);
      const matchesCat = category === "all" || cat === category;
      return matchesQuery && matchesCat;
    });
  }, [search, category]);

  const categories: Array<{ key: string; label: string }> = [
    { key: "all", label: "All" },
    { key: "ai", label: "AI" },
    { key: "payments", label: "Payments" },
    { key: "data", label: "Data" },
    { key: "comms", label: "Comms" },
  ];

  const featuredSlugs = ["openai", "claude", "stripe"]; // showcase a few up top
  const featured = apiProviders.filter(p => featuredSlugs.includes(p.slug));
  const nonFeatured = filtered.filter(p => !featuredSlugs.includes(p.slug));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardTopNav links={navLinks} />
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        {/* Hero header */}
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-secondary/40 p-8 md:p-10 shadow-glow">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#a855f7]/20 blur-3xl" aria-hidden />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
          <div className="relative z-10 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Explore API marketplace</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground text-base md:text-lg">
              Unified endpoints, wallet-native billing, instant docs. No provider keys required.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={() => document.getElementById('providers-grid')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full">Browse providers</Button>
              <Button asChild variant="outline" className="rounded-full border-border/70">
                <a href="/list-api">List your API</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Featured providers */}
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {featured.map((p) => (
            <div
              key={p.slug}
              role="link"
              tabIndex={0}
              aria-label={`View documentation for ${p.name}`}
              className="ios-card relative flex cursor-pointer flex-col overflow-hidden p-6 transition-transform duration-200 hover:-translate-y-1"
              onClick={() => openDocs(p.slug)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDocs(p.slug);
                }
              }}
            >
              <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #a855f7 0, transparent 60%), radial-gradient(circle at 80% 0%, #06b6d4 0, transparent 50%)' }} />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-border/60 bg-secondary/50">
                  <img
                    src={p.logo || "/placeholder.svg"}
                    alt={p.name}
                    className="h-14 w-14 object-contain"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="mt-4 text-lg font-semibold text-foreground">{p.name}</div>
                <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.summary}</div>
                {Array.isArray(p.endpoints) && p.endpoints.length > 0 && (
                  <div className="mt-4 grid w-full grid-cols-1 gap-2 text-left">
                    {p.endpoints.slice(0,2).map((e) => (
                      <div key={e.path} className="flex items-center gap-2 text-xs">
                        <span className="rounded-full border border-border/60 px-2 py-0.5 font-mono">
                          {e.method}
                        </span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground" title={e.path}>{e.path}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6">
                <Button
                  type="button"
                  className="w-full rounded-xl bg-[#a855f7] px-4 py-5 text-sm font-semibold text-white shadow-[0_0_12px_rgba(168,85,247,0.6)] hover:bg-[#9333ea]"
                  onClick={(event) => {
                    event.stopPropagation();
                    openDocs(p.slug);
                  }}
                >
                  Test Endpoint now
                </Button>
              </div>
            </div>
          ))}
        </section>

        {/* Controls + full catalog */}
        <section id="providers-grid" className="mt-12 grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar filters */}
          <aside className="h-max rounded-3xl border border-border bg-secondary/35 p-4 shadow-glow sticky top-24 self-start hidden lg:block">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Filters</div>
            <div className="mt-3 grid gap-2">
              {categories.map((c) => (
                <button
                  key={c.key}
                  className={`w-full rounded-full border px-3 py-1.5 text-sm text-left ${
                    category === c.key
                      ? "bg-accent/60 border-border/70"
                      : "border-border/40 hover:bg-accent/40"
                  }`}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search providers…"
                className="rounded-full"
              />
            </div>
          </aside>

          {/* Grid */}
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nonFeatured.map((provider) => (
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
                    <div className="mt-1">
                      <span className="inline-block rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {categoryOf(provider.slug)}
                      </span>
                    </div>
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
            {nonFeatured.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-10">
                No providers match your filters.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
