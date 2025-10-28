import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiProviders, getProviderBySlug } from "@/data/apiProviders";
import SiteFooter from "@/components/SiteFooter";

export default function ProviderDocumentation() {
  const { slug } = useParams<{ slug: string }>();
  const provider = getProviderBySlug(slug);

  if (!provider) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="text-3xl font-semibold">Provider not found</div>
          <p className="text-muted-foreground">
            The requested integration is unavailable. Return to the marketplace to browse all available APIs.
          </p>
          <Button asChild>
            <Link to="/marketplace">Back to Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-secondary/30">
          <div className="px-6 py-6 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Applications</div>
          <nav className="flex-1 overflow-y-auto px-2 pb-8">
            <ul className="space-y-1">
              {apiProviders.map((item) => {
                const active = item.slug === provider.slug;
                return (
                  <li key={item.slug}>
                    <Link
                      to={`/documentation/${item.slug}`}
                      className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm transition-colors ${
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-foreground/80 hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">&rsaquo;</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-5xl px-6 py-10 md:px-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary/60">
                    <img
                      src={provider.logo || "/placeholder.svg"}
                      alt={provider.name}
                      className="h-10 w-10 object-contain"
                      onError={(event) => {
                        (event.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">{provider.name}</h1>
                    <p className="text-sm text-muted-foreground">{provider.tagline}</p>
                  </div>
                </div>
                <p className="mt-6 max-w-3xl text-sm text-foreground/80 md:text-base">{provider.summary}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" asChild>
                  <Link to="/marketplace">All APIs</Link>
                </Button>
                <Button
                  className="rounded-xl bg-[#0ea5ff] px-5 py-5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(14,165,255,0.5)] hover:bg-[#08b0ff]"
                  onClick={() => window.open(provider.testUrl, "_blank", "noopener")}
                >
                  Test it
                </Button>
              </div>
            </div>

            <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Endpoint</div>
                <div className="mt-3 inline-flex items-center gap-3 rounded-full bg-background/80 px-4 py-2 text-xs font-semibold text-foreground shadow-inner ring-1 ring-border">
                  <span className="rounded-full bg-primary/15 px-2 py-1 text-primary">{provider.method}</span>
                  <span className="font-mono text-[13px]">{provider.endpoint}</span>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-foreground">{provider.codeSampleTitle}</div>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-black/90">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-white/60">
                      <span>{provider.language}</span>
                      <button
                        type="button"
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-wide text-white/70 hover:bg-white/10"
                        onClick={() => {
                          navigator.clipboard.writeText(provider.codeSample).catch(() => {});
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="overflow-auto px-4 py-5 text-[13px] leading-relaxed text-white">
                      <code>{provider.codeSample}</code>
                    </pre>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-border bg-secondary/30 p-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Quickstart</div>
                  <ul className="mt-3 space-y-3 text-sm text-foreground/80">
                    <li>1. Start a session from the home page.</li>
                    <li>2. Call the endpoint with your wallet-backed `x402-session` header.</li>
                    <li>3. Monitor response headers for metering + credits.</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-xs text-muted-foreground">
                  Need help? Join the community in Discord or book time with the integrations team.
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <SiteFooter className="mt-12" />
    </div>
  );
}
