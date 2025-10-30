import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import StreamSettingsModal from '@/components/StreamSettingsModal';
import { agoraLive } from '@/services/agoraLive';
import AgoraRTC from 'agora-rtc-sdk-ng';

type Props = { open: boolean; onOpenChange: (v: boolean)=>void };

export default function CampaignCreateModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [xurl, setXurl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState<number>(10);
  const [category, setCategory] = useState<'personal'|'company'>('personal');
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Collage images (UI only)
  const [collageFiles, setCollageFiles] = useState<File[]>([]);
  const [collagePreviews, setCollagePreviews] = useState<string[]>([]);

  const userId = useMemo(() => Number(localStorage.getItem('current_user_id') || '') || 0, [open]);
  const userdid = useMemo(() => localStorage.getItem('current_user_userdid') || 'user', [open]);

  useEffect(()=>{ if (open) { setTitle(''); setDescription(''); setWebsite(''); setXurl(''); setFile(null); setUploading(false); setSaving(false); setGoal(10); setCategory('personal'); } }, [open]);
  useEffect(()=>{ if (open) { collagePreviews.forEach((u)=>{ try { URL.revokeObjectURL(u); } catch {} }); setCollageFiles([]); setCollagePreviews([]); } }, [open]);

  const handleSelect = (fl: FileList | null) => { if (!fl || !fl.length) return; setFile(fl[0]); };
  const handleCollageSelect = (fl: FileList | null) => {
    if (!fl || !fl.length) return;
    const files = Array.from(fl).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    collagePreviews.forEach((u)=>{ try { URL.revokeObjectURL(u); } catch {} });
    const previews = files.map(f => URL.createObjectURL(f));
    setCollageFiles(files);
    setCollagePreviews(previews);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!file) return null;
    try {
      setUploading(true);
      const ext = file.name.split('.').pop() || 'png';
      const path = `images/${userdid}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('campaigns').upload(path, file, { upsert: false, contentType: file.type || 'image/png' });
      if (error) throw error;
      const { data } = supabase.storage.from('campaigns').getPublicUrl(path);
      return data.publicUrl || null;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  };

  const create = async () => {
    if (!userId || !title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      let imageUrl: string | null = null;
      if (file) imageUrl = await uploadImage();
      const payload: any = {
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl,
        // mint_address is set by backend after token launch
        goal_sol: Number.isFinite(goal) ? goal : 0,
        category,
        website_url: website.trim() || null,
        x_url: xurl.trim() || null,
      };
      const { data: created, error } = await supabase.from('campaigns').insert(payload).select('id').single();
      if (error) throw error;
      const campaign_id = (created as any)?.id as number;
      // Trigger token launch (backend will update mint_address)
      if (campaign_id) {
        try {
          const name = title.trim().slice(0, 32);
          const symbol = 'MARKETX402';
          const site = window.location.origin.replace(/\/$/, '');
          const videoUrl = `${site}/stream/${encodeURIComponent(userdid || 'user')}`; // required by endpoint
          const { data, error } = await supabase.functions.invoke('launch-token', {
            body: {
              name,
              symbol,
              description: description.trim(),
              website: website.trim() || undefined,
              x: xurl.trim() || undefined,
              videoUrl,
              userId,
              walletAddress: userdid,
              campaignId: campaign_id,
            }
          });
          // Navigate to the campaign page after launch attempt
          onOpenChange(false);
          navigate(`/campaign/${campaign_id}?goLive=1`);
        } catch {
          onOpenChange(false);
          navigate(`/campaign/${campaign_id}?goLive=1`);
        }
      }
      onOpenChange(false);
    } catch (e) {
      alert((e as any)?.message || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-[80vw] h-[80vh] rounded-2xl border border-border/50 bg-background flex flex-col">
        <DialogHeader>
          <DialogTitle>Launch a campaign</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 overflow-hidden">
          {/* Left column: broadcast preview + control strip */}
          <div className="flex flex-col h-full min-h-0">
            <PreviewPane description={description} />
            <div className="mt-3">
              <Button variant="outline" onClick={()=> setSettingsOpen(true)}>Broadcast Settings (Custom RTMP)</Button>
            </div>
          </div>

          {/* Right column: Existing form fields */}
          <div className="space-y-3 h-full overflow-auto pr-1">
            <div>
              <label className="text-sm">Title</label>
              <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Campaign title" />
            </div>
            <div>
              <label className="text-sm">Description</label>
              <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="What is this campaign about?" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Website URL (optional)</label>
                <Input value={website} onChange={(e)=>setWebsite(e.target.value)} placeholder="https://example.com" />
              </div>
              <div>
                <label className="text-sm">X (Twitter) URL (optional)</label>
                <Input value={xurl} onChange={(e)=>setXurl(e.target.value)} placeholder="https://x.com/username" />
              </div>
            </div>
            <div>
              <label className="text-sm">Campaign category</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { key: 'personal', label: 'Personal', desc: 'Individual creator or cause' },
                  { key: 'company', label: 'Company', desc: 'Organization or team' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={()=>setCategory(opt.key as 'personal'|'company')}
                    className={cn(
                      'text-left p-3 rounded-lg border bg-background hover:bg-accent/30',
                      category === opt.key ? 'border-primary ring-1 ring-primary' : 'border-border'
                    )}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm">Campaign image</label>
              <div className="mt-1 border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-accent/10"
                onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); handleSelect(e.dataTransfer.files); }}
                onClick={()=>{ const input = document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=()=>handleSelect(input.files); input.click(); }}
              >
                <div className="text-xs text-muted-foreground">Select a file or drag and drop</div>
              </div>
              {uploading && <div className="text-xs text-muted-foreground mt-1">Uploading...</div>}
              {file && <div className="text-xs mt-1">Selected: {file.name}</div>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Donation goal</label>
                <div className="text-xs text-muted-foreground">{goal.toFixed(1)} SOL</div>
              </div>
              <div className="pt-2">
                <Slider value={[goal]} min={0} max={1000} step={0.1} onValueChange={(v)=>setGoal(v?.[0] ?? 0)} />
              </div>
            </div>
            {/* Collage upload strip */}
            <div>
              <label className="text-sm">Campaign photo collage</label>
              <div
                className="mt-2 rounded-xl border border-dashed border-border bg-background/50 p-6 cursor-pointer hover:bg-accent/10 flex flex-col items-center justify-center text-center min-h-[160px]"
                onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); handleCollageSelect(e.dataTransfer.files); }}
                onClick={()=>{ const input = document.createElement('input'); input.type='file'; input.accept='image/*'; input.multiple = true; input.onchange=()=>handleCollageSelect(input.files); input.click(); }}
              >
                <svg className="h-8 w-8 text-muted-foreground mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4"/>
                  <path d="M8 8l4-4 4 4"/>
                  <rect x="3" y="16" width="18" height="4" rx="1"/>
                </svg>
                <div className="text-xs text-muted-foreground">Drag images here or click to select files</div>
                {collagePreviews.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto w-full py-1">
                    {collagePreviews.map((src, idx) => (
                      <img key={idx} src={src} alt={`collage-${idx}`} className="h-16 w-24 object-cover rounded border border-border" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Mint address is assigned automatically after launch; user does not input it */}
          </div>
        </div>
        <DialogFooter>
          <Button variant="iosOutline" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={saving || uploading || !title.trim() || !description.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
      <StreamSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} channelName={null} />
    </Dialog>
  );
}

// Left preview pane with live camera preview and control strip
function PreviewPane({ description }: { description: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCamError('Camera not supported');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Autoplay can fail quietly; ignore
          videoRef.current.play().catch(() => {});
        }
        setCamError(null);
      } catch (e) {
        setCamError('Camera access denied');
      }
    };
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative w-full flex-1 min-h-0 rounded-xl overflow-hidden border border-border bg-black/90 flex items-center justify-center">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted
        />
        {camError && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            {camError}
          </div>
        )}
        {/* Optional live badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white tracking-wide">LIVE</div>
      </div>
      {/* Horizontal strip under preview */}
      <div className="mt-3 flex items-center justify-between gap-3 border border-border rounded-xl px-3 py-2 bg-card/60">
        <div className="flex items-center gap-2">
          {[{label:'Twitch'}, {label:'TikTok Live'}, {label:'X'}, {label:'YouTube'}].map((b) => (
            <button
              key={b.label}
              type="button"
              className="h-10 w-10 rounded-full border border-border bg-background hover:bg-accent/40 text-xs flex items-center justify-center"
              title={`Stream on ${b.label}`}
            >
              {b.label[0]}
            </button>
          ))}
        </div>
        <div className="text-right text-xs md:text-sm text-foreground/90 truncate" title={description}>
          {description || 'Your stream text will appear here'}
        </div>
      </div>
    </div>
  );
}
