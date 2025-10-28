export type ApiProvider = {
  name: string;
  slug: string;
  logo?: string;
  tagline: string;
  summary: string;
  endpoint: string;
  method: string;
  testUrl: string;
  codeSampleTitle: string;
  codeSample: string;
  language: string;
};

export const apiProviders: ApiProvider[] = [
  {
    name: "OpenAI",
    slug: "openai",
    logo: "/logos/openai.jpg",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Leverage the OpenAI Chat Completions API through the x402 marketplace without provisioning keys. Send a prompt, receive structured responses, and bill usage per call.",
    endpoint: "https://api.x402.market/openai/chat",
    method: "POST",
    testUrl: "https://api.x402.market/openai/chat/test",
    codeSampleTitle: "JavaScript – streaming chat request",
    language: "typescript",
    codeSample: `import fetch from "node-fetch";

async function runChat() {
  const response = await fetch("https://api.x402.market/openai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x402-session": "wallet-session-token"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Summarize the latest platform updates." }
      ],
      stream: true
    })
  });

  for await (const chunk of response.body as any) {
    process.stdout.write(chunk);
  }
}

runChat().catch(console.error);`,
  },
  {
    name: "Claude",
    slug: "claude",
    logo: "/logos/claude.jpg",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Call Anthropic Claude via x402 to build natural language and agentic workflows without maintaining separate billing relationships.",
    endpoint: "https://api.x402.market/anthropic/messages",
    method: "POST",
    testUrl: "https://api.x402.market/anthropic/messages/test",
    codeSampleTitle: "Python – concise completion call",
    language: "python",
    codeSample: `import requests

payload = {
    "model": "claude-3-5-sonnet",
    "messages": [
        {"role": "user", "content": "Draft a product launch update for our investors."}
    ],
    "max_tokens": 200
}

res = requests.post(
    "https://api.x402.market/anthropic/messages",
    headers={
        "Content-Type": "application/json",
        "x402-session": "wallet-session-token"
    },
    json=payload,
    timeout=30
)

print(res.json()["content"][0]["text"])`,
  },
  {
    name: "Stripe",
    slug: "stripe",
    logo: "/logos/stripe.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Create on-demand charges and PaymentIntents through a wallet-backed Stripe proxy. Perfect for gating API calls with fiat billing.",
    endpoint: "https://api.x402.market/stripe/charges",
    method: "POST",
    testUrl: "https://api.x402.market/stripe/charges/test",
    codeSampleTitle: "Node – create a one-time charge",
    language: "javascript",
    codeSample: `import fetch from "node-fetch";

async function createCharge() {
  const res = await fetch("https://api.x402.market/stripe/charges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x402-session": "wallet-session-token"
    },
    body: JSON.stringify({
      amount: 3200,
      currency: "usd",
      description: "Usage-based API call",
      source: "tok_visa"
    })
  });

  const json = await res.json();
  console.log(json.id);
}

createCharge().catch(console.error);`,
  },
  {
    name: "Google Maps",
    slug: "google-maps",
    logo: "/logos/google-icon.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Drop in geocoding, reverse geocoding, and place search without managing API keys. Requests meter automatically to your x402 session.",
    endpoint: "https://api.x402.market/google/maps/geocode",
    method: "GET",
    testUrl: "https://api.x402.market/google/maps/geocode/test",
    codeSampleTitle: "Curl – forward geocoding",
    language: "bash",
    codeSample: `curl \\
  -H "x402-session: wallet-session-token" \\
  "https://api.x402.market/google/maps/geocode?address=1600+Amphitheatre+Parkway"`,
  },
  {
    name: "YouTube Data",
    slug: "youtube-data",
    logo: "/logos/youtube.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Fetch channel stats, video metadata, and search results instantly for campaign dashboards or analytics overlays.",
    endpoint: "https://api.x402.market/google/youtube/search",
    method: "GET",
    testUrl: "https://api.x402.market/google/youtube/search/test",
    codeSampleTitle: "JavaScript – search by keyword",
    language: "typescript",
    codeSample: `const res = await fetch("https://api.x402.market/google/youtube/search?q=solana+news", {
  headers: { "x402-session": "wallet-session-token" }
});

const data = await res.json();
console.log(data.items.map((item: any) => item.snippet.title));`,
  },
  {
    name: "Twilio",
    slug: "twilio",
    logo: "/logos/twilio.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Send SMS updates or voice call triggers via the x402 Twilio proxy. Perfect for notifying supporters when a campaign milestone hits.",
    endpoint: "https://api.x402.market/twilio/messages",
    method: "POST",
    testUrl: "https://api.x402.market/twilio/messages/test",
    codeSampleTitle: "Python – send an SMS alert",
    language: "python",
    codeSample: `import requests

payload = {
    "to": "+15551234567",
    "from": "+18885550123",
    "body": "Milestone unlocked! Join the live stream now."
}

res = requests.post(
    "https://api.x402.market/twilio/messages",
    headers={
        "Content-Type": "application/json",
        "x402-session": "wallet-session-token"
    },
    json=payload,
)

print(res.json())`,
  },
];

export const getProviderBySlug = (slug: string | undefined) =>
  apiProviders.find((provider) => provider.slug === slug);
