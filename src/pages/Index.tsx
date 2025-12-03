import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import DashboardTopNav from "@/components/DashboardTopNav";
import GridBackground from "@/components/GridBackground";
import { supabase } from "@/integrations/supabase/client";
import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";

type MarketRow = {
  id: string;
  ticker: string | null;
  title: string | null;
  event_title?: string | null;
  status: string | null;
  volume: number | null;
  open_interest?: number | null;
  price_yes: number | null;
  price_no?: number | null;
  category: string | null;
  tags?: string[] | null;
  expiration_time?: string | null;
  yes_mint?: string | null;
  no_mint?: string | null;
  settlement_mint?: string | null;
};

type ParlayLeg = {
  id: string;
  question: string;
  choice: "YES" | "NO";
  category: string;
  resolves?: string | null;
  outputMint?: string | null;
  settlementMint?: string | null;
};

const formatProbability = (val: number | null): number => {
  if (val == null || Number.isNaN(val)) return 50;
  if (val <= 1) return Math.round(val * 100);
  if (val <= 100) return Math.round(val);
  return Math.round(val / 100);
};

const PAGE_SIZE = 12;
const DEFAULT_INPUT_MINT = "EPjFWdd5AufqSSqeM2q9D4p9iu3Xwp9Qw3tXnCh9xz2V"; // USDC mainnet

