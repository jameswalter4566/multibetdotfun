import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import { useMemo as useReactMemo } from 'react';
import { apiProviders } from "@/data/apiProviders";

type Campaign = {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  raised_sol: number;
  created_at?: string;
};

export default function ExploreCampaignsPage() {
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sub: any = null;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('campaigns')
        .select('id, title, description, image_url, raised_sol, created_at')
        .order('created_at', { ascending: false });
      setCampaigns((data as any) || []);
      sub = supabase
        .channel('realtime:explore_campaigns')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
          supabase
            .from('campaigns')
            .select('id, title, description, image_url, raised_sol, created_at')
            .order('created_at', { ascending: false })
            .then(({ data }) => setCampaigns((data as any) || []));
        })
        .subscribe();
      setLoading(false);
    })();
    return () => { try { sub && supabase.removeChannel(sub); } catch {} };
  }, []);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent'|'raised'>('recent');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = campaigns.filter(c => !q
      || c.title.toLowerCase().includes(q)
      || (c.description || '').toLowerCase().includes(q)
    );
    return list.sort((a, b) => {
      if (sort === 'raised') return (Number(b.raised_sol||0) - Number(a.raised_sol||0));
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });
  }, [campaigns, search, sort]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav links={navLinks} />
      <main className="container mx-auto px-4 pt-20 pb-10 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Explore launches</h1>
            <p className="text-sm text-muted-foreground">Discover live and recent broadcasts from creators on Hub X 402.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-64"><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search launches…" className="rounded-full" /></div>
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e)=>setSort(e.target.value as any)}
              className="rounded-full border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="recent">Most recent</option>
              <option value="raised">Most raised</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({length:8}).map((_,i)=> (
              <div key={i} className="ios-card overflow-hidden animate-pulse">
                <div className="w-full aspect-square bg-muted" />
                <div className="p-3">
                  <div className="h-4 w-2/3 bg-muted rounded" />
                  <div className="mt-2 h-3 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-sm text-muted-foreground">No launches yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(c => (
              <div key={c.id} className="ios-card overflow-hidden">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.title} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-muted" />
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm truncate" title={c.title}>{c.title}</div>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">{Number(c.raised_sol||0).toFixed(2)} SOL</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
