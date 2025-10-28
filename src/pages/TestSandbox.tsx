import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiProviders, getProviderBySlug } from "@/data/apiProviders";
import { cn } from "@/lib/utils";

const sampleCatalog: Record<string, string[]> = {
  openai: [
    "Summarize the latest fundraising milestones.",
    "Generate a headline for a crypto charity livestream.",
    "Draft a thank-you note for top donors.",
  ],
  claude: [
    "Outline a launch plan for a Solana-based product.",
    "Generate FAQs for API onboarding.",
    "Write a privacy policy intro paragraph.",
  ],
  stripe: ["Create a $32 usage charge", "Authorise a $99 hold", "Refund a $12 transaction"],
  "google-maps": [
    "address=476 5th Ave, New York, NY 10018",
    "address=Champ de Mars, 5 Avenue Anatole, 75007 Paris",
    "latlng=37.422,-122.084",
  ],
  "youtube-data": [
    "q=x402 marketplace launch",
    "channelId=UC_x5XG1OV2P6uZZ5FSM9Ttw",
    "videoId=dQw4w9WgXcQ",
  ],
  twilio: ["SMS: Stream going live", "SMS: Goal reached announcement", "SMS: Share campaign update"],
};

const payloadTemplates: Record<string, string> = {
  openai: JSON.stringify(
    {
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant for fundraising campaigns." },
        { role: "user", content: "Summarize the latest fundraising milestones." },
      ],
    },
    null,
    2
  ),
  claude: JSON.stringify(
    {
      model: "claude-3-5-sonnet",
      messages: [{ role: "user", content: "Outline a launch plan for a Solana-based product." }],
      max_tokens: 200,
    },
    null,
    2
  ),
  stripe: JSON.stringify(
    {
      amount: 3200,
      currency: "usd",
      description: "Usage-based API call",
      source: "tok_visa",
    },
    null,
    2
  ),
  "google-maps": "address=1600 Amphitheatre Parkway, Mountain View, CA",
  "youtube-data": "q=solana news",
  twilio: JSON.stringify(
    {
      to: "+15551234567",
      from: "+18885550123",
      body: "Milestone unlocked! Join the live stream now.",
    },
    null,
    2
  ),
};

type TestSandboxProps = {
  className?: string;
};

const TestSandbox = ({ className }: TestSandboxProps) => {
  const [providerSlug, setProviderSlug] = useState(apiProviders[0]?.slug ?? "");
  const provider = useMemo(() => getProviderBySlug(providerSlug), [providerSlug]);

  const [sampleInput, setSampleInput] = useState(0);
  const [requestText, setRequestText] = useState(payloadTemplates[providerSlug] ?? "");
  const [responseText, setResponseText] = useState<string>("Awaiting request…");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    setSampleInput(0);
    setRequestText(payloadTemplates[providerSlug] ?? "");
    setResponseText("Ready to test the endpoint.");
    setStatus("idle");
  }, [providerSlug]);

  const samples = sampleCatalog[providerSlug] ?? ["Sample request"];

  const handleTryIt = async () => {
    if (!provider) {
      setStatus("error");
      setResponseText("Provider metadata unavailable.");
      return;
    }

    setStatus("loading");
    setResponseText("Sending request to provider…");

    try {
      let targetUrl = provider.endpoint;
      let fetchOptions: RequestInit = {
        method: provider.method,
        headers: {
          "x402-session": "wallet-session-token",
        },
      };

      if (provider.method === "GET") {
        const query = requestText.trim();
        if (query.length > 0) {
          const encodedQuery = query
            .split("&")
            .map((pair) => {
              if (!pair.includes("=")) return encodeURIComponent(pair);
              const [key, ...rest] = pair.split("=");
              return `${encodeURIComponent(key)}=${encodeURIComponent(rest.join("="))}`;
            })
            .join("&");
          targetUrl = `${provider.endpoint}?${encodedQuery}`;
        }
      } else if (requestText.trim().length > 0) {
        try {
          fetchOptions = {
            ...fetchOptions,
            headers: {
              ...fetchOptions.headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(JSON.parse(requestText)),
          };
        } catch {
          fetchOptions = {
            ...fetchOptions,
            headers: {
              ...fetchOptions.headers,
              "Content-Type": "application/json",
            },
            body: requestText,
          };
        }
      }

      const res = await fetch(targetUrl, fetchOptions);
      const text = await res.text();
      setResponseText(text || "(empty response)");
      setStatus(res.ok ? "success" : "error");
    } catch (error: any) {
      setStatus("error");
      setResponseText(
        `Request failed:\n${error?.message ?? "Unknown error"}\n\nVerify the endpoint and try again.`
      );
    }
  };

  if (!provider) {
    return (
      <div className={cn("rounded-3xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground", className)}>
        No sandbox providers are configured yet. Add an API in `apiProviders.ts` to enable testing.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-8 lg:flex-row", className)}>
      <section className="space-y-6 lg:w-[360px]">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            API Provider
          </label>
          <select
            value={providerSlug}
            onChange={(event) => setProviderSlug(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {apiProviders.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            Test string
          </label>
          <select
            value={sampleInput}
            onChange={(event) => {
              const index = Number(event.target.value) || 0;
              setSampleInput(index);
              if (provider.method === "GET") {
                setRequestText(samples[index] ?? "");
              } else {
                const baseTemplate = payloadTemplates[providerSlug];
                if (baseTemplate) {
                  try {
                    const parsed = JSON.parse(baseTemplate);
                    if (Array.isArray(parsed.messages) && parsed.messages.length > 1) {
                      parsed.messages[1].content = samples[index] ?? parsed.messages[1].content;
                    } else if (parsed.body) {
                      parsed.body = samples[index];
                    } else if (parsed.description) {
                      parsed.description = samples[index];
                    }
                    setRequestText(JSON.stringify(parsed, null, 2));
                  } catch {
                    setRequestText(baseTemplate);
                  }
                }
              }
            }}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {samples.map((label, index) => (
              <option key={index} value={index}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            Request payload / query
          </label>
          <textarea
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
            rows={provider.method === "GET" ? 4 : 10}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Enter JSON payload or query string"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Include your wallet-backed <code className="font-mono text-[11px]">x402-session</code> header when testing from
            your client.
          </p>
        </div>

        <Button
          onClick={handleTryIt}
          disabled={status === "loading"}
          className="w-full rounded-xl bg-[#0ea5ff] px-4 py-4 text-sm font-semibold text-white shadow-[0_0_14px_rgba(14,165,255,0.6)] hover:bg-[#08b0ff]"
        >
          {status === "loading" ? "Calling endpoint…" : "Try it"}
        </Button>
      </section>

      <section className="flex-1 rounded-3xl border border-border bg-secondary/30 p-6 shadow-inner">
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Response</div>
            <div className="mt-1 text-sm text-muted-foreground">Method: {provider.method}</div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === "success"
                ? "bg-emerald-500/20 text-emerald-400"
                : status === "error"
                ? "bg-red-500/20 text-red-400"
                : status === "loading"
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-border text-muted-foreground"
            }`}
          >
            {status.toUpperCase()}
          </span>
        </div>
        <pre className="mt-4 h-[480px] overflow-auto rounded-2xl bg-black/90 p-5 text-sm leading-relaxed text-white">
          <code>{responseText}</code>
        </pre>
      </section>
    </div>
  );
};

export default TestSandbox;
