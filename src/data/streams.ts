export type Streamer = {
  channel: string;
  displayName: string;
  pfp: string; // path in public/
  mint?: string; // full, non-truncated
  marketCapUsd?: number; // in USD
  currentFeesUsd?: number; // in USD
  bio?: string;
};

// Basic static config. Extend/replace with API data when available.
export const STREAMERS: Streamer[] = [
  { channel: 'jhetteliberated', displayName: 'Jhette', pfp: '/jhette.jpg', mint: undefined, marketCapUsd: undefined, currentFeesUsd: undefined },
  { channel: 'chrissaliberated', displayName: 'Chrissa', pfp: '/chrissaimage.jpg' },
  { channel: 'ellieliberated', displayName: 'Ellie', pfp: '/ELLIE.jpg' },
  { channel: 'kevinliberated', displayName: 'KEVIN', pfp: '/KEVIN.jpg' },
  { channel: 'joyyliberated', displayName: 'Joy', pfp: '/joyy.jpg' },
  { channel: 'anjjliberated', displayName: 'Anjj', pfp: '/ANJJ.jpg' },
  { channel: 'kassandraliberated', displayName: 'Kassandra', pfp: '/kassandra.jpg' },
];

export function getStreamer(channel: string): Streamer | undefined {
  return STREAMERS.find(s => s.channel.toLowerCase() === channel.toLowerCase());
}

