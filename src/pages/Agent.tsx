import { useMemo, useState } from "react";
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import { apiProviders } from "@/data/apiProviders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AutomationSandbox } from "@/components/automation/AutomationSandbox";
import SiteFooter from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { requestAutomationAssistant } from "@/lib/assistant";

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

export default function Agent() {
  const docHome = useMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);
  const navLinks: DashboardNavLink[] = useMemo(
    () => [
      { label: "Explore API market place", href: "#marketplace" },
      { label: "Documentation", href: docHome },
      { label: "Create AI Automation", href: "/agent", cta: true },
      { label: "Agent Playground", href: "/agent" },
      { label: "Test sandbox", href: "#sandbox" },
      { label: "Add your API", href: "/list-api" },
    ],
    [docHome]
  );

  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isResponding, setIsResponding] = useState(false);

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isResponding) return;

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const historyForAssistant = [...messages, userMessage].map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsResponding(true);

    try {
      const { text } = await requestAutomationAssistant({ prompt: trimmed, history: historyForAssistant });
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
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <DashboardTopNav links={navLinks} />
      <main className="relative flex flex-1 min-h-0 overflow-hidden px-4 py-6 sm:px-8 lg:px-12">
        <span id="marketplace" className="sr-only" aria-hidden="true" />
        <div className="mx-auto grid h-full min-h-0 w-full max-w-7xl gap-6 lg:grid-cols-[minmax(320px,360px)_minmax(0,1.65fr)]">
          <section className="flex h-full min-h-0 flex-col rounded-3xl border border-border bg-secondary/35 p-6 shadow-glow">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Agent chat</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Describe your workflow</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                The assistant translates your prompt into nodes and sends the plan to the sandbox on the right.
              </p>
            </div>

            <div className="mt-6 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div key={message.id} className="flex">
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                      message.role === "assistant"
                        ? "mr-auto bg-background/80 text-foreground"
                        : "ml-auto bg-[#0ea5ff] text-white"
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

          <section
            id="sandbox"
            className="flex h-full min-h-0 flex-col rounded-3xl border border-border bg-secondary/30 p-6 shadow-[0_25px_60px_rgba(8,47,73,0.45)]"
          >
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/80 p-4">
              <div className="flex-1 min-h-0 overflow-auto rounded-xl">
                <AutomationSandbox />
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter className="shrink-0 border-t border-border/60" />
    </div>
  );
}
