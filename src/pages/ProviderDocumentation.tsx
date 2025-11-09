import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SiteFooter from "@/components/SiteFooter";
import { apiProviders, getProviderBySlug } from "@/data/apiProviders";
import type { ApiProvider } from "@/data/apiProviders";
import { sandboxDefaultPayloads, sandboxSamples } from "@/components/SandboxPanel";

type SandboxStatus = "idle" | "loading" | "success" | "error" | "payment_required";

export default function ProviderDocumentation() {
  const { slug } = useParams<{ slug: string }>();
  const provider = getProviderBySlug(slug);

  if (!provider) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="text-3xl font-semibold">Provider not found</div>
          <p className="text-muted-foreground">
            The requested integration is unavailable. Return to the marketplace to browse all available APIs.
          </p>
          <Button asChild>
            <Link to="/marketplace">Back to Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  const endpoints = useMemo(() => {
    if (provider.endpoints && provider.endpoints.length > 0) {
      return provider.endpoints;
    }
    return [
      {
        name: provider.name,
        method: provider.method,
        path: provider.endpoint,
        description: provider.summary
      }
    ];
  }, [provider]);

  const providerSamples = useMemo(() => sandboxSamples[provider.slug] ?? ["Sample request"], [provider.slug]);

  const [sandboxEndpointIndex, setSandboxEndpointIndex] = useState(0);
  const [sandboxSampleIndex, setSandboxSampleIndex] = useState(0);
  const [sandboxRequest, setSandboxRequest] = useState<string>("");
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>("idle");
  const [sandboxResponse, setSandboxResponse] = useState<string>("Ready to test the endpoint.");

  const activeEndpoint = endpoints[sandboxEndpointIndex];

  const applySampleToPayload = (payload: any, sampleValue: string) => {
    if (Array.isArray(payload.messages) && payload.messages.length > 0) {
      payload.messages[payload.messages.length - 1] = {
        ...payload.messages[payload.messages.length - 1],
        content: sampleValue,
      };
    } else if (typeof payload.prompt === "string") {
      payload.prompt = sampleValue;
    } else if (payload.body) {
      payload.body = sampleValue;
    }
  };

  const buildDefaultRequest = (endpoint: typeof endpoints[number], sampleValue?: string) => {
    if (endpoint.method.toUpperCase() === "GET") {
      if (sampleValue) return sampleValue;
      return providerSamples[0] ?? "";
    }
    const base = sandboxDefaultPayloads[provider.slug];
    if (!base) return "{}";
    const clone = JSON.parse(JSON.stringify(base));
    applySampleToPayload(clone, sampleValue ?? providerSamples[0] ?? "");
    return JSON.stringify(clone, null, 2);
  };

  const docEndpoint = endpoints[0];
  const docUrl = docEndpoint?.path ?? provider.endpoint;
  const docMethod = (docEndpoint?.method ?? provider.method).toUpperCase();
  const docIsGet = docMethod === "GET";
  const docBodyExample =
    !docIsGet && docEndpoint ? buildDefaultRequest(docEndpoint, providerSamples[0]) : undefined;
  const docQueryExample = docIsGet ? providerSamples[0] ?? "" : undefined;
  const docUrlWithQuery =
    docIsGet && docQueryExample
      ? `${docUrl}${docQueryExample.startsWith("?") ? docQueryExample : `?${docQueryExample}`}`
      : docUrl;
  const initialCurlCommand = docIsGet
    ? `curl -i "${docUrlWithQuery}" \\
  -H 'x402-sender-wallet: <YOUR_SOLANA_ADDRESS>'`
    : `curl -i "${docUrl}" \\
  -H 'Content-Type: application/json' \\
  -H 'x402-sender-wallet: <YOUR_SOLANA_ADDRESS>' \\
  -H 'x402-session: optional-session-id' \\
  -d '<JSON_PAYLOAD>'`;
  const retryCurlCommand = docIsGet
    ? `curl -i "${docUrlWithQuery}" \\
  -H 'x402-sender-wallet: <YOUR_SOLANA_ADDRESS>' \\
  -H 'X-PAYMENT: <BASE64_ENCODED_ENVELOPE>'`
    : `curl -i "${docUrl}" \\
  -H 'Content-Type: application/json' \\
  -H 'x402-sender-wallet: <YOUR_SOLANA_ADDRESS>' \\
  -H 'x402-session: optional-session-id' \\
  -H 'X-PAYMENT: <BASE64_ENCODED_ENVELOPE>' \\
  -d '<JSON_PAYLOAD>'`;
  const challengeExample = `{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "network": "solana",
      "scheme": "exact",
      "payTo": "<GATEWAY_WALLET>",
      "amountUsd": "0.05",
      "memo": "session:YOUR-MEMO"
    }
  ]
}`;
  const paymentEnvelopeExample = `{
  "x402Version": 1,
  "paymentPayload": "<signed transaction or receipt payload>",
  "paymentRequirements": "<paste the accepts[0] object from the 402 response>"
}`;
  const base64Snippet =
    'const paymentHeader = Buffer.from(JSON.stringify(envelope)).toString("base64");';
  const nodeRetryLines = [
    'import { createSigner } from "x402/types";',
    'import { createPaymentHeader } from "x402/client";',
    '',
    ...(docIsGet ? [] : ['const payload = /* same body as the initial call */ YOUR_PAYLOAD;', '']),
    'const requirements = accepts[0]; // copy from the 402 response body',
    'const signer = await createSigner("solana", process.env.SVM_PRIVATE_KEY!);',
    'const header = await createPaymentHeader(signer, 1, requirements);',
    `const response = await fetch("${docUrlWithQuery}", {`,
    `  method: "${docMethod}",`,
    "  headers: {",
    ...(docIsGet ? [] : ['    "content-type": "application/json",']),
    '    "x402-sender-wallet": signer.address,',
    '    "X-PAYMENT": header,',
    "  },",
    ...(docIsGet ? [] : ['  body: JSON.stringify(payload),']),
    "});",
  ];
  const nodeRetrySnippet = nodeRetryLines.join("\n");

  useEffect(() => {
    if (!activeEndpoint) return;
    const defaultRequest = buildDefaultRequest(activeEndpoint);
    setSandboxRequest(defaultRequest);
    setSandboxSampleIndex(0);
    setSandboxStatus("idle");
    setSandboxResponse("Ready to test the endpoint.");
  }, [provider.slug, sandboxEndpointIndex, activeEndpoint?.method]);

  const handleSandboxSampleChange = (index: number) => {
    setSandboxSampleIndex(index);
    if (!activeEndpoint) return;
    const newRequest = buildDefaultRequest(activeEndpoint, providerSamples[index]);
    setSandboxRequest(newRequest);
    setSandboxStatus("idle");
    setSandboxResponse("Ready to test the endpoint.");
  };

  const executeSandboxRequest = async (
    withPayment = false,
    endpointOverride?: typeof endpoints[number],
    requestOverride?: string
  ) => {
    const endpoint = endpointOverride ?? activeEndpoint;
    if (!endpoint) return;

    const requestPayload = requestOverride ?? sandboxRequest;

    setSandboxStatus("loading");
    setSandboxResponse("Calling x402 gateway…");

    try {
      const headers: Record<string, string> = {
        "x402-sender-wallet": "DemoSenderWallet11111111111111111111111",
      };

      let url = endpoint.path;
      let body: string | undefined = requestPayload ?? "{}";

      if (endpoint.method.toUpperCase() === "GET") {
        const query = requestPayload.trim();
        if (query.length > 0) {
          url = `${endpoint.path}${query.startsWith("?") ? query : `?${query}`}`;
        }
        body = undefined;
      } else {
        headers["Content-Type"] = "application/json";
      }

      if (withPayment || sandboxStatus === "payment_required") {
        headers["x-payment"] = "eyJ4NDAyVmVyc2lvbiI6MSwicGF5bWVudCI6Im1vY2stcGF5bWVudCJ9";
      }

      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        body,
      });

      const rawText = await response.text();
      let formatted = rawText;
      try {
        formatted = JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        // keep plain text
      }

      setSandboxResponse(formatted);

      if (response.status === 402) {
        setSandboxStatus("payment_required");
      } else if (response.ok) {
        setSandboxStatus("success");
      } else {
        setSandboxStatus("error");
      }
    } catch (error) {
      setSandboxStatus("error");
      setSandboxResponse((error instanceof Error ? error.message : String(error)) ?? "Request failed");
    }
  };

  const handleEndpointTry = (index: number) => {
    const endpoint = endpoints[index];
    const defaultRequest = buildDefaultRequest(endpoint);
    setSandboxEndpointIndex(index);
    setSandboxSampleIndex(0);
    setSandboxRequest(defaultRequest);
    executeSandboxRequest(false, endpoint, defaultRequest);
  };

  const statusBadge = (state: SandboxStatus) => {
    switch (state) {
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-border lg:bg-secondary/30">
          <Link
            to="/"
            className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border/70 hover:opacity-80 transition-opacity"
          >
            <img src="/HUBX402DESIGN.png" alt="Hub X 402" className="h-12 w-auto" />
            <span className="text-sm font-semibold tracking-tight">Hub X 402</span>
          </Link>
          <div className="px-6 py-6 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Applications</div>
          <nav className="flex-1 overflow-y-auto px-2 pb-8">
            <ul className="space-y-1">
              {apiProviders.map((item) => {
                const active = item.slug === provider.slug;
                return (
                  <li key={item.slug}>
                    <Link
                      to={`/documentation/${item.slug}`}
                      className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm transition-colors ${
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-foreground/80 hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">&rsaquo;</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="px-6 pb-8">
            <Link
              to="/agent"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0ea5ff] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_16px_rgba(14,165,255,0.35)] transition-colors hover:bg-[#08b0ff]"
            >
              Create AI Automation
            </Link>
          </div>
        </aside>

        <main className="flex-1">
          <div className="lg:hidden border-b border-border/70 px-6 py-4 flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src="/HUBX402DESIGN.png" alt="Hub X 402" className="h-10 w-auto" />
              <span className="text-sm font-semibold tracking-tight">Hub X 402</span>
            </Link>
          </div>

          <div className="mx-auto w-full max-w-5xl px-6 py-10 md:px-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary/60">
                    <img
                      src={provider.logo || "/placeholder.svg"}
                      alt={provider.name}
                      className="h-10 w-10 object-contain"
                      onError={(event) => {
                        (event.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">{provider.name}</h1>
                    <p className="text-sm text-muted-foreground">{provider.tagline}</p>
                  </div>
                </div>
                <p className="mt-6 max-w-3xl text-sm text-foreground/80 md:text-base">{provider.summary}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" asChild>
                  <Link to="/marketplace">All APIs</Link>
                </Button>
                <Button
                  className="rounded-xl bg-[#0ea5ff] px-5 py-5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(14,165,255,0.5)] hover:bg-[#08b0ff]"
                  onClick={() => window.open(provider.testUrl, "_blank", "noopener")}
                >
                  Test it
                </Button>
              </div>
            </div>

            <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow space-y-6">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Endpoint</div>
                <div className="mt-3 inline-flex items-center gap-3 rounded-full bg-background/80 px-4 py-2 text-xs font-semibold text-foreground shadow-inner ring-1 ring-border">
                  <span className="rounded-full bg-primary/15 px-2 py-1 text-primary">{provider.method}</span>
                  <span className="font-mono text-[13px]">{provider.endpoint}</span>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                      Payment flow
                    </div>
                    <p className="mt-2 text-sm text-foreground/80">
                      Every request hits the gateway twice: first to collect a 402 challenge, then to retry with an{" "}
                      <code className="mx-1 font-mono text-[11px]">X-PAYMENT</code> header that proves settlement on Solana.
                    </p>
                  </div>

                  <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                    <li>Call the endpoint without an <code className="font-mono text-[11px]">X-PAYMENT</code> header to fetch pricing requirements.</li>
                    <li>Read the <code className="font-mono text-[11px]">accepts[0]</code> object from the 402 response and sign a payment using your wallet or facilitator.</li>
                    <li>Retry the identical request with <code className="font-mono text-[11px]">X-PAYMENT</code> and the same sender wallet.</li>
                  </ol>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                      Step 1 — Initial request
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap">{initialCurlCommand}</pre>
                    {!docIsGet && docBodyExample && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-muted-foreground">Sample JSON payload</p>
                        <pre className="overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-xs font-mono text-foreground/80 whitespace-pre">{docBodyExample}</pre>
                      </div>
                    )}
                    {docIsGet && docQueryExample && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Example query string: <code className="font-mono text-[11px]">{docQueryExample}</code>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                      Step 2 — Gateway challenge
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Your first call returns a 402 response containing <code className="font-mono text-[11px]">PaymentRequirements</code>. Save the payload exactly.
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-xs font-mono text-foreground/80 whitespace-pre">{challengeExample}</pre>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                      Step 3 — Build the payment envelope
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Combine the signed payment data with the original requirements, then base64-encode the JSON to create the <code className="font-mono text-[11px]">X-PAYMENT</code> header value.
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-xs font-mono text-foreground/80 whitespace-pre">{paymentEnvelopeExample}</pre>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap">{base64Snippet}</pre>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                      Step 4 — Retry with X-PAYMENT
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap">{retryCurlCommand}</pre>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Example Node implementation using the official x402 SDK:
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-xs font-mono text-foreground/80 whitespace-pre">{nodeRetrySnippet}</pre>
                  </div>

                  <div className="rounded-xl bg-secondary/40 px-3 py-3 text-xs text-muted-foreground">
                    Keep the payload, memo, and headers identical between attempts. The gateway rejects payments when the signer wallet does not match the{" "}
                    <code className="mx-1 font-mono text-[11px]">x402-sender-wallet</code>{" "}
                    header or when the requirements are mutated.
                  </div>
                </div>

                {provider.endpoints && provider.endpoints.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-foreground">Available proxy endpoints</div>
                    <div className="space-y-3">
                      {endpoints.map((ep, index) => (
                        <div key={ep.path} className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-3">
                          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
                            <span className="rounded-full bg-primary/15 px-2 py-1 text-primary">{ep.method}</span>
                            <span className="font-mono text-[12px] text-foreground">{ep.path}</span>
                            <Button
                              size="sm"
                              className="ml-auto rounded-full bg-[#0ea5ff] text-white hover:bg-[#08b0ff]"
                              onClick={() => handleEndpointTry(index)}
                            >
                              Try it
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">{ep.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="text-sm font-semibold text-foreground">{provider.codeSampleTitle}</div>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-black/90">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-white/60">
                      <span>{provider.language}</span>
                      <button
                        type="button"
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-wide text-white/70 hover:bg-white/10"
                        onClick={() => {
                          navigator.clipboard.writeText(provider.codeSample).catch(() => {});
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="overflow-auto px-4 py-5 text-[13px] leading-relaxed text-white">
                      <code>{provider.codeSample}</code>
                    </pre>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-border bg-secondary/30 p-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Sandbox</div>
                  <p className="mt-2 text-sm text-foreground/80">
                    Send a live request to the x402 gateway. The first call returns a <code className="font-mono text-[11px]">402 Payment Required</code>
                    response with pricing details. Retry with an <code className="font-mono text-[11px]">X-PAYMENT</code> header to see the live path.
                  </p>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Endpoint</div>
                  <div className="mt-2 rounded-xl border border-border bg-background px-3 py-3 text-xs font-mono text-foreground/80 break-all">
                    <span className="font-semibold text-primary mr-2">{activeEndpoint.method}</span>
                    {activeEndpoint.path}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Test string</label>
                  <select
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={sandboxSampleIndex}
                    onChange={(event) => handleSandboxSampleChange(Number(event.target.value))}
                  >
                    {providerSamples.map((sample, index) => (
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
                    className="mt-2 h-32 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={sandboxRequest}
                    onChange={(event) => {
                      setSandboxRequest(event.target.value);
                      setSandboxStatus("idle");
                    }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Include <code className="font-mono text-[11px]">x402-session</code>, <code className="font-mono text-[11px]">x402-sender-wallet</code>, and retry with
                    <code className="font-mono text-[11px]"> X-PAYMENT</code> when the gateway returns 402.
                  </p>
                </div>

                <Button
                  onClick={() => executeSandboxRequest(sandboxStatus === "payment_required")}
                  disabled={sandboxStatus === "loading"}
                  className="w-full rounded-xl bg-[#0ea5ff] py-4 text-sm font-semibold text-white shadow-[0_0_14px_rgba(14,165,255,0.6)] hover:bg-[#08b0ff]"
                >
                  {sandboxStatus === "payment_required" ? "Retry with mock X-PAYMENT" : "Call gateway"}
                </Button>

                <div className="rounded-2xl border border-border bg-background/70">
                  <div className="flex items-center justify-between border-b border-border/70 px-4 py-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Response</div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground/80">
                      {statusBadge(sandboxStatus)}
                    </span>
                  </div>
                  <pre className="max-h-60 overflow-auto px-4 py-5 text-[13px] leading-relaxed text-foreground/90">{sandboxResponse}</pre>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-xs text-muted-foreground">
                  Need help? Join the community in Discord or book time with the integrations team.
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <SiteFooter className="mt-12" />
    </div>
  );
}
