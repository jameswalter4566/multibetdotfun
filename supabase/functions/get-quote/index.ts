// Supabase Edge Function: get-quote
// Given legs (outputMint + amount), fetches Dflow quote-api quotes for each leg.
// No auth required; intended to be called from the app before placing a parlay.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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

const QUOTE_BASE = "https://quote-api.dflow.net";
const DEFAULT_INPUT_MINT = "EPjFWdd5AufqSSqeM2q9D4p9iu3Xwp9Qw3tXnCh9xz2V"; // USDC mainnet

interface QuoteLeg {
  outputMint: string;
  amount: number; // decimal human amount (e.g., 10 USDC)
  slippageBps?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  try {
    const body = await req.json().catch(() => ({}));
    const legs: QuoteLeg[] = Array.isArray(body?.legs) ? body.legs : [];
    const inputMint: string = body?.inputMint || DEFAULT_INPUT_MINT;
    const slippageBps: number = Number(body?.slippageBps || 100);
    if (!legs.length) return json({ success: false, error: "legs required" }, 400);

    const results = [] as any[];
    for (const leg of legs) {
      const amountDec = Number(leg.amount || 0);
      if (!leg.outputMint || amountDec <= 0) continue;
      const amountInt = Math.round(amountDec * 1_000_000); // USDC 6 decimals
      const url = new URL(`${QUOTE_BASE}/quote`);
      url.searchParams.set("inputMint", inputMint);
      url.searchParams.set("outputMint", leg.outputMint);
      url.searchParams.set("amount", String(amountInt));
      url.searchParams.set("slippageBps", String(leg.slippageBps ?? slippageBps));
      url.searchParams.set("onlyDirectRoutes", "true");
      const start = Date.now();
      const resp = await fetch(url.toString());
      const text = await resp.text();
      if (!resp.ok) {
        console.error("[get-quote] quote failed", { status: resp.status, body: text.slice(0, 300), leg });
        continue;
      }
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch (e) {
        console.error("[get-quote] parse failed", { error: (e as Error)?.message, bodyPreview: text.slice(0, 300) });
        continue;
      }
      results.push({ leg, quote: parsed, durationMs: Date.now() - start });
    }

    if (!results.length) return json({ success: false, error: "no quotes returned" }, 502);
    return json({ success: true, results });
  } catch (e) {
    console.error("[get-quote] fatal", { error: (e as Error)?.message });
    return json({ success: false, error: (e as Error)?.message || "internal error" }, 500);
  }
});
