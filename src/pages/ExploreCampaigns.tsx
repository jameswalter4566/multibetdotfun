import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Campaign = {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  raised_sol: number;
};

export default function ExploreCampaignsPage() {
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
      <a href="/" className="fixed top-2 left-12 md:left-16 z-20 block">
        <img src="/f6cc0350-62e9-4a52-a7b4-e9955a2333a3.png" alt="Liberated" className="h-12 w-auto md:h-14 lg:h-16 align-middle" />
        <img src="/950b5320-c3a6-44f1-8b8e-bdd46eb85fdf.png" alt="Partner" className="h-12 w-auto md:h-14 lg:h-16 ml-3 align-middle" />
      </a>
      <main className="container mx-auto px-4 pt-24 pb-10 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Explore Campaigns</h1>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="text-sm text-muted-foreground">No campaigns yet.</div>
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
                  <div className="mt-2 text-xs text-muted-foreground">Raised: {Number(c.raised_sol || 0).toFixed(2)} SOL</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
