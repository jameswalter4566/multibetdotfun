import { Button } from "@/components/ui/button";
import SiteFooter from "@/components/SiteFooter";
import { useNavigate } from "react-router-dom";

export default function ListAPI() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0ea5ff]/20 via-transparent to-purple-500/10 blur-3xl" />
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            List your API on our marketplace
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Tap into x402 wallet billing, instant discovery, and live sandboxing. Reach builders the moment your endpoint goes
            live.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="rounded-full bg-[#0ea5ff] px-10 py-6 text-base font-semibold text-white shadow-[0_0_18px_rgba(14,165,255,0.6)] hover:bg-[#08b0ff]"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-10">
        <section className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow">
            <div className="text-lg font-semibold text-foreground">Instant distribution</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Your endpoint surfaces across the marketplace, sandbox, and documentation navigation immediately.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow">
            <div className="text-lg font-semibold text-foreground">Wallet-native billing</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Charge per call with x402. No API keys or manual onboarding flows required for new developers.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow">
            <div className="text-lg font-semibold text-foreground">Sandbox ready</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Developers can test your endpoints live in the sandbox before pushing to production.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow">
            <div className="text-lg font-semibold text-foreground">Analytics included</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Track call volume, credits earned, and downstream usage with transparent dashboards.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
