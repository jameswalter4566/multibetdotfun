import { useEffect, useMemo, useRef, useState } from "react";
import { PlayCircle, Repeat, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

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

const NODE_WIDTH = 240;
const NODE_HEIGHT = 130;

const INITIAL_NODES: AutomationNode[] = [
  {
    id: "node-0",
    title: "Listen for Mentions",
    description: "Monitor X (Twitter) mentions for a handle.",
    color: "rgba(14,165,255,0.16)",
    borderColor: "rgba(14,165,255,0.45)",
    position: { x: 40, y: 60 },
  },
  {
    id: "node-1",
    title: "Filter Timeline",
    description: "Decide which incoming events should continue.",
    color: "rgba(16,185,129,0.14)",
    borderColor: "rgba(16,185,129,0.45)",
    position: { x: 340, y: 20 },
  },
  {
    id: "node-2",
    title: "Draft Response",
    description: "Generate on-brand responses with AI prompts.",
    color: "rgba(249,115,22,0.16)",
    borderColor: "rgba(249,115,22,0.5)",
    position: { x: 640, y: 140 },
  },
  {
    id: "node-3",
    title: "Ship Reply",
    description: "Queue or automatically publish the reply.",
    color: "rgba(168,85,247,0.16)",
    borderColor: "rgba(168,85,247,0.5)",
    position: { x: 940, y: 80 },
  },
];

const INITIAL_CONFIGS: Record<string, any> = {
  "node-0": {
    twitterHandle: "marketx402",
    pollFrequency: 5,
    maxMentions: 25,
  },
  "node-1": {
    filterQuestions: true,
    filterHashtags: false,
    filterShortPosts: false,
  },
  "node-2": {
    responseMode: "conversational",
    prompt:
      "You are an on-brand automation that replies with concise, friendly and helpful tone. Reference the original tweet when it adds value.",
  },
  "node-3": {
    autoPublish: false,
    moderationEnabled: true,
  },
};

const CONNECTORS: ConnectorEdge[] = [
  { from: "node-0", to: "node-1", animated: true },
  { from: "node-1", to: "node-2", animated: true },
  { from: "node-2", to: "node-3", animated: true },
];

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

type NodeProps = AutomationNode & {
  isActive: boolean;
  onStartDrag: (id: string, offsetX: number, offsetY: number) => void;
  onSelect: (id: string) => void;
};

const AutomationNode = ({
  id,
  title,
  description,
  color,
  borderColor,
  position,
  isActive,
  onStartDrag,
  onSelect,
}: NodeProps) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    onStartDrag(id, offsetX, offsetY);
  };

  return (
    <div
      ref={nodeRef}
      onMouseDown={handleMouseDown}
      onClick={() => onSelect(id)}
      role="button"
      tabIndex={0}
      className={`automation-node select-none rounded-2xl border p-4 shadow-lg transition-transform duration-150 ${
        isActive ? "ring-2 ring-offset-2 ring-white" : "hover:-translate-y-1"
      }`}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: color,
        borderColor,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/70">{description}</p>
        </div>
        <Zap className="h-5 w-5 text-white/60" />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/5" />
    </div>
  );
};

const Connector = ({ startX, startY, endX, endY, animated }: { startX: number; startY: number; endX: number; endY: number; animated?: boolean }) => {
  const path = useMemo(() => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const horizontal = Math.min(Math.abs(deltaX) * 0.5, 160);
    const vertical = Math.min(Math.abs(deltaY) * 0.5, 120);

    let cp1x = startX + horizontal;
    let cp1y = startY;
    let cp2x = endX - horizontal;
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
      <path d={path} stroke="rgba(255,255,255,0.28)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path
        d={path}
        stroke={animated ? "rgba(255,255,255,0.8)" : "transparent"}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="6,8"
        className={animated ? "animate-[dash_2.8s_linear_infinite]" : ""}
      />
    </svg>
  );
};

