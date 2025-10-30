import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, Repeat } from "lucide-react";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 130;
const CANVAS_PADDING = 32;

type AutomationNode = {
  id: string;
  title: string;
  description: string;
  color: string;
  borderColor: string;
  position: { x: number; y: number };
};

type ConnectorEdge = {
  from: string;
  to: string;
  animated?: boolean;
};

type DragInfo = {
  id: string;
  offsetX: number;
  offsetY: number;
};

const INITIAL_NODES: AutomationNode[] = [
  {
    id: "node-0",
    title: "Listen for Mentions",
    description: "Monitor X (Twitter) mentions for a handle.",
    color: "rgba(14,165,255,0.16)",
    borderColor: "rgba(14,165,255,0.45)",
    position: { x: 40, y: 80 },
  },
  {
    id: "node-1",
    title: "Filter Timeline",
    description: "Choose which events continue downstream.",
    color: "rgba(16,185,129,0.16)",
    borderColor: "rgba(16,185,129,0.45)",
    position: { x: 360, y: 20 },
  },
  {
    id: "node-2",
    title: "Draft Response",
    description: "Generate on-brand replies with AI prompts.",
    color: "rgba(249,115,22,0.18)",
    borderColor: "rgba(249,115,22,0.55)",
    position: { x: 660, y: 140 },
  },
  {
    id: "node-3",
    title: "Ship Reply",
    description: "Queue or ship the reply automatically.",
    color: "rgba(168,85,247,0.18)",
    borderColor: "rgba(168,85,247,0.55)",
    position: { x: 960, y: 80 },
  },
];

const INITIAL_CONFIGS: Record<string, any> = {
  "node-0": { twitterHandle: "marketx402", pollFrequency: 5, maxMentions: 25 },
  "node-1": { filterQuestions: true, filterHashtags: false, filterShortPosts: false },
  "node-2": {
    responseMode: "conversational",
    prompt:
      "You are an on-brand automation that replies with concise, helpful tone. Reference original tweets when it helps the reader.",
  },
  "node-3": { autoPublish: false, moderationEnabled: true },
};

