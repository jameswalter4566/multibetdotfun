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
      <a href="/signin" className="text-foreground/90 hover:underline text-sm md:text-base text-right leading-snug">
        Sign in to list your Application in the market place
      </a>
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
