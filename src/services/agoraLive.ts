import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IAgoraRTCRemoteUser,
  UID,
} from 'agora-rtc-sdk-ng';
import { supabase } from '@/integrations/supabase/client';

const AGORA_APP_ID = '950e9a1a1b4b4e65b28aff4afeee3c62';
const FORCE_SERVER_PUSH = true; // Force using server-side REST Media Push

type Role = 'host' | 'audience';

interface LiveEventHandlers {
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser) => void;
  onUserPublished?: (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => void;
  onUserUnpublished?: (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => void;
}

class AgoraLiveService {
  private clients = new Map<string, IAgoraRTCClient>();
  private localAudio = new Map<string, ILocalAudioTrack>();
  private localVideo = new Map<string, ILocalVideoTrack>();
  private localScreen = new Map<string, ILocalVideoTrack>();
  private localScreenAudio = new Map<string, ILocalAudioTrack>();
  private joined = new Map<string, boolean>();
  private currentUid = new Map<string, UID>();
  private handlers = new Map<string, LiveEventHandlers>();
  private activePushes = new Map<string, Set<string>>();
  private rtmpHandlersBound = new Set<string>();
  private serverPushIds = new Map<string, Map<string, string>>(); // channel -> (url -> converterId)

  constructor() {
    AgoraRTC.setLogLevel(2);
    AgoraRTC.onAutoplayFailed = () => {
      const id = 'agora-autoplay-resume';
      if (typeof document === 'undefined') return;
      if (document.getElementById(id)) return;
      const btn = document.createElement('button');
      btn.id = id;
      btn.textContent = 'Click to enable audio';
      btn.style.position = 'fixed';
      btn.style.left = '50%';
      btn.style.bottom = '24px';
      btn.style.transform = 'translateX(-50%)';
      btn.style.zIndex = '9999';
      btn.style.padding = '10px 16px';
      btn.style.borderRadius = '8px';
      btn.style.border = '1px solid rgba(255,255,255,0.2)';
      btn.style.background = 'rgba(0,0,0,0.8)';
      btn.style.color = '#fff';
      btn.style.cursor = 'pointer';
      btn.onclick = async () => {
        try { await AgoraRTC.resumeAudioContext(); } catch {} finally { btn.remove(); }
      };
      document.body.appendChild(btn);
    };
  }

  setHandlers(channel: string, h: LiveEventHandlers) {
    this.handlers.set(channel, h);
  }

  async join(channel: string, role: Role, uid?: number) {
    console.log('[agoraLive] creating client', { channel, role });
    const client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
    this.clients.set(channel, client);
    this.setupClientListeners(channel, client);

    await client.setClientRole(role, role === 'audience' ? { level: 1 } : undefined);
    const theUid = uid ?? Math.floor(Math.random() * 10_000_000);
    try {
      console.log('[agoraLive] joining…', { channel, uid: theUid, role });
      await client.join(AGORA_APP_ID, channel, null, theUid);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      // Fallback: try Agora Cloud Proxy over TCP:443 for restricted networks
      if (/WebSocket is closed|ECONN|NETWORK|timeout|Network Error|connection is closed/i.test(msg)) {
        console.warn('[agoraLive] join failed, enabling Cloud Proxy and retrying', { channel, err: msg });
        try { (AgoraRTC as any).startProxyServer?.(2); } catch {}
        try { client.removeAllListeners(); } catch {}
        // Recreate client after enabling proxy
        const newClient = AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
        this.clients.set(channel, newClient);
        this.setupClientListeners(channel, newClient);
        await newClient.setClientRole(role, role === 'audience' ? { level: 1 } : undefined);
        await newClient.join(AGORA_APP_ID, channel, null, theUid);
      } else {
        console.error('[agoraLive] join failed unrecoverable', { channel, err });
        throw err;
      }
    }
    this.joined.set(channel, true);
    this.currentUid.set(channel, theUid);
    console.log('[agoraLive] joined', { channel, uid: theUid, role });
    // Bind RTMP streaming state events once per channel
    if (!this.rtmpHandlersBound.has(channel)) {
      const client = this.clients.get(channel) as any;
      if (client && client.on) {
        try {
          client.on('rtmpStreamingStateChanged', (url: string, state: number, errCode: number) => {
            console.log('[agoraLive] rtmpStreamingStateChanged', { channel, url, state, errCode });
          });
        } catch {}
        try {
          client.on('rtmpStreamingEvent', (url: string, eventCode: number) => {
            console.log('[agoraLive] rtmpStreamingEvent', { channel, url, eventCode });
          });
        } catch {}
        this.rtmpHandlersBound.add(channel);
      }
    }
    return { client, uid: theUid };
  }

  async startPublishing(channel: string, withCamera = true, withMic = true) {
    console.log('[agoraLive] startPublishing', { channel, withCamera, withMic });
    const client = this.clients.get(channel);
    if (!client || !this.joined.get(channel)) throw new Error('Join channel first');
    const tracks: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
    if (withMic && !this.localAudio.get(channel)) {
      const at = await AgoraRTC.createMicrophoneAudioTrack();
      this.localAudio.set(channel, at);
      tracks.push(at);
    }
    if (withCamera && !this.localVideo.get(channel)) {
      const vt = await AgoraRTC.createCameraVideoTrack();
      this.localVideo.set(channel, vt);
      tracks.push(vt);
    }
    if (tracks.length) { await client.publish(tracks); console.log('[agoraLive] published tracks', { channel, tracks: tracks.map(t=>t.getTrackLabel?.()) }); }
    return { audio: this.localAudio.get(channel) || null, video: this.localVideo.get(channel) || null };
  }

  getLocalTracks(channel: string) {
    return {
      audio: this.localAudio.get(channel) || null,
      video: this.localVideo.get(channel) || null,
      screen: this.localScreen.get(channel) || null,
    };
  }

  async stopPublishing(channel: string) {
    const client = this.clients.get(channel);
    if (!client) return;
    const a = this.localAudio.get(channel);
    const v = this.localVideo.get(channel);
    const s = this.localScreen.get(channel);
    const sa = this.localScreenAudio.get(channel);
    const toUnpub = [a, v, s, sa].filter(Boolean) as (ILocalAudioTrack | ILocalVideoTrack)[];
    if (toUnpub.length) await client.unpublish(toUnpub);
    a?.close(); v?.close();
    if (s) { try { s.stop(); } catch {} try { s.close(); } catch {} }
    if (sa) { try { sa.stop(); } catch {} try { sa.close(); } catch {} }
    if (a) this.localAudio.delete(channel);
    if (v) this.localVideo.delete(channel);
    if (s) this.localScreen.delete(channel);
    if (sa) this.localScreenAudio.delete(channel);
  }

  async startScreenShare(channel: string) {
    const client = this.clients.get(channel);
    if (!client || !this.joined.get(channel)) throw new Error('Join channel first');
    if (this.localScreen.get(channel)) return this.localScreen.get(channel)!;

    // If camera video is published, unpublish it during screen share
    const cam = this.localVideo.get(channel);
    if (cam) {
      try { await client.unpublish([cam]); } catch {}
    }

    const res = await AgoraRTC.createScreenVideoTrack({
      encoderConfig: '1080p_1',
      optimizationMode: 'detail',
    }, 'auto');

    let screenTrack: ILocalVideoTrack;
    let screenAudio: ILocalAudioTrack | null = null;
    if (Array.isArray(res)) {
      [screenTrack, screenAudio] = res as [ILocalVideoTrack, ILocalAudioTrack];
    } else {
      screenTrack = res as ILocalVideoTrack;
    }

    // Auto stop when user ends share from browser UI
    screenTrack.on('track-ended', async () => {
      try { await this.stopScreenShare(channel); } catch {}
    });

    this.localScreen.set(channel, screenTrack);
    if (screenAudio) this.localScreenAudio.set(channel, screenAudio);

    const publishTracks: (ILocalVideoTrack | ILocalAudioTrack)[] = [screenTrack];
    if (screenAudio) publishTracks.push(screenAudio);
    await client.publish(publishTracks);
    return screenTrack;
  }

  async stopScreenShare(channel: string) {
    const client = this.clients.get(channel);
    const s = this.localScreen.get(channel);
    const sa = this.localScreenAudio.get(channel);
    if (client && (s || sa)) {
      try { await client.unpublish([s, sa].filter(Boolean) as any); } catch {}
    }
    if (s) { try { s.stop(); } catch {} try { s.close(); } catch {} this.localScreen.delete(channel); }
    if (sa) { try { sa.stop(); } catch {} try { sa.close(); } catch {} this.localScreenAudio.delete(channel); }

    // Re-publish camera if it exists
    const cam = this.localVideo.get(channel);
    if (client && cam) {
      try { await client.publish([cam]); } catch {}
    }
  }

  async leave(channel: string) {
    try {
      console.log('[agoraLive] leaving…', { channel });
      await this.stopPublishing(channel);
      const client = this.clients.get(channel);
      if (client && this.joined.get(channel)) {
        try { await client.leave(); } catch (e) { console.warn('[agoraLive] underlying leave failed (continuing)', e); }
      }
    } finally {
      console.log('[agoraLive] cleanup', { channel });
      this.cleanup(channel);
    }
  }

  private setupClientListeners(channel: string, client: IAgoraRTCClient) {
    const h = this.handlers.get(channel) || {};
    client.on('user-joined', (user) => h.onUserJoined?.(user));
    client.on('user-left', (user) => h.onUserLeft?.(user));
    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      h.onUserPublished?.(user, mediaType);
    });
    client.on('user-unpublished', (user, mediaType) => h.onUserUnpublished?.(user, mediaType));
  }

  private cleanup(channel: string) {
    this.clients.get(channel)?.removeAllListeners();
    this.clients.delete(channel);
    this.joined.delete(channel);
    this.currentUid.delete(channel);
    this.handlers.delete(channel);
    const a = this.localAudio.get(channel); a?.close(); this.localAudio.delete(channel);
    const v = this.localVideo.get(channel); v?.close(); this.localVideo.delete(channel);
    const s = this.localScreen.get(channel); s?.close(); this.localScreen.delete(channel);
    const sa = this.localScreenAudio.get(channel); sa?.close(); this.localScreenAudio.delete(channel);
    this.activePushes.delete(channel);
    this.rtmpHandlersBound.delete(channel);
  }
}

