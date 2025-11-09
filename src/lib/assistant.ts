export type AssistantRole = "assistant" | "user";

export interface AssistantChatMessage {
  role: AssistantRole;
  content: string;
}

const FALLBACK_SUPABASE_URL = "https://noftpjabkurphbiiaqqq.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZnRwamFia3VycGhiaWlhcXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjAxNjIsImV4cCI6MjA3MzgzNjE2Mn0.dOcyIPkBGRJk3Bnxu9-WsFsJouFIBwyhtHruwYqu6Xs";

const envSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const resolvedSupabaseUrl = (envSupabaseUrl || FALLBACK_SUPABASE_URL).replace(/\/$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || FALLBACK_SUPABASE_ANON_KEY;
const SUPABASE_FUNCTION_ENDPOINT = `${resolvedSupabaseUrl}/functions/v1/assistant-chat`;

const envAssistantEndpoint = (import.meta.env.VITE_AUTOMATION_ASSISTANT_ENDPOINT as string | undefined)?.trim();
const sanitizedEnvEndpoint =
  envAssistantEndpoint && !envAssistantEndpoint.includes("hubx402.app") ? envAssistantEndpoint : undefined;
const DEFAULT_ASSISTANT_ENDPOINT = sanitizedEnvEndpoint ?? SUPABASE_FUNCTION_ENDPOINT;
const DEFAULT_SYSTEM_PROMPT =
  "You are an automation architect for the Hub X 402. When a user describes a task, explain how you will orchestrate it by combining our available third-party APIs (OpenAI, Claude, Google Sheets, Discord, on-chain actions, etc.). Always respond with a friendly plan that lists the nodes to create, the order they execute, and how much SOL/USDC to fund for execution.";

export const getAutomationAssistantEndpoint = () => DEFAULT_ASSISTANT_ENDPOINT;

export interface AutomationAssistantRequest {
  prompt: string;
  history: AssistantChatMessage[];
  automationName?: string;
  walletAddress?: string;
  autoPublish?: boolean;
  moderation?: boolean;
  systemPrompt?: string;
}

export interface AutomationAssistantResponse<T = unknown> {
  text: string;
  raw: T;
}

interface BuildRequestBodyOptions extends AutomationAssistantRequest {
  systemPrompt?: string;
}

const buildRequestBody = ({
  automationName,
  walletAddress,
  systemPrompt,
  prompt,
  history,
  autoPublish,
  moderation,
}: BuildRequestBodyOptions) => ({
  automationName: automationName?.trim() || "untitled",
  walletAddress: walletAddress ?? "",
  systemPrompt: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
  prompt,
  history,
  autoPublish: autoPublish ?? false,
  moderation: moderation ?? true,
});

export const requestAutomationAssistant = async <T = unknown>({
  prompt,
  history,
  automationName,
  walletAddress,
  autoPublish,
  moderation,
  systemPrompt,
}: AutomationAssistantRequest): Promise<AutomationAssistantResponse<T>> => {
  const endpoint = getAutomationAssistantEndpoint();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (SUPABASE_FUNCTION_ENDPOINT && endpoint === SUPABASE_FUNCTION_ENDPOINT && supabaseAnonKey) {
    headers["apikey"] = supabaseAnonKey;
    headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(
      buildRequestBody({
        automationName,
        walletAddress,
        prompt,
        history,
        autoPublish,
        moderation,
        systemPrompt,
      })
    ),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`assistant_endpoint_${response.status}: ${body}`);
  }

  const data = (await response.json()) as T & { reply?: string; message?: string };
  const text = (data.reply ?? data.message ?? "Assistant processed your request.") as string;

  return { text, raw: data };
};
