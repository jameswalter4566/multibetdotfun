import SiteFooter from "@/components/SiteFooter";
import UserBadge from "@/components/UserBadge";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { agoraLive } from "@/services/agoraLive";
import AgoraRTC from "agora-rtc-sdk-ng";

type CampaignLite = {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  raised_sol: number;
  goal_sol?: number | null;
  created_at: string;
  is_live?: boolean | null;
  channel_name?: string | null;
  started_at?: string | null;
};

type ContainersMap = Record<string, HTMLDivElement | null>;

const sideLinks = [{ label: "Explore API market place", href: "/marketplace" }];

export default function Index() {
  const [recentCamps, setRecentCamps] = useState<CampaignLite[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const containersRef = useRef<ContainersMap>({});
  const previewing = useRef<Set<string>>(new Set());
  const ioRef = useRef<IntersectionObserver | null>(null);

  const setContainerRef = (channel: string) => (el: HTMLDivElement | null) => {
    containersRef.current[channel] = el;
    if (!el) return;
    try {
      el.dataset.channel = channel;
      ioRef.current?.observe(el);
    } catch {
      // ignore observe errors
    }
  };

  const startPreview = async (channel: string) => {
    if (!channel || previewing.current.has(channel)) return;
    const container = containersRef.current[channel];
    if (!container) return;
    previewing.current.add(channel);
    try {
      agoraLive.setHandlers(channel, {
        onUserPublished: (user, mediaType) => {
          if (mediaType === "video") {
            const target = containersRef.current[channel];
            if (!target) return;
            target.innerHTML = "";
            try {
              user.videoTrack?.play(target);
            } catch {
              // ignore playback errors
            }
          }
        },
      });
      await agoraLive.join(channel, "audience");
    } catch {
      previewing.current.delete(channel);
    }
  };

  const stopPreview = async (channel: string) => {
    try {
      await agoraLive.leave(channel);
    } catch {
      // ignore leave errors
    }
    const node = containersRef.current[channel];
    if (node) node.innerHTML = "";
    previewing.current.delete(channel);
  };

  const stopAllPreviews = async () => {
    const copy = Array.from(previewing.current);
    if (!copy.length) return;
    try {
      await Promise.all(copy.map((c) => stopPreview(c)));
    } catch {
      // ignore bulk stop errors
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setRecentLoading(true);
        const { data } = await supabase
          .from("campaigns")
          .select("id, title, description, image_url, raised_sol, goal_sol, created_at, is_live, channel_name, started_at")
          .order("is_live", { ascending: false })
          .order("started_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(30);
        if (!cancelled) {
          setRecentCamps((data as any) || []);
        }
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();

    const channel = supabase
      .channel("discover-campaigns")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, async () => {
        try {
          const { data } = await supabase
            .from("campaigns")
            .select("id, title, description, image_url, raised_sol, goal_sol, created_at, is_live, channel_name, started_at")
            .order("is_live", { ascending: false })
            .order("started_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(30);
          setRecentCamps((data as any) || []);
        } catch {
          // ignore fetch errors in live updates
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore cleanup failures
      }
    };
  }, []);

  useEffect(() => {
    try {
      ioRef.current = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const node = e.target as HTMLDivElement;
            const channel = node?.dataset?.channel as string | undefined;
            if (!channel) continue;
            if (e.isIntersecting) {
              void startPreview(channel);
            } else {
              void stopPreview(channel);
            }
          }
        },
        { threshold: 0.2 }
      );
    } catch {
      ioRef.current = null;
    }
    return () => {
      try {
        ioRef.current?.disconnect();
      } catch {
        // ignore disconnect failures
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      void stopAllPreviews();
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden sm:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border bg-background/95 backdrop-blur">
        <a href="/" className="flex flex-col gap-4 px-6 pt-8 pb-4">
          <img src="/f6cc0350-62e9-4a52-a7b4-e9955a2333a3.png" alt="Liberated" className="h-16 w-auto" />
          <img src="/950b5320-c3a6-44f1-8b8e-bdd46eb85fdf.png" alt="Partner" className="h-12 w-auto" />
        </a>
        <nav className="mt-6 flex-1 px-6">
          <ul className="flex flex-col gap-3 text-sm font-medium text-foreground/90">
            {sideLinks.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-transparent px-4 py-2 transition-colors hover:border-border/70 hover:bg-accent/10"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">&rsaquo;</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-6 pb-8 text-xs text-muted-foreground/80">
          Powered by x402 — instant access for builders.
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col sm:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3 sm:hidden">
            <a href="/" className="flex items-center gap-3">
              <img src="/f6cc0350-62e9-4a52-a7b4-e9955a2333a3.png" alt="Liberated" className="h-10 w-auto" />
              <img src="/950b5320-c3a6-44f1-8b8e-bdd46eb85fdf.png" alt="Partner" className="h-10 w-auto" />
            </a>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <UserBadge />
            <a
              href="https://x.com/liberatedorg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground/90 underline-offset-4 hover:underline"
            >
              Follow us on X
            </a>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12">
          <section id="discover" className="max-w-7xl mx-auto">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">Discover Campaigns</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Track live fundraising efforts across the network. Streams unlock instant previews so you can drop in and
                  contribute in seconds.
                </p>
              </div>
              <a href="/campaigns" className="text-sm font-medium underline-offset-4 hover:underline">
                See all campaigns
              </a>
            </div>
            <div className="mt-6">
              {recentLoading ? (
                <div className="text-sm text-muted-foreground">Loading campaigns…</div>
              ) : recentCamps.length === 0 ? (
                <div className="text-sm text-muted-foreground">No campaigns yet.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {recentCamps.map((campaign) => (
                    <div key={campaign.id} className="ios-card overflow-hidden">
                      <a
                        href={`/campaign/${campaign.id}`}
                        className="block"
                        onClick={async () => {
                          try {
                            await AgoraRTC.resumeAudioContext();
                          } catch {
                            // ignore resume errors
                          }
                          try {
                            sessionStorage.setItem("agoraAudioUnlocked", "1");
                          } catch {
                            // ignore storage errors
                          }
                          await stopAllPreviews();
                        }}
                      >
                        <div className="relative aspect-square w-full bg-black">
                          {campaign.image_url ? (
                            <img src={campaign.image_url} alt={campaign.title} className="absolute inset-0 h-full w-full object-cover opacity-40" />
                          ) : (
                            <div className="absolute inset-0 h-full w-full bg-muted" />
                          )}
                          {campaign.is_live ? (
                            <div ref={setContainerRef((campaign as any).channel_name || `campaign-${campaign.id}`)} className="absolute inset-0" />
                          ) : null}
                          {campaign.is_live ? (
                            <div className="absolute left-2 top-2 z-10">
                              <span className="rounded bg-red-600 px-2 py-0.5 text-xs text-white">LIVE</span>
                            </div>
                          ) : null}
                        </div>
                      </a>
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium" title={campaign.title}>
                            {campaign.title}
                          </div>
                          <Button
                            variant="iosOutline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await AgoraRTC.resumeAudioContext();
                              } catch {
                                // ignore resume errors
                              }
                              try {
                                sessionStorage.setItem("agoraAudioUnlocked", "1");
                              } catch {
                                // ignore storage errors
                              }
                              await stopAllPreviews();
                              window.location.href = `/campaign/${campaign.id}`;
                            }}
                          >
                            Watch Stream
                          </Button>
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{campaign.description}</div>
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Campaign progress</span>
                            <span>Campaign goal</span>
                          </div>
                          {(() => {
                            const raised = Number(campaign.raised_sol || 0);
                            const goal = Number(campaign.goal_sol || 0);
                            const pct = goal > 0 ? Math.max(0, Math.min(100, (raised / goal) * 100)) : 0;
                            return (
                              <div className="relative h-2 overflow-hidden rounded-full bg-muted/50 ring-1 ring-border">
                                <div
                                  className="h-full rounded-full bg-[#0ea5ff] shadow-[0_0_8px_rgba(14,165,255,0.9),_0_0_16px_rgba(14,165,255,0.6)]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            );
                          })()}
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {Number(campaign.raised_sol || 0).toFixed(2)} SOL raised out of {Number(campaign.goal_sol || 0).toFixed(2)} SOL goal
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
