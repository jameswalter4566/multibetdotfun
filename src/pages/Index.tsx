import SiteFooter from "@/components/SiteFooter";
import UserBadge from "@/components/UserBadge";
import OrganizersRealtimeGrid from "@/components/OrganizersRealtimeGrid";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Heart, Pill, AlertTriangle, Megaphone, Rocket, GraduationCap } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { agoraLive } from '@/services/agoraLive';
import AgoraRTC from 'agora-rtc-sdk-ng';

function NeonCircle({
  side,
  top,
  delay = 0,
  label,
  rotate = 0,
  offsetX = 16,
  color = "#0ea5ff",
  progress = 0.7,
  Icon,
  imgSrc,
  imgScale = 1.82,
}: {
  side: "left" | "right";
  top: number;
  delay?: number;
  label: string;
  rotate?: number;
  offsetX?: number;
  color?: string;
  progress?: number; // 0..1
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  imgSrc?: string;
  imgScale?: number;
}) {
  const size = 120; // visual diameter
  const stroke = 10;
  const pad = 8; // extra padding to avoid SVG cap clipping
  const r = (size / 2) - (stroke / 2);
  const C = Math.PI * 2 * r;
  const [entered, setEntered] = useState(false);
  const [offset, setOffset] = useState(C);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), delay);
    const p = setTimeout(() => setOffset(C * (1 - Math.max(0, Math.min(1, progress)))), delay + 250);
    return () => { clearTimeout(t); clearTimeout(p); };
  }, [C, delay, progress]);
  const baseTransform = side === 'left' ? 'translateX(-36px)' : 'translateX(36px)';
  const finalTransform = 'translateX(0)';
  const posStyle: React.CSSProperties = {
    position: 'absolute',
    top,
    [side]: offsetX,
    transform: `${entered ? finalTransform : baseTransform} rotate(${rotate}deg)`,
    transition: 'transform 700ms ease-out, opacity 700ms ease-out',
    transitionDelay: `${delay}ms`,
    opacity: entered ? 1 : 0,
  } as any;
  return (
    <div style={posStyle} className="hidden md:block select-none">
      <div className="relative" style={{ width: size + pad * 2, height: size + pad * 2 }}>
        <svg width={size + pad * 2} height={size + pad * 2} viewBox={`0 0 ${size + pad * 2} ${size + pad * 2}`}>
          <defs>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#0ea5ff" floodOpacity="0.9" />
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#0ea5ff" floodOpacity="0.6" />
            </filter>
          </defs>
          {/* track */}
          <circle cx={size/2 + pad} cy={size/2 + pad} r={r} fill="none" stroke="rgba(14,165,255,0.15)" strokeWidth={stroke} />
          {/* progress */}
          <circle
            cx={size/2 + pad}
            cy={size/2 + pad}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{
              filter: 'url(#neonGlow)',
              transition: 'stroke-dashoffset 1200ms ease-out',
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%'
            }}
          />
        </svg>
        {imgSrc ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={imgSrc}
              alt=""
              className="rounded-full object-cover border border-cyan-400/40 shadow-sm"
              style={{ width: `${56 * imgScale}px`, height: `${56 * imgScale}px` }}
            />
          </div>
        ) : Icon ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon size={28} className="text-cyan-300" />
          </div>
        ) : null}
        <div className={side === 'left' ? "absolute top-1/2 -translate-y-1/2 right-[calc(100%+8px)]" : "absolute top-1/2 -translate-y-1/2 left-[calc(100%+8px)]"}>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-background/90 border border-cyan-500/40 text-cyan-300 whitespace-nowrap shadow-sm">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  // Hero causes (displayed under headline)
  const causes = useMemo(() => [
    'Charity', 'New start up', 'Awareness', 'Education'
  ], []);
  const neonColors = useMemo(() => ['#0ea5ff', '#f97316', '#a855f7'], []);
  const [causeIdx, setCauseIdx] = useState(0);
  const [prevCauseIdx, setPrevCauseIdx] = useState<number | null>(null);
  const [causeEntering, setCauseEntering] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setPrevCauseIdx(causeIdx);
      setCauseIdx(i => (i + 1) % causes.length);
      setCauseEntering(true);
      const raf = setTimeout(() => setCauseEntering(false), 20);
      const cleanup = setTimeout(() => setPrevCauseIdx(null), 650);
      return () => { clearTimeout(raf); clearTimeout(cleanup); };
    }, 3000);
    return () => clearInterval(interval);
  }, [causeIdx, causes.length]);
  const heroTags = useMemo(() => [
    'Your cause', 'Medical', 'Emergency', 'Spread awareness', 'New start up', 'Education', 'Support a cause'
  ], []);
  // Debug positions & rotation
  const [c1Top, setC1Top] = useState(46);
  const [c1X, setC1X] = useState(203);
  const [c1Rot, setC1Rot] = useState(0);
  const [c2Top, setC2Top] = useState(58);
  const [c2X, setC2X] = useState(224);
  const [c2Rot, setC2Rot] = useState(-8);
  const [c3Top, setC3Top] = useState(210);
  const [c3X, setC3X] = useState(98);
  const [c3Rot, setC3Rot] = useState(6);
  // Additional three circles
  const [c4Top, setC4Top] = useState(212);
  const [c4X, setC4X] = useState(96);
  const [c4Rot, setC4Rot] = useState(4);
  const [c5Top, setC5Top] = useState(319);
  const [c5X, setC5X] = useState(260);
  const [c5Rot, setC5Rot] = useState(-6);
  const [c6Top, setC6Top] = useState(322);
  const [c6X, setC6X] = useState(260);
  const [c6Rot, setC6Rot] = useState(8);
  // Hero layout debug states
  const [subX, setSubX] = useState(26);
  const [subY, setSubY] = useState(-23);
  const [subScale, setSubScale] = useState(1.13);
  const [causeX, setCauseX] = useState(-150);
  const [causeY, setCauseY] = useState(-21);
  const [causeScale, setCauseScale] = useState(1);
  const [ctaTop, setCtaTop] = useState(0);
  const [ctaX, setCtaX] = useState(54); // adjusted per design
  const [ctaScale, setCtaScale] = useState(1);
  // Paragraph offset and quick control panel
  const [descX, setDescX] = useState(0);
  const [showPos, setShowPos] = useState(false);
  // Per-cause X offsets for individual centering
  const [causeOffsets, setCauseOffsets] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    try {
      const sx = localStorage.getItem('pos:subX'); if (sx !== null) setSubX(parseInt(sx));
      const cx = localStorage.getItem('pos:ctaX'); if (cx !== null) setCtaX(parseInt(cx));
      const dx = localStorage.getItem('pos:descX'); if (dx !== null) setDescX(parseInt(dx));
      const co: number[] = [];
      for (let i = 0; i < 8; i++) { // read up to 8 potential causes
        const k = localStorage.getItem(`pos:causeX:${i}`);
        if (k !== null) co[i] = parseInt(k);
      }
      if (co.length) setCauseOffsets((prev) => prev.map((v, i) => (typeof co[i] === 'number' && !Number.isNaN(co[i]!) ? co[i]! : v)));
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem('pos:subX', String(subX)); } catch {} }, [subX]);
  useEffect(() => { try { localStorage.setItem('pos:ctaX', String(ctaX)); } catch {} }, [ctaX]);
  useEffect(() => { try { localStorage.setItem('pos:descX', String(descX)); } catch {} }, [descX]);
  useEffect(() => {
    try {
      causeOffsets.forEach((v, i) => localStorage.setItem(`pos:causeX:${i}`, String(v || 0)));
    } catch {}
  }, [causeOffsets]);

  // Apply new requested defaults on mount
  useEffect(() => {
    setDescX(0); setSubX(26); setCtaX(54);
    try {
      localStorage.setItem('pos:descX','0');
      localStorage.setItem('pos:subX','26');
      localStorage.setItem('pos:ctaX','54');
    } catch {}
  }, []);
  
  
  // Discover campaigns
  type CampaignLite = { id: number; title: string; description: string; image_url: string | null; raised_sol: number; goal_sol?: number | null; created_at: string; is_live?: boolean | null; channel_name?: string | null; started_at?: string | null };
  const [recentCamps, setRecentCamps] = useState<CampaignLite[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setRecentLoading(true);
        const { data } = await supabase
          .from('campaigns')
          .select('id, title, description, image_url, raised_sol, goal_sol, created_at, is_live, channel_name, started_at')
          .order('is_live', { ascending: false })
          .order('started_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(30);
        if (!cancelled) setRecentCamps((data as any) || []);
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    const ch = supabase
      .channel('discover-campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, async () => {
        try {
          const { data } = await supabase
            .from('campaigns')
            .select('id, title, description, image_url, raised_sol, goal_sol, created_at, is_live, channel_name, started_at')
            .order('is_live', { ascending: false })
            .order('started_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(30);
          setRecentCamps((data as any) || []);
        } catch {}
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} cancelled = true; };
  }, []);

  // Live previews inside Discover grid
  const containersRef = useRef<Record<string, HTMLDivElement | null>>({});
  const previewing = useRef<Set<string>>(new Set());
  const ioRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    try {
      ioRef.current = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const el = e.target as HTMLDivElement;
          const ch = el?.dataset?.channel as string | undefined;
          if (!ch) continue;
          if (e.isIntersecting) void startPreview(ch);
          else void stopPreview(ch);
        }
      }, { threshold: 0.2 });
    } catch {}
    return () => { try { ioRef.current?.disconnect(); } catch {} };
  }, []);

  const setContainerRef = (channel: string) => (el: HTMLDivElement | null) => {
    containersRef.current[channel] = el;
    if (el) { try { el.dataset.channel = channel; ioRef.current?.observe(el); } catch {} }
  };

  const startPreview = async (channel: string) => {
    if (!channel || previewing.current.has(channel)) return;
    const el = containersRef.current[channel]; if (!el) return;
    previewing.current.add(channel);
    try {
      agoraLive.setHandlers(channel, {
        onUserPublished: (user, mediaType) => {
          if (mediaType === 'video') {
            const node = containersRef.current[channel]; if (!node) return;
            node.innerHTML = '';
            try { user.videoTrack?.play(node); } catch {}
          }
        },
      });
      await agoraLive.join(channel, 'audience');
    } catch {
      previewing.current.delete(channel);
    }
  };

  const stopPreview = async (channel: string) => {
    try { await agoraLive.leave(channel); } catch {}
    const el = containersRef.current[channel]; if (el) el.innerHTML = '';
    previewing.current.delete(channel);
  };

  const stopAllPreviews = async () => {
    const chans = Array.from(previewing.current);
    try { await Promise.all(chans.map((ch) => stopPreview(ch))); } catch {}
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Top-left logo (larger and shifted right) */}
      <a href="/" className="fixed top-2 left-12 md:left-16 z-20 flex items-center">
        <img src="/f6cc0350-62e9-4a52-a7b4-e9955a2333a3.png" alt="Liberated" className="h-16 w-auto md:h-20 lg:h-24 align-middle" />
        <img src="/950b5320-c3a6-44f1-8b8e-bdd46eb85fdf.png" alt="Partner" className="h-16 w-auto md:h-20 lg:h-24 ml-3 align-middle" />
      </a>

      {/* Top-right navigation (plain text links, aligned with logo) */}
      <nav className="fixed top-2 right-16 md:right-24 z-20 h-12 md:h-14 lg:h-16 flex items-center gap-6 md:gap-8">
        <a href="#mission" className="text-foreground/90 hover:underline text-sm md:text-base">Mission</a>
        <a href="#workers" className="text-foreground/90 hover:underline text-sm md:text-base">Explore Organizers</a>
        <a href="/explore" className="text-foreground/90 hover:underline text-sm md:text-base">Explore Campaigns</a>
        <a href="/campaigns" className="text-foreground/90 hover:underline text-sm md:text-base">Start a Campaign</a>
        <UserBadge />
        <a href="https://x.com/liberatedorg" target="_blank" rel="noopener noreferrer" className="text-foreground/90 hover:underline text-sm md:text-base">Follow us on X</a>
      </nav>

      <main className="container mx-auto px-2 md:px-4 py-2 md:py-3 mb-12 overflow-visible">
        {/* Center hero logo removed */}

        {/* Hero headline */}
        <div id="mission" className="relative mt-[65px] mb-6 overflow-visible py-6 md:py-8 min-h-[480px] md:min-h-[560px]">
          <h1 className="text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight">
            empowering creators through streaming visibility.  Stream any coin on any launch pad, on any platform.
          </h1>
          <p className="mt-3 text-center text-foreground/80 max-w-xl mx-auto text-sm md:text-base leading-relaxed" style={{ transform: `translateX(${descX}px)` }}>
            Launch a campagin for your cause instantly. Through livestream tokenization Liberated allows you to raise capital for your cause without ever having to receive a direct donation.
          </p>
          {showPos && (
            <div className="mt-1 text-center text-[10px] text-muted-foreground">descX: {descX}px</div>
          )}
          {/* Glowing hero subheading + animated causes */}
          <div className="mt-8 md:mt-10 text-center" style={{ transform: `translate(${subX}px, ${subY}px) scale(${subScale})` }}>
            <div
              className="font-extrabold text-white"
              style={{ fontSize: 'clamp(20px, 4vw, 40px)', textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' }}
            >
              Start a Fundraiser for:
            </div>
            <div className="relative mt-3 h-[1.8em]" style={{ fontSize: 'clamp(22px, 5vw, 48px)', transform: `translate(${causeX}px, ${causeY}px) scale(${causeScale})` }}>
              {/* Current cause (slides in from top) */}
              <span
                className="absolute left-1/2 -translate-x-1/2 font-extrabold whitespace-nowrap"
                style={{
                  top: 0,
                  color: neonColors[causeIdx % neonColors.length],
                  textShadow: `0 0 10px ${neonColors[causeIdx % neonColors.length]}AA, 0 0 18px ${neonColors[causeIdx % neonColors.length]}88`,
                  transform: `${causeEntering ? 'translateY(-100%)' : 'translateY(0%)'} translateX(${causeOffsets[causeIdx] || 0}px)`,
                  opacity: causeEntering ? 0 : 1,
                  transition: 'transform 500ms ease-out, opacity 500ms ease-out'
                }}
              >
                {causes[causeIdx]}
              </span>
              {/* Previous cause (slides down and fades out) */}
              {prevCauseIdx !== null && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 font-extrabold whitespace-nowrap"
                  style={{
                    top: 0,
                    color: neonColors[prevCauseIdx % neonColors.length],
                    textShadow: `0 0 10px ${neonColors[prevCauseIdx % neonColors.length]}AA, 0 0 18px ${neonColors[prevCauseIdx % neonColors.length]}88`,
                    transform: `${causeEntering ? 'translateY(0%)' : 'translateY(100%)'} translateX(${causeOffsets[prevCauseIdx] || 0}px)`,
                    opacity: causeEntering ? 1 : 0,
                    transition: 'transform 500ms ease-out, opacity 500ms ease-out'
                  }}
                >
                  {causes[prevCauseIdx]}
                </span>
              )}
            </div>
          </div>
          {/* Neon animated circles (decorative) — three on each side */}
          {/* Row 1 */}
          <NeonCircle side="left" top={c1Top} offsetX={c1X} delay={100} label={heroTags[0]} rotate={c1Rot} imgSrc="/your-cause.jpg" />
          <NeonCircle side="right" top={c2Top} offsetX={c2X} delay={180} label={heroTags[1]} rotate={c2Rot} imgSrc="/circle-medical.jpg" />
          {/* Row 2 */}
          <NeonCircle side="left" top={c3Top} offsetX={c3X} delay={260} label={heroTags[2]} rotate={c3Rot} imgSrc="/circle-emergency.jpg" />
          <NeonCircle side="right" top={c4Top} offsetX={c4X} delay={340} label={heroTags[3]} rotate={c4Rot} imgSrc="/circle-awareness.jpg" />
          {/* Row 3 */}
          <NeonCircle side="left" top={c5Top} offsetX={c5X} delay={420} label={heroTags[4]} rotate={c5Rot} imgSrc="/circle-startup.jpg" />
          <NeonCircle side="right" top={c6Top} offsetX={c6X} delay={500} label={heroTags[5]} rotate={c6Rot} imgSrc="/circle-education.webp" />

          {/* CTA inside hero, aligned with row 3 */}
          <div className="absolute left-1/2" style={{ top: 420 + ctaTop, transform: `translateX(-50%) translateX(${ctaX}px) scale(${ctaScale})` }}>
            <Button
              asChild
              variant="ios"
              className="text-lg md:text-xl rounded-xl text-white bg-[#0ea5ff] hover:bg-[#08b0ff] shadow-[0_0_12px_rgba(14,165,255,0.9),0_0_24px_rgba(14,165,255,0.6)] w-[180px] md:w-[260px] h-[32px] md:h-[36px] px-0 py-0"
            >
              <a href="/campaigns" className="w-full h-full flex items-center justify-center">
                Launch a campaign
              </a>
            </Button>
            <div className="mt-2 text-[11px] md:text-xs text-foreground/80 text-center">
              Each stream is tokenized by and dually streamed to pump.fun!
            </div>
            {showPos && (
              <div className="mt-1 text-center text-[10px] text-muted-foreground">ctaX: {ctaX}px</div>
            )}
          </div>
        </div>
                        {/* Spacer under hero minimized to pull content up */}
        <div className="mb-0" />

        {/* Live Stream Grid removed; Discover Campaigns follows directly */}

        {/* Discover Campaigns (pulled higher) */}
        <section className="mt-1 md:mt-2 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Discover Campaigns</h2>
            <a href="/campaigns" className="text-sm underline">See more</a>
          </div>
          {recentLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : recentCamps.length === 0 ? (
            <div className="text-sm text-muted-foreground">No campaigns yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentCamps.map(c => (
                <div key={c.id} className="ios-card overflow-hidden">
                  <a href={`/campaign/${c.id}`} className="block" onClick={async () => { try { await AgoraRTC.resumeAudioContext(); } catch {}; try { sessionStorage.setItem('agoraAudioUnlocked','1'); } catch {}; await stopAllPreviews(); }}>
                    <div className="relative w-full aspect-square bg-black">
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.title} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-muted" />
                      )}
                      {c.is_live ? (
                        <div ref={setContainerRef((c as any).channel_name || `campaign-${c.id}`)} className="absolute inset-0" />
                      ) : null}
                      {c.is_live ? (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-0.5 text-xs rounded bg-red-600 text-white">LIVE</span>
                        </div>
                      ) : null}
                    </div>
                  </a>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate" title={c.title}>{c.title}</div>
                      <Button variant="iosOutline" size="sm" onClick={async () => { try { await AgoraRTC.resumeAudioContext(); } catch {}; try { sessionStorage.setItem('agoraAudioUnlocked','1'); } catch {}; await stopAllPreviews(); window.location.href = `/campaign/${c.id}`; }}>
                        Watch Stream
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</div>
                    {/* Campaign progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Campaign progress</span>
                        <span>Campaign goal</span>
                      </div>
                      {(() => {
                        const raised = Number(c.raised_sol || 0);
                        const goal = Number(c.goal_sol || 0);
                        const pct = goal > 0 ? Math.max(0, Math.min(100, (raised / goal) * 100)) : 0;
                        return (
                          <div className="h-2 rounded-full bg-muted/50 overflow-hidden ring-1 ring-border relative">
                            <div
                              className="h-full rounded-full bg-[#0ea5ff] shadow-[0_0_8px_rgba(14,165,255,0.9),_0_0_16px_rgba(14,165,255,0.6)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        );
                      })()}
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {Number(c.raised_sol || 0).toFixed(2)} SOL raised out of {Number(c.goal_sol || 0).toFixed(2)} SOL goal
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick X-axis position controls */}
        <div className="fixed bottom-3 right-3 z-40">
          {!showPos ? (
            <button
              onClick={() => setShowPos(true)}
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs shadow"
              title="Adjust hero positions"
            >
              Adjust positions
            </button>
          ) : (
            <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-3 w-64 shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium">Position Controls</div>
                <button className="text-xs underline" onClick={() => setShowPos(false)}>Close</button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Paragraph X</div>
                  <Slider value={[descX]} onValueChange={(v)=> setDescX(v?.[0] ?? 0)} min={-300} max={300} step={1} />
                  <div className="mt-1 flex items-center gap-2">
                    <input type="number" className="w-20 h-7 px-2 rounded border border-border bg-background text-xs"
                      value={descX} onChange={(e)=> setDescX(parseInt(e.target.value || '0'))} />
                    <div className="text-[11px] text-muted-foreground">{descX}px</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Section X</div>
                  <Slider value={[subX]} onValueChange={(v)=> setSubX(v?.[0] ?? 0)} min={-300} max={300} step={1} />
                  <div className="mt-1 flex items-center gap-2">
                    <input type="number" className="w-20 h-7 px-2 rounded border border-border bg-background text-xs"
                      value={subX} onChange={(e)=> setSubX(parseInt(e.target.value || '0'))} />
                    <div className="text-[11px] text-muted-foreground">{subX}px</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Button X</div>
                  <Slider value={[ctaX]} onValueChange={(v)=> setCtaX(v?.[0] ?? 0)} min={-300} max={300} step={1} />
                  <div className="mt-1 flex items-center gap-2">
                    <input type="number" className="w-20 h-7 px-2 rounded border border-border bg-background text-xs"
                      value={ctaX} onChange={(e)=> setCtaX(parseInt(e.target.value || '0'))} />
                    <div className="text-[11px] text-muted-foreground">{ctaX}px</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Causes X offsets</div>
                  <div className="grid grid-cols-2 gap-2">
                    {causes.map((label, i) => (
                      <div key={i} className="border border-border rounded p-2">
                        <div className="text-[11px] text-muted-foreground mb-1 truncate">{label}</div>
                        <Slider value={[causeOffsets[i] || 0]} onValueChange={(v)=> setCauseOffsets((arr)=> { const n=[...arr]; n[i]=v?.[0] ?? 0; return n; })} min={-300} max={300} step={1} />
                        <div className="mt-1 flex items-center gap-2">
                          <input type="number" className="w-20 h-7 px-2 rounded border border-border bg-background text-xs"
                            value={causeOffsets[i] || 0}
                            onChange={(e)=> setCauseOffsets((arr)=> { const n=[...arr]; n[i]=parseInt(e.target.value || '0'); return n; })}
                          />
                          <div className="text-[11px] text-muted-foreground">{(causeOffsets[i] || 0)}px</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-between pt-1">
                  <button
                    className="px-2 py-1 rounded border border-border text-[11px] hover:bg-accent"
                    onClick={() => { setDescX(0); setSubX(0); setCtaX(0); setCauseOffsets(causes.map(()=>0)); }}
                  >Reset</button>
                  <button
                    className="px-2 py-1 rounded bg-primary text-primary-foreground text-[11px] hover:opacity-90"
                    onClick={() => { try { navigator.clipboard.writeText(JSON.stringify({ descX, subX, ctaX, causeOffsets })); } catch {} }}
                  >Copy JSON</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explore Organizers: realtime + static tiles (expand bio to the right) */}
        <section id="workers" className="mt-6 md:mt-10 max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-foreground text-center mb-6">Explore Organizers</h2>
          {/* Realtime organizers from Supabase */}
          <div className="mb-6">
            <OrganizersRealtimeGrid />
          </div>
          {/* Static hard-coded tiles removed now that realtime data is live */}
        </section>

        {/* Static bios modal removed */}
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
