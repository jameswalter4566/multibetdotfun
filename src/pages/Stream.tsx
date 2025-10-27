import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import UserBadge from '@/components/UserBadge';
import { supabase } from '@/integrations/supabase/client';
import { agoraLive } from '@/services/agoraLive';
import AgoraRTC from 'agora-rtc-sdk-ng';

export default function StreamPage() {
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
      <Link to="/" className="fixed top-2 left-12 md:left-16 z-30 block">
        <img src="/f6cc0350-62e9-4a52-a7b4-e9955a2333a3.png" alt="Liberated" className="h-12 w-auto md:h-14 lg:h-16 align-middle" />
        <img src="/950b5320-c3a6-44f1-8b8e-bdd46eb85fdf.png" alt="Partner" className="h-12 w-auto md:h-14 lg:h-16 ml-3 align-middle" />
      </Link>
      <nav className="fixed top-2 right-16 md:right-24 z-30 h-12 md:h-14 lg:h-16 flex items-center gap-6 md:gap-8">
        <a href="/#mission" className="text-foreground/90 hover:underline text-sm md:text-base">Mission</a>
        <a href="/#workers" className="text-foreground/90 hover:underline text-sm md:text-base">Explore Organizers</a>
        <a href="/explore" className="text-foreground/90 hover:underline text-sm md:text-base">Explore Campaigns</a>
        <a href="/campaigns" className="text-foreground/90 hover:underline text-sm md:text-base">Start a Campaign</a>
        <UserBadge />
        <a href="https://x.com/liberatedorg" target="_blank" rel="noopener noreferrer" className="text-foreground/90 hover:underline text-sm md:text-base">Follow us on X</a>
      </nav>

      <div className="container mx-auto px-2 md:px-4 pt-20 pb-6">
        <div className="ios-card overflow-hidden h-[70vh] lg:h-[calc(100vh-8rem)] relative">
          <div ref={videoContainerRef} className="absolute inset-0 bg-black" />
          {audioBlocked && (
            <button onClick={unlockAudio} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md bg-background/90 border border-border text-xs">Enable Audio</button>
          )}
          {!resolvedChannel && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Stream is offline</div>
          )}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white tracking-wide">LIVE</div>
        </div>
      </div>
    </div>
  );
}
