import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, Repeat } from "lucide-react";
import { AUTOMATION_SUPPORT_WALLET } from "@/constants/automation";

const CANVAS_BACKGROUND = "radial-gradient(circle at 20px 20px, rgba(168,85,247,0.12) 0, rgba(168,85,247,0.12) 1px, transparent 1px)";

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

const DEFAULT_NODES: CanvasNode[] = [
  {
    id: "assistant-node",
    title: "AI assistant",
    description: "Understands tasks and orchestrates flows",
    color: "rgba(168,85,247,0.18)",
    borderColor: "rgba(168,85,247,0.5)",
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

const DEFAULT_AUTOMATION_NAME = "untitled";
const DEFAULT_AUTOMATION_FLAGS = { autoPublish: false, moderation: true };

const TerminalLog = ({ logs }: { logs: string[] }) => (
  <div className="rounded-[32px] border border-white/5 bg-[#030712]/90 p-5 shadow-[0_30px_80px_rgba(3,7,18,0.65)] backdrop-blur">
    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
      <span>Automation terminal</span>
      <span>live feed</span>
    </div>
    <div className="mt-4 max-h-60 overflow-y-auto rounded-2xl bg-black/70 p-4 font-mono text-xs text-[#c5fffd]">
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
    </div>
  </div>
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
  const [nodes, setNodes] = useState<CanvasNode[]>(() => DEFAULT_NODES.map((node) => ({ ...node })));
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [connectorAnchors, setConnectorAnchors] = useState<
    Array<{ id: string; startX: number; startY: number; endX: number; endY: number; animated?: boolean }>
  >([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { toast } = useToast();
  const walletAddress = AUTOMATION_SUPPORT_WALLET;

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
    updateAnchors();
  }, [nodes, updateAnchors]);

  useEffect(() => {
    const handleResize = () => updateAnchors();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateAnchors]);


  const resetLayout = () => {
    const seeded = DEFAULT_NODES.map((node) => ({ ...node }));
    setNodes(seeded);
    setConnectorAnchors([]);
    nodeRefs.current = {};
    requestAnimationFrame(() => updateAnchors());
    toast({ title: "Workspace reset", description: "Node canvas refreshed." });
  };

  const simulateAutomation = () => {
    const now = new Date().toISOString();
    const synthetic = [
      JSON.stringify({ timestamp: now, stage: "fetch_sources", wallet: walletAddress, filters: DEFAULT_AUTOMATION_FLAGS }, null, 2),
      JSON.stringify({ timestamp: now, stage: "draft_automation", name: DEFAULT_AUTOMATION_NAME }, null, 2),
    ];

    setTerminalLogs((prev) => [...synthetic, ...prev].slice(0, 40));
    toast({ title: "Automation simulated", description: "Streaming raw events to the terminal." });
  };

  return (
    <div id="sandbox" className="flex h-full flex-col gap-8">
      <style>{`
        @keyframes automation-dash { to { stroke-dashoffset: -180; } }
      `}</style>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Automation playground</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Drag nodes, wire third-party APIs, and stream raw logs while the agent drafts your workflow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="rounded-full border-border/70 bg-background px-6 py-2 text-sm" onClick={resetLayout}>
            <Repeat className="mr-2 h-4 w-4" />
            Reset layout
          </Button>
          <Button
            className="rounded-full bg-[#a855f7] px-6 py-2 text-sm font-semibold text-white shadow-[0_0_30px_rgba(168,85,247,0.55)] hover:bg-[#9333ea]"
            onClick={simulateAutomation}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Run automation
          </Button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 rounded-[48px] bg-[#1a0833] p-10 shadow-[0_70px_120px_rgba(26,8,51,0.8)]">
        <div
          ref={canvasRef}
          className="relative h-full w-full overflow-hidden rounded-[32px]"
          style={{ backgroundImage: CANVAS_BACKGROUND, backgroundSize: "40px 40px" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#a855f724] to-transparent" />
          {nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-sm space-y-3 text-sm text-white/70">
                <p className="text-base font-semibold text-white">Your canvas is empty</p>
                <p>Prompt the AI assistant to generate nodes or drag them in from the marketplace.</p>
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
      </div>

      <TerminalLog logs={terminalLogs} />
    </div>
  );
};

export default AutomationSandbox;
