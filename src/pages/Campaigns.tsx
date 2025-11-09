import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CampaignCreateModal from '@/components/CampaignCreateModal';
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import { useMemo as useReactMemo } from 'react';
import { apiProviders } from "@/data/apiProviders";
import { Button } from '@/components/ui/button';

type Campaign = {
  id: number;
  user_id: number;
  title: string;
  description: string;
  image_url: string | null;
  mint_address: string | null;
  total_received_sol?: number | null;
  raised_sol: number;
  goal_sol?: number;
  created_at: string;
  website_url?: string | null;
  x_url?: string | null;
};

export default function CampaignsPage() {
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
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useMemo(() => Number(localStorage.getItem('current_user_id') || '') || 0, []);

  useEffect(() => {
    let sub: any = null;
    (async () => {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from('campaigns')
        .select('id, user_id, title, description, image_url, mint_address, raised_sol, total_received_sol, goal_sol, website_url, x_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setCampaigns((data as any) || []);
      sub = supabase
        .channel('realtime:my_campaigns')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `user_id=eq.${userId}` }, () => {
          supabase
            .from('campaigns')
            .select('id, user_id, title, description, image_url, mint_address, raised_sol, total_received_sol, goal_sol, website_url, x_url, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data }) => setCampaigns((data as any) || []));
        })
        .subscribe();
      setLoading(false);
    })();
    return () => { try { sub && supabase.removeChannel(sub); } catch {} };
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav links={navLinks} />
      <main className="container mx-auto px-4 pt-20 pb-10 max-w-5xl">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Your Launches</h1>
            <Button onClick={() => setOpen(true)}>Create a launch</Button>
          </div>
          <div className="mt-4">
            {!userId ? (
              <div className="text-sm text-muted-foreground">Please <a className="underline" href="/signin">sign in</a> to create a launch.</div>
            ) : loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : campaigns.length === 0 ? (
              <div className="text-sm text-muted-foreground">You have not published any launches yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map(c => (
                  <div key={c.id} className="ios-card overflow-hidden">
                    <a href={`/campaign/${c.id}`} className="block">
                      {c.image_url ? <img src={c.image_url} className="w-full aspect-video object-cover" alt={c.title} /> : <div className="w-full aspect-video bg-muted" />}
                    </a>
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate" title={c.title}>{c.title}</div>
                        <Button variant="iosOutline" size="sm" onClick={() => { window.location.href = `/campaign/${c.id}`; }}>Open Broadcast</Button>
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
                          const raised = Number((c as any).total_received_sol ?? c.raised_sol ?? 0);
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

      <CampaignCreateModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
