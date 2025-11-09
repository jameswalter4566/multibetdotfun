export type AssistantRole = "assistant" | "user";

export interface AssistantChatMessage {
  role: AssistantRole;
  content: string;
}

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
const SUPABASE_FUNCTION_ENDPOINT = supabaseUrl ? `${supabaseUrl}/functions/v1/assistant-chat` : undefined;
const LEGACY_ASSISTANT_ENDPOINT = "https://hubx402.app/api/assistant";
const DEFAULT_ASSISTANT_ENDPOINT = SUPABASE_FUNCTION_ENDPOINT ?? LEGACY_ASSISTANT_ENDPOINT;
const DEFAULT_SYSTEM_PROMPT =
  "You are an automation architect for the Hub X 402. When a user describes a task, explain how you will orchestrate it by combining our available third-party APIs (OpenAI, Claude, Google Sheets, Discord, on-chain actions, etc.). Always respond with a friendly plan that lists the nodes to create, the order they execute, and how much SOL/USDC to fund for execution.";

export const getAutomationAssistantEndpoint = () =>
  (import.meta.env.VITE_AUTOMATION_ASSISTANT_ENDPOINT as string | undefined)?.trim() ?? DEFAULT_ASSISTANT_ENDPOINT;

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
