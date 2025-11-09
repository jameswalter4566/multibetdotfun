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
    logo: "/logos/openai_logo.png",
    tagline: "Instant access. No API key required. Powered by Hub X 402.",
    summary:
      "Use Hub X 402 to call OpenAI's APIs without sharing or storing your own keys. Pay with the Hub X 402 protocol, send your request to our gateway, and we forward it securely using our managed OpenAI account.",
    endpoint: "https://hubx402.app/openai/chat/completions",
    method: "POST",
    testUrl: "https://hubx402.app/openai/models",
    codeSampleTitle: "Node (fetch) – chat completions via Hub X 402 gateway",
    language: "javascript",
    codeSample: `import fetch from "node-fetch";

async function runChat() {
  const response = await fetch("https://hubx402.app/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x402-session": "session-token-from-x402",
      "x402-sender-wallet": "YourSenderWalletAddress",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an assistant for Hub X 402 users." },
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
        path: "https://hubx402.app/openai/chat/completions",
        description: "Proxy for OpenAI's Chat Completions. Send messages array and chat parameters, receive assistant replies."
      },
      {
        name: "Completions",
        method: "POST",
        path: "https://hubx402.app/openai/completions",
        description: "Text completion endpoint for legacy or non-chat models like `text-davinci-003`."
      },
      {
        name: "Image Generations",
        method: "POST",
        path: "https://hubx402.app/openai/images/generations",
        description: "Generate images using DALL·E style prompts. Returns base64 data or URLs depending on payload options."
      },
      {
        name: "Models",
        method: "GET",
        path: "https://hubx402.app/openai/models",
        description: "List the OpenAI models currently available through the gateway."
      }
    ],
  },
  {
    name: "Claude",
    slug: "claude",
    logo: "/logos/Claude_AI_symbol.svg",
    tagline: "Instant access. No API key required. Powered by Hub X 402.",
    summary:
      "Call Anthropic Claude through the Hub X 402 gateway for high-quality reasoning and agentic workflows. Your wallet funds the usage, we forward the request with our managed Anthropic key.",
    endpoint: "https://hubx402.app/claude/messages",
    method: "POST",
    testUrl: "https://hubx402.app/claude/messages",
    codeSampleTitle: "Node (fetch) – Claude messages via Hub X 402",
    language: "javascript",
    codeSample: `import fetch from "node-fetch";