export default function Index() {
  const navigate = useNavigate();
  const [parlayOpen, setParlayOpen] = useState(true);
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([]);
  const [stake, setStake] = useState("10");
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteResults, setQuoteResults] = useState<any[]>([]);
  const [aiParlay, setAiParlay] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [pendingQuote, setPendingQuote] = useState(false);

  const goToMarkets = () => navigate("/marketplace");

  const selectionCounts = useMemo(
    () => ({
      legs: parlayLegs.length,
      yesPicks: parlayLegs.filter((leg) => leg.choice === "YES").length,
    }),
    [parlayLegs]
  );

  const ensureWallet = useCallback(async () => {
    const provider = (window as any)?.solana;
    if (!provider || !provider.isPhantom) throw new Error("Phantom wallet not found");
    let res;
    try {
      res = await provider.connect({ onlyIfTrusted: false });
    } catch (e) {
      throw new Error("Wallet connection declined");
    }
    const pk = res?.publicKey?.toString?.();
    if (!pk) throw new Error("Wallet connection failed");
    setWalletPubkey(pk);
    // Upsert user row
    try {
      await supabase
        .from("users")
        .upsert(
          {
            userdid: pk,
            username: pk,
            wallet_public_key: pk,
            auth_method: "phantom",
            signed_in_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          },
          { onConflict: "userdid" }
        );
    } catch (e) {
      console.error("[auth] upsert user failed", (e as Error)?.message);
    }
    return { provider, pk };
  }, []);

  const fetchPubkeyFromDb = useCallback(async () => {
    const { data, error } = await supabase
      .from("users")
      .select("wallet_public_key")
      .order("signed_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[auth] fetch pubkey failed", error.message);
      return null;
    }
    return data?.wallet_public_key || null;
  }, []);

  const runQuote = useCallback(
    async (_userPubkey: string) => {
      setQuoteLoading(true);
      setQuoteError(null);
      setQuoteResults([]);
      setAiParlay(null);
      try {
        const legs = parlayLegs.map((leg) => ({
          id: leg.id,
          outputMint: leg.outputMint as string | null,
          amount: Number(stake || "0"),
          inputMint: leg.settlementMint || DEFAULT_INPUT_MINT,
          question: leg.question,
          choice: leg.choice,
        }));
        const nonEmptyLegs = legs.filter((l) => l.outputMint);
        if (!nonEmptyLegs.length) throw new Error("No legs available for quote. Select markets with mints.");

        const mockResults = nonEmptyLegs.map((l, idx) => {
          const outAmount = l.amount * (1.1 + 0.05 * idx);
          return {
            leg: l,
            quote: {
              inAmount: (l.amount * 1_000_000).toFixed(0),
              outAmount: (outAmount * 1_000_000).toFixed(0),
              minOutAmount: (outAmount * 0.98 * 1_000_000).toFixed(0),
              priceImpactPct: "0.01",
              requestId: `mock-${Date.now()}-${idx}`,
            },
          };
        });
        setQuoteResults(mockResults);

        // Call AI parlay calculator (serverless) for a fun preview
        try {
          const { data, error } = await supabase.functions.invoke("parlay-ai", {
            body: {
              legs: nonEmptyLegs.map((l) => ({
                question: l.question,
                choice: l.choice,
              })),
              stake: Number(stake || "0"),
            },
          });
          if (!error && data?.analysis) {
            setAiParlay(data.analysis);
          }
        } catch (aiErr) {
          console.error("[ai parlay] error", (aiErr as Error)?.message);
        }

        setQuoteModalOpen(true);
      } catch (e) {
        setQuoteError((e as Error)?.message || "Quote failed");
      } finally {
        setQuoteLoading(false);
        setPendingQuote(false);
      }
    },
    [parlayLegs, stake]
  );

  const connectAndMaybeQuote = useCallback(
    async () => {
      try {
        const { pk } = await ensureWallet();
        setWalletPubkey(pk);
        setConnectModalOpen(false);
        if (pendingQuote) {
          setPendingQuote(false);
          await runQuote(pk);
        }
      } catch (e) {
        setQuoteError((e as Error)?.message || "Wallet connect failed");
      }
    },
    [ensureWallet, pendingQuote, runQuote]
  );

  const addToParlay = (market: MarketRow, choice: "YES" | "NO" = "YES") => {
    setParlayOpen(true);
    setParlayLegs((prev) => {
      if (prev.some((leg) => leg.id === market.id)) return prev;
      if (prev.length >= 4) return prev;
      return [
        ...prev,
        {
          id: market.id,
          question: market.title || market.event_title || "Untitled market",
          choice,
          category: market.category || "Market",
          resolves: market.expiration_time || null,
          outputMint: market.yes_mint || market.no_mint || null,
          settlementMint: market.settlement_mint || null,
        },
      ];
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

  useEffect(() => {
    let mounted = true;
    const fetchMarkets = async () => {
      setLoadingMarkets(true);
      const { data, error, count } = await supabase
        .from("markets")
        .select(
          "id, ticker, title, event_title, status, volume, open_interest, price_yes, price_no, category, tags, expiration_time, yes_mint, no_mint, settlement_mint",
          { count: "exact" }
        )
        .order("volume", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (!mounted) return;
      if (error) {
        console.error("[markets] fetch error", error.message);
        setMarkets([]);
        setTotalPages(1);
      } else {
        setMarkets(data || []);
        const totalCount = count ?? (data?.length || 0);
        setTotalPages(Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));
      }
      setLoadingMarkets(false);
    };

    fetchMarkets();

    const channel = supabase
      .channel("markets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markets" },
        () => fetchMarkets()
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [page]);

  const toggleParlayPanel = () => setParlayOpen((v) => !v);

  const handleGetQuote = useCallback(async () => {
    if (!parlayLegs.length) return;
    const pk = await fetchPubkeyFromDb();
    if (!pk) {
      setPendingQuote(true);
      setConnectModalOpen(true);
      return;
    }
    setWalletPubkey(pk);
    await runQuote(pk);
  }, [parlayLegs, fetchPubkeyFromDb, runQuote]);

  const handlePlaceParlay = useCallback(async () => {
    if (!quoteResults.length) return;
    setPlacing(true);
    try {
      const { provider, pk } = await ensureWallet();
      const conn = new Connection("https://rpc.helius.xyz/?api-key=53c58a68-9bd4-4473-9edb-506db6cb4501", "confirmed");
      const toPubkey = new PublicKey("8FBMT6sqqKHaQHAqhLfKiWpQELUGnZDEqc3VvtDK7oZb");
      const lamports = Math.max(0, Number(stake || "0")) * 1_000_000_000;
      if (!lamports) throw new Error("Stake amount must be greater than zero");
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(pk),
          toPubkey,
          lamports,
        })
      );
      tx.feePayer = new PublicKey(pk);
      const { blockhash } = await conn.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      const signature = await provider.signAndSendTransaction(tx);
      const sigStr = typeof signature === "string" ? signature : signature?.signature || "";

      try {
        const { data: userRow } = await supabase
          .from("users")
          .select("id, transactions")
          .eq("wallet_public_key", pk)
          .maybeSingle();
        const existing = (userRow as any)?.transactions || [];
        const entry = {
          created_at: new Date().toISOString(),
          signature: sigStr,
          stake_sol: Number(stake || "0"),
          legs: parlayLegs,
          mock_quotes: quoteResults,
        };
        await supabase
          .from("users")
          .update({ transactions: [...existing, entry] })
          .eq("wallet_public_key", pk);
      } catch (logErr) {
        console.error("[parlay] log failed", (logErr as Error)?.message);
      }
      setQuoteModalOpen(false);
    } catch (e) {
      setQuoteError((e as Error)?.message || "Place parlay failed");
    } finally {
      setPlacing(false);
    }
  }, [quoteResults, ensureWallet]);

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
              Stack multiple yes/no markets into a single slip. Live Kalshi-backed order books coming next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button className="rounded-full px-6 py-3 text-sm font-semibold shadow-md" onClick={goToMarkets}>
                Browse markets
              </Button>
              <Button asChild variant="outline" className="rounded-full border-border/70 px-6 py-3 text-sm font-semibold">
                <a href="https://github.com/multibetsol/multibet" target="_blank" rel="noreferrer">
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

        {/* Markets + Parlay */}
        <section id="markets" className="mt-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Markets</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Live feed from Kalshi</h2>
            </div>
            <Button variant="outline" className="rounded-full border-border/70 px-4 py-2 text-sm" onClick={goToMarkets}>
              View all
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Powered by the Markets table populated from the Kalshi metadata API.</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,420px)]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {loadingMarkets && (
                <div className="col-span-full rounded-2xl border border-border bg-white/80 p-6 text-sm text-muted-foreground shadow-sm">
                  Loading markets…
                </div>
              )}

              {!loadingMarkets && markets.length === 0 && (
                <div className="col-span-full rounded-2xl border border-border bg-white/80 p-6 text-sm text-muted-foreground shadow-sm">
                  No markets yet. Run the sync function from Supabase to pull the latest Kalshi data.
                </div>
              )}

              {markets.map((market) => {
                const positiveChange = (market.price_yes ?? 0) >= (market.price_no ?? 0);
                const probability = formatProbability(market.price_yes);
                const reachedMax = parlayLegs.length >= 4;
                const isAdded = parlayLegs.some((leg) => leg.id === market.id);
                return (
                  <div
                    key={market.id}
                    className="relative overflow-hidden rounded-2xl border border-border bg-white/90 p-6 shadow-glow transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">
                        {market.category || "Market"}
                      </span>
                      <span className="text-xs text-muted-foreground">Parlay ready</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug">{market.title || market.event_title || "Untitled market"}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Resolves {market.expiration_time ? new Date(market.expiration_time).toLocaleDateString() : "TBD"}</p>

                    <div className="mt-6 flex items-end justify-between">
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Volume</div>
                        <div className="text-lg font-semibold text-foreground">{market.volume ?? "-"}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span>Status: {market.status || "unknown"}</span>
                      <span className={positiveChange ? "text-green-600" : "text-red-600"}>
                        Yes: {market.price_yes ?? "-"} / No: {market.price_no ?? "-"}
                      </span>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <Button
                        className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold shadow-md"
                        variant="default"
                        onClick={() => addToParlay(market, "YES")}
                        disabled={isAdded || reachedMax}
                      >
                        {isAdded ? "Added" : reachedMax ? "Max 4 legs" : "Add YES"}
                      </Button>
                      <Button
                        className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold shadow-md"
                        variant="secondary"
                        onClick={() => addToParlay(market, "NO")}
                        disabled={isAdded || reachedMax}
                      >
                        {isAdded ? "Added" : reachedMax ? "Max 4 legs" : "Add NO"}
                      </Button>
                      <Button
                        className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold"
                        variant="outline"
                        onClick={() => navigate(`/market/${market.id}`)}
                      >
                        View market
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              id="parlay-panel"
              className={`relative rounded-[24px] border border-border bg-white/95 p-6 shadow-glow transition-transform duration-200 ${
                parlayOpen ? "translate-x-0" : "lg:translate-x-[calc(100%+16px)]"
              } lg:sticky lg:top-24`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Slip</p>
                  <h3 className="text-xl font-semibold text-foreground">Parlay builder</h3>
                  <p className="text-xs text-muted-foreground">Max 4 legs</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-muted-foreground underline underline-offset-4"
                    onClick={toggleParlayPanel}
                  >
                    {parlayOpen ? "Collapse" : "Open"}
                  </button>
                  <button
                    className="text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-40"
                    onClick={clearParlay}
                    disabled={!parlayLegs.length}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {!parlayOpen && (
                <p className="mt-3 text-xs text-muted-foreground">Tap “Open” to manage your parlay.</p>
              )}

              {parlayOpen && (
              <>
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
                      <p className="mt-1 text-xs text-muted-foreground">Resolves {leg.resolves ? new Date(leg.resolves).toLocaleDateString() : "TBD"}</p>
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
                  disabled={!parlayLegs.length || quoteLoading}
                  onClick={handleGetQuote}
                >
                  {quoteLoading
                    ? "Getting quotes..."
                    : parlayLegs.length
                    ? `Get Quote (${parlayLegs.length} ${parlayLegs.length === 1 ? "leg" : "legs"})`
                    : "Add a leg to quote"}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {parlayLegs.length ? `${parlayLegs.length} leg parlay` : "No legs selected"}
                </p>
                {quoteError && <p className="mt-2 text-xs text-red-600 text-center">{quoteError}</p>}
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
              </>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            {[...Array(totalPages)].map((_, idx) => {
              const p = idx + 1;
              if (p > 6 && p < totalPages - 2) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
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

      {/* Quote Modal */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Review quotes</h3>
              <button className="text-sm text-muted-foreground underline" onClick={() => setQuoteModalOpen(false)}>
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {quoteResults.map((item, idx) => {
                const leg = parlayLegs.find((l) => l.outputMint === item.leg?.outputMint) || parlayLegs[idx];
                const quote = item.quote || {};
                return (
                  <div key={idx} className="rounded-xl border border-border bg-secondary/60 p-4">
                    <div className="text-sm font-semibold text-foreground">{leg?.question || "Market"}</div>
                    <div className="text-xs text-muted-foreground">Output mint: {item.leg?.outputMint}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <span>In: {quote.inAmount}</span>
                      <span>Out: {quote.outAmount}</span>
                      <span>Min out: {quote.minOutAmount}</span>
                      <span>Impact: {quote.priceImpactPct}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {aiParlay && (
              <div className="mt-4 rounded-xl border border-border/70 bg-white/70 p-4 text-sm text-foreground">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-1">Parlay probability</div>
                <div className="whitespace-pre-wrap leading-snug">{aiParlay}</div>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setQuoteModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={placing} onClick={handlePlaceParlay}>
                {placing ? "Placing..." : "Place parlay"}
              </Button>
            </div>
            {quoteError && <p className="mt-3 text-xs text-red-600 text-center">{quoteError}</p>}
          </div>
        </div>
      )}

      {/* Connect Wallet Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Connect wallet to place parlay</h3>
              <button className="text-sm text-muted-foreground underline" onClick={() => setConnectModalOpen(false)}>Close</button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              We’ll connect Phantom, store your public key, and keep you signed in for future quotes.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConnectModalOpen(false)}>Cancel</Button>
              <Button onClick={connectAndMaybeQuote}>Connect Phantom</Button>
            </div>
            {quoteError && <p className="mt-3 text-xs text-red-600 text-center">{quoteError}</p>}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
