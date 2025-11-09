import { supabase } from "@/integrations/supabase/client";

export type AgentSession = {
  id: string;
  client_id: string;
  title: string | null;
  initial_prompt: string;
  created_at: string;
};

export const fetchAgentSessions = async (clientId: string): Promise<AgentSession[]> => {
  const { data, error } = await supabase
    .from("agent_sessions")
    .select("id, client_id, title, initial_prompt, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as AgentSession[]) ?? [];
};

export const createAgentSession = async (clientId: string, payload: { title?: string | null; initialPrompt: string }): Promise<AgentSession> => {
  const { data, error } = await supabase
    .from("agent_sessions")
    .insert({
      client_id: clientId,
      title: payload.title ?? null,
      initial_prompt: payload.initialPrompt,
    })
    .select("id, client_id, title, initial_prompt, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as AgentSession;
};
