import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const fallbackGatewayUrl = import.meta.env.DEV
  ? "http://localhost:3000"
  : "https://x402market.app";
const gatewayUrl =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined)?.trim() || fallbackGatewayUrl;
const adminEndpoint = `${gatewayUrl}/admin/test-openai`;

type RequestState = "idle" | "loading" | "success" | "error";

const AdminWorkbench = () => {
  const [adminToken, setAdminToken] = useState<string>("");
  const [status, setStatus] = useState<RequestState>("idle");
  const [resultText, setResultText] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");

  const runGatewayTest = async () => {
    setStatus("loading");
    setErrorText("");
    setResultText("Pinging gateway...");

    try {
      const response = await fetch(adminEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken.trim().length > 0
            ? { Authorization: `Bearer ${adminToken.trim()}` }
            : {}),
        },
        body: JSON.stringify({}),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json") || contentType.includes("+json");
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        setStatus("error");
        setErrorText(
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 2),
        );
        setResultText("");
        return;
      }

      setStatus("success");
      setResultText(JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error("Admin gateway test failed", error);
      setStatus("error");
      setErrorText(error instanceof Error ? error.message : String(error));
      setResultText("");
    }
  };

  const statusLabel = () => {
    switch (status) {
      case "loading":
        return "Running";
      case "success":
        return "Success";
      case "error":
        return "Error";
      default:
        return "Idle";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            Admin Utilities
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Gateway Sanity Check</h1>
          <p className="text-sm text-muted-foreground">
            Trigger a full Solana payment flow against the OpenAI models endpoint using the
            facilitator and test payer configured on Railway. Provide the admin bearer token from
            `ADMIN_API_KEY` to authorise this call.
          </p>
        </header>

        <section className="space-y-5 rounded-3xl border border-border bg-secondary/30 p-6 shadow-glow">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
              Admin bearer token
            </label>
            <Input
              type="password"
              value={adminToken}
              onChange={event => setAdminToken(event.target.value)}
              placeholder="Paste your ADMIN_API_KEY token"
            />
            <p className="text-xs text-muted-foreground">
              The token is never stored; it is attached to a single POST request to
              <span className="ml-1 font-mono text-[11px] text-foreground/80">/admin/test-openai</span>.
            </p>
          </div>

          <Button
            onClick={runGatewayTest}
            disabled={status === "loading"}
            className="w-full rounded-xl bg-[#0ea5ff] py-4 text-sm font-semibold text-white shadow-[0_0_14px_rgba(14,165,255,0.6)] hover:bg-[#08b0ff]"
          >
            {status === "loading" ? "Running test…" : "Run OpenAI gateway test"}
          </Button>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
              <span>Response</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[11px]",
                  status === "success" && "bg-emerald-500/20 text-emerald-500",
                  status === "error" && "bg-rose-500/15 text-rose-500",
                  status === "loading" && "bg-amber-500/20 text-amber-500",
                  status === "idle" && "bg-secondary text-foreground/70",
                )}
              >
                {statusLabel()}
              </span>
            </div>
            <Textarea
              className="h-64 font-mono text-xs"
              value={status === "error" ? errorText : resultText}
              readOnly
              placeholder="Results will appear here"
            />
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-border bg-secondary/20 p-6 text-sm text-muted-foreground">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            How end users pay
          </h2>
          <p>
            Regular callers never hit this admin endpoint. They call an API route (for example
            <span className="ml-1 font-mono text-[11px]">/openai/chat/completions</span>) with their wallet in the
            <span className="ml-1 font-mono text-[11px]">x402-sender-wallet</span> header. When the gateway responds
            with HTTP 402 it includes <span className="font-mono text-[11px]">PaymentRequirements</span>. Clients use
            the x402 helpers to sign those requirements with their payer private key and send the resulting
            <span className="ml-1 font-mono text-[11px]">X-PAYMENT</span> header on the retry.
          </p>
          <p>
            The facilitator verifies the signature and settles the transfer in the same request, so each call is either
            paid exactly once or rejected. Credits are recorded in Supabase via the gateway ledger module.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AdminWorkbench;
