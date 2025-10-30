import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

const marqueeLogosTop = [
  "OpenAI",
  "Claude",
  "Google",
  "Stripe",
  "YouTube",
  "Twilio",
  "CoinGecko",
  "Helius",
  "PayPal",
  "Pinecone",
  "Supabase",
  "Solana",
  "x402",
];

const marqueeLogosBottom = [
  "Anthropic",
  "Cohere",
  "AWS",
  "Azure",
  "GCP",
  "Mapbox",
  "Plaid",
  "SendGrid",
  "Segment",
  "Datadog",
];

const heroLogoSet: { src: string; alt: string }[] = [
  { src: "/logos/openai.png", alt: "OpenAI" },
  { src: "/logos/stripe.png", alt: "Stripe" },
  { src: "/logos/google.webp", alt: "Google" },
  { src: "/logos/twilio.png", alt: "Twilio" },
  { src: "/logos/youtube.png", alt: "YouTube" },
  { src: "/logos/coingecko.png", alt: "CoinGecko" },
  { src: "/logos/helius.png", alt: "Helius" },
  { src: "/logos/paypal.png", alt: "PayPal" },
  { src: "/logos/google-maps.png", alt: "Google Maps" },
  { src: "/logos/claude.png", alt: "Claude" },
];

const brandLogos: Record<string, string> = {
  OpenAI: "/logos/openai.png",
  Claude: "/logos/claude.png",
  Google: "/logos/google.webp",
  Stripe: "/logos/stripe.png",
  YouTube: "/logos/youtube.png",
  Twilio: "/logos/twilio.png",
  CoinGecko: "/logos/coingecko.png",
  Helius: "/logos/helius.png",
  PayPal: "/logos/paypal.png",
  "Google Maps": "/logos/google-maps.png",
  "YouTube Data": "/logos/youtube.png",
};

const tileLogos: Record<string, string> = {
  OpenAI: brandLogos.OpenAI,
  Claude: brandLogos.Claude,
  Stripe: brandLogos.Stripe,
  "Google Maps": brandLogos["Google Maps"],
  "YouTube Data": brandLogos["YouTube Data"],
  Twilio: brandLogos.Twilio,
};

const featureTiles = [
  {
    title: "Access Layer – Instant API Access",
    image: "/logos/agent-automation.png",
    alt: "Access automation",
    points: [
      "One unified endpoint for every major API (OpenAI, Claude, Google, Stripe, etc.)",
      "No API keys or signup forms required",
      "Pay per call using x402 protocol",
      "Designed for developers, agents, and automations",
    ],
  },
  {
    title: "Infrastructure Layer – Developer-First Platform",
    image: "/logos/infra-stack.png",
    alt: "Infrastructure illustration",
    points: [
      "Session-based billing (no per-call delays)",
      "Automatic on-chain verification",
      "Multi-chain support coming soon",
    ],
  },
  {
    title: "Marketplace Layer – List & Monetize Your API",
    image: "/logos/payment-card.png",
    alt: "Marketplace illustration",
    points: [
      "List your API in minutes",
      "Set per-call pricing and supported tokens",
      "Receive instant payments per request",
      "Analytics dashboard for usage and earnings",
    ],
  },
  {
    title: "Payment Layer – Powered by x402 Protocol",
    image: "/logos/hero-console.png",
    alt: "Platform payment console",
    points: [
      "Handles all transactions via x402 Payment Required standard",
      "Accepts SOL, USDC, $402MARKET, and other Solana tokens",
      "Instant confirmations, no chargebacks",
      "Replaces outdated payment processors",
    ],
  },
];

