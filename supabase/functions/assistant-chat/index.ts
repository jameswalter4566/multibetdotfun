import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface AssistantRequestBody {
  prompt?: string;
  history?: ChatMessage[];
  automationName?: string;
  walletAddress?: string;
  systemPrompt?: string;
  autoPublish?: boolean;
  moderation?: boolean;
}

const SYSTEM_PROMPT =
  "You are an automation architect for the Hub X 402. When a user describes a task, explain how you will orchestrate it by combining our available third-party APIs (OpenAI, Claude, Google Sheets, Discord, on-chain actions, etc.). Always respond with a friendly plan that lists the nodes to create, the order they execute, and how much SOL/USDC to fund for execution.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("open-ai-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenAI key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload = (await req.json()) as AssistantRequestBody;
    const prompt = (payload?.prompt ?? "").toString().trim();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const history = Array.isArray(payload?.history) ? (payload.history as ChatMessage[]) : [];
    const normalizedHistory = history
      .filter((message) => !!message?.content)
      .map((message) => ({
        role: message?.role === "assistant" ? "assistant" : "user",
        content: message?.content?.toString() ?? "",
      }));

    const systemMessage = (payload?.systemPrompt ?? SYSTEM_PROMPT).toString();
    const messages = [
      { role: "system", content: systemMessage },
      ...normalizedHistory,
      { role: "user", content: prompt },
    ];

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        messages,
      }),
    });

    const completionText = await completion.text();
    if (!completion.ok) {
      return new Response(
        JSON.stringify({
          error: `openai_${completion.status}`,
          detail: completionText || completion.statusText,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(completionText) as Record<string, unknown>;
    } catch {
      // If OpenAI returns non-JSON, surface as text
      data = { raw: completionText };
    }

    const reply =
      ((data as any)?.choices?.[0]?.message?.content as string | undefined)?.trim() ??
      "Assistant drafted your automation. Review the sandbox for node updates.";

    const responseBody = {
      reply,
      metadata: {
        automationName: payload?.automationName ?? "untitled",
        walletAddress: payload?.walletAddress ?? null,
        autoPublish: payload?.autoPublish ?? false,
        moderation: payload?.moderation ?? true,
      },
      raw: data,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
