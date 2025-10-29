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
  endpoints?: Array<{
    name: string;
    method: string;
    path: string;
    description: string;
  }>;
};

export const apiProviders: ApiProvider[] = [
  {
    name: "OpenAI",
    slug: "openai",
    logo: "/logos/openai.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Use x402 Marketplace to call OpenAI's APIs without sharing or storing your own keys. Pay with x402 protocol, send your request to our gateway, and we forward it securely using our managed OpenAI account.",
    endpoint: "https://x402market.app/openai/chat/completions",
    method: "POST",
    testUrl: "https://x402market.app/openai/models",
    codeSampleTitle: "Node (fetch) – chat completions via x402 gateway",
    language: "javascript",
    codeSample: `import fetch from "node-fetch";

async function runChat() {
  const response = await fetch("https://x402market.app/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x402-session": "session-token-from-x402",
      "x402-sender-wallet": "YourSenderWalletAddress",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an assistant for x402 marketplace users." },
        { role: "user", content: "Draft a welcome message for new API partners." }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  console.log(data.choices?.[0]?.message?.content ?? data);
}

runChat().catch(console.error);`,
    endpoints: [
      {
        name: "Chat Completions",
        method: "POST",
        path: "https://x402market.app/openai/chat/completions",
        description: "Proxy for OpenAI's Chat Completions. Send messages array and chat parameters, receive assistant replies."
      },
      {
        name: "Completions",
        method: "POST",
        path: "https://x402market.app/openai/completions",
        description: "Text completion endpoint for legacy or non-chat models like `text-davinci-003`."
      },
      {
        name: "Image Generations",
        method: "POST",
        path: "https://x402market.app/openai/images/generations",
        description: "Generate images using DALL·E style prompts. Returns base64 data or URLs depending on payload options."
      },
      {
        name: "Models",
        method: "GET",
        path: "https://x402market.app/openai/models",
        description: "List the OpenAI models currently available through the gateway."
      }
    ],
  },
  {
    name: "Claude",
    slug: "claude",
    logo: "/logos/claude.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Call Anthropic Claude via x402 to build natural language and agentic workflows without juggling API keys or separate billing.",
    endpoint: "https://x402market.app/claude/messages",
    method: "POST",
    testUrl: "https://x402market.app/claude/models",
    codeSampleTitle: "Node (fetch) – Claude message call",
    language: "javascript",
    codeSample: `import fetch from "node-fetch";

async function callClaude() {
  const response = await fetch("https://x402market.app/claude/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x402-session": "session-token-from-x402",
      "x402-sender-wallet": "YourSenderWalletAddress",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet",
      messages: [
        { role: "user", content: "Brainstorm a launch plan for a pay-per-call API marketplace." }
      ],
      max_tokens: 200
    })
  });

  const data = await response.json();
  console.log(data.content?.[0]?.text ?? data);
}

callClaude().catch(console.error);`,
    endpoints: [
      {
        name: "Messages",
        method: "POST",
        path: "https://x402market.app/claude/messages",
        description: "Primary Claude endpoint for non-streaming responses."
      },
      {
        name: "Streaming Messages",
        method: "POST",
        path: "https://x402market.app/claude/messages/stream",
        description: "Stream Claude responses event-by-event using server-sent events."
      },
      {
        name: "Models",
        method: "GET",
        path: "https://x402market.app/claude/models",
        description: "List the Claude models exposed through x402."
      }
    ],
  },
  {
    name: "Stripe",
    slug: "stripe",
    logo: "/logos/stripe.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Create on-demand charges and PaymentIntents through a wallet-backed Stripe proxy. Perfect for gating API calls with fiat billing.",
    endpoint: "https://x402market.app/stripe/charges",
    method: "POST",
    testUrl: "https://x402market.app/stripe/charges",
    codeSampleTitle: "Node – create a one-time charge",
    language: "javascript",
    codeSample: `import fetch from "node-fetch";

async function createCharge() {
  const res = await fetch("https://x402market.app/stripe/charges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x402-session": "session-token-from-x402",
      "x402-sender-wallet": "YourSenderWalletAddress",
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
    endpoints: [
      {
        name: "Charges",
        method: "POST",
        path: "https://x402market.app/stripe/charges",
        description: "Create an immediate charge using a tokenized payment method."
      },
      {
        name: "PaymentIntents",
        method: "POST",
        path: "https://x402market.app/stripe/payment_intents",
        description: "Create PaymentIntents for multi-step confirmation flows."
      },
      {
        name: "Customers",
        method: "POST",
        path: "https://x402market.app/stripe/customers",
        description: "Register or look up customers that will be billed through x402."
      }
    ],
  },
  {
    name: "Google Maps",
    slug: "google-maps",
    logo: "/logos/google-maps.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Drop in geocoding, reverse geocoding, and place search without managing credentials. Each request is linked to your x402 session.",
    endpoint: "https://x402market.app/google/maps/geocode",
    method: "GET",
    testUrl: "https://x402market.app/google/maps/geocode?address=NYC",
    codeSampleTitle: "Curl – forward geocoding",
    language: "bash",
    codeSample: `curl \
  -H "x402-session: session-token-from-x402" \
  -H "x402-sender-wallet: YourSenderWalletAddress" \
  "https://x402market.app/google/maps/geocode?address=1600+Amphitheatre+Parkway"`,
    endpoints: [
      {
        name: "Forward Geocode",
        method: "GET",
        path: "https://x402market.app/google/maps/geocode",
        description: "Convert street addresses into lat/long coordinates."
      },
      {
        name: "Reverse Geocode",
        method: "GET",
        path: "https://x402market.app/google/maps/reverse",
        description: "Convert lat/long coordinates into human-readable addresses."
      },
      {
        name: "Places Search",
        method: "GET",
        path: "https://x402market.app/google/maps/places",
        description: "Search for places, venues, or businesses by keyword and radius."
      }
    ],
  },
  {
    name: "YouTube Data",
    slug: "youtube-data",
    logo: "/logos/youtube.png",
    tagline: "Instant access. No API key required. Powered by x402.",	
    summary:
      "Fetch channel stats, video metadata, and search results instantly for campaign dashboards or analytics overlays.",
    endpoint: "https://x402market.app/google/youtube/search",
    method: "GET",
    testUrl: "https://x402market.app/google/youtube/search?q=solana",
    codeSampleTitle: "JavaScript – search by keyword",
    language: "typescript",
    codeSample: `const res = await fetch("https://x402market.app/google/youtube/search?q=solana+news", {
  headers: {
    "x402-session": "session-token-from-x402",
    "x402-sender-wallet": "YourSenderWalletAddress"
  }
});

const data = await res.json();
console.log(data.items.map((item: any) => item.snippet.title));`,
    endpoints: [
      {
        name: "Search",
        method: "GET",
        path: "https://x402market.app/google/youtube/search",
        description: "Search for videos, channels, or playlists by keyword."
      },
      {
        name: "Videos",
        method: "GET",
        path: "https://x402market.app/google/youtube/videos",
        description: "Fetch metadata and statistics for specific videos."
      },
      {
        name: "Channels",
        method: "GET",
        path: "https://x402market.app/google/youtube/channels",
        description: "Retrieve information about channels, including subscriber counts and descriptions."
      }
    ],
  },
  {
    name: "Twilio",
    slug: "twilio",
    logo: "/logos/twilio.png",
    tagline: "Instant access. No API key required. Powered by x402.",
    summary:
      "Send SMS updates or voice call triggers via the x402 Twilio proxy. Perfect for notifying supporters when a campaign milestone hits.",
    endpoint: "https://x402market.app/twilio/messages",
    method: "POST",
    testUrl: "https://x402market.app/twilio/messages",
    codeSampleTitle: "Python – send an SMS alert",
    language: "python",
    codeSample: `import requests

payload = {
    "to": "+15551234567",
    "from": "+18885550123",
    "body": "Milestone unlocked! Join the live stream now."
}

res = requests.post(
    "https://x402market.app/twilio/messages",
    headers={
        "Content-Type": "application/json",
        "x402-session": "session-token-from-x402",
        "x402-sender-wallet": "YourSenderWalletAddress"
    },
    json=payload,
)

print(res.json())`,
    endpoints: [
      {
        name: "Messages",
        method: "POST",
        path: "https://x402market.app/twilio/messages",
        description: "Send SMS messages via the Twilio API proxy."
      },
      {
        name: "Calls",
        method: "POST",
        path: "https://x402market.app/twilio/calls",
        description: "Initiate outbound calls using Twilio voice capabilities."
      },
      {
        name: "Lookup",
        method: "GET",
        path: "https://x402market.app/twilio/lookup",
        description: "Verify phone numbers or fetch carrier metadata."
      }
    ],
  },
];

export const getProviderBySlug = (slug: string | undefined) =>
  apiProviders.find((provider) => provider.slug === slug);
