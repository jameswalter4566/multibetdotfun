import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, Repeat } from "lucide-react";

const CANVAS_BACKGROUND = "radial-gradient(circle at 20px 20px, rgba(14,165,255,0.12) 0, rgba(14,165,255,0.12) 1px, transparent 1px)";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: number;
}

type CanvasNode = {
  id: string;
  title: string;
  description: string;
  color: string;
  borderColor: string;
  position: { x: number; y: number };
  logo?: string;
};

type ConnectorEdge = {
  from: string;
  to: string;
  animated?: boolean;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "assistant-intro",
    role: "assistant",
    content:
      "Hey there! I'm your automation co-pilot. Describe the workflow you want to orchestrate and I'll assemble the right third-party APIs from our marketplace to make it happen.",
    createdAt: Date.now(),
  },
];

const DEFAULT_NODES: CanvasNode[] = [
  {
    id: "assistant-node",
    title: "AI assistant",
    description: "Understands tasks and orchestrates flows",
    color: "rgba(14,165,255,0.18)",
    borderColor: "rgba(14,165,255,0.5)",
    position: { x: 80, y: 150 },
    logo: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f916.svg",
  },
  {
    id: "openai-node",
    title: "OpenAI",
    description: "Generates reasoning & content",
    color: "rgba(34,197,94,0.16)",
    borderColor: "rgba(34,197,94,0.5)",
    position: { x: 360, y: 90 },
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/openai/openai-original.svg",
  },
  {
    id: "sheets-node",
    title: "Google Sheets",
    description: "Stores structured results",
    color: "rgba(249,115,22,0.18)",
    borderColor: "rgba(249,115,22,0.55)",
    position: { x: 640, y: 210 },
    logo: "https://www.gstatic.com/images/branding/product/2x/sheets_48dp.png",
  },
];

const EDGE_BLUEPRINT: ConnectorEdge[] = [
  { from: "assistant-node", to: "openai-node", animated: true },
  { from: "openai-node", to: "sheets-node", animated: true },
];

