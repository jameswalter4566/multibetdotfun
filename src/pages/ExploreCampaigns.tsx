import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardTopNav, { type DashboardNavLink } from "@/components/DashboardTopNav";
import { useMemo as useReactMemo } from 'react';
import { apiProviders } from "@/data/apiProviders";

type Campaign = {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  raised_sol: number;
};

export default function ExploreCampaignsPage() {
  const docHome = useReactMemo(() => (apiProviders[0] ? `/documentation/${apiProviders[0].slug}` : "/marketplace"), []);
  const navLinks: DashboardNavLink[] = useReactMemo(
    () => [
      { label: "Explore API market place", href: "#marketplace" },
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
        .select('id, title, description, image_url, raised_sol')
        .order('created_at', { ascending: false });
      setCampaigns((data as any) || []);
      sub = supabase
        .channel('realtime:explore_campaigns')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
          supabase
            .from('campaigns')
            .select('id, title, description, image_url, raised_sol')
            .order('created_at', { ascending: false })
            .then(({ data }) => setCampaigns((data as any) || []));
        })
        .subscribe();
      setLoading(false);
    })();
    return () => { try { sub && supabase.removeChannel(sub); } catch {} };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav links={navLinks} />
      <main className="container mx-auto px-4 pt-20 pb-10 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Explore Launches</h1>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="text-sm text-muted-foreground">No launches yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {campaigns.map(c => (
              <div key={c.id} className="ios-card overflow-hidden">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.title} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-muted" />
                )}
                <div className="p-3">
                  <div className="font-medium text-sm truncate" title={c.title}>{c.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{c.description}</div>
                  <div className="mt-2 text-xs text-muted-foreground">Processed: {Number(c.raised_sol || 0).toFixed(2)} SOL</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
