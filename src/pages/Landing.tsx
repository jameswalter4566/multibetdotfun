import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Store, PlugZap, ShieldCheck, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const marqueeLogosTop = [
  "OpenAI", "Claude", "Google", "Stripe", "YouTube", "Twilio", "Pinecone", "Supabase", "Solana", "x402",
];

const marqueeLogosBottom = [
  "Anthropic", "Cohere", "AWS", "Azure", "GCP", "Mapbox", "Plaid", "SendGrid", "Segment", "Datadog",
];

export default function Landing() {
  const heroLogos: { src: string; alt: string }[] = [
    { src: "/logos/openai.jpg", alt: "OpenAI" },
    { src: "/logos/stripe.png", alt: "Stripe" },
    { src: "/logos/google.webp", alt: "Google" },
    { src: "/logos/twilio.png", alt: "Twilio" },
    { src: "/logos/youtube.png", alt: "YouTube" },
    { src: "/logos/coingecko.jpg", alt: "CoinGecko" },
    { src: "/logos/microsoft.png", alt: "Microsoft" },
    { src: "/logos/paypal.png", alt: "PayPal" },
    { src: "/logos/google-icon.png", alt: "Google" },
    { src: "/logos/claude.jpg", alt: "Claude" },
    // repeat to make 18
    { src: "/logos/openai.jpg", alt: "OpenAI" },
    { src: "/logos/stripe.png", alt: "Stripe" },
    { src: "/logos/google.webp", alt: "Google" },
    { src: "/logos/twilio.png", alt: "Twilio" },
    { src: "/logos/youtube.png", alt: "YouTube" },
    { src: "/logos/coingecko.jpg", alt: "CoinGecko" },
    { src: "/logos/microsoft.png", alt: "Microsoft" },
    { src: "/logos/paypal.png", alt: "PayPal" },
  ];
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorative tiles with logos (moved outside hero, behind) */}
        <div className="absolute inset-0 -z-10" aria-hidden>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] max-w-[96vw]">
            <div className="grid grid-cols-6 gap-3 sm:gap-3">
              {heroLogos.slice(0, 18).map((logo, i) => (
                <div
                  key={i}
                  className="group h-24 md:h-28 rounded-2xl border border-white/15 bg-white/5 transition-all duration-150 hover:bg-cyan-500/10 hover:border-cyan-400/60 hover:shadow-[0_0_18px_rgba(14,165,255,0.6)] hover:ring-2 hover:ring-cyan-400/70"
                >
                  <div className="h-full w-full flex items-center justify-center p-3">
                    <img src={logo.src} alt={logo.alt} className="max-h-10 md:max-h-12 max-w-[85%] object-contain opacity-85 transition-opacity duration-150 group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-50 max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-20 md:pb-28">
          <h1 className="hero-headline font-extrabold tracking-tight">
            instant access to every top third party api with a single call
          </h1>
          <h2 className="mt-4 text-center text-2xl md:text-3xl font-bold text-muted-foreground">
            no API key required. Powered by x402
          </h2>

          <div className="mt-8 text-center text-sm md:text-base text-foreground/90">
            Make your first call for free now
          </div>

          <div className="mt-3 flex justify-center">
            <Button asChild className="rounded-xl bg-[#0ea5ff] hover:bg-[#08b0ff] text-white shadow-[0_0_16px_rgba(14,165,255,0.8)] text-base md:text-lg px-6 py-5">
              <Link to="/marketplace">Explore API marketplace</Link>
            </Button>
          </div>

        </div>

        {/* Soft glow background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-cyan-500/10 blur-3xl -z-20" />
      </section>

      {/* Scrolling Rows */}
      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-6">
          {/* Top row left moving */}
          <div className="overflow-hidden">
            <div className="marquee-left">
              {[...marqueeLogosTop, ...marqueeLogosTop].map((name, i) => (
                <Card key={`top-${i}`} className="mr-4 rounded-2xl px-5 py-3 bg-card/80 border border-border/80">
                  <div className="text-sm md:text-base font-medium text-foreground/90">{name}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Bottom row right moving */}
          <div className="overflow-hidden mt-4">
            <div className="marquee-right">
              {[...marqueeLogosBottom, ...marqueeLogosBottom].map((name, i) => (
                <Card key={`bot-${i}`} className="mr-4 rounded-2xl px-5 py-3 bg-card/80 border border-border/80">
                  <div className="text-sm md:text-base font-medium text-foreground/90">{name}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Explainer Tiles */}
      <section className="py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-6 grid gap-6">
          {/* Tile 1: Access Layer */}
          <div className="ios-card p-6 md:p-8 grid md:grid-cols-[120px_1fr] gap-4 items-center">
            <div className="flex md:justify-center">
              <div className="w-20 h-20 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_24px_rgba(14,165,255,0.3)]">
                <PlugZap className="w-9 h-9 text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold">Access Layer – Instant API Access</div>
              <ul className="mt-2 text-sm md:text-base text-muted-foreground space-y-1 list-disc pl-5">
                <li>One unified endpoint for every major API (OpenAI, Claude, Google, Stripe, etc.)</li>
                <li>No API keys or signup forms required</li>
                <li>Pay per call using x402 protocol</li>
                <li>Designed for developers, agents, and automations</li>
              </ul>
            </div>
          </div>

          {/* Tile 2: Payment Layer */}
          <div className="ios-card p-6 md:p-8 grid md:grid-cols-[1fr_120px] gap-4 items-center">
            <div>
              <div className="text-xl md:text-2xl font-bold">Payment Layer – Powered by x402 Protocol</div>
              <ul className="mt-2 text-sm md:text-base text-muted-foreground space-y-1 list-disc pl-5">
                <li>Handles all transactions via x402 Payment Required standard</li>
                <li>Accepts SOL, USDC, $402MARKET, and other Solana tokens</li>
                <li>Instant confirmations, no chargebacks</li>
                <li>Replaces outdated payment processors</li>
              </ul>
            </div>
            <div className="flex md:justify-center order-first md:order-last">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                <ShieldCheck className="w-9 h-9 text-emerald-300" />
              </div>
            </div>
          </div>

          {/* Tile 3: Marketplace Layer */}
          <div className="ios-card p-6 md:p-8 grid md:grid-cols-[120px_1fr] gap-4 items-center">
            <div className="flex md:justify-center">
              <div className="w-20 h-20 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.25)]">
                <Store className="w-9 h-9 text-indigo-300" />
              </div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold">Marketplace Layer – List & Monetize Your API</div>
              <ul className="mt-2 text-sm md:text-base text-muted-foreground space-y-1 list-disc pl-5">
                <li>List your API in minutes</li>
                <li>Set per-call pricing and supported tokens</li>
                <li>Receive instant payments per request</li>
                <li>Analytics dashboard for usage and earnings</li>
              </ul>
            </div>
          </div>

          {/* Tile 4: Infrastructure Layer */}
          <div className="ios-card p-6 md:p-8 grid md:grid-cols-[1fr_120px] gap-4 items-center">
            <div>
              <div className="text-xl md:text-2xl font-bold">Infrastructure Layer – Developer-First Platform</div>
              <ul className="mt-2 text-sm md:text-base text-muted-foreground space-y-1 list-disc pl-5">
                <li>Session-based billing (no per-call delays)</li>
                <li>Automatic on-chain verification</li>
                <li>Multi-chain support coming soon</li>
              </ul>
            </div>
            <div className="flex md:justify-center order-first md:order-last">
              <div className="w-20 h-20 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-400/30 flex items-center justify-center shadow-[0_0_24px_rgba(217,70,239,0.25)]">
                <Building2 className="w-9 h-9 text-fuchsia-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Marketplace (bottom section) */}
      <section className="py-12 md:py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-center">API Marketplace</h2>
          <p className="mt-3 text-center text-muted-foreground text-base md:text-lg">
            Browse and call top third‑party APIs via a single unified endpoint.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {["OpenAI", "Claude", "Stripe", "Google Maps", "YouTube Data", "Twilio"].map((name) => (
              <div key={name} className="ios-card p-5">
                <div className="text-lg font-semibold">{name}</div>
                <div className="text-sm text-muted-foreground mt-1">Instant access. No API key required. Powered by x402.</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
