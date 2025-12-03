import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardTopNav from "@/components/DashboardTopNav";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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

const Market = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [market, setMarket] = useState<MarketRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarket = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.from("markets").select("*").eq("id", id).maybeSingle();
      if (error) {
        setError(error.message);
        setMarket(null);
      } else {
        setMarket(data as MarketRow);
        setError(null);
      }
      setLoading(false);
    };
    fetchMarket();
  }, [id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardTopNav />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
          Back
        </Button>

        {loading && <p className="text-muted-foreground">Loading market...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && !market && !error && <p className="text-muted-foreground">Market not found.</p>}

        {market && (
          <div className="space-y-6 rounded-3xl border border-border/70 bg-white/90 p-6 shadow-glow">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ticker</p>
              <h1 className="text-3xl font-bold text-foreground">{market.title || market.event_title || "Untitled market"}</h1>
              <p className="text-sm text-muted-foreground mt-1">{market.ticker}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                <p className="text-lg font-semibold text-foreground">{market.status || "Unknown"}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Volume</p>
                <p className="text-lg font-semibold text-foreground">{market.volume ?? "-"}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Open Interest</p>
                <p className="text-lg font-semibold text-foreground">{market.open_interest ?? "-"}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resolves</p>
                <p className="text-lg font-semibold text-foreground">
                  {market.expiration_time ? new Date(market.expiration_time).toLocaleString() : "TBD"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Yes mint</p>
                <p className="text-sm break-all text-foreground">{market.yes_mint || "-"}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">No mint</p>
                <p className="text-sm break-all text-foreground">{market.no_mint || "-"}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Settlement mint</p>
                <p className="text-sm break-all text-foreground">{market.settlement_mint || "-"}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Yes price</p>
                <p className="text-lg font-semibold text-foreground">{market.price_yes ?? "-"}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">No price</p>
                <p className="text-lg font-semibold text-foreground">{market.price_no ?? "-"}</p>
              </div>
            </div>

            {market.tags && (
              <div className="flex flex-wrap gap-2">
                {market.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-accent/40 px-3 py-1 text-xs font-semibold text-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Market;
