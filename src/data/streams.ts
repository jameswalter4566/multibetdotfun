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
  { channel: 'jhette-marketx', displayName: 'Jhette', pfp: '/jhette.jpg', mint: undefined, marketCapUsd: undefined, currentFeesUsd: undefined },
  { channel: 'chrissa-marketx', displayName: 'Chrissa', pfp: '/chrissaimage.jpg' },
  { channel: 'ellie-marketx', displayName: 'Ellie', pfp: '/ELLIE.jpg' },
  { channel: 'kevin-marketx', displayName: 'KEVIN', pfp: '/KEVIN.jpg' },
  { channel: 'joy-marketx', displayName: 'Joy', pfp: '/joyy.jpg' },
  { channel: 'anjj-marketx', displayName: 'Anjj', pfp: '/ANJJ.jpg' },
  { channel: 'kassandra-marketx', displayName: 'Kassandra', pfp: '/kassandra.jpg' },
];

export function getStreamer(channel: string): Streamer | undefined {
  return STREAMERS.find(s => s.channel.toLowerCase() === channel.toLowerCase());
}
