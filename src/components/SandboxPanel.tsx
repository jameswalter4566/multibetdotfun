import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiProviders, getProviderBySlug } from "@/data/apiProviders";
import { cn } from "@/lib/utils";

type SandboxStatus = "idle" | "loading" | "success" | "error" | "payment_required";

type SandboxPanelProps = {
  className?: string;
  initialProvider?: string;
  lockedProvider?: boolean;
};

export const sandboxSamples: Record<string, string[]> = {
  openai: [
    "Summarize the latest fundraising milestones.",
    "Generate a headline for a crypto protocol showcase.",
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
  twilio: ["SMS: Product update broadcast", "SMS: Goal reached announcement", "SMS: Share campaign update"],
};

export const sandboxDefaultPayloads: Record<string, any> = {
  openai: {
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant for fundraising campaigns." },
      { role: "user", content: "Summarize the latest fundraising milestones." },
    ],
  },
  claude: {
    model: "claude-3-5-sonnet",
    messages: [{ role: "user", content: "Outline a launch plan for a Solana-based product." }],
    max_tokens: 200,
  },
  stripe: {
    amount: 3200,
    currency: "usd",
    description: "Usage-based API call",
    source: "tok_visa",
  },
  twilio: {
    to: "+15551234567",
    from: "+18885550123",
    body: "Milestone unlocked! Claim your perk in the dashboard.",
  },
};

const SandboxPanel = ({ className, initialProvider, lockedProvider = false }: SandboxPanelProps) => {
  const [providerSlug, setProviderSlug] = useState(initialProvider ?? apiProviders[0]?.slug ?? "");
  const provider = useMemo(() => getProviderBySlug(providerSlug), [providerSlug]);

  const [sampleIndex, setSampleIndex] = useState(0);
  const [requestText, setRequestText] = useState<string>("");
  const [responseText, setResponseText] = useState<string>("Ready to test the endpoint.");
  const [status, setStatus] = useState<SandboxStatus>("idle");
  const [hasCalledGateway, setHasCalledGateway] = useState(false);

  useEffect(() => {
    if (initialProvider) {
      setProviderSlug(initialProvider);
    }
  }, [initialProvider]);

  useEffect(() => {
    const template = sandboxDefaultPayloads[providerSlug];
    if (template) {
      setRequestText(JSON.stringify(template, null, 2));
    } else if (provider?.method?.toUpperCase() === "GET") {
      setRequestText(sandboxSamples[providerSlug]?.[0] ?? "");
    } else {
      setRequestText("{}");
    }
    setSampleIndex(0);
    setResponseText("Ready to test the endpoint.");
    setStatus("idle");
  }, [providerSlug, provider?.method]);

  const samples = sandboxSamples[providerSlug] ?? ["Sample request"];

  const handleSampleChange = (value: string, index: number) => {
    setSampleIndex(index);
    if (!provider) return;

    if (provider.method.toUpperCase() === "GET") {
      setRequestText(value);
      return;
    }

    const base = sandboxDefaultPayloads[providerSlug];
    if (!base) return;

    const clone = JSON.parse(JSON.stringify(base));
    if (Array.isArray(clone.messages) && clone.messages.length > 0) {
      clone.messages[clone.messages.length - 1] = {
        ...clone.messages[clone.messages.length - 1],
        content: value,
      };
    } else if (typeof clone.prompt === "string") {
      clone.prompt = value;
    } else if (clone.body) {
      clone.body = value;
    }
    setRequestText(JSON.stringify(clone, null, 2));
  };

  const handleTryIt = async () => {
    if (hasCalledGateway) return;
    if (!provider) {
      setStatus("error");
      setResponseText("Provider metadata unavailable.");
      return;
    }

    setStatus("loading");
    setResponseText("Calling x402 gateway…");
    setHasCalledGateway(true);

    try {
      const headers: Record<string, string> = {
        "x402-sender-wallet": "DemoSenderWallet11111111111111111111111",
      };

      let url = provider.endpoint;
      let body: string | undefined;

      if (provider.method.toUpperCase() === "GET") {
        const query = requestText.trim();
        if (query.length > 0) {
          url = `${provider.endpoint}${query.startsWith("?") ? query : `?${query}`}`;
        }
      } else {
        headers["Content-Type"] = "application/json";
        body = requestText ?? "{}";
      }

      const response = await fetch(url, {
        method: provider.method,
        headers,
        body: provider.method.toUpperCase() === "GET" ? undefined : body,
      });

      const rawText = await response.text();
      let formatted = rawText;
      try {
        formatted = JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        // plain text response
      }

      setResponseText(formatted);

      if (response.status === 402) {
        setStatus("payment_required");
      } else if (response.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      setResponseText((error instanceof Error ? error.message : String(error)) ?? "Request failed");
    }
  };

  const statusBadge = () => {
    switch (status) {
      case "loading":
        return "Loading";
      case "success":
        return "Success";
      case "error":
        return "Error";
      case "payment_required":
        return "402 Payment Required";
      default:
        return "Idle";
    }
  };

  return (
    <div className={cn("rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow space-y-6", className)}>
      {!lockedProvider && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            API Provider
          </label>
          <select
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={providerSlug}
            onChange={(event) => setProviderSlug(event.target.value)}
          >
            {apiProviders.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Test string</label>
          <select
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={sampleIndex}
            onChange={(event) => handleSampleChange(samples[Number(event.target.value)] ?? "", Number(event.target.value))}
          >
            {samples.map((sample, index) => (
              <option key={`${sample}-${index}`} value={index}>
                {sample}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            Request payload / query
          </label>
          <textarea
            className="mt-2 h-36 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Include your wallet-backed <code className="font-mono text-[11px]">x402-session</code> and
            <code className="font-mono text-[11px]"> x402-sender-wallet</code> headers for authenticated calls.
          </p>
        </div>

        <Button
          onClick={handleTryIt}
          disabled={status === "loading" || hasCalledGateway}
          className="w-full rounded-xl bg-[#0ea5ff] py-4 text-sm font-semibold text-white shadow-[0_0_14px_rgba(14,165,255,0.6)] hover:bg-[#08b0ff] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Call gateway
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-background/70">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Response</div>
          <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground/80">
            {statusBadge()}
          </span>
        </div>
        <pre className="max-h-72 overflow-auto px-4 py-5 text-[13px] leading-relaxed text-foreground/90">{responseText}</pre>
      </div>
    </div>
  );
};

export default SandboxPanel;