const TerminalLog = ({ logs }: { logs: string[] }) => (
  <Card className="border border-border/60 bg-background/80 backdrop-blur">
    <CardHeader>
      <CardTitle className="text-sm font-semibold text-foreground">Automation terminal</CardTitle>
      <CardDescription>Raw AI responses captured during simulation.</CardDescription>
    </CardHeader>
    <CardContent className="max-h-64 overflow-y-auto rounded-lg bg-black/80 p-4 font-mono text-xs text-[#c5fffd]">
      {logs.length === 0 ? (
        <p className="text-white/50">Run an automation to stream logs here.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((entry, index) => (
            <li key={`${entry}-${index}`}>
              <pre className="whitespace-pre-wrap leading-snug">{entry}</pre>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

const Connector = ({
  startX,
  startY,
  endX,
  endY,
  animated,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  animated?: boolean;
}) => {
  const path = useMemo(() => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const influence = Math.min(Math.abs(deltaX) * 0.45, 180);
    const vertical = Math.min(Math.abs(deltaY) * 0.4, 110);

    let cp1x = startX + influence;
    let cp1y = startY;
    let cp2x = endX - influence;
    let cp2y = endY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      cp1x = startX;
      cp1y = startY + vertical;
      cp2x = endX;
      cp2y = endY - vertical;
    }

    return `M${startX},${startY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`;
  }, [startX, startY, endX, endY]);

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <path d={path} stroke="rgba(255,255,255,0.24)" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path
        d={path}
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="6 8"
        style={{ animation: animated ? "automation-dash 2000ms linear infinite" : "none" }}
      />
    </svg>
  );
};

const NodeCard = ({ node, provideRef }: { node: CanvasNode; provideRef: (id: string, el: HTMLDivElement | null) => void }) => (
  <div
    ref={(el) => provideRef(node.id, el)}
    className="absolute w-60 rounded-2xl border px-4 py-3 shadow-[0_18px_30px_rgba(8,47,73,0.35)] backdrop-blur"
    style={{
      transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0)`,
      backgroundColor: node.color,
      borderColor: node.borderColor,
    }}
  >
    <div className="flex items-start gap-3">
      {node.logo ? (
        <img src={node.logo} alt={node.title} className="h-8 w-8 rounded-md border border-white/20 bg-white/10 object-contain" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-white/10 text-sm text-white/80">AI</div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{node.title}</p>
        <p className="text-xs text-white/70">{node.description}</p>
      </div>
    </div>
  </div>
);

export const AutomationSandbox = () => {
  const [automationName, setAutomationName] = useState("");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [promptInput, setPromptInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isAutoPublish, setIsAutoPublish] = useState(false);
  const [isModerationEnabled, setIsModerationEnabled] = useState(true);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connectorAnchors, setConnectorAnchors] = useState<
    Array<{ id: string; startX: number; startY: number; endX: number; endY: number; animated?: boolean }>
  >([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { toast } = useToast();

  const assistantEndpoint =
    (import.meta.env.VITE_AUTOMATION_ASSISTANT_ENDPOINT as string | undefined) ??
    "https://x402market.app/api/assistant";
  const openAiKey = import.meta.env.OPENAI_API_KEY as string | undefined;

  const updateAnchors = useCallback(() => {
    const container = canvasRef.current;
    if (!container || nodes.length === 0) {
      setConnectorAnchors([]);
      return;
    }

    const bounds = container.getBoundingClientRect();
    const anchors = EDGE_BLUEPRINT.filter((edge) => nodeRefs.current[edge.from] && nodeRefs.current[edge.to]).map((edge) => {
      const fromEl = nodeRefs.current[edge.from] as HTMLDivElement;
      const toEl = nodeRefs.current[edge.to] as HTMLDivElement;
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      return {
        id: `${edge.from}-${edge.to}`,
        animated: edge.animated,
        startX: fromRect.right - bounds.left,
        startY: fromRect.top + fromRect.height / 2 - bounds.top,
        endX: toRect.left - bounds.left,
        endY: toRect.top + toRect.height / 2 - bounds.top,
      };
    });

    setConnectorAnchors(anchors);
  }, [nodes.length]);

  useEffect(() => {
    const keypair = Keypair.generate();
    setWalletAddress(keypair.publicKey.toBase58());
  }, []);

  useEffect(() => {
    updateAnchors();
  }, [nodes, updateAnchors]);

  useEffect(() => {
    const handleResize = () => updateAnchors();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateAnchors]);


  const resetLayout = () => {
    setNodes([]);
    setConnectorAnchors([]);
    nodeRefs.current = {};
    updateAnchors();
    toast({ title: "Workspace reset", description: "Node canvas cleared." });
  };

  const simulateAutomation = () => {
    const now = new Date().toISOString();
    const synthetic = [
      JSON.stringify({ timestamp: now, stage: "fetch_sources", wallet: walletAddress, filters: { autoPublish: isAutoPublish, moderation: isModerationEnabled } }, null, 2),
      JSON.stringify({ timestamp: now, stage: "draft_automation", name: automationName || "untitled" }, null, 2),
    ];

    setTerminalLogs((prev) => [...synthetic, ...prev].slice(0, 40));
    toast({ title: "Automation simulated", description: "Streaming raw events to the terminal." });
  };

  const handleSaveAutomation = () => {
    const trimmed = automationName.trim();
    if (!trimmed) {
      toast({ title: "Name required", description: "Give your automation a memorable name before saving.", variant: "destructive" });
      return;
    }

    try {
      localStorage.setItem("automation-name", trimmed);
      localStorage.setItem("automation-chat", JSON.stringify(chatMessages));
      toast({ title: "Automation saved", description: "We stored the name and current chat locally." });
    } catch (error) {
      toast({ title: "Save failed", description: "Unable to persist automation locally.", variant: "destructive" });
    }
  };

  const appendAssistantMessage = useCallback((content: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const callAssistant = useCallback(
    async (payload: { prompt: string; history: ChatMessage[] }) => {
      try {
        const response = await fetch(assistantEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            automationName: automationName || "untitled",
            walletAddress,
            systemPrompt:
              "You are an automation architect for the x402 marketplace. When a user describes a task, explain how you will orchestrate it by combining our available third-party APIs (OpenAI, Claude, Google Sheets, Discord, on-chain actions, etc.). Always respond with a friendly plan that lists the nodes to create, the order they execute, and how much SOL/USDC to fund for execution.",
            prompt: payload.prompt,
            history: payload.history,
            autoPublish: isAutoPublish,
            moderation: isModerationEnabled,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`assistant_endpoint_${response.status}: ${body}`);
        }

        const data = await response.json();
        const text = data.reply ?? data.message ?? "Assistant processed your request.";
        setTerminalLogs((prev) => [JSON.stringify(data, null, 2), ...prev].slice(0, 40));
        return text as string;
      } catch (error) {
        console.error("Assistant endpoint request failed", error);
        throw error;
      }
      if (false) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an automation architect for the x402 marketplace. When a user describes a task, explain how you will orchestrate it by combining our available third-party APIs (OpenAI, Claude, Google Sheets, Discord, on-chain actions, etc.). Always respond with a friendly plan that says which nodes you will create, the order they run in, and how much SOL/USDC should be funded for execution.",
              },
              ...payload.history.map((message) => ({ role: message.role, content: message.content })),
              { role: "user", content: payload.prompt },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI request failed with ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content ?? "Assistant created a draft automation.";
        setTerminalLogs((prev) => [JSON.stringify(data, null, 2), ...prev].slice(0, 40));
        return text as string;
      }

      return "Automation assistant unavailable: configure the backend endpoint.";
    },
    [assistantEndpoint, automationName, openAiKey, walletAddress, isAutoPublish, isModerationEnabled]
  );

  const handlePromptSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = promptInput.trim();
    if (!trimmed.length) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    if (nodes.length === 0) {
      const seeded = DEFAULT_NODES.map((node) => ({ ...node }));
      setNodes(seeded);
      requestAnimationFrame(() => updateAnchors());
    }
    setPromptInput("");
    setIsSending(true);

    try {
      const reply = await callAssistant({ prompt: trimmed, history: [...chatMessages, userMessage] });
      appendAssistantMessage(reply);
    } catch (error) {
      console.error(error);
      appendAssistantMessage("I hit an issue reaching the assistant endpoint. Double-check your configuration and try again.");
    } finally {
      setIsSending(false);
    }
  };

  const copyWalletToClipboard = () => {
    if (!walletAddress) return;
    navigator.clipboard
      .writeText(walletAddress)
      .then(() => toast({ title: "Wallet copied", description: "Address copied to clipboard." }))
      .catch(() => toast({ title: "Copy failed", description: "Unable to copy address.", variant: "destructive" }));
  };

  return (
    <div id="marketplace" className="space-y-8">
      <style>{`
        @keyframes automation-dash { to { stroke-dashoffset: -180; } }
      `}</style>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Automation playground</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Drag and wire nodes to choreograph end-to-end workflows. Generate ideas with the assistant and simulate them locally
            before deploying to production.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="rounded-full border-border/70 bg-background px-5 py-2 text-sm" onClick={resetLayout}>
            <Repeat className="mr-2 h-4 w-4" />
            Reset layout
          </Button>
          <Button
            className="rounded-full bg-[#0ea5ff] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(14,165,255,0.5)] hover:bg-[#08b0ff]"
            onClick={simulateAutomation}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Run automation
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          ref={canvasRef}
          className="relative min-h-[560px] overflow-hidden rounded-3xl border border-border/60 bg-[#050b1f] p-6 shadow-[0_0_60px_rgba(8,47,73,0.35)]"
          style={{ backgroundImage: CANVAS_BACKGROUND, backgroundSize: "40px 40px" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0ea5ff24] to-transparent" />
          {nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-sm space-y-3 text-sm text-white/70">
                <p className="text-base font-semibold text-white">Your canvas is empty</p>
                <p>Start by prompting the AI assistant. Suggested nodes will appear here when the automation is ready.</p>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full">
              {connectorAnchors.map((edge) => (
                <Connector key={edge.id} {...edge} />
              ))}
              {nodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  provideRef={(id, el) => {
                    nodeRefs.current[id] = el;
                    requestAnimationFrame(updateAnchors);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <Card className="border border-border/60 bg-background/70 backdrop-blur shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex-1">
                <Label htmlFor="automation-name" className="text-sm font-medium text-muted-foreground">
                  Name automation
                </Label>
                <Input
                  id="automation-name"
                  value={automationName}
                  onChange={(event) => setAutomationName(event.target.value)}
                  placeholder="Ex: Crypto supporter onboarding"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSaveAutomation} className="rounded-xl bg-[#0ea5ff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(14,165,255,0.35)] hover:bg-[#08b0ff]">
                Save automation
              </Button>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Fund your AI agent&#39;s wallet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This wallet pays for on-chain verification and per-call usage (SOL or USDC). Fund it before running live automations.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs text-foreground">
                <span className="truncate flex-1">{walletAddress || "Generating wallet..."}</span>
                <Button variant="ghost" size="sm" onClick={copyWalletToClipboard}>
                  Copy
                </Button>
              </div>
            </div>

            <CardTitle className="text-lg font-semibold text-foreground">AI Automation assistant</CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              Tell us what you want to automate and the assistant will stitch together the right third-party APIs (OpenAI, Claude,
              Google Sheets, Discord, on-chain actions, and more). You stay in the cockpit while it drafts the workflow.
            </CardDescription>
            <div className="rounded-lg border border-border/70 bg-background/80 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How it works</p>
              <p className="mt-2">
                Simply type in a task or a service that you would like to automate and our AI assistant will pick the most relevant
                third-party APIs to orchestrate the workflow. It will describe the nodes it plans to deploy and request funding when
                on-chain actions are required.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border/60 bg-background/70 p-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                      message.role === "user" ? "bg-[#0ea5ff] text-white" : "bg-accent/30 text-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            <form className="space-y-3" onSubmit={handlePromptSubmit}>
              <Textarea
                value={promptInput}
                onChange={(event) => setPromptInput(event.target.value)}
                placeholder="Type your automation here"
                rows={4}
                className="border-border/70"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Switch checked={isAutoPublish} onCheckedChange={setIsAutoPublish} id="auto-publish-toggle" />
                    <label htmlFor="auto-publish-toggle" className="cursor-pointer">
                      Auto publish replies
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={isModerationEnabled} onCheckedChange={setIsModerationEnabled} id="moderation-toggle" />
                    <label htmlFor="moderation-toggle" className="cursor-pointer">
                      Require review
                    </label>
                  </div>
                </div>
                <Button type="submit" className="rounded-xl" disabled={isSending}>
                  {isSending ? "Thinking..." : "Submit"}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="border-t border-border/60 bg-background/60 px-6 py-4 text-xs text-muted-foreground">
            Keep this tab open while the assistant works. Saving exports the latest plan to local storage for quick restoration.
          </CardFooter>
        </Card>
      </div>

      <div id="sandbox"><TerminalLog logs={terminalLogs} /></div>
    </div>
  );
};

export default AutomationSandbox;
