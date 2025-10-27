import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type DBUser = {
  id: number;
  userdid: string | null;
  username: string | null;
  screename: string | null;
  profile_picture_url: string | null;
  bio?: string | null;
};

export default function OrganizersRealtimeGrid() {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [openUser, setOpenUser] = useState<DBUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('users')
          .select('id, userdid, username, screename, profile_picture_url, bio')
          .order('id', { ascending: false })
          .limit(24);
        if (!cancelled) setUsers((data as any) || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const ch = supabase
      .channel('realtime:users_grid')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async () => {
        try {
          const { data } = await supabase
            .from('users')
            .select('id, userdid, username, screename, profile_picture_url, bio')
            .order('id', { ascending: false })
            .limit(24);
          setUsers((data as any) || []);
        } catch {}
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {}; cancelled = true; };
  }, []);

  if (loading && (!users || users.length === 0)) {
    return <div className="text-sm text-muted-foreground text-center mb-4">Loading organizers…</div>;
  }
  if (!users || users.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map((u) => {
          const handle = u.screename || u.username || u.userdid || String(u.id);
          const name = u.screename || u.username || (u.userdid ? `user_${u.userdid.slice(0,6)}` : 'user');
          const img = u.profile_picture_url || (u.userdid ? `https://api.dicebear.com/7.x/identicon/svg?seed=${u.userdid}` : '/placeholder.svg');
          const bioPreview = (u.bio || '').trim();
          const short = bioPreview.length > 0 ? (bioPreview.length > 90 ? bioPreview.slice(0, 90) + '…' : bioPreview) : '';
          return (
            <div key={u.id} className="ios-card overflow-hidden">
              <button
                type="button"
                className="block relative w-full text-left"
                onClick={() => navigate(`/profile/${encodeURIComponent(handle)}`)}
              >
                <div className="relative bg-muted overflow-hidden w-full aspect-square sm:w-60 sm:h-60">
                  <img src={img} alt={name} className="w-full h-full object-cover sm:absolute sm:inset-0" />
                </div>
              </button>
              <div className="px-3 py-3">
                <div className="text-sm font-semibold text-foreground/90 truncate" title={name}>{name}</div>
                {short && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {short} {' '}
                    <button type="button" className="underline hover:opacity-90" onClick={() => setOpenUser(u)}>
                      (Click to read full bio)
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpenUser(null)}>
          <div
            className="relative w-[70vw] max-w-5xl bg-card border border-border rounded-lg overflow-hidden"
            style={{ height: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setOpenUser(null)} className="absolute right-3 top-3 px-2 py-1 rounded bg-primary text-primary-foreground text-xs">
              Close
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 h-full">
              {/* Left: full-height profile image */}
              <div className="relative bg-muted min-h-[280px]">
                <img
                  src={openUser.profile_picture_url || (openUser.userdid ? `https://api.dicebear.com/7.x/identicon/svg?seed=${openUser.userdid}` : '/placeholder.svg')}
                  alt={openUser.screename || openUser.username || 'user'}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              {/* Right: full bio and actions */}
              <div className="p-5 md:p-6 overflow-y-auto">
                <div className="text-base md:text-lg font-semibold">
                  {openUser.screename || openUser.username || (openUser.userdid ? `user_${openUser.userdid.slice(0,6)}` : 'user')}
                </div>
                <div className="mt-3 text-sm md:text-base whitespace-pre-wrap">
                  {openUser.bio || 'No bio provided yet.'}
                </div>
                <div className="mt-4">
                  <button
                    className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs md:text-sm"
                    onClick={() => navigate(`/profile/${encodeURIComponent(openUser.screename || openUser.username || openUser.userdid || String(openUser.id))}#campaigns`)}
                  >
                    View Campaigns
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
