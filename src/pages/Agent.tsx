import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import { apiProviders } from "@/data/apiProviders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AutomationSandbox } from "@/components/automation/AutomationSandbox";
import SiteFooter from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { requestAutomationAssistant } from "@/lib/assistant";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AUTOMATION_SUPPORT_WALLET } from "@/constants/automation";
import { createAgentSession, fetchAgentSessions, type AgentSession } from "@/services/agents";

type ChatRole = "assistant" | "user";

type AgentMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const initialMessages: AgentMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content: "Hey! I can wire up Solana + web2 APIs inside the sandbox. What do you want to build today?",
  },
];

const generateClientId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

const deriveAgentTitle = (prompt: string) => {
  const sanitized = prompt.trim().replace(/\s+/g, " ");
  if (!sanitized) return "Untitled agent";
  return sanitized.length > 48 ? `${sanitized.slice(0, 45)}…` : sanitized;
};

export default function Agent() {
  const docHome = useMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);
  const navLinks: DashboardNavLink[] = useMemo(
    () => [
      { label: "Explore API market place", href: "#marketplace" },
      { label: "Documentation", href: docHome },
      { label: "Create AI Automation (Beta)", href: "/agent", cta: true },
      { label: "Agent Playground", href: "/agent" },
      { label: "Test sandbox", href: "#sandbox" },
      { label: "Add your API", href: "/list-api" },
    ],
    [docHome]
  );

  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [clientId, setClientId] = useState("");
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingPrompt, setOnboardingPrompt] = useState("");
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const { toast } = useToast();
  const supportWallet = AUTOMATION_SUPPORT_WALLET;
  const activeAgent = useMemo(() => agentSessions.find((session) => session.id === activeAgentId) ?? null, [agentSessions, activeAgentId]);

  const handleCopySupportWallet = () => {
    navigator.clipboard
      .writeText(supportWallet)
      .then(() => toast({ title: "Wallet copied", description: "Support wallet copied to clipboard." }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  };

  useEffect(() => {
    if (clientId) return;
    let stored = "";
    try {
      stored = localStorage.getItem("agent-client-id") || "";
    } catch {
      stored = "";
    }
    if (!stored) {
      stored = generateClientId();
      try {
        localStorage.setItem("agent-client-id", stored);
      } catch {
        // ignore storage errors
      }
    }
    setClientId(stored);
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAgentSessions(clientId);
        if (cancelled) return;
        setAgentSessions(data);
        if (data.length) {
          let storedActive = "";
          try {
            storedActive = localStorage.getItem("agent-active-agent-id") || "";
          } catch {
            storedActive = "";
          }
          const initial = data.find((session) => session.id === storedActive) ?? data[0];
          setActiveAgentId(initial.id);
        } else {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Failed to load agents", error);
        toast({ title: "Unable to load agents", description: "Refresh to try again.", variant: "destructive" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, toast]);

  useEffect(() => {
    if (!activeAgentId) return;
    try {
      localStorage.setItem("agent-active-agent-id", activeAgentId);
    } catch {
      // noop
    }
  }, [activeAgentId]);

  const sendPrompt = useCallback(
    async (rawPrompt: string, options?: { historyBase?: AgentMessage[] }) => {
      const trimmed = rawPrompt.trim();
      if (!trimmed) return;
      const baseHistory = options?.historyBase ?? messages;
      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const historyForAssistant = [...baseHistory, userMessage];
      setMessages(historyForAssistant);
      setIsResponding(true);
      try {
        const { text } = await requestAutomationAssistant({
          prompt: trimmed,
          history: historyForAssistant.map(({ role, content }) => ({ role, content })),
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: text,
          },
        ]);
      } catch (error) {
        console.error("Agent chat failed", error);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "I couldn't reach the automation assistant. Please try again in a moment.",
          },
        ]);
      } finally {
        setIsResponding(false);
      }
    },
    [messages]
  );

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isResponding) return;
    setInput("");
    await sendPrompt(trimmed);
  };

  const createNewAgent = () => {
    setOnboardingName("");
    setOnboardingPrompt("");
    setShowOnboarding(true);
  };

  const handleAgentCreation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPrompt = onboardingPrompt.trim();
    if (!clientId || !trimmedPrompt) return;
    setIsSavingAgent(true);
    try {
      const session = await createAgentSession(clientId, {
        title: onboardingName.trim() || deriveAgentTitle(trimmedPrompt),
        initialPrompt: trimmedPrompt,
      });
      setAgentSessions((prev) => [session, ...prev]);
      setActiveAgentId(session.id);
      setShowOnboarding(false);
      setOnboardingName("");
      setOnboardingPrompt("");
      setMessages([...initialMessages]);
      await sendPrompt(trimmedPrompt, { historyBase: initialMessages });
    } catch (error) {
      console.error("Create agent failed", error);
      toast({ title: "Unable to create agent", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSavingAgent(false);
    }
  };

  const handleAgentSelection = async (session: AgentSession) => {
    if (session.id === activeAgentId || isResponding) return;
    setActiveAgentId(session.id);
    setMessages([...initialMessages]);
    await sendPrompt(session.initial_prompt, { historyBase: initialMessages });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <DashboardTopNav links={navLinks} />
      <main className="relative flex flex-1 min-h-0 overflow-hidden px-4 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto grid h-full min-h-0 w-full max-w-[1900px] gap-10 lg:grid-cols-[minmax(340px,480px)_minmax(0,3fr)]">
          <section className="flex h-full min-h-0 flex-col rounded-3xl border border-border bg-secondary/35 p-7 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Agent chat</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full border-border/70 bg-background/80 px-4 py-1">
                    How it works
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl space-y-4">
                  <DialogHeader>
                    <DialogTitle>AI Automation assistant</DialogTitle>
                    <DialogDescription>
                      Tell us what you want to automate and the assistant will stitch together the right third-party APIs while you stay in the cockpit.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Agent wallet</p>
                      <p className="mt-2">
                        Fund this wallet before running live automations. It pays for on-chain verification and per-call usage (SOL or USDC).
                      </p>
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs text-foreground">
                        <span className="truncate">{supportWallet}</span>
                        <Button variant="ghost" size="sm" onClick={handleCopySupportWallet}>
                          Copy
                        </Button>
                      </div>
                    </div>
                    <p>
                      Hey there! I&apos;m your automation co-pilot. Describe the workflow you want to orchestrate and I&apos;ll assemble the right third-party APIs from our marketplace to make it happen.
                    </p>
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">How it works</p>
                      <p>
                        Simply type in a task or service you&apos;d like to automate and the assistant will pick the most relevant APIs, describe the nodes it plans to deploy, and request funding when on-chain actions are required.
                      </p>
                      <ul className="list-disc space-y-1 pl-5">
                        <li><span className="font-medium text-foreground">Auto publish replies</span> stay off by default so nothing ships without your sign-off.</li>
                        <li><span className="font-medium text-foreground">Require review</span> keeps flows paused until you approve them.</li>
                        <li>Keep this tab open while the assistant works so drafts sync to the sandbox.</li>
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Type your automation in the chat input and hit Send—responses stream here while nodes update in the sandbox.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Describe your workflow</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                The assistant translates your prompt into nodes and sends the plan to the sandbox on the right.
              </p>
              {activeAgent && (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Active agent</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {activeAgent.title || deriveAgentTitle(activeAgent.initial_prompt)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{activeAgent.initial_prompt}</p>
                </div>
              )}
            </div>

            {agentSessions.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Your agents</p>
                  <Button type="button" variant="ghost" size="sm" className="rounded-full px-3 py-1 text-xs" onClick={createNewAgent}>
                    + New agent
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agentSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleAgentSelection(session)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        session.id === activeAgentId
                          ? "border-[#a855f7]/70 bg-[#a855f7]/20 text-white"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {session.title || deriveAgentTitle(session.initial_prompt)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div key={message.id} className="flex">
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                      message.role === "assistant"
                        ? "mr-auto bg-background/80 text-foreground"
                        : "ml-auto bg-[#a855f7] text-white"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isResponding && (
                <div className="flex">
                  <div className="mr-auto rounded-2xl bg-background/70 px-4 py-3 text-sm italic text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="mt-6 flex items-end gap-3">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask the agent to build an automation..."
                className="flex-1 bg-background/80"
              />
              <Button type="submit" className="rounded-2xl px-6 py-2" disabled={isResponding}>
                {isResponding ? "Sending..." : "Send"}
              </Button>
            </form>
          </section>

          <section id="sandbox" className="flex h-full min-h-0 flex-col">
            <AutomationSandbox />
          </section>
        </div>
      </main>
      <SiteFooter className="shrink-0 border-t border-border/60" />
      <Dialog
        open={showOnboarding}
        onOpenChange={(open) => {
          if (isSavingAgent) return;
          setShowOnboarding(open);
        }}
      >
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader>
            <DialogTitle>Spin up your first automation agent</DialogTitle>
            <DialogDescription>
              Give the agent a quick nickname and describe the workflow you want. We&apos;ll save it in your workspace and immediately draft the flow.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAgentCreation}>
            <Input
              value={onboardingName}
              onChange={(event) => setOnboardingName(event.target.value)}
              placeholder="Name this agent (optional)"
            />
            <Textarea
              value={onboardingPrompt}
              onChange={(event) => setOnboardingPrompt(event.target.value)}
              placeholder="Describe the automation you need..."
              rows={4}
            />
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (!isSavingAgent) setShowOnboarding(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingAgent || !onboardingPrompt.trim()}>
                {isSavingAgent ? "Creating..." : "Create & start"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
