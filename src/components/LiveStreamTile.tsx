import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';

interface LiveStreamTileProps {
  streamId: number;
  className?: string;
  twitchChannel?: string | null;
}

let twitchScriptPromise: Promise<void> | null = null;
function loadTwitchScript() {
  if (typeof window !== 'undefined' && (window as any).Twitch && (window as any).Twitch.Player) {
    return Promise.resolve();
  }
  if (twitchScriptPromise) return twitchScriptPromise;
  twitchScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('twitch-embed-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Twitch script failed')));
      return;
    }
    const s = document.createElement('script');
    s.id = 'twitch-embed-script';
    s.src = 'https://player.twitch.tv/js/embed/v1.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Twitch script failed'));
    document.body.appendChild(s);
  });
  return twitchScriptPromise;
}

const LiveStreamTile = ({ streamId, className, twitchChannel }: LiveStreamTileProps) => {
  const isTwitchTile = !!twitchChannel;
  const embedId = `twitch-embed-${twitchChannel || 'none'}-${streamId}`;
  const playerRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTwitchTile || !twitchChannel) return;
    let disposed = false;
    const parentHost = window.location.hostname || "localhost";

    loadTwitchScript()
      .then(() => {
        if (disposed) return;
        const Twitch = (window as any).Twitch;
        const opts = {
          width: "100%",
          height: "100%",
          channel: twitchChannel,
          autoplay: true,
          muted: true,
          parent: [parentHost],
        } as any;
        playerRef.current = new Twitch.Player(embedId, opts);
        try {
          playerRef.current.setMuted(true);
          playerRef.current.play();
        } catch {}
      })
      .catch(() => {});

    return () => {
      disposed = true;
      try { playerRef.current?.pause?.(); } catch {}
      playerRef.current = null;
    };
  }, [isTwitchTile, embedId, twitchChannel]);

  return (
    <div className={cn("ios-tile group", className)}>
      <div className="aspect-[16/9] bg-black flex items-center justify-center relative cursor-pointer" onClick={() => { if (isTwitchTile && twitchChannel) navigate(`/stream/${twitchChannel}`); }}>
        {isTwitchTile ? (
          <>
            <div id={embedId} className="absolute inset-0 w-full h-full" />
            {/* Click-through overlay to open dedicated stream page */}
            <a href={twitchChannel ? `/stream/${twitchChannel}` : '#'} className="absolute inset-0 z-10" aria-label="Open broadcast" />
          </>
        ) : (
          <div className="relative z-10 text-center">
            <p className="text-sm text-white/80">Broadcast Pending...</p>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-card-foreground text-sm">{isTwitchTile ? `Twitch: ${twitchChannel}` : `Broadcast #${streamId}`}</h3>
            <p className="text-xs text-muted-foreground mt-1">{isTwitchTile ? 'On air' : 'Pending'}</p>
          </div>
          {isTwitchTile && twitchChannel && (
            <Button asChild variant="iosOutline" size="sm">
              <a href={`/stream/${twitchChannel}`}>Open Broadcast</a>
            </Button>
          )}
        </div>

        {/* Campaign progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Campaign progress</span>
            <span>Campaign goal</span>
          </div>
          {(() => {
            const raised = 212; // USD raised (placeholder)
            const goal = 10000; // USD goal (placeholder)
            const pct = Math.max(0, Math.min(100, (raised / goal) * 100));
            return (
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden ring-1 ring-border relative">
                <div
                  className="h-full rounded-full bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.9),_0_0_16px_rgba(168,85,247,0.6)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            );
          })()}
          <div className="mt-1 text-[11px] text-muted-foreground">
            $212 raised out of $10,000 goal
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamTile;
