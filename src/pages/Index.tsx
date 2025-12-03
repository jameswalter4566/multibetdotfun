import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import DashboardTopNav from "@/components/DashboardTopNav";
import GridBackground from "@/components/GridBackground";

type DemoMarket = {
  id: string;
  question: string;
  category: string;
  probability: number;
  change: number;
  volume: string;
  resolves: string;
  leverage: string;
};

type ParlayLeg = {
  id: string;
  question: string;
  choice: "YES" | "NO";
  category: string;
};

const demoMarkets: DemoMarket[] = [
  {
    id: "btc-120k-2025",
    question: "Will BTC close above $120k on Dec 31, 2025?",
    category: "Crypto",
    probability: 62,
    change: 1.8,
    volume: "$12.4M",
    resolves: "Dec 31, 2025",
    leverage: "x3",
  },
  {
    id: "sol-400-jun",
    question: "Will SOL trade above $400 before June 2025?",
    category: "Crypto",
    probability: 54,
    change: -0.6,
    volume: "$8.1M",
    resolves: "Jun 30, 2025",
    leverage: "x2",
  },
  {
    id: "eth-etf",
    question: "Will a US spot ETH ETF be approved by Q2 2025?",
    category: "Macro",
    probability: 68,
    change: 2.4,
    volume: "$9.6M",
    resolves: "Jun 30, 2025",
    leverage: "x4",
  },
  {
    id: "fed-cut-march",
    question: "Will the Fed cut rates at the March 2026 meeting?",
    category: "Rates",
    probability: 41,
    change: 0.9,
    volume: "$5.4M",
    resolves: "Mar 19, 2026",
    leverage: "x3",
  },
  {
    id: "oil-70",
    question: "Will WTI crude settle above $70 in Q1 2026?",
    category: "Commodities",
    probability: 58,
    change: -1.2,
    volume: "$3.9M",
    resolves: "Mar 31, 2026",
    leverage: "x2",
  },
  {
    id: "ai-chip-share",
    question: "Will NVIDIA keep >70% AI accelerator share by FY2026?",
    category: "Equities",
    probability: 64,
    change: 1.1,
    volume: "$6.7M",
    resolves: "Jan 31, 2026",
    leverage: "x3",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const [parlayOpen, setParlayOpen] = useState(false);
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([]);
  const [stake, setStake] = useState("10");

  const goToMarkets = () => navigate("/marketplace");

  const selectionCounts = useMemo(
    () => ({
      legs: parlayLegs.length,
      yesPicks: parlayLegs.filter((leg) => leg.choice === "YES").length,
    }),
    [parlayLegs]
  );

  const addToParlay = (market: DemoMarket) => {
    setParlayOpen(true);
    setParlayLegs((prev) => {
      if (prev.some((leg) => leg.id === market.id)) return prev;
      return [...prev, { id: market.id, question: market.question, choice: "YES", category: market.category }];
    });
    if (typeof document !== "undefined") {
      const panel = document.getElementById("parlay-panel");
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const removeLeg = (id: string) => {
    setParlayLegs((prev) => prev.filter((leg) => leg.id !== id));
  };

  const clearParlay = () => {
    setParlayLegs([]);
    setStake("10");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DashboardTopNav />

      {/* Ambient background */}
      <GridBackground />

      <main className="relative z-10 flex-1 px-4 py-12 sm:px-8 lg:px-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-border/80 bg-gradient-to-r from-white via-white to-secondary/70 p-8 md:p-12 shadow-glow">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden />
          <div className="relative z-10 max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground shadow-sm">
              Parlay-first, minimal, fast
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-foreground">
              multibet — build parlays on Solana prediction markets
            </h1>
            <p className="mt-4 max-w-3xl text-base md:text-lg text-muted-foreground">
              Stack multiple yes/no markets into a single slip. Clean white surface, fast quotes, and transparent odds. Live Kalshi-backed order books coming next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button className="rounded-full px-6 py-3 text-sm font-semibold shadow-md" onClick={goToMarkets}>
                Browse markets
              </Button>
              <Button asChild variant="outline" className="rounded-full border-border/70 px-6 py-3 text-sm font-semibold">
                <a href="https://github.com/jameswalter4566/multibetdotfun" target="_blank" rel="noreferrer">
                  View GitHub
                </a>
              </Button>
              <Button asChild variant="ghost" className="rounded-full px-6 py-3 text-sm font-semibold text-foreground">
                <a href="https://x.com/multibetdotfun" target="_blank" rel="noreferrer">
                  Follow updates on X
                </a>
              </Button>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-foreground/70">Parlays</div>
                <div className="text-lg font-semibold text-foreground">Group multiple legs into one</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-foreground/70">Settlement</div>
                <div className="text-lg font-semibold text-foreground">Instant on-chain receipts</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-foreground/70">Feeds</div>
                <div className="text-lg font-semibold text-foreground">Kalshi-grade market data</div>
              </div>
            </div>
          </div>
        </section>

        {/* Markets */}
        <section id="markets" className="mt-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Markets</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Curated questions to trade now</h2>
            </div>
            <Button variant="outline" className="rounded-full border-border/70 px-4 py-2 text-sm" onClick={goToMarkets}>
              View all
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            These cards are design-only placeholders. Live order books will be powered by Kalshi data.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,400px)]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {demoMarkets.map((market) => {
                const positive = market.change >= 0;
                return (
                  <div
                    key={market.id}
                    className="relative overflow-hidden rounded-2xl border border-border bg-white/90 p-6 shadow-glow transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">
                        {market.category}
                      </span>
                      <span className="text-xs text-muted-foreground">Parlay ready</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug">{market.question}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Resolves {market.resolves}</p>

                    <div className="mt-6 flex items-end justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Yes probability</div>
                        <div className="text-4xl font-extrabold text-foreground">{market.probability}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">24h change</div>
                        <div className={`text-lg font-semibold ${positive ? "text-green-600" : "text-red-600"}`}>
                          {positive ? "+" : ""}
                          {market.change}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span>Volume {market.volume}</span>
                      <span className="text-foreground/80">Settles on-chain</span>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <Button
                        className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold shadow-md"
                        variant="default"
                        onClick={() => addToParlay(market)}
                      >
                        Add to parlay
                      </Button>
                      <Button className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold" variant="outline">
                        View market
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              id="parlay-panel"
              className={`rounded-[24px] border border-border bg-white/95 p-6 shadow-glow transition-all duration-200 ${
                parlayOpen ? "opacity-100 translate-y-0" : "opacity-95 lg:opacity-100"
              } lg:sticky lg:top-24`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Slip</p>
                  <h3 className="text-xl font-semibold text-foreground">Parlay builder</h3>
                </div>
                <button
                  className="text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-40"
                  onClick={clearParlay}
                  disabled={!parlayLegs.length}
                >
                  Clear all
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {parlayLegs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/50 px-4 py-6 text-sm text-muted-foreground">
                    Add markets from the left to start a parlay.
                  </div>
                ) : (
                  parlayLegs.map((leg) => (
                    <div key={leg.id} className="rounded-2xl border border-border/80 bg-secondary/70 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{leg.category}</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{leg.question}</p>
                          <p className="mt-1 text-xs font-semibold uppercase text-sky-600">{leg.choice}</p>
                        </div>
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => removeLeg(leg.id)}
                          aria-label="Remove leg"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5">
                <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Stake amount ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm outline-none shadow-sm focus-visible:ring-2 focus-visible:ring-primary/60"
                  placeholder="10"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
              </div>

              <div className="mt-5">
                <Button
                  className="w-full rounded-2xl bg-sky-500 py-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(14,165,233,0.35)] hover:bg-sky-600 disabled:opacity-60"
                  disabled={!parlayLegs.length}
                >
                  {parlayLegs.length ? `Get Quote (${parlayLegs.length} ${parlayLegs.length === 1 ? "leg" : "legs"})` : "Add a leg to quote"}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {parlayLegs.length ? `${parlayLegs.length} leg parlay` : "No legs selected"}
                </p>
              </div>

              <div className="mt-6 space-y-2 rounded-2xl border border-border bg-white/90 p-4 text-sm text-muted-foreground">
                <h4 className="text-sm font-semibold text-foreground">How it works</h4>
                <ol className="space-y-1">
                  <li>1) Connect your Phantom wallet</li>
                  <li>2) Select Yes or No on multiple markets</li>
                  <li>3) All legs must win for your parlay to pay out</li>
                </ol>
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-white/90 p-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Selection</span>
                  <span className="text-foreground font-semibold">
                    {selectionCounts.legs} {selectionCounts.legs === 1 ? "leg" : "legs"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Yes picks</span>
                  <span className="text-foreground font-semibold">{selectionCounts.yesPicks}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Secondary CTA */}
        <section className="mt-14 rounded-[24px] border border-border bg-secondary/80 p-8 shadow-create">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pipeline</p>
              <h3 className="mt-2 text-2xl font-bold text-foreground">Live data + funding rails next</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                Connect your wallet, stack legs into parlays, and stream Kalshi markets directly. Get updates as we turn these designs into live order books.
              </p>
            </div>
            <div className="flex gap-3">
              <Button className="rounded-full px-5 py-3 text-sm font-semibold" onClick={() => navigate("/signup")}>
                Join the waitlist
              </Button>
              <Button asChild variant="outline" className="rounded-full px-5 py-3 text-sm font-semibold">
                <a href="https://x.com/multibetdotfun" target="_blank" rel="noreferrer">Follow on X</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
