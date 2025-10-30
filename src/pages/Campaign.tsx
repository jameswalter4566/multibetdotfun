import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { agoraLive } from '@/services/agoraLive';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { supabase } from '@/integrations/supabase/client';
import { connectPhantom } from '@/lib/phantom';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import UserBadge from '@/components/UserBadge';
import StreamSettingsModal from '@/components/StreamSettingsModal';

  type Campaign = {
    id: number;
    user_id: number;
    title: string;
    description: string;
    image_url: string | null;
    mint_address: string | null;
    raised_sol: number;
    total_received_sol?: number | null;
  goal_sol?: number | null;
  website_url?: string | null;
  x_url?: string | null;
  created_at: string;
};

type DBUser = {
  id: number;
  userdid: string | null;
  username: string | null;
  screename: string | null;
  profile_picture_url: string | null;
  wallet_public_key: string | null;
};

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = useMemo(() => Number(id || 0) || 0, [id]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [owner, setOwner] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ id: number; user: string; text: string; ts: number; sc?: boolean; amt?: number }>>([]);
  const msgIdRef = useRef(1);
  const [donations, setDonations] = useState<Array<{ id: number; user: string; amount: number; message: string; ts: number; sig?: string }>>([]);
  const donationIdRef = useRef(1);
  const [donationOpen, setDonationOpen] = useState(false);
  const [sendingDonation, setSendingDonation] = useState(false);
  const [superChatOn, setSuperChatOn] = useState(false);
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [donationMsg, setDonationMsg] = useState<string>("");

  useEffect(() => {
    if (!campaignId) return;
    let sub: any = null;
    let chatSub: any = null;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('campaigns')
        .select('id, user_id, title, description, image_url, mint_address, raised_sol, total_received_sol, goal_sol, website_url, x_url, created_at, channel_name, is_live, started_at')
        .eq('id', campaignId)
        .maybeSingle();
      setCampaign((data as any) || null);
      if ((data as any)?.user_id) {
        const { data: u } = await supabase
          .from('users')
          .select('id, userdid, username, screename, profile_picture_url, wallet_public_key')
          .eq('id', (data as any).user_id)
          .maybeSingle();
        setOwner((u as any) || null);
      }
      sub = supabase
        .channel('realtime:campaign_view')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` }, (payload) => {
          setCampaign(payload.new as any);
        })
        .subscribe();
      // Load existing chat
      try {
        const { data: msgs } = await supabase
          .from('live_chat')
          .select('id, user_id, user_display, message, is_superchat, amount_sol, created_at')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: true });
        if (Array.isArray(msgs)) {
          setMessages(
            (msgs as any[]).map((m: any) => ({ id: m.id, user: m.user_display || `user_${m.user_id}`, text: m.message, ts: new Date(m.created_at).getTime(), sc: !!m.is_superchat, amt: Number(m.amount_sol || 0) }))
          );
        }
      } catch {}
      // Subscribe to new chat events
      chatSub = supabase
        .channel(`realtime:chat:${campaignId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chat', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
          const r: any = payload.new;
          if (!r) return;
          setMessages(prev => ([...prev, { id: r.id, user: r.user_display || `user_${r.user_id}`, text: r.message, ts: new Date(r.created_at).getTime(), sc: !!r.is_superchat, amt: Number(r.amount_sol || 0) }]));
          try { const el = document.getElementById('chat-scroll'); if (el) el.scrollTop = el.scrollHeight; } catch {}
        })
        .subscribe();

      setLoading(false);
    })();
    return () => { try { sub && supabase.removeChannel(sub); } catch {}; try { chatSub && supabase.removeChannel(chatSub); } catch {} };
  }, [campaignId]);

  if (!campaignId) return <div className="p-6">Missing launch id</div>;

  const title = campaign?.title || 'Launch';
  const parentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const ownerAvatar = owner?.profile_picture_url || (owner?.userdid ? `https://api.dicebear.com/7.x/identicon/svg?seed=${owner.userdid}` : '/placeholder.svg');
  const ownerName = owner?.screename || owner?.username || (owner?.userdid ? `${String(owner.userdid).slice(0,4)}…${String(owner.userdid).slice(-4)}` : 'creator');
  const totalDonated = useMemo(() => donations.reduce((s, d) => s + (Number(d.amount) || 0), 0), [donations]);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const screenContainerRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioTracksRef = useRef<any[]>([]);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const currentUserId = useMemo(() => Number(localStorage.getItem('current_user_id') || '') || null, []);
  const isOwner = !!(currentUserId && campaign && currentUserId === campaign.user_id);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const channelName = useMemo(() => (campaign ? (campaign as any).channel_name || `campaign-${campaign.id}` : ''), [campaign]);
  const shouldAutoGoLive = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('goLive') === '1';
    } catch { return false; }
  }, []);

  useEffect(() => {
    const live = (campaign as any)?.is_live;
    console.log('[CampaignLive] mount/effect', { isOwner, live, channelName });
    let joined = false;
    if (channelName) {
      const local = (() => {
        try { return agoraLive.getLocalTracks(channelName); } catch { return null; }
      })();
      const hasLocalVideo = !!(local && (local as any).video);
      // Do NOT auto-join as audience for owners; it interferes with host publishing.
      const shouldAudienceJoin = !isOwner;
      console.log('[CampaignLive] decide join', { hasLocalVideo, shouldAudienceJoin });
      if (shouldAudienceJoin) {
        agoraLive.setHandlers(channelName, {
          onUserPublished: (user, mediaType) => {
            console.log('[CampaignLive] onUserPublished', { mediaType, uid: (user as any)?.uid });
            if (mediaType === 'video') {
              const el = videoContainerRef.current; if (!el) { console.warn('[CampaignLive] no video container'); return; }
              el.innerHTML='';
              try { user.videoTrack?.play(el); console.log('[CampaignLive] played remote video'); } catch (e) { console.warn('[CampaignLive] play video failed', e); }
            }
            if (mediaType === 'audio') {
              if (user.audioTrack) {
                remoteAudioTracksRef.current.push(user.audioTrack);
                try { user.audioTrack.play(); console.log('[CampaignLive] played remote audio'); }
                catch (e) { console.warn('[CampaignLive] play audio blocked', e); setAudioBlocked(true); }
              }
            }
          },
        });
        console.log('[CampaignLive] joining audience…', { channelName });
        agoraLive.join(channelName, 'audience').then(()=>{ joined = true; console.log('[CampaignLive] audience joined'); }).catch((e)=>{ console.error('[CampaignLive] audience join failed', e); });
        // One-time auto-refresh if remote video fails to mount (only when DB says live)
        if (live === true) {
          try {
            const key = `streamAutoRefresh:${channelName}`;
            if (!sessionStorage.getItem(key)) {
              const timer = setTimeout(() => {
                const container = videoContainerRef.current;
                if (container && container.childElementCount === 0) {
                  sessionStorage.setItem(key, '1');
                  console.warn('[CampaignLive] auto-refresh due to empty container');
                  window.location.reload();
                }
              }, 1200);
              return () => { clearTimeout(timer); };
            }
          } catch {}
        }
      } else {
        console.log('[CampaignLive] skipping audience join; local host video present');
      }
    } else {
      console.log('[CampaignLive] not live or no channelName; skipping join');
    }
    return () => { if (joined) { console.log('[CampaignLive] leaving audience…'); try { agoraLive.leave(channelName); } catch (e) { console.warn('[CampaignLive] leave failed', e); } } };
  }, [isOwner, (campaign as any)?.is_live, channelName]);

  // Auto-start host streaming when navigated with ?goLive=1 (from creation modal)
  useEffect(() => {
    if (!isOwner || !shouldAutoGoLive || !channelName || !(campaign && campaign.id)) return;
    (async () => {
      try {
        await AgoraRTC.resumeAudioContext();
        await agoraLive.join(channelName, 'host');
        let publishedVideo: any = null;
        try {
          const { video } = await agoraLive.startPublishing(channelName, true, true);
          publishedVideo = video || null;
        } catch (err: any) {
          if (err && /Join channel first/i.test(String(err.message || err))) {
            await new Promise(r => setTimeout(r, 200));
            await agoraLive.join(channelName, 'host');
            const { video } = await agoraLive.startPublishing(channelName, true, true);
            publishedVideo = video || null;
          } else {
            throw err;
          }
        }
        const el = videoContainerRef.current; if (el && publishedVideo) { try { publishedVideo.play(el); } catch {} }
        await supabase.from('campaigns').update({ is_live: true, channel_name: channelName, started_at: new Date().toISOString() }).eq('id', campaign!.id);
        setCampaign(cur => cur ? ({ ...(cur as any), is_live: true, channel_name: channelName } as any) : cur);
      } catch (e) {
        console.warn('Auto Go Live failed:', e);
      }
    })();
  }, [isOwner, shouldAutoGoLive, channelName, campaign?.id]);

  // If owner started live elsewhere (e.g., creation modal), render their local preview here
  useEffect(() => {
    if (!isOwner || !(campaign as any)?.is_live || !channelName) return;
    try {
      const { video } = agoraLive.getLocalTracks(channelName);
      if (video && videoContainerRef.current) {
        videoContainerRef.current.innerHTML = '';
        (video as any).play(videoContainerRef.current);
      }
    } catch {}
  }, [isOwner, (campaign as any)?.is_live, channelName]);

  const unlockAudio = useCallback(async () => {
    console.log('[CampaignLive] unlockAudio click');
    try {
      await AgoraRTC.resumeAudioContext();
      for (const t of remoteAudioTracksRef.current) { try { t.play(); } catch {} }
      try { sessionStorage.setItem('agoraAudioUnlocked', '1'); } catch {}
    } catch {}
    setAudioBlocked(false);
  }, []);

  const sendChat = useCallback(async (text: string) => {
    if (!campaignId || !currentUserId) return;
    const display = (localStorage.getItem('current_user_screename')
      || localStorage.getItem('current_user_username')
      || (localStorage.getItem('current_user_userdid') ? `${String(localStorage.getItem('current_user_userdid')!).slice(0,4)}…${String(localStorage.getItem('current_user_userdid')!).slice(-4)}` : 'user')) as string;
    // Super Chat is free — no amount is requested or charged
    await supabase.from('live_chat').insert({
      campaign_id: campaignId,
      user_id: currentUserId,
      user_display: display,
      message: text,
      is_superchat: !!superChatOn,
      amount_sol: null,
    });
    if (superChatOn) setSuperChatOn(false);
  }, [campaignId, currentUserId, owner?.wallet_public_key, superChatOn]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top-left logo */}
      <Link to="/" className="fixed top-2 left-12 md:left-16 z-30 block">
        <img src="/marketx-logo.png" alt="x402 marketplace" className="h-12 w-auto md:h-14 lg:h-16 align-middle" />
      </Link>
      {/* Top-right nav (match Index nav) */}
      <nav className="fixed top-2 right-16 md:right-24 z-30 h-12 md:h-14 lg:h-16 flex items-center gap-6 md:gap-8">
        <a href="/#mission" className="text-foreground/90 hover:underline text-sm md:text-base">Mission</a>
        <a href="/#workers" className="text-foreground/90 hover:underline text-sm md:text-base">Explore Organizers</a>
        <a href="/explore" className="text-foreground/90 hover:underline text-sm md:text-base">Explore Campaigns</a>
        <a href="/campaigns" className="text-foreground/90 hover:underline text-sm md:text-base">Start a Campaign</a>
        <UserBadge />
        <a href="https://x.com/marketx402" target="_blank" rel="noopener noreferrer" className="text-foreground/90 hover:underline text-sm md:text-base">Follow us on X</a>
      </nav>

      <div className="container mx-auto px-2 md:px-4 pt-20 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: broadcast placeholder (mirrors Stream layout) */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="ios-card overflow-hidden h-[70vh] lg:h-[calc(100vh-8rem)] flex flex-col">
              <div className="flex-1 bg-black relative">
                {campaign?.image_url ? (
                  <img src={campaign.image_url} alt={title} className="w-full h-full object-cover opacity-40" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Broadcast</div>
                )}
                <div ref={videoContainerRef} className="absolute inset-0" />
                <div ref={screenContainerRef} className="absolute inset-0 pointer-events-none" />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white tracking-wide">LIVE</div>
                {audioBlocked && (
                  <button
                    onClick={unlockAudio}
                    className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-background/80 border border-border text-xs hover:bg-accent"
                  >
                    Enable Audio
                  </button>
                )}
              </div>
              
              <div className="border-t border-border px-3 md:px-4 py-4 bg-background">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <img
                        src={campaign?.image_url || '/placeholder.svg'}
                        alt={title}
                        className="h-12 w-12 rounded object-cover border border-border"
                      />
                      <div className="text-[11px] text-muted-foreground leading-none mt-1 text-center max-w-[8rem] truncate">
                        {title}
                      </div>
                    </div>
                    <div className="hidden md:block w-px h-10 bg-border ml-2" />
                    <div className="text-xs md:text-sm text-muted-foreground space-x-3">
                      <span className="inline-block">Collected: {Number((campaign as any)?.total_received_sol ?? campaign?.raised_sol ?? 0).toFixed(2)} SOL{typeof campaign?.goal_sol === 'number' ? ` / ${Number(campaign?.goal_sol || 0).toFixed(1)} SOL` : ''}</span>
                      <span className="inline-block">
                        Mint: {campaign?.mint_address ? (
                          <a href={`https://pump.fun/coin/${campaign.mint_address}`} target="_blank" rel="noreferrer" className="underline font-mono">{campaign.mint_address}</a>
                        ) : '—'}
                      </span>
                    </div>
                    
                    <div className="hidden sm:block ml-auto text-xs md:text-sm text-muted-foreground">
                      Website: {campaign?.website_url ? (<a className="underline" href={campaign.website_url} target="_blank" rel="noreferrer">{campaign.website_url}</a>) : '—'}
                    </div>
                  </div>
                  <form
                    className="flex items-center gap-2 flex-wrap"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget as HTMLFormElement);
                      const amt = Number(fd.get('amount') as string);
                      alert(`Send ${isFinite(amt) ? amt : 0} SOL to ${title}`);
                    }}
                  >
                    {[0.1, 0.2, 0.5, 1].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('payment-amount') as HTMLInputElement | null;
                          if (input) input.value = String(v);
                        }}
                        className="px-2 py-1 text-xs rounded border border-border hover:bg-accent"
                      >
                        {v.toFixed(2)} SOL
                      </button>
                    ))}
                    <input
                      id="payment-amount"
                      name="amount"
                      inputMode="decimal"
                      placeholder="Amount (SOL)"
                      className="px-4 py-1.5 h-9 rounded-full border border-border bg-background text-sm w-32 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                    />
                    <button
                      type="button"
                      onClick={() => setDonationOpen(true)}
                      className="px-3 py-1.5 h-8 rounded-full bg-primary text-primary-foreground text-sm hover:opacity-90"
                    >
                      Send payment
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const url = window.location.href;
                          navigator.clipboard.writeText(url);
                          alert('Link copied to clipboard');
                        } catch {
                          // noop
                        }
                      }}
                      className="px-3 py-1.5 h-8 rounded-full bg-primary text-primary-foreground text-sm hover:opacity-90"
                    >
                      Share
                    </button>
                  </form>
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={claiming}
                        onClick={async () => {
                          if (!currentUserId) return;
                          setClaimMsg(null);
                          setClaiming(true);
                          try {
                            const { data, error } = await supabase.functions.invoke('claim-creator-fees', {
                              body: { userId: currentUserId, campaignId: campaign?.id },
                            });
                            if (error || !data?.success) throw new Error((data as any)?.error || error?.message || 'Failed to claim fees');
                            setClaimMsg(`Fees claimed! Tx: ${(data as any).signature}`);
                          } catch (e: any) {
                            setClaimMsg(`Claim failed: ${e?.message || String(e)}`);
                          } finally {
                            setClaiming(false);
                          }
                        }}
                        className={`px-3 py-1.5 h-8 rounded-full text-sm ${claiming ? 'bg-muted text-foreground/60' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
                      >
                        {claiming ? 'Claiming…' : 'Claim Creator Fees'}
                      </button>
                      {claimMsg && (
                        <div className="text-xs text-muted-foreground truncate max-w-[50%]" title={claimMsg}>{claimMsg}</div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <img src={ownerAvatar} alt={ownerName} className="h-8 w-8 rounded-full border border-border object-cover" />
                    <div className="text-xs md:text-sm text-foreground/90">{ownerName}</div>
                    <div className="ml-auto text-xs md:text-sm text-muted-foreground sm:hidden">
                      Website: {campaign?.website_url ? (<a className="underline" href={campaign.website_url} target="_blank" rel="noreferrer">{campaign.website_url}</a>) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="ios-card overflow-hidden h-[70vh] lg:h-[calc(100vh-8rem)] sticky top-20 flex flex-col">
              <div className="px-3 py-2 border-b border-border text-sm font-medium flex items-center justify-between">
                <div>Live Chat</div>
                <div className="text-xs md:text-sm text-muted-foreground">Total collected: {(Number(campaign?.raised_sol || 0) + totalDonated).toFixed(2)} SOL</div>
              </div>
              <div className="flex-1 overflow-auto p-3 space-y-2" id="chat-scroll">
                {messages.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No messages yet. Be the first to chat.</div>
                ) : (
                  messages.map((m: any) => (
                    <div key={m.id} className={m.sc ? "text-base font-extrabold text-[#0ea5ff] drop-shadow-[0_0_12px_rgba(14,165,255,0.9)]" : "text-sm"}>
                      <span className="text-muted-foreground">[{new Date(m.ts).toLocaleTimeString()}]</span>{' '}
                      <span className="font-medium">{m.user}:</span>{' '}
                      {m.sc && <span className="px-2 py-0.5 rounded bg-[#0ea5ff]/20 border border-[#0ea5ff]/40 mr-1">SUPERCHAT</span>}
                      {m.text}
                      {m.sc && m.amt ? <span className="ml-1 text-[#0ea5ff]">({m.amt.toFixed(2)} SOL)</span> : null}
                    </div>
                  ))
                )}
              </div>
              <form
                className="p-3 border-t border-border flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const txt = chatInput.trim();
                  if (!txt) return;
                  setChatInput('');
                  sendChat(txt);
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e)=>setChatInput(e.target.value)}
                  placeholder="Type a message"
                  className="flex-1 h-9 px-4 rounded-full border border-border bg-background text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                />
                <button type="submit" className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-sm hover:opacity-90">Send</button>
              </form>
              <div className="px-3 pb-3 flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <span className="text-muted-foreground">Super Chat</span>
                  <input type="checkbox" className="h-4 w-4" checked={superChatOn} onChange={(e)=> setSuperChatOn(e.target.checked)} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {isOwner && (
            <div className="ios-card p-4 flex items-center gap-3">
              <button
                className="px-3 py-1.5 h-9 rounded-full bg-primary text-primary-foreground text-sm hover:opacity-90"
                onClick={async () => {
                  try { await AgoraRTC.resumeAudioContext(); } catch {}
                  const ch = channelName || `campaign-${campaignId}`;
                  try {
                    // Ensure any audience session is left before hosting
                    try { console.log('[CampaignLive] pre-host leave any existing session'); await agoraLive.leave(ch); } catch {}
                    await agoraLive.join(ch, 'host');
                    let publishedVideo: any = null;
                    try {
                      const { video } = await agoraLive.startPublishing(ch, true, true);
                      publishedVideo = video || null;
                    } catch (err: any) {
                      if (err && /Join channel first/i.test(String(err.message || err))) {
                        await new Promise(r => setTimeout(r, 200));
                        await agoraLive.join(ch, 'host');
                        const { video } = await agoraLive.startPublishing(ch, true, true);
                        publishedVideo = video || null;
                      } else {
                        throw err;
                      }
                    }
                    const el = videoContainerRef.current; if (el && publishedVideo) { try { publishedVideo.play(el); } catch {} }
                    await supabase.from('campaigns').update({ is_live: true, channel_name: ch, started_at: new Date().toISOString() }).eq('id', campaignId);
                    setCampaign(cur => cur ? ({ ...(cur as any), is_live: true, channel_name: ch } as any) : cur);
                  } catch (e) { alert('Failed to go live'); }
                }}
              >Go Live</button>
              <button
                className="px-3 py-1.5 h-9 rounded-full bg-blue-600 text-white text-sm hover:opacity-90"
                onClick={() => setSettingsOpen(true)}
              >Stream Settings</button>
              <button
                className="px-3 py-1.5 h-9 rounded-full bg-blue-600 text-white text-sm hover:opacity-90"
                onClick={async () => {
                  if (!isOwner) return;
                  const ch = channelName || `campaign-${campaignId}`;
                  try {
                    if (!screenOn) {
                      const track = await agoraLive.startScreenShare(ch);
                      const el = screenContainerRef.current; if (el && track) { try { el.innerHTML=''; (track as any).play(el); } catch {} }
                      setScreenOn(true);
                    } else {
                      await agoraLive.stopScreenShare(ch);
                      const el = screenContainerRef.current; if (el) el.innerHTML='';
                      setScreenOn(false);
                    }
                  } catch (e) {
                    console.error('Screen share error', e);
                  }
                }}
              >{screenOn ? 'Stop Share' : 'Share Screen'}</button>
              <button
                className="px-3 py-1.5 h-9 rounded-full border border-border text-sm hover:bg-accent"
                onClick={async () => {
                  const ch = channelName || `campaign-${campaignId}`;
                  try { await agoraLive.stopScreenShare(ch); } catch {}
                  try { await agoraLive.leave(ch); } catch {}
                  await supabase.from('campaigns').update({ is_live: false }).eq('id', campaignId);
                  setCampaign(cur => cur ? ({ ...(cur as any), is_live: false } as any) : cur);
                  const el = videoContainerRef.current; if (el) el.innerHTML='';
                  const sel = screenContainerRef.current; if (sel) sel.innerHTML='';
                }}
              >End Live</button>
            </div>
          )}
          {isOwner && (
            <StreamSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} channelName={channelName} />
          )}
          <div className="ios-card p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs md:text-sm text-muted-foreground space-x-3">
                  <span>Collected: {Number(campaign?.raised_sol || 0).toFixed(2)} SOL{typeof campaign?.goal_sol === 'number' ? ` / ${Number(campaign?.goal_sol || 0).toFixed(1)} SOL` : ''}</span>
                  <span>
                    Mint: {campaign?.mint_address ? (
                      <a href={`https://pump.fun/coin/${campaign.mint_address}`} target="_blank" rel="noreferrer" className="underline font-mono">{campaign.mint_address}</a>
                    ) : '—'}
                  </span>
                  <span>Website: {campaign?.website_url ? (<a className="underline" href={campaign.website_url} target="_blank" rel="noreferrer">{campaign.website_url}</a>) : '—'}</span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2 flex-wrap">
                  {[0.1, 0.2, 0.5, 1].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDonationAmount(String(v))}
                      className="px-2 py-1 text-xs rounded border border-border hover:bg-accent"
                    >
                      {v.toFixed(2)} SOL
                    </button>
                  ))}
                  <input
                    value={donationAmount}
                    onChange={(e)=>setDonationAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="Amount (SOL)"
                    className="px-2 py-1 h-8 rounded border border-border bg-background text-sm w-28"
                  />
                  <button
                    type="button"
                    onClick={() => setDonationOpen(true)}
                    className="px-3 py-1.5 h-8 rounded-full bg-primary text-primary-foreground text-sm hover:opacity-90"
                  >
                    Send payment
                  </button>
                  <button
                    type="button"
                    onClick={() => { try { navigator.clipboard.writeText(window.location.href); alert('Link copied to clipboard'); } catch {} }}
                    className="px-3 py-1.5 h-8 rounded-full bg-primary text-primary-foreground text-sm hover:opacity-90"
                  >
                    Share
                  </button>
                </div>
              </div>
              <div className="text-sm text-foreground/90">${Number(((campaign as any)?.total_received_sol ?? campaign?.raised_sol ?? 0) + totalDonated).toFixed(2)} Processed so far!</div>
            </div>
          </div>

          <div className="ios-card">
            <div className="px-4 py-3 border-b border-border text-sm font-medium">Recent payments</div>
            <div className="p-4">
              {donations.length === 0 ? (
                <div className="text-sm text-muted-foreground">No payments yet.</div>
              ) : (
                <div className="space-y-2">
                  {donations.slice().reverse().map(d => (
                    <div key={d.id} className="flex items-start gap-3 text-sm">
                      <div className="font-medium w-24">{d.amount.toFixed(2)} SOL</div>
                      <div className="flex-1">
                        <div className="text-foreground/90">
                          from {d.user} <span className="text-xs text-muted-foreground">· {new Date(d.ts).toLocaleString()}</span>
                          {d.sig && (
                            <a className="ml-2 text-xs underline" href={`https://solscan.io/tx/${d.sig}`} target="_blank" rel="noreferrer">View on Solscan</a>
                          )}
                        </div>
                        {d.message && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{d.message}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {donationOpen && (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
        <div className="relative w-full aspect-video bg-muted">
          {campaign?.image_url ? (
            <img src={campaign.image_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Launch</div>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm font-medium">Send a payment</div>
          <div className="flex items-center gap-2 flex-wrap">
            {[0.1, 0.2, 0.5, 1].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setDonationAmount(String(v))}
                className="px-2 py-1 text-xs rounded border border-border hover:bg-accent"
              >
                {v.toFixed(2)} SOL
              </button>
            ))}
          </div>
          <textarea
            value={donationMsg}
            onChange={(e)=>setDonationMsg(e.target.value)}
            placeholder="Add a message (optional)"
            className="w-full min-h-[80px] rounded border border-border bg-background text-sm p-2"
          />
          <div className="flex items-center gap-2">
            <input
              value={donationAmount}
              onChange={(e)=>setDonationAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Amount (SOL)"
              className="px-4 py-1.5 h-9 rounded-full border border-border bg-background text-sm flex-1 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
            />
            <button
              type="button"
              className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-60"
              disabled={sendingDonation}
              onClick={async () => {
                const amt = parseFloat(donationAmount);
                if (!isFinite(amt) || amt <= 0) { alert('Enter a valid amount'); return; }
                if (!owner?.wallet_public_key) { alert('Creator wallet not available'); return; }
                try {
                  setSendingDonation(true);
                  // Legacy transfer via Phantom
                  const { provider, publicKey } = await connectPhantom();
                  const rpc = (window as any).RPC_ENDPOINT || 'https://mainnet.helius-rpc.com/?api-key=f06c4460-64a5-427c-a481-9d173d50f50c';
                  const conn = new Connection(rpc, 'confirmed');
                  const from = new PublicKey(publicKey);
                  const to = new PublicKey(String(owner.wallet_public_key));
                  const lamports = Math.floor(amt * LAMPORTS_PER_SOL);
                  // Check balance to reduce warnings
                  try {
                    const bal = await conn.getBalance(from, { commitment: 'processed' });
                    if (bal <= lamports) { alert('Insufficient SOL balance in your wallet'); setSendingDonation(false); return; }
                  } catch {}
                  const { blockhash } = await conn.getLatestBlockhash({ commitment: 'processed' });
                  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }));
                  tx.feePayer = from;
                  (tx as any).recentBlockhash = blockhash;
                  let signature: string | null = null;
                  if ((provider as any).signAndSendTransaction) {
                    try {
                      const res = await (provider as any).signAndSendTransaction(tx);
                      signature = (res && (res.signature || res)) || null;
                    } catch (e) {
                      // fallback to sign + send raw
                      const signed = await (provider as any).signTransaction!(tx);
                      signature = await conn.sendRawTransaction(signed.serialize());
                    }
                  } else if ((provider as any).signTransaction) {
                    const signed = await (provider as any).signTransaction(tx);
                    signature = await conn.sendRawTransaction(signed.serialize());
                  }
                  try {
                    await supabase.from('donations').insert({
                      campaign_id: campaignId,
                      user_id: currentUserId,
                      amount_sol: amt,
                      is_superchat: false,
                      tx_signature: signature,
                    });
                    await supabase.functions.invoke('update-campaign-total', { body: { campaignId } });
                  } catch {}
                  // Reflect locally in UI
                  const uname = (localStorage.getItem('current_user_screename')
                    || localStorage.getItem('current_user_username')
                    || (localStorage.getItem('current_user_userdid') ? `user_${String(localStorage.getItem('current_user_userdid')!).slice(0,6)}` : 'anon')) as string;
                  const id = donationIdRef.current++;
                  setDonations(prev => [...prev, { id, user: uname, amount: amt, message: donationMsg.trim(), ts: Date.now(), sig: signature || undefined }]);
                  setDonationAmount('');
                  setDonationMsg('');
                  setDonationOpen(false);
                } catch (e) {
                  console.warn('Payment send failed', e);
                  alert('Payment failed or was cancelled');
                } finally {
                  setSendingDonation(false);
                }
              }}
            >
              {sendingDonation ? 'Sending…' : 'Send payment'}
            </button>
          </div>
          <div className="flex items-center justify-end">
            <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={()=> setDonationOpen(false)}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )}
    </div>
  );
}
