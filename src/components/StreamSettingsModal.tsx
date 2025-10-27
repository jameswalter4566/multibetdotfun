import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';
import { composeRtmpUrl, listActiveMediaPushes, stopMediaPush } from '@/services/agoraLive';
import { startMediaPushAsHost } from '@/services/mediaPushHelper';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channelName?: string | null;
};

export default function StreamSettingsModal({ open, onOpenChange, channelName }: Props) {
  const [serverUrl, setServerUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const combinedUrl = useMemo(() => composeRtmpUrl(serverUrl, streamKey), [serverUrl, streamKey]);
  const [active, setActive] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceTranscode, setForceTranscode] = useState(true);
  // Media Pull removed

  useEffect(() => {
    try { setActive(channelName ? listActiveMediaPushes(channelName) : []); } catch {}
  }, [open, channelName]);

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); } catch {} };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby="stream-settings-desc">
        <DialogHeader>
          <DialogTitle>Stream Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div id="stream-settings-desc" className="rounded-lg border border-border p-3 bg-card/60 text-xs text-muted-foreground">
            Choose to stream via our camera/mic as usual, or dually stream out to another platform using Agora Media Push.
          </div>

          {/* Dual Stream (Media Push) */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Push to External Platform (RTMP/RTMPS)</div>
            <div className="space-y-2">
              <label className="text-sm">RTMP Server URL</label>
              <Input value={serverUrl} onChange={(e)=>setServerUrl(e.target.value)} placeholder="rtmp://example.com/live" />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Stream Key</label>
              <Input value={streamKey} onChange={(e)=>setStreamKey(e.target.value)} placeholder="your-stream-key" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={forceTranscode} onChange={(e)=>setForceTranscode(e.target.checked)} />
                Force transcoding
              </label>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Combined URL</div>
              <div className="flex items-center gap-2">
                <Input readOnly value={combinedUrl} placeholder="rtmp://host/app/key" />
                <Button variant="secondary" onClick={()=>copy(combinedUrl)}>Copy</Button>
              </div>
            </div>
            {error && <div className="text-xs text-red-500">{error}</div>}
            <div className="flex items-center gap-2">
              <Button
                disabled={!channelName || !combinedUrl || starting}
                onClick={async () => {
                  setError(null); setStarting(true);
                  try {
                    if (!channelName) throw new Error('Missing channel');
                    const tx = forceTranscode ? { width: 1280, height: 720, videoBitrate: 2400, videoFramerate: 30, audioBitrate: 48, audioChannels: 2, audioSampleRate: 44100 } : undefined;
                    const res = await startMediaPushAsHost(channelName, combinedUrl, tx);
                    if (!res.ok) throw res.error || new Error('Failed to start');
                    setActive(listActiveMediaPushes(channelName));
                  } catch (e: any) {
                    setError(String(e?.message || e || 'Failed to start'));
                  } finally { setStarting(false); }
                }}
              >{starting ? 'Starting…' : 'Start Dual Stream'}</Button>
            </div>
          </div>

          {/* Active Destinations */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Active Destinations</div>
            {(!active || active.length === 0) ? (
              <div className="text-xs text-muted-foreground">None</div>
            ) : (
              <div className="space-y-2">
                {active.map((u) => (
                  <div key={u} className="flex items-center gap-2 text-xs">
                    <div className="flex-1 truncate" title={u}>{u}</div>
                    <Button
                      variant="secondary"
                      onClick={async ()=>{
                        try {
                          if (!channelName) return;
                          await stopMediaPush(channelName, u);
                          setActive(listActiveMediaPushes(channelName));
                        } catch {}
                      }}
                    >Stop</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media Pull removed */}

          <div className="rounded-lg border border-border p-3 bg-card/60 text-xs text-muted-foreground">
            Tip: Many platforms split server URL and stream key. Enter both here, then click Start Dual Stream to forward your live feed. Charges apply for Media Push.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