const CONNECTORS: ConnectorEdge[] = [
  { from: "node-0", to: "node-1", animated: true },
  { from: "node-1", to: "node-2", animated: true },
  { from: "node-2", to: "node-3", animated: true },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const Connector = ({ startX, startY, endX, endY, animated }: { startX: number; startY: number; endX: number; endY: number; animated?: boolean }) => {
  const path = useMemo(() => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const influence = Math.min(Math.abs(deltaX) * 0.45, 180);
    const vertical = Math.min(Math.abs(deltaY) * 0.45, 120);

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
    <svg className="absolute inset-0 h-full w-full overflow-visible pointer-events-none">
      <path d={path} stroke="rgba(255,255,255,0.25)" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path
        d={path}
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="6 8"
        style={{ animation: animated ? "automation-dash 2200ms linear infinite" : "none" }}
      />
    </svg>
  );
};

const AutomationNode = ({
  node,
  isActive,
  onStartDrag,
  onSelect,
}: {
  node: AutomationNode;
  isActive: boolean;
  onStartDrag: (info: DragInfo) => void;
  onSelect: (id: string) => void;
}) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragging.current = true;
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    onStartDrag({ id: node.id, offsetX: dragOffset.current.x, offsetY: dragOffset.current.y });
  };

  const handleClick = () => {
    if (!dragging.current) {
      onSelect(node.id);
    }
    dragging.current = false;
  };

  useEffect(() => {
    const handleMouseUp = () => {
      dragging.current = false;
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div
      ref={nodeRef}
      role="button"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={`select-none rounded-2xl border p-4 shadow-lg transition-transform duration-150 ${
        isActive ? "ring-2 ring-offset-2 ring-white" : "hover:-translate-y-[3px]"
      }`}
      style={{
        transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0)`,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: node.color,
        borderColor: node.borderColor,
        cursor: "grab",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{node.title}</h3>
          <p className="mt-1 text-sm text-white/70">{node.description}</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-white/60" />
          <div className="h-2 w-2 rounded-full bg-white/40" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10" />
    </div>
  );
};

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

export const AutomationSandbox = () => {
  const [nodes, setNodes] = useState<AutomationNode[]>(INITIAL_NODES);
  const [configs, setConfigs] = useState<Record<string, any>>(INITIAL_CONFIGS);
  const [activeNodeId, setActiveNodeId] = useState<string>(INITIAL_NODES[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragInfoRef = useRef<DragInfo | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragInfoRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { id, offsetX, offsetY } = dragInfoRef.current;
      const rawX = event.clientX - rect.left - offsetX;
      const rawY = event.clientY - rect.top - offsetY;
      const x = clamp(rawX, CANVAS_PADDING, rect.width - NODE_WIDTH - CANVAS_PADDING);
      const y = clamp(rawY, CANVAS_PADDING, rect.height - NODE_HEIGHT - CANVAS_PADDING);
      pendingPositionRef.current = { id, x, y };

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const pending = pendingPositionRef.current;
        if (!pending) return;
        setNodes((current) =>
          current.map((node) => (node.id === pending.id ? { ...node, position: { x: pending.x, y: pending.y } } : node))
        );
        rafRef.current = null;
      });
    };

    const handleMouseUp = () => {
      dragInfoRef.current = null;
      pendingPositionRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleStartDrag = (info: DragInfo) => {
    dragInfoRef.current = info;
  };

  const handleConfigChange = (id: string, patch: Record<string, any>) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleResetLayout = () => {
    setNodes(INITIAL_NODES);
    setConfigs(INITIAL_CONFIGS);
    setActiveNodeId(INITIAL_NODES[0].id);
    toast({ title: "Layout reset", description: "Nodes returned to their default positions." });
  };

  const simulateAutomation = () => {
    setIsRunning(true);
    const timestamp = new Date().toISOString();
    const syntheticResponses = [
      JSON.stringify({
        timestamp,
        stage: "listen",
        handle: configs["node-0"].twitterHandle,
        mentions: Math.floor(Math.random() * configs["node-0"].maxMentions),
      }, null, 2),
      JSON.stringify({
        timestamp,
        stage: "filter",
        accepted: Math.floor(Math.random() * 12),
        filters: configs["node-1"],
      }, null, 2),
      JSON.stringify({
        timestamp,
        stage: "draft",
        mode: configs["node-2"].responseMode,
        sampleResponse: "Appreciate the shoutout! Launching AI automations with x402 is faster than ever.",
      }, null, 2),
      JSON.stringify({
        timestamp,
        stage: "ship",
        autoPublish: configs["node-3"].autoPublish,
        moderationQueue: configs["node-3"].moderationEnabled,
      }, null, 2),
    ];

    setTimeout(() => {
      setIsRunning(false);
      setTerminalLogs((prev) => [...syntheticResponses.reverse(), ...prev].slice(0, 40));
      toast({ title: "Automation simulated", description: "Responses streamed to the terminal panel." });
    }, 900);
  };

  const activeConfig = configs[activeNodeId] ?? {};

  const connectors = useMemo(() => {
    return CONNECTORS.map((edge) => {
      const from = nodes.find((node) => node.id === edge.from);
      const to = nodes.find((node) => node.id === edge.to);
      if (!from || !to) return null;
      return {
        id: `${edge.from}-${edge.to}`,
        animated: edge.animated,
        startX: from.position.x + NODE_WIDTH,
        startY: from.position.y + NODE_HEIGHT / 2,
        endX: to.position.x,
        endY: to.position.y + NODE_HEIGHT / 2,
      };
    }).filter(Boolean) as Array<{ id: string; startX: number; startY: number; endX: number; endY: number; animated?: boolean }>;
  }, [nodes]);

  return (
    <div className="space-y-8">
      <style>{`
        @keyframes automation-dash { to { stroke-dashoffset: -180; } }
      `}</style>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Automation playground</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Drag nodes to rewire the workflow. Configure each step and preview how data flows from listening to shipping
            responses. This editor is fully client-side—no sign in required.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="rounded-full border-border/70 bg-background px-5 py-2 text-sm"
            onClick={handleResetLayout}
          >
            <Repeat className="mr-2 h-4 w-4" />
            Reset layout
          </Button>
          <Button
            className="rounded-full bg-[#0ea5ff] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(14,165,255,0.5)] hover:bg-[#08b0ff]"
            onClick={simulateAutomation}
            disabled={isRunning}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            {isRunning ? "Simulating…" : "Run automation"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          ref={containerRef}
          className="relative min-h-[640px] overflow-hidden rounded-3xl border border-border/60 bg-[#050b1f] p-6 shadow-[0_0_60px_rgba(8,47,73,0.35)]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20px 20px, rgba(14,165,255,0.12) 0, rgba(14,165,255,0.12) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0ea5ff24] to-transparent" />
          {connectors.map((edge) => (
            <Connector key={edge.id} {...edge} />
          ))}
          {nodes.map((node) => (
            <AutomationNode
              key={node.id}
              node={node}
              isActive={node.id === activeNodeId}
              onStartDrag={handleStartDrag}
              onSelect={setActiveNodeId}
            />
          ))}
        </div>

        <Card className="border border-border/60 bg-background/70 backdrop-blur shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Step configuration</CardTitle>
            <CardDescription>
              Tweak how <span className="font-medium text-foreground">{nodes.find((node) => node.id === activeNodeId)?.title}</span> behaves inside
              the flow. Changes update live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeNodeId === "node-0" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter-handle">X handle (without @)</Label>
                  <Input
                    id="twitter-handle"
                    value={activeConfig.twitterHandle}
                    onChange={(event) => handleConfigChange("node-0", { twitterHandle: event.target.value })}
                    placeholder="marketx402"
                    className="border-border/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="poll-frequency">Poll every (minutes)</Label>
                    <Input
                      id="poll-frequency"
                      type="number"
                      min={1}
                      value={activeConfig.pollFrequency}
                      onChange={(event) => handleConfigChange("node-0", { pollFrequency: Number(event.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-mentions">Max mentions per cycle</Label>
                    <Input
                      id="max-mentions"
                      type="number"
                      min={1}
                      value={activeConfig.maxMentions}
                      onChange={(event) => handleConfigChange("node-0", { maxMentions: Number(event.target.value) || 1 })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeNodeId === "node-1" && (
              <div className="space-y-4">
                {[
                  { id: "filter-questions", label: "Prioritize questions", key: "filterQuestions" },
                  { id: "filter-hashtags", label: "Skip hashtag-only posts", key: "filterHashtags" },
                  { id: "filter-short", label: "Ignore very short posts", key: "filterShortPosts" },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                    <Label htmlFor={item.id} className="text-sm font-medium">
                      {item.label}
                    </Label>
                    <Switch
                      id={item.id}
                      checked={Boolean(activeConfig[item.key])}
                      onCheckedChange={(value) => handleConfigChange("node-1", { [item.key]: value })}
                    />
                  </div>
                ))}
              </div>
            )}

            {activeNodeId === "node-2" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="response-mode">Response style</Label>
                  <Input
                    id="response-mode"
                    value={activeConfig.responseMode}
                    onChange={(event) => handleConfigChange("node-2", { responseMode: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="prompt">Prompt instructions</Label>
                  <Textarea
                    id="prompt"
                    rows={6}
                    value={activeConfig.prompt}
                    onChange={(event) => handleConfigChange("node-2", { prompt: event.target.value })}
                    className="border-border/60"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Explain how the automation should sound. The prompt is injected before every response call.
                  </p>
                </div>
              </div>
            )}

            {activeNodeId === "node-3" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <Label htmlFor="auto-publish" className="text-sm font-medium">
                    Auto publish replies
                  </Label>
                  <Switch
                    id="auto-publish"
                    checked={Boolean(activeConfig.autoPublish)}
                    onCheckedChange={(value) => handleConfigChange("node-3", { autoPublish: value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <Label htmlFor="moderation-enabled" className="text-sm font-medium">
                    Require human review
                  </Label>
                  <Switch
                    id="moderation-enabled"
                    checked={Boolean(activeConfig.moderationEnabled)}
                    onCheckedChange={(value) => handleConfigChange("node-3", { moderationEnabled: value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/60 bg-background/60 px-6 py-4 text-xs text-muted-foreground">
            Position nodes anywhere inside the canvas. Copy this blueprint into your own backend to run production flows.
          </CardFooter>
        </Card>
      </div>

      <TerminalLog logs={terminalLogs} />
    </div>
  );
};

export default AutomationSandbox;