async function callClaude() {
  const response = await fetch("https://hubx402.app/claude/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x402-session": "session-token-from-x402",
      "x402-sender-wallet": "YourSenderWalletAddress",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet",
      max_tokens: 300,
      messages: [
        { role: "user", content: [{ type: "text", text: "Draft a launch checklist for our marketplace." }] }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  console.log(data);
}

callClaude().catch(console.error);`,
    endpoints: [
      {
        name: "Messages",
        method: "POST",
        path: "https://hubx402.app/claude/messages",
        description: "Send Anthropic Claude chat messages and receive assistant replies via Hub X 402."
      }
    ],
  },
  {
    name: "Stripe",
    slug: "stripe",
    logo: "/logos/stripe.png",
    tagline: "Instant access. No API key required. Powered by Hub X 402.",
    summary:
      "Create on-demand charges and PaymentIntents through a wallet-backed Stripe proxy. Perfect for gating API calls with fiat billing.",
    endpoint: "https://hubx402.app/stripe/charges",
    method: "POST",
    testUrl: "https://hubx402.app/stripe/charges",
    codeSampleTitle: "Node – create a one-time charge",
    language: "javascript",
    codeSample: `import fetch from "node-fetch";

async function createCharge() {
  const res = await fetch("https://hubx402.app/stripe/charges", {
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
        path: "https://hubx402.app/stripe/charges",
        description: "Create an immediate charge using a tokenized payment method."
      },
      {
        name: "PaymentIntents",
        method: "POST",
        path: "https://hubx402.app/stripe/payment_intents",
        description: "Create PaymentIntents for multi-step confirmation flows."
      },
      {
        name: "Customers",
        method: "POST",
        path: "https://hubx402.app/stripe/customers",
        description: "Register or look up customers that will be billed through Hub X 402."
      }
    ],
  },
  {
    name: "Google Sheets",
    slug: "google-sheets",
    logo: "/logos/google-sheets.png",
    tagline: "Instant access. No API key required. Powered by Hub X 402.",
    summary:
      "Read and write Sheets data without juggling service accounts. Each request is signed by Hub X 402 and billed through your wallet session.",
    endpoint: "https://hubx402.app/google-sheets/values/get",
    method: "POST",
    testUrl: "https://hubx402.app/google-sheets/values/get",
    codeSampleTitle: "Node (fetch) – read a range",
    language: "javascript",
    codeSample: `import fetch from "node-fetch";

async function readSheet() {
  const response = await fetch("https://hubx402.app/google-sheets/values/get", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x402-session": "session-token-from-x402",
      "x402-sender-wallet": "YourSenderWalletAddress",
    },
    body: JSON.stringify({
      spreadsheetId: "1AbCdEfGhIjKlMnOpQrStUvWxYz",
      range: "Sheet1!A1:C5"
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  console.log(data.values);
}

readSheet().catch(console.error);`,
    endpoints: [
      {
        name: "Get values",
        method: "POST",
        path: "https://hubx402.app/google-sheets/values/get",
        description: "Fetch a range of cells from a spreadsheet. Provide `spreadsheetId` and `range` in the body."
      },
      {
        name: "Update values",
        method: "POST",
        path: "https://hubx402.app/google-sheets/values/update",
        description: "Overwrite a target range. Send `values` and optional `valueInputOption`."
      },
      {
        name: "Append values",
        method: "POST",
        path: "https://hubx402.app/google-sheets/values/append",
        description: "Append rows to the end of a sheet. Supply the value rows and optional insert mode."
      }
    ],
  },
  {
    name: "YouTube Data",
    slug: "youtube-data",
    logo: "/logos/youtube.png",
    tagline: "Instant access. No API key required. Powered by Hub X 402.",	
    summary:
      "Fetch channel stats, video metadata, and search results instantly for campaign dashboards or analytics overlays.",
    endpoint: "https://hubx402.app/google/youtube/search",
    method: "GET",
    testUrl: "https://hubx402.app/google/youtube/search?q=solana",
    codeSampleTitle: "JavaScript – search by keyword",
    language: "typescript",
    codeSample: `const res = await fetch("https://hubx402.app/google/youtube/search?q=solana+news", {
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
        path: "https://hubx402.app/google/youtube/search",
        description: "Search for videos, channels, or playlists by keyword."
      },
      {
        name: "Videos",
        method: "GET",
        path: "https://hubx402.app/google/youtube/videos",
        description: "Fetch metadata and statistics for specific videos."
      },
      {
        name: "Channels",
        method: "GET",
        path: "https://hubx402.app/google/youtube/channels",
        description: "Retrieve information about channels, including subscriber counts and descriptions."
      }
    ],
  },
  {
    name: "Twilio",
    slug: "twilio",
    logo: "/logos/free-twilio-icon-svg-download-png-3030259.webp",
    tagline: "Instant access. No API key required. Powered by Hub X 402.",
    summary:
      "Send SMS updates or voice call triggers via the Hub X 402 Twilio proxy. Perfect for notifying supporters when a campaign milestone hits.",
    endpoint: "https://hubx402.app/twilio/messages",
    method: "POST",
    testUrl: "https://hubx402.app/twilio/messages",
    codeSampleTitle: "Python – send an SMS alert",
    language: "python",
    codeSample: `import requests

payload = {
    "to": "+15551234567",
    "from": "+18885550123",
    "body": "Milestone unlocked! Jump back into the dashboard now."
}

res = requests.post(
    "https://hubx402.app/twilio/messages",
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
        path: "https://hubx402.app/twilio/messages",
        description: "Send SMS messages via the Twilio API proxy."
      },
      {
        name: "Calls",
        method: "POST",
        path: "https://hubx402.app/twilio/calls",
        description: "Initiate outbound calls using Twilio voice capabilities."
      },
      {
        name: "Lookup",
        method: "GET",
        path: "https://hubx402.app/twilio/lookup",
        description: "Verify phone numbers or fetch carrier metadata."
      }
    ],
  },
];

export const getProviderBySlug = (slug: string | undefined) =>
  apiProviders.find((provider) => provider.slug === slug);
