// Supabase Edge Function: sync-markets
// Fetches live Kalshi/DFlow prediction markets and upserts into public.markets.
// Invokable via Supabase dashboard "Test" button (no payload required).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });

type ApiMarket = {
  ticker?: string;
  title?: string;
  status?: string;
  volume?: number;
  open_interest?: number;
  openInterest?: number;
  yesMint?: string;
  noMint?: string;
  marketLedger?: string;
  openTime?: string;
  closeTime?: string;
  expirationTime?: string;
  result?: string;
  redemptionStatus?: string;
  tags?: string[];
  price?: { yes?: number; no?: number };
  lastPrice?: { yes?: number; no?: number };
  seriesTickers?: string[];
};

type ApiEvent = {
  title?: string;
  ticker?: string;
  tags?: string[];
  status?: string;
  markets?: ApiMarket[];
  seriesTickers?: string[];
};

async function fetchEvents(status: string) {
  const kalshiKey = Deno.env.get("kalshi_key");
  const API_BASE =
    Deno.env.get("KALSHI_API_BASE") ||
    "https://pond.dflow.net/prediction-market-metadata-api-reference";

  const url = `${API_BASE}/events?withNestedMarkets=true${status ? `&status=${status}` : ""}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (kalshiKey) headers["Authorization"] = `Bearer ${kalshiKey}`;

  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    throw new Error(`Kalshi API failed: ${resp.status} ${await resp.text()}`);
  }
  return (await resp.json()) as { events?: ApiEvent[] } | ApiEvent[];
}

function flattenMarkets(payload: { events?: ApiEvent[] } | ApiEvent[]): any[] {
  const events = Array.isArray(payload) ? payload : payload?.events || [];
  const rows: any[] = [];

  for (const ev of events) {
    const markets = ev?.markets || [];
    for (const m of markets) {
      rows.push({
        ticker: m.ticker ?? null,
        title: m.title ?? ev.title ?? null,
        event_title: ev.title ?? null,
        status: m.status ?? ev.status ?? null,
        volume: m.volume ?? null,
        open_interest: (m.openInterest ?? m.open_interest) ?? null,
        yes_mint: m.yesMint ?? null,
        no_mint: m.noMint ?? null,
        market_ledger: m.marketLedger ?? null,
        open_time: m.openTime ? new Date(m.openTime).toISOString() : null,
        close_time: m.closeTime ? new Date(m.closeTime).toISOString() : null,
        expiration_time: m.expirationTime ? new Date(m.expirationTime).toISOString() : null,
        result: m.result ?? null,
        redemption_status: m.redemptionStatus ?? null,
        category: ev.tags?.[0] ?? null,
        tags: m.tags ?? ev.tags ?? null,
        series_tickers: m.seriesTickers ?? ev.seriesTickers ?? null,
        price_yes: m.price?.yes ?? m.lastPrice?.yes ?? null,
        price_no: m.price?.no ?? m.lastPrice?.no ?? null,
        updated_at: new Date().toISOString(),
      });
    }
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const status = new URL(req.url).searchParams.get("status") || "active";

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const apiPayload = await fetchEvents(status);
    const rows = flattenMarkets(apiPayload).filter((r) => r.ticker);
    if (!rows.length) return json({ success: false, error: "No markets returned from API" }, 502);

    const { error } = await admin.from("markets").upsert(rows, { onConflict: "ticker" });
    if (error) return json({ success: false, error: error.message }, 500);

    return json({ success: true, insertedOrUpdated: rows.length });
  } catch (e) {
    try {
      console.error("[sync-markets] error", (e as Error)?.message);
    } catch {}
    return json({ success: false, error: (e as Error)?.message || "internal error" }, 500);
  }
});
