// Supabase Edge Function: swap-parlay
// Given quote responses and a user public key, fetches swap transactions for each leg from Dflow and returns base64 txs to sign.
// Caller (front-end) must sign and send with the user's wallet (e.g., Phantom).

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

serve(async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  try {
    const body = await req.json().catch(() => ({}));
    const quotes = Array.isArray(body?.quotes) ? body.quotes : [];
    const userPublicKey = String(body?.userPublicKey || "").trim();
    if (!userPublicKey) return json({ success: false, error: "userPublicKey required" }, 400);
    if (!quotes.length) return json({ success: false, error: "quotes required" }, 400);

    const results: any[] = [];
    for (const quote of quotes) {
      const payload = {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
      };
      const start = Date.now();
      const resp = await fetch(`${QUOTE_BASE}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      if (!resp.ok) {
        console.error("[swap-parlay] swap failed", { status: resp.status, body: text.slice(0, 300) });
        continue;
      }
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch (e) {
        console.error("[swap-parlay] parse failed", { error: (e as Error)?.message, bodyPreview: text.slice(0, 300) });
        continue;
      }
      results.push({ quoteRequestId: quote?.requestId, swap: parsed, durationMs: Date.now() - start });
    }

    if (!results.length) return json({ success: false, error: "no swaps returned" }, 502);
    return json({ success: true, results });
  } catch (e) {
    console.error("[swap-parlay] fatal", { error: (e as Error)?.message });
    return json({ success: false, error: (e as Error)?.message || "internal error" }, 500);
  }
});
