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
  openTime?: number | string;
  closeTime?: number | string;
  expirationTime?: number | string;
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

const API_BASE_DEFAULT = "https://prediction-markets-api.dflow.net/api/v1";

async function fetchEvents(status: string) {
  const kalshiKey = Deno.env.get("kalshi_key");
  const API_BASE = Deno.env.get("KALSHI_API_BASE") || API_BASE_DEFAULT;

  const url = `${API_BASE}/events?withNestedMarkets=true${status ? `&status=${status}` : ""}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (kalshiKey) headers["Authorization"] = `Bearer ${kalshiKey}`;

  let text: string | null = null;
  let parsed: any = null;
  const start = Date.now();
  try {
    const resp = await fetch(url, { headers });
    text = await resp.text();
    if (!resp.ok) {
      console.error("[sync-markets] fetch failed", { url, status: resp.status, body: text?.slice(0, 400) });
      throw new Error(`Kalshi API failed: ${resp.status}`);
    }
    try {
      parsed = JSON.parse(text || "null");
    } catch (e) {
      console.error("[sync-markets] json parse error", { url, bodyPreview: text?.slice(0, 400), error: (e as Error)?.message });
      throw e;
    }
    const durationMs = Date.now() - start;
    console.log("[sync-markets] fetched events", { url, durationMs, hasEvents: Boolean((parsed as any)?.events), isArray: Array.isArray(parsed) });
    return parsed as { events?: ApiEvent[] } | ApiEvent[];
  } catch (e) {
    console.error("[sync-markets] fetchEvents error", { url, bodyPreview: text?.slice(0, 400), error: (e as Error)?.message });
    throw e;
  }
}

const toISO = (value?: number | string) => {
  if (value == null) return null;
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isFinite(num)) {
    const ms = num < 2_000_000_000 ? num * 1000 : num;
    return new Date(ms).toISOString();
  }
  try { return new Date(value as string).toISOString(); } catch { return null; }
};

function flattenMarkets(payload: { events?: ApiEvent[] } | ApiEvent[]): any[] {
  const events = Array.isArray(payload) ? payload : payload?.events || [];
  const rows: any[] = [];

  for (const ev of events) {
    const markets = ev?.markets || [];
    for (const m of markets) {
      const accounts = (m as any)?.accounts || {};
      let yesMint = m.yesMint || null;
      let noMint = m.noMint || null;
      if (!yesMint || !noMint) {
        const accountEntries = Object.values(accounts || {}) as any[];
        for (const acct of accountEntries) {
          if (!yesMint && acct?.yesMint) yesMint = acct.yesMint;
          if (!noMint && acct?.noMint) noMint = acct.noMint;
          if (yesMint && noMint) break;
        }
      }
      rows.push({
        ticker: m.ticker ?? null,
        title: m.title ?? ev.title ?? null,
        event_title: ev.title ?? null,
        status: m.status ?? ev.status ?? null,
        volume: m.volume ?? null,
        open_interest: (m.openInterest ?? m.open_interest) ?? null,
        yes_mint: yesMint,
        no_mint: noMint,
        market_ledger: m.marketLedger ?? null,
        open_time: toISO(m.openTime),
        close_time: toISO(m.closeTime),
        expiration_time: toISO(m.expirationTime),
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
  console.log("[sync-markets] flattened rows", { count: rows.length });
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

    console.log("[sync-markets] upserting rows", { count: rows.length });
    const { error } = await admin.from("markets").upsert(rows, { onConflict: "ticker" });
    if (error) console.error("[sync-markets] upsert error", { message: error.message });
    if (error) return json({ success: false, error: error.message }, 500);

    return json({ success: true, insertedOrUpdated: rows.length });
  } catch (e) {
    try {
      console.error("[sync-markets] error", (e as Error)?.message);
    } catch {}
    return json({ success: false, error: (e as Error)?.message || "internal error" }, 500);
  }
});
