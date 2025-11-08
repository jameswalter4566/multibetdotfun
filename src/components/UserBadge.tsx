import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type CurrentUser = {
  id: number;
  userdid: string;
  username: string;
  screename: string;
  profile_picture_url?: string | null;
};

export default function UserBadge() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  const readUser = () => {
    try {
      const id = Number(localStorage.getItem('current_user_id') || '') || 0;
      if (!id) { setUser(null); return; }
      const userdid = localStorage.getItem('current_user_userdid') || '';
      const username = localStorage.getItem('current_user_username') || '';
      const screename = localStorage.getItem('current_user_screename') || '';
      const profile_picture_url = localStorage.getItem('current_user_profile_url') || null;
      setUser({ id, userdid, username, screename, profile_picture_url });
    } catch { setUser(null); }
  };

  useEffect(() => {
    readUser();
    const onUpdated = () => readUser();
    window.addEventListener('storage', onUpdated);
    window.addEventListener('clips:user_updated', onUpdated as any);
    return () => {
      window.removeEventListener('storage', onUpdated);
      window.removeEventListener('clips:user_updated', onUpdated as any);
    };
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/list-api"
          className="inline-flex items-center rounded-full bg-[#0ea5ff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_14px_rgba(14,165,255,0.4)] hover:bg-[#08b0ff]"
        >
          List your App
        </a>
        <a
          href="https://github.com/hubx402"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/90 hover:bg-secondary/60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8"
            />
          </svg>
          GitHub
        </a>
      </div>
    );
  }

  const avatar = user.profile_picture_url || (user.userdid ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.userdid}` : '/placeholder.svg');
  const handle = user.screename || user.username || `user_${String(user.id)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:bg-accent/40 px-2 py-1">
          <img src={avatar} alt={handle} className="h-8 w-8 rounded-full border border-border object-cover" />
          <span className="hidden sm:block text-sm text-foreground/90">@{handle}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => { window.location.href = `/profile/${encodeURIComponent(handle)}`; }}>
          View profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            try {
              localStorage.removeItem('current_user_id');
              localStorage.removeItem('current_user_userdid');
              localStorage.removeItem('current_user_username');
              localStorage.removeItem('current_user_screename');
              localStorage.removeItem('current_user_profile_url');
            } catch {}
            try { window.dispatchEvent(new Event('clips:user_updated')); } catch {}
            window.location.href = '/';
          }}
        >
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