export default function Landing() {
  const heroLogos = [...heroLogoSet, ...heroLogoSet].slice(0, 18);
  const featureSectionRef = useRef<HTMLDivElement | null>(null);
  const [featureProgress, setFeatureProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || typeof window === "undefined") {
      setFeatureProgress(1);
      return;
    }
    const section = featureSectionRef.current;
    if (!section) return;

    const thresholds = Array.from({ length: 41 }, (_, i) => i / 40);
    let animationFrame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const ratio = Math.max(0, Math.min(1, entry.intersectionRatio));
        cancelAnimationFrame(animationFrame);
        animationFrame = window.requestAnimationFrame(() => {
          setFeatureProgress(ratio);
        });
      },
      {
        threshold: thresholds,
      }
    );

    observer.observe(section);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [prefersReducedMotion]);

  const clampedProgress = prefersReducedMotion ? 1 : Math.min(Math.max(featureProgress, 0), 1);
  const normalizedProgress = prefersReducedMotion
    ? 1
    : Math.min(Math.max((clampedProgress - 0.1) / 0.8, 0), 1);
  const easedProgress = prefersReducedMotion ? 1 : 1 - Math.pow(1 - normalizedProgress, 3);

  const renderMarqueeBadge = (name: string, key: string) => {
    const logoSrc = brandLogos[name];
    return (
      <Card
        key={key}
        className="text-card-foreground shadow-sm mr-4 rounded-2xl px-5 py-3 bg-card/80 border border-border/80"
      >
        <div className="flex items-center gap-2 text-sm md:text-base font-medium text-foreground/90">
          {logoSrc && (
            <img
              src={logoSrc}
              alt={name}
              className="h-6 w-6 object-contain"
            />
          )}
          <span>{name}</span>
        </div>
      </Card>
    );
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="hero-section relative overflow-hidden">
        {/* Background decorative tiles with logos (moved outside hero, behind) */}
        <div className="absolute inset-0 z-0" aria-hidden>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] max-w-[96vw]">
            <div className="mt-[30px] grid grid-cols-6 gap-3 sm:gap-3">
              {heroLogos.slice(0, 18).map((logo, i) => (
                <div
                  key={i}
                  className="group h-28 md:h-32 rounded-2xl border border-white/20 bg-white/10 transition-all duration-200 hover:bg-cyan-500/10 hover:border-cyan-400/60 hover:shadow-[0_0_18px_rgba(14,165,255,0.6)] hover:ring-2 hover:ring-cyan-400/70"
                >
                  <div className="h-full w-full flex items-center justify-center p-4">
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      className="max-h-12 md:max-h-14 max-w-[85%] object-contain opacity-60 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-50 max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-20 md:pb-28">
          <div className="relative -translate-y-[20px] text-center max-w-3xl mx-auto">
            <h1 className="hero-headline hero-text-shadow hero-slide font-extrabold tracking-tight">
              instant access to every top third party api with a single call
            </h1>
            <h2 className="hero-text-shadow hero-slide hero-slide-delay-1 mt-4 text-2xl md:text-3xl font-bold text-white">
              <span className="hero-highlight">no API key required. Powered by x402</span>
            </h2>

            <div className="hero-text-shadow hero-slide hero-slide-delay-2 mt-8 text-sm md:text-base text-foreground/90">
              Make your first call for free now. Built for developers, agents, and automations.
            </div>

            <div className="hero-slide hero-slide-delay-3 mt-3 flex justify-center">
              <Button asChild className="rounded-xl bg-[#0ea5ff] hover:bg-[#08b0ff] text-white shadow-[0_0_16px_rgba(14,165,255,0.8)] text-base md:text-lg px-6 py-5">
                <Link to="/home">Explore API marketplace</Link>
              </Button>
            </div>
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
              {[...marqueeLogosTop, ...marqueeLogosTop].map((name, i) =>
                renderMarqueeBadge(name, `top-${i}`)
              )}
            </div>
          </div>

          {/* Bottom row right moving */}
          <div className="overflow-hidden mt-4">
            <div className="marquee-right">
              {[...marqueeLogosBottom, ...marqueeLogosBottom].map((name, i) =>
                renderMarqueeBadge(name, `bot-${i}`)
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Explainer Tiles */}
      <section className="py-10 md:py-16">
        <div ref={featureSectionRef} className="max-w-6xl mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-2">
            {featureTiles.map((tile, index) => {
              const direction = index % 2 === 0 ? -1 : 1;
              const offset = (1 - easedProgress) * (direction * 180);
              const tileStyle: CSSProperties = prefersReducedMotion
                ? {}
                : {
                    transform: `translateX(${offset}px)`,
                    transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                    willChange: "transform",
                  };

              return (
                <div
                  key={tile.title}
                  className="rounded-3xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur flex flex-col items-center text-center"
                  style={tileStyle}
                >
                  <img
                    src={tile.image}
                  alt={tile.alt}
                  className="w-[220px] max-w-full object-contain drop-shadow-[0_0_24px_rgba(14,165,255,0.2)] mb-4"
                />
                <h3 className="text-xl md:text-2xl font-bold">{tile.title}</h3>
                <ul className="mt-4 text-sm md:text-base text-muted-foreground space-y-1 list-disc pl-6 text-left w-full">
                  {tile.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              );
            })}
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
            {["OpenAI", "Claude", "Stripe", "Google Maps", "YouTube Data", "Twilio"].map((name) => {
              const logoSrc = tileLogos[name];
              return (
                <div key={name} className="ios-card p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {logoSrc && (
                      <img
                        src={logoSrc}
                        alt={name}
                        className="h-8 w-8 object-contain"
                      />
                    )}
                    <div className="text-lg font-semibold">{name}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Instant access. No API key required. Powered by x402.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
