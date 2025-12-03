// Supabase Edge Function: get-quote-legs
// Fetches quotes for each leg from Dflow quote API. Requires legs[] and userPublicKey.
// This avoids collision with any existing get-quote function.

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
const DEFAULT_INPUT_MINT = "EPjFWdd5AufqSSqeM2q9D4p9iu3Xwp9Qw3tXnCh9xz2V"; // USDC

interface QuoteLeg {
  outputMint: string;
  amount: number;
  slippageBps?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  try {
    const body = await req.json().catch(() => ({}));
    const legs: QuoteLeg[] = Array.isArray(body?.legs) ? body.legs : [];
    const inputMint: string = body?.inputMint || DEFAULT_INPUT_MINT;
    const slippageBps: number = Number(body?.slippageBps || 100);
    const userPublicKey = String(body?.userPublicKey || "").trim();

    if (!userPublicKey) return json({ success: false, error: "userPublicKey required" }, 400);
    if (!legs.length) return json({ success: false, error: "legs required" }, 400);

    const results = [] as any[];
    const errors = [] as any[];
    for (const leg of legs) {
      const amountDec = Number(leg.amount || 0);
      if (!leg.outputMint || amountDec <= 0) continue;
      const amountInt = Math.round(amountDec * 1_000_000); // assume 6 decimals (USDC)
      const url = new URL(`${QUOTE_BASE}/quote`);
      url.searchParams.set("inputMint", inputMint);
      url.searchParams.set("outputMint", leg.outputMint);
      url.searchParams.set("amount", String(amountInt));
      url.searchParams.set("slippageBps", String(leg.slippageBps ?? slippageBps));
      url.searchParams.set("onlyDirectRoutes", "false");
      const start = Date.now();
      const resp = await fetch(url.toString());
      const text = await resp.text();
      if (!resp.ok) {
        const err = { status: resp.status, body: text.slice(0, 300), leg };
        console.error("[get-quote-legs] quote failed", err);
        errors.push(err);
        continue;
      }
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        const err = { error: (e as Error)?.message, bodyPreview: text.slice(0, 300), leg };
        console.error("[get-quote-legs] parse failed", err);
        errors.push(err);
        continue;
      }
      results.push({ leg, quote: parsed, durationMs: Date.now() - start });
    }

    if (!results.length) return json({ success: false, error: "no quotes returned", errors }, 502);
    return json({ success: true, results, errors });
  } catch (e) {
    console.error("[get-quote-legs] fatal", { error: (e as Error)?.message });
    return json({ success: false, error: (e as Error)?.message || "internal error" }, 500);
  }
});
