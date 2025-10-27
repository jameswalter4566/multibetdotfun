import { supabase } from '@/integrations/supabase/client';
import { agoraLive } from '@/services/agoraLive';

export type SimpleTranscoding = {
  width?: number; height?: number; videoBitrate?: number; videoFramerate?: number;
  audioBitrate?: number; audioChannels?: number; audioSampleRate?: number;
};

export interface MediaPushResult { url: string; ok: boolean; error?: unknown }

// Ensure we are joined as host and actively publishing before starting Media Push
export async function startMediaPushAsHost(channel: string, fullUrl: string, transcoding?: SimpleTranscoding, region: 'na'|'eu'|'ap'|'cn' = 'na'): Promise<MediaPushResult> {
  try {
    let client = (agoraLive as any).clients?.get(channel);
    let joined = (agoraLive as any).joined?.get(channel);
    if (!client || !joined) {
      await (agoraLive as any).join(channel, 'host');
      client = (agoraLive as any).clients?.get(channel);
      joined = true;
    }
    const lv = (agoraLive as any).localVideo?.get(channel);
    const la = (agoraLive as any).localAudio?.get(channel);
    if (!lv || !la) {
      try { await (agoraLive as any).startPublishing(channel, true, true); } catch {}
    }
    const hostUid = (agoraLive as any).currentUid?.get(channel) || null;
    const { data, error } = await supabase.functions.invoke('media-push', {
      body: { action: 'start', channel, url: fullUrl, transcoding: transcoding || null, region, hostUid },
    });
    if (error) throw new Error(`Server media-push failed: ${error.message || String(error)}`);
    if (!data?.ok) throw new Error('Server media-push returned non-ok response');
    const convId = (data as any)?.converterId as string | undefined;
    if (convId) {
      const map = (agoraLive as any).serverPushIds.get(channel) || new Map<string, string>();
      map.set(fullUrl, convId);
      (agoraLive as any).serverPushIds.set(channel, map);
    }
    const set = (agoraLive as any).activePushes.get(channel) || new Set<string>();
    set.add(fullUrl);
    (agoraLive as any).activePushes.set(channel, set);
    return { url: fullUrl, ok: true };
  } catch (e) {
    return { url: fullUrl, ok: false, error: e };
  }
}

