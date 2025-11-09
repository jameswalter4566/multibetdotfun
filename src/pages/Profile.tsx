import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import CampaignCreateModal from '@/components/CampaignCreateModal';
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import { useMemo as useReactMemo } from 'react';
import { apiProviders } from "@/data/apiProviders";

type DBUser = {
  id: number;
  userdid: string | null;
  username: string | null;
  screename: string | null;
  profile_picture_url: string | null;
  bio: string | null;
};

  type Campaign = {
    id: number;
    user_id: number;
    title: string;
    description: string;
    image_url: string | null;
    mint_address: string | null;
    raised_sol: number;
    goal_sol?: number;
    created_at: string;
    website_url?: string | null;
    x_url?: string | null;
  };

export default function ProfilePage() {
  const docHome = useReactMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);
  const navLinks: DashboardNavLink[] = useReactMemo(
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
  const [user, setUser] = useState<DBUser | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const currentUserId = useMemo(() => Number(localStorage.getItem('current_user_id') || '') || null, []);
  const isOwner = !!(currentUserId && user && currentUserId === user.id);
  const handle = channel || '';

  const totalRaised = useMemo(() => {
    return campaigns.reduce((sum, c) => sum + (Number(c.raised_sol) || 0), 0);
  }, [campaigns]);

  useEffect(() => {
    let usersSub: any = null;
    let campaignsSub: any = null;
    (async () => {
      try {
        setLoading(true);
        // Load user by screename or username
        const { data: u } = await supabase
          .from('users')
          .select('id, userdid, username, screename, profile_picture_url, bio')
          .or(`screename.eq.${handle},username.eq.${handle},userdid.eq.${handle}`)
          .maybeSingle();
        setUser(u as any);
        if (u?.id) {
          // Load campaigns
          const { data: camps } = await supabase
            .from('campaigns')
            .select('id, user_id, title, description, image_url, mint_address, raised_sol, goal_sol, website_url, x_url, created_at')
            .eq('user_id', u.id)
            .order('created_at', { ascending: false });
          setCampaigns((camps as any) || []);

          // Subscribe to realtime updates
          usersSub = supabase
            .channel('realtime:user_profile')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${u.id}` }, (payload) => {
              const row = payload.new as DBUser;
              setUser((cur) => ({ ...(cur as any), ...row }));
            })
            .subscribe();

          campaignsSub = supabase
            .channel('realtime:campaigns')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `user_id=eq.${u.id}` }, () => {
              // Refresh list on any change
              supabase
                .from('campaigns')
                .select('id, user_id, title, description, image_url, mint_address, raised_sol, goal_sol, website_url, x_url, created_at')
                .eq('user_id', u.id)
                .order('created_at', { ascending: false })
                .then(({ data }) => setCampaigns((data as any) || []));
            })
            .subscribe();
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      try { usersSub && supabase.removeChannel(usersSub); } catch {}
      try { campaignsSub && supabase.removeChannel(campaignsSub); } catch {}
    };
  }, [handle]);

  if (!channel) return <div className="p-6">Missing user</div>;

  const avatar = (user?.profile_picture_url
    || (typeof window !== 'undefined' ? localStorage.getItem('current_user_profile_url') : null)
    || (user?.userdid ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.userdid}` : '/placeholder.svg')) as string;
  const display = user?.screename || user?.username || handle;

  const beginEdit = () => { setBioDraft(user?.bio || ''); setEditing(true); };
  const saveBio = async () => {
    if (!user) return; 
    await supabase.from('users').update({ bio: bioDraft }).eq('id', user.id);
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav links={navLinks} />
      <main className="container mx-auto px-4 pt-20 pb-10 max-w-5xl">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <img src={avatar} alt={display} className="h-24 w-24 rounded-full object-cover border border-border" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{display}</h1>
              <p className="text-sm text-muted-foreground">@{handle}</p>

              {/* Bio section with total raised */}
              <div className="mt-4 text-sm text-foreground/90">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Bio</div>
                  {isOwner && !editing && (
                    <Button variant="iosOutline" size="sm" onClick={beginEdit}>
                      ✏️ Edit bio
                    </Button>
                  )}
                </div>
                {!editing ? (
                  <div className="mt-1 whitespace-pre-wrap min-h-[2rem]">{user?.bio || 'No bio provided yet.'}</div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <Textarea value={bioDraft} onChange={(e)=>setBioDraft(e.target.value)} placeholder="Write your bio..." />
                    <div className="flex gap-2 justify-end">
                      <Button variant="iosOutline" onClick={()=>setEditing(false)}>Cancel</Button>
                      <Button onClick={saveBio}>Save</Button>
                    </div>
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground">Total processed: <span className="text-foreground font-medium">{totalRaised.toFixed(2)} SOL</span></div>
              </div>

              {/* Actions */}
              {isOwner && (
                <div className="mt-4">
                  <Button onClick={()=>setCreateOpen(true)} className="px-3 py-1.5">Launch a project</Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Launches */}
        <div id="campaigns" className="mt-6 bg-card border border-border rounded-lg">
          <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Launches</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : campaigns.length === 0 ? (
              <div className="text-sm text-muted-foreground">User has not published any launches yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map(c => (
                  <div key={c.id} className="ios-card overflow-hidden">
                    <a className="block" href={`/campaign/${c.id}`}>
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.title} className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-muted" />
                      )}
                    </a>
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate" title={c.title}>{c.title}</div>
                        <Button asChild variant="iosOutline" size="sm">
                          <a href={`/campaign/${c.id}`}>Open Broadcast</a>
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</div>
                      <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                        {c.website_url && <a className="underline" href={c.website_url} target="_blank" rel="noreferrer">Website</a>}
                        {c.x_url && <a className="underline" href={c.x_url} target="_blank" rel="noreferrer">X</a>}
                      </div>
                      {/* Launch progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                          <span>Launch progress</span>
                          <span>Launch target</span>
                        </div>
                        {(() => {
                          const raised = Number(c.raised_sol || 0);
                          const goal = Number(c.goal_sol || 0);
                          const pct = goal > 0 ? Math.max(0, Math.min(100, (raised / goal) * 100)) : 0;
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
                          {Number(c.raised_sol || 0).toFixed(2)} SOL processed toward {Number(c.goal_sol || 0).toFixed(2)} SOL target
                        </div>
                        {c.mint_address && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Mint: <a href={`https://pump.fun/coin/${c.mint_address}`} target="_blank" rel="noreferrer" className="underline font-mono">{c.mint_address}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {isOwner && (
        <CampaignCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </div>
  );
}
