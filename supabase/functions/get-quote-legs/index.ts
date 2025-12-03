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
  inputMint?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const amountDec = Number(leg.amount || 0);
      if (!leg.outputMint || amountDec <= 0) continue;
      const amountInt = Math.round(amountDec * 1_000_000); // assume 6 decimals (USDC)
      const legInputMint = leg.inputMint || inputMint;
      const url = new URL(`${QUOTE_BASE}/order`);
      url.searchParams.set("userPublicKey", userPublicKey);
      url.searchParams.set("inputMint", legInputMint);
      url.searchParams.set("outputMint", leg.outputMint);
      url.searchParams.set("amount", String(amountInt));
      url.searchParams.set("slippageBps", String(leg.slippageBps ?? slippageBps));
      let parsed: any = null;
      let lastErr: any = null;
      const start = Date.now();
      for (let attempt = 1; attempt <= 3; attempt++) {
        const resp = await fetch(url.toString());
        const text = await resp.text();
        const logCtx = { status: resp.status, attempt, leg, inputMint: legInputMint, bodyPreview: text.slice(0, 400) };
        console.log("[get-quote-legs] response", logCtx);
        if (resp.status === 429) {
          lastErr = logCtx;
          console.error("[get-quote-legs] rate limited, retrying", logCtx);
          await sleep(400 * attempt);
          continue;
        }
        if (!resp.ok) {
          lastErr = logCtx;
          console.error("[get-quote-legs] quote failed", logCtx);
          break;
        }
        try {
          parsed = JSON.parse(text);
          results.push({ leg, quote: parsed, durationMs: Date.now() - start, attempt, rawPreview: text.slice(0, 200) });
        } catch (e) {
          lastErr = { error: (e as Error)?.message, bodyPreview: text.slice(0, 400), leg, attempt };
          console.error("[get-quote-legs] parse failed", lastErr);
        }
        break;
      }
      if (!parsed && lastErr) errors.push(lastErr);
      if (i < legs.length - 1) await sleep(500); // small gap between legs
    }

    if (!results.length) return json({ success: false, error: "no quotes returned", errors }, 502);
    return json({ success: true, results, errors });
  } catch (e) {
    console.error("[get-quote-legs] fatal", { error: (e as Error)?.message });
    return json({ success: false, error: (e as Error)?.message || "internal error" }, 500);
  }
});
