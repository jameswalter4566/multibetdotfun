// Supabase Edge Function: parlay-ai
// Takes legs (question + choice) and stake, calls OpenAI to produce a fun parlay analysis.
// Requires env OPENAI_API_KEY.

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

serve(async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  try {
    const body = await req.json().catch(() => ({}));
    const legs = Array.isArray(body?.legs) ? body.legs : [];
    const stake = Number(body?.stake || 0);

    if (!legs.length) return json({ success: false, error: "legs required" }, 400);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ success: false, error: "OPENAI_API_KEY not set" }, 500);

    const prompt = [
      "You are a parlay builder. I will provide up to 4 prediction markets (question + YES/NO pick).",
      "Your job: give a % chance for each leg and a final parlay % chance.",
      "Output in a short, readable paragraph. Keep it concise.",
      "",
      "Legs:",
      ...legs.map((l: any, idx: number) => `${idx + 1}. ${l.choice || "YES"} on "${l.question || "Untitled"}"`),
      "",
      `Stake: ${stake || "N/A"} (for context only)`,
    ].join("\n");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("[parlay-ai] openai error", { status: resp.status, body: text.slice(0, 400) });
      return json({ success: false, error: "openai failed", detail: text.slice(0, 400) }, 500);
    }

    let content: string | null = null;
    try {
      const parsed = JSON.parse(text);
      content = parsed?.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error("[parlay-ai] parse error", (e as Error)?.message);
    }

    if (!content) return json({ success: false, error: "no content returned" }, 500);

    return json({ success: true, analysis: content });
  } catch (e) {
    console.error("[parlay-ai] fatal", { error: (e as Error)?.message });
    return json({ success: false, error: (e as Error)?.message || "internal error" }, 500);
  }
});
