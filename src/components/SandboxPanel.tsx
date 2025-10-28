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

const SandboxPanel = ({ className }: { className?: string }) => {
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

  const WELCOME_PAYLOAD = useMemo(
    () =>
      JSON.stringify(
        {
          message: "👋 Welcome to the x402 Marketplace API Gateway.",
          description: "Instant pay-per-use access to top APIs using the x402 protocol — starting with OpenAI.",
          status: "online",
          version: "1.0.0",
          payment_instructions: {
            how_to_pay: "Before using any endpoint, you must pay via x402 protocol to unlock access.",
            step_1: "Send your payment to the x402 Gateway wallet address:",
            wallet_address: "9rKmtdWDHGmi3xqyvTM23Bps5wUwg2oB7Y9HAseRrxqv",
            step_2: "Include your request hash or session ID in the memo field for verification.",
            step_3: "Once payment is confirmed on-chain, retry your API call — the gateway will verify it automatically.",
            accepted_currencies: ["USDC", "SOL", "$402MARKET"],
            note: "Each call or session requires a valid on-chain payment. Unpaid requests will receive an HTTP 402 Payment Required response."
          },
          available_endpoints: {
            openai_completions: "/openai/completions",
            openai_chat_completions: "/openai/chat/completions",
            openai_images: "/openai/images/generations",
            openai_models: "/openai/models"
          },
          disclaimer:
            "x402 Marketplace acts as a payment-gated proxy layer for third-party APIs. Payments are verified on-chain and non-refundable."
        },
        null,
        2
      ),
    []
  );

  const handleTryIt = async () => {
    if (!provider) {
      setStatus("error");
      setResponseText("Provider metadata unavailable.");
      return;
    }

    setStatus("loading");
    setResponseText("Calling x402 gateway…");

    await new Promise((resolve) => setTimeout(resolve, 900));

    setStatus("success");
    setResponseText(WELCOME_PAYLOAD);
  };