export const AutomationSandbox = () => {
  const [nodes, setNodes] = useState<AutomationNode[]>(INITIAL_NODES);
  const [configs, setConfigs] = useState<Record<string, any>>(INITIAL_CONFIGS);
  const [activeNodeId, setActiveNodeId] = useState<string>(INITIAL_NODES[0].id);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left - dragState.offsetX;
      const y = event.clientY - rect.top - dragState.offsetY;

      setNodes((current) =>
        current.map((node) =>
          node.id === dragState.id
            ? {
                ...node,
                position: {
                  x: Math.max(24, Math.min(rect.width - NODE_WIDTH - 24, x)),
                  y: Math.max(24, Math.min(rect.height - NODE_HEIGHT - 24, y)),
                },
              }
            : node
        )
      );
    };

    const handleMouseUp = () => setDragState(null);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState]);

  const handleConfigChange = (id: string, next: Partial<Record<string, any>>) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  };

  const handleResetLayout = () => {
    setNodes(INITIAL_NODES);
    setConfigs(INITIAL_CONFIGS);
    setActiveNodeId(INITIAL_NODES[0].id);
    toast({ title: "Layout reset", description: "Nodes returned to their default positions." });
  };

  const runAutomation = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      toast({
        title: "Automation simulated",
        description: "The flow executed using the current configuration. Connect a backend to run this live.",
      });
    }, 1200);
  };

  const getConnectorPosition = (id: string) => {
    const node = nodes.find((item) => item.id === id);
    if (!node) return { x: 0, y: 0 };
    return { x: node.position.x + NODE_WIDTH / 2, y: node.position.y + NODE_HEIGHT / 2 };
  };

  const getEdgeAnchors = (edge: ConnectorEdge) => {
    const from = nodes.find((item) => item.id === edge.from);
    const to = nodes.find((item) => item.id === edge.to);
    if (!from || !to) return null;
    return {
      startX: from.position.x + NODE_WIDTH,
      startY: from.position.y + NODE_HEIGHT / 2,
      endX: to.position.x,
      endY: to.position.y + NODE_HEIGHT / 2,
    };
  };

  const activeConfig = configs[activeNodeId] ?? {};

  return (
    <div className="space-y-8">
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
            onClick={runAutomation}
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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0ea5ff1c] to-transparent" />
          {CONNECTORS.map((edge) => {
            const anchors = getEdgeAnchors(edge);
            if (!anchors) return null;
            return <Connector key={`${edge.from}-${edge.to}`} animated={edge.animated} {...anchors} />;
          })}

          {nodes.map((node) => (
            <AutomationNode
              key={node.id}
              {...node}
              isActive={node.id === activeNodeId}
              onSelect={(id) => setActiveNodeId(id)}
              onStartDrag={(id, offsetX, offsetY) => setDragState({ id, offsetX, offsetY })}
            />
          ))}
        </div>

        <Card className="border border-border/60 bg-background/70 backdrop-blur shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Step configuration</CardTitle>
            <CardDescription>
              Tweak how <span className="font-medium text-foreground">{nodes.find((node) => node.id === activeNodeId)?.title}</span>{" "}
              behaves inside the flow. Changes update live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeNodeId === "node-0" && (
              <>
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
                      onChange={(event) =>
                        handleConfigChange("node-0", { pollFrequency: Number(event.target.value) || 1 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-mentions">Max mentions per cycle</Label>
                    <Input
                      id="max-mentions"
                      type="number"
                      min={1}
                      value={activeConfig.maxMentions}
                      onChange={(event) =>
                        handleConfigChange("node-0", { maxMentions: Number(event.target.value) || 1 })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {activeNodeId === "node-1" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <Label htmlFor="filter-questions" className="text-sm font-medium">
                    Prioritize questions
                  </Label>
                  <Switch
                    id="filter-questions"
                    checked={Boolean(activeConfig.filterQuestions)}
                    onCheckedChange={(value) => handleConfigChange("node-1", { filterQuestions: value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <Label htmlFor="filter-hashtags" className="text-sm font-medium">
                    Skip hashtag-only posts
                  </Label>
                  <Switch
                    id="filter-hashtags"
                    checked={Boolean(activeConfig.filterHashtags)}
                    onCheckedChange={(value) => handleConfigChange("node-1", { filterHashtags: value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <Label htmlFor="filter-short" className="text-sm font-medium">
                    Ignore very short posts
                  </Label>
                  <Switch
                    id="filter-short"
                    checked={Boolean(activeConfig.filterShortPosts)}
                    onCheckedChange={(value) => handleConfigChange("node-1", { filterShortPosts: value })}
                  />
                </div>
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
                    placeholder="conversational"
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
                    Give your automation personality. The prompt is injected before each response call.
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
            Position nodes anywhere inside the canvas. Drag edges to visualize data flow, or copy this blueprint into
            your own backend to execute the automations for real.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AutomationSandbox;
