import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { agoraLive } from '@/services/agoraLive';
import AgoraRTC from 'agora-rtc-sdk-ng';

type LiveCamp = { id: number; title: string; channel_name: string };

export default function LiveNowRail() {
  const [items, setItems] = useState<LiveCamp[]>([]);
  const navigate = useNavigate();
  const previewing = useRef<Set<string>>(new Set());
  const containersRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('id,title,channel_name')
        .eq('is_live', true)
        .order('started_at', { ascending: false })
        .limit(10);
      if (!cancelled && data) setItems((data as any) || []);
    })();

    const ch = supabase
      .channel('live-now-rail')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
        supabase
          .from('campaigns')
          .select('id,title,channel_name')
          .eq('is_live', true)
          .order('started_at', { ascending: false })
          .limit(10)
          .then(({ data }) => setItems((data as any) || []));
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} cancelled = true; };
  }, []);

  const setContainerRef = (channel: string) => (el: HTMLDivElement | null) => {
    containersRef.current[channel] = el;
  };

  const startPreview = async (channel: string) => {
    if (!channel || previewing.current.has(channel)) return;
    const el = containersRef.current[channel];
    if (!el) return;
    previewing.current.add(channel);
    try {
      console.log('[LiveNowRail] startPreview join audience', { channel });
      agoraLive.setHandlers(channel, {
        onUserPublished: (user, mediaType) => {
          console.log('[LiveNowRail] onUserPublished', { channel, mediaType, uid: (user as any)?.uid });
          if (mediaType === 'video') {
            const node = containersRef.current[channel];
            if (!node) return;
            node.innerHTML = '';
            try { user.videoTrack?.play(node); console.log('[LiveNowRail] played preview video', { channel }); } catch (e) { console.warn('[LiveNowRail] preview play failed', e); }
          }
        },
      });
      await agoraLive.join(channel, 'audience');
    } catch {
      previewing.current.delete(channel);
    }
  };

  const stopPreview = async (channel: string) => {
    console.log('[LiveNowRail] stopPreview leave', { channel });
    try { await agoraLive.leave(channel); } catch (e) { console.warn('[LiveNowRail] stopPreview leave failed', e); }
    const el = containersRef.current[channel];
    if (el) el.innerHTML = '';
    previewing.current.delete(channel);
  };

  useEffect(() => {
    const target = new Set(items.slice(0, 5).map(s => s.channel_name).filter(Boolean));
    target.forEach(ch => { void startPreview(ch); });
    previewing.current.forEach(ch => { if (!target.has(ch)) void stopPreview(ch); });
    return () => { previewing.current.forEach(ch => { void stopPreview(ch); }); };
  }, [items]);

  if (!items.length) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-2">
        <h2 className="text-lg font-semibold">Live Now</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-2 pb-2">
        {items.map((s) => (
          <div key={s.id}
               className="min-w-[240px] w-[240px] aspect-video rounded-xl overflow-hidden border border-border bg-card relative cursor-pointer"
               onClick={async () => {
                 try { await AgoraRTC.resumeAudioContext(); } catch {}
                 try { sessionStorage.setItem('agoraAudioUnlocked', '1'); } catch {}
                 // Clean up any active previews before navigation to avoid ws conflicts
                 try {
                   const chans = Array.from(previewing.current);
                   await Promise.all(chans.map(async (ch) => {
                     try { await agoraLive.leave(ch); } catch {}
                     const el = containersRef.current[ch]; if (el) el.innerHTML = '';
                   }));
                   previewing.current.clear();
                 } catch {}
                 navigate(`/campaign/${s.id}`);
               }}>
            <div ref={setContainerRef(s.channel_name)} className="absolute inset-0" />
            <div className="absolute top-2 left-2 text-xs bg-red-600 text-white rounded px-2 py-0.5">LIVE</div>
            <div className="absolute bottom-2 left-2 right-2 text-xs text-white truncate bg-black/50 rounded px-1 py-0.5">{s.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
