import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import { apiProviders } from "@/data/apiProviders";
import { supabase } from '@/integrations/supabase/client';
import { agoraLive } from '@/services/agoraLive';
import AgoraRTC from 'agora-rtc-sdk-ng';

export default function StreamPage() {
  const docHome = useMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);
  const navLinks: DashboardNavLink[] = useMemo(
    () => [
      { label: "Explore API market place", href: "/marketplace" },
      { label: "Documentation", href: docHome },
      { label: "Create AI Automation (Beta)", href: "/agent", cta: true },
      { label: "Agent Playground", href: "/agent" },
      { label: "Test sandbox", href: "#sandbox" },
      { label: "Add your API", href: "/list-api" },
    ],
    [docHome]
  );
  const { channel } = useParams<{ channel: string }>();
  const [sp] = useSearchParams();
  const isHost = sp.get('host') === '1';
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [resolvedChannel, setResolvedChannel] = useState<string | null>(null);
  const remoteAudioTracksRef = useRef<any[]>([]);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Resolve to an Agora channel
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!channel) return;
      // If already a campaign-* channel, use directly
      if (/^campaign-\d+$/i.test(channel)) { setResolvedChannel(channel); return; }
      // Otherwise, treat param as userdid; find their latest live campaign
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('userdid', channel)
          .maybeSingle();
        const uid = (userRow as any)?.id;
        if (!uid) { setResolvedChannel(null); return; }
        const { data: camp } = await supabase
          .from('campaigns')
          .select('channel_name,is_live,started_at')
          .eq('user_id', uid)
          .eq('is_live', true)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) setResolvedChannel((camp as any)?.channel_name || null);
      } catch {
        if (!cancelled) setResolvedChannel(null);
      }
    })();
    return () => { cancelled = true; };
  }, [channel]);

  // Join and render
  useEffect(() => {
    let joined = false;
    const ch = resolvedChannel;
    if (!ch) { console.warn('[StreamPage] no resolved channel, offline'); return; }
    console.log('[StreamPage] joining', { ch, isHost });
    agoraLive.setHandlers(ch, {
      onUserPublished: async (user, mediaType) => {
        console.log('[StreamPage] onUserPublished', { mediaType, uid: (user as any)?.uid });
        if (mediaType === 'video') {
          const el = videoContainerRef.current; if (!el) return; el.innerHTML = '';
          try { user.videoTrack?.play(el); console.log('[StreamPage] played remote video'); } catch (e) { console.warn('[StreamPage] play video failed', e); }
        }
        if (mediaType === 'audio') {
          if (user.audioTrack) {
            remoteAudioTracksRef.current.push(user.audioTrack);
            try { user.audioTrack.play(); console.log('[StreamPage] played remote audio'); } catch (e) { console.warn('[StreamPage] play audio blocked', e); setAudioBlocked(true); }
          }
        }
      },
    });
    agoraLive.join(ch, isHost ? 'host' : 'audience').then(async () => {
      joined = true; console.log('[StreamPage] join ok');
      if (isHost) {
        try { const { video } = await agoraLive.startPublishing(ch, true, true); const el = videoContainerRef.current; if (el && video) { video.play(el); console.log('[StreamPage] host local video playing'); } } catch (e) { console.warn('[StreamPage] host publish failed', e); }
      }
    }).catch((e) => { console.error('[StreamPage] join failed', e); });
    // One-time auto-refresh if remote video fails to mount
    try {
      const key = `streamAutoRefresh:${ch}`;
      if (!sessionStorage.getItem(key)) {
        const timer = setTimeout(() => {
          const container = videoContainerRef.current;
          if (!isHost && container && container.childElementCount === 0) {
            sessionStorage.setItem(key, '1');
            window.location.reload();
          }
        }, 1200);
        return () => { clearTimeout(timer); };
      }
    } catch {}
    return () => { if (joined) { console.log('[StreamPage] leaving…'); try { agoraLive.leave(ch); } catch (e) { console.warn('[StreamPage] leave failed', e); } } };
  }, [resolvedChannel, isHost]);

  const unlockAudio = useCallback(async () => {
    console.log('[StreamPage] unlockAudio click');
    try {
      await AgoraRTC.resumeAudioContext();
      for (const t of remoteAudioTracksRef.current) { try { t.play(); } catch {} }
    } catch {}
    setAudioBlocked(false);
  }, []);

  if (!channel) return <div className="p-6">Missing channel</div>;

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav links={navLinks} />

      <div className="container mx-auto px-2 md:px-4 pt-20 pb-6">
        <div className="ios-card overflow-hidden h-[70vh] lg:h-[calc(100vh-8rem)] relative">
          <div ref={videoContainerRef} className="absolute inset-0 bg-black" />
          {audioBlocked && (
            <button onClick={unlockAudio} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md bg-background/90 border border-border text-xs">Enable Audio</button>
          )}
          {!resolvedChannel && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Broadcast is offline</div>
          )}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white tracking-wide">LIVE</div>
        </div>
      </div>
    </div>
  );
}