export const agoraLive = new AgoraLiveService();

// Convenience helpers for Media Push (RTMP/RTMPS) from current channel
export type SimpleTranscoding = {
  width?: number; height?: number; videoBitrate?: number; videoFramerate?: number;
  audioBitrate?: number; audioChannels?: number; audioSampleRate?: number;
};

export interface MediaPushResult { url: string; ok: boolean; error?: unknown }

// Compose a full RTMP URL from server + key
export function composeRtmpUrl(serverUrl: string, streamKey: string): string {
  const base = (serverUrl || '').trim();
  const key = (streamKey || '').trim();
  if (!base) return '';
  if (!key) return base;
  return base.endsWith('/') ? `${base}${key}` : `${base}/${key}`;
}

export async function startMediaPush(channel: string, fullUrl: string, transcoding?: SimpleTranscoding, region: 'na'|'eu'|'ap'|'cn' = 'na'): Promise<MediaPushResult> {
  const client = (agoraLive as any).clients?.get(channel);
  if (!client || !(agoraLive as any).joined?.get(channel)) {
    return { url: fullUrl, ok: false, error: new Error('Join channel as host before starting Media Push') };
  }
  try {
    if (FORCE_SERVER_PUSH) {
      const hostUid = (agoraLive as any).currentUid?.get(channel) || null;
      const { data, error } = await supabase.functions.invoke('media-push', {
        body: { action: 'start', channel, url: fullUrl, transcoding: transcoding || null, region, hostUid },
      });
      if (error) throw new Error(`Server media-push failed: ${error.message || String(error)}`);
      if (!data?.ok) throw new Error('Server media-push returned non-ok response');
      const convId = data?.converterId as string | undefined;
      if (convId) {
        const map = (agoraLive as any).serverPushIds.get(channel) || new Map<string, string>();
        map.set(fullUrl, convId);
        (agoraLive as any).serverPushIds.set(channel, map);
      }
      const set = (agoraLive as any).activePushes.get(channel) || new Set<string>();
      set.add(fullUrl);
      (agoraLive as any).activePushes.set(channel, set);
      return { url: fullUrl, ok: true };
    }
    const hasStartNoTx = typeof client.startRtmpStreamWithoutTranscoding === 'function';
    const hasStartTx = typeof client.startRtmpStreamWithTranscoding === 'function';
    const hasStartLive = typeof client.startLiveStreaming === 'function';
    const hasAddPublish = typeof client.addPublishStreamUrl === 'function';
    const hasSetTx = typeof client.setLiveTranscoding === 'function';

    if (hasStartNoTx || hasStartTx || hasStartLive) {
      if (transcoding && hasStartTx) {
        const cfg: any = {
          width: transcoding.width ?? 1280,
          height: transcoding.height ?? 720,
          videoBitrate: transcoding.videoBitrate ?? 2400,
          videoFramerate: transcoding.videoFramerate ?? 30,
          audioBitrate: transcoding.audioBitrate ?? 48,
          audioChannels: transcoding.audioChannels ?? 2,
          audioSampleRate: transcoding.audioSampleRate ?? 44100,
          userCount: 1,
          transcodingUsers: [],
        };
        await client.startRtmpStreamWithTranscoding(fullUrl, cfg);
      } else {
        // Try raw push first, but fall back to transcoding if H264 requirement blocks raw
        const tryRaw = async () => {
          if (hasStartNoTx) {
            await client.startRtmpStreamWithoutTranscoding(fullUrl);
          } else if (hasStartLive) {
            await client.startLiveStreaming(fullUrl);
          } else {
            throw new Error('No supported client-side start API found.');
          }
        };
        try {
          await tryRaw();
        } catch (e: any) {
          const msg = String(e?.message || e || '');
          if (/LIVE_STREAMING_INVALID_RAW_STREAM|only support h264/i.test(msg) && hasStartTx) {
            const cfg: any = {
              width: 1280, height: 720, videoBitrate: 2400, videoFramerate: 30,
              audioBitrate: 48, audioChannels: 2, audioSampleRate: 44100,
              userCount: 1, transcodingUsers: [],
            };
            await client.startRtmpStreamWithTranscoding(fullUrl, cfg);
          } else if (/LIVE_STREAMING_INVALID_RAW_STREAM|only support h264/i.test(msg) && hasAddPublish) {
            const cfg: any = {
              width: 1280, height: 720, videoBitrate: 2400, videoFramerate: 30,
              audioBitrate: 48, audioChannels: 2, audioSampleRate: 44100,
              userCount: 1, transcodingUsers: [],
            };
            try { if (hasSetTx) await client.setLiveTranscoding(cfg); } catch {}
            await client.addPublishStreamUrl(fullUrl, true);
          } else {
            throw e;
          }
        }
      }
    } else if (hasAddPublish) {
      // Fallback to legacy API: setLiveTranscoding + addPublishStreamUrl(url, transcodingEnabled)
      if (transcoding && hasSetTx) {
        const cfg: any = {
          width: transcoding.width ?? 1280,
          height: transcoding.height ?? 720,
          videoBitrate: transcoding.videoBitrate ?? 2400,
          videoFramerate: transcoding.videoFramerate ?? 30,
          audioBitrate: transcoding.audioBitrate ?? 48,
          audioChannels: transcoding.audioChannels ?? 2,
          audioSampleRate: transcoding.audioSampleRate ?? 44100,
          userCount: 1,
          transcodingUsers: [],
        };
        try { await client.setLiveTranscoding(cfg); } catch {}
        await client.addPublishStreamUrl(fullUrl, true);
      } else {
        await client.addPublishStreamUrl(fullUrl, false);
      }
    } else {
      // Final fallback: call Supabase Edge Function to start via Agora REST API
      const { data, error } = await supabase.functions.invoke('media-push', {
        body: { action: 'start', channel, url: fullUrl, transcoding: transcoding || null },
      });
      if (error) {
        throw new Error(`Server media-push failed: ${error.message || String(error)}`);
      }
      if (!data?.ok) {
        throw new Error('Server media-push returned non-ok response');
      }
      const convId = data?.converterId as string | undefined;
      if (convId) {
        const map = this.serverPushIds.get(channel) || new Map<string, string>();
        map.set(fullUrl, convId);
        this.serverPushIds.set(channel, map);
      }
    }
    const set = (agoraLive as any).activePushes.get(channel) || new Set<string>();
    set.add(fullUrl);
    (agoraLive as any).activePushes.set(channel, set);
    return { url: fullUrl, ok: true };
  } catch (e) {
    console.warn('[agoraLive] startMediaPush failed', { channel, fullUrl, e });
    return { url: fullUrl, ok: false, error: e };
  }
}

export async function stopMediaPush(channel: string, fullUrl: string, region: 'na'|'eu'|'ap'|'cn' = 'na'): Promise<MediaPushResult> {
  const client = (agoraLive as any).clients?.get(channel);
  if (!client) {
    return { url: fullUrl, ok: false, error: new Error('No client for channel') };
  }
  try {
    if (FORCE_SERVER_PUSH) {
      const convId = (agoraLive as any).serverPushIds.get(channel)?.get(fullUrl);
      const { data, error } = await supabase.functions.invoke('media-push', {
        body: { action: 'stop', channel, url: fullUrl, converterId: convId, region },
      });
      if (error) throw new Error(`Server media-push stop failed: ${error.message || String(error)}`);
      if (!data?.ok) throw new Error('Server media-push stop returned non-ok response');
      if (convId) (agoraLive as any).serverPushIds.get(channel)?.delete(fullUrl);
      const set: Set<string> = (agoraLive as any).activePushes.get(channel) || new Set<string>();
      set.delete(fullUrl);
      (agoraLive as any).activePushes.set(channel, set);
      return { url: fullUrl, ok: true };
    }
    if (typeof client.stopRtmpStream === 'function') {
      await client.stopRtmpStream(fullUrl);
    } else if (typeof client.stopLiveStreaming === 'function') {
      await client.stopLiveStreaming(fullUrl);
    } else if (typeof client.removePublishStreamUrl === 'function') {
      await client.removePublishStreamUrl(fullUrl);
    } else {
      // Server fallback
      const convId = this.serverPushIds.get(channel)?.get(fullUrl);
      const { data, error } = await supabase.functions.invoke('media-push', {
        body: { action: 'stop', channel, url: fullUrl, converterId: convId },
      });
      if (error) {
        throw new Error(`Server media-push stop failed: ${error.message || String(error)}`);
      }
      if (!data?.ok) {
        throw new Error('Server media-push stop returned non-ok response');
      }
      if (convId) {
        this.serverPushIds.get(channel)?.delete(fullUrl);
      }
    }
    const set: Set<string> = (agoraLive as any).activePushes.get(channel) || new Set<string>();
    set.delete(fullUrl);
    (agoraLive as any).activePushes.set(channel, set);
    return { url: fullUrl, ok: true };
  } catch (e) {
    console.warn('[agoraLive] stopMediaPush failed', { channel, fullUrl, e });
    return { url: fullUrl, ok: false, error: e };
  }
}

export function listActiveMediaPushes(channel: string): string[] {
  const set: Set<string> = (agoraLive as any).activePushes.get(channel) || new Set<string>();
  return Array.from(set);
}
