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
  { channel: 'jhette-hubx', displayName: 'Jhette', pfp: '/jhette.jpg', mint: undefined, marketCapUsd: undefined, currentFeesUsd: undefined },
  { channel: 'chrissa-hubx', displayName: 'Chrissa', pfp: '/chrissaimage.jpg' },
  { channel: 'ellie-hubx', displayName: 'Ellie', pfp: '/ELLIE.jpg' },
  { channel: 'kevin-hubx', displayName: 'KEVIN', pfp: '/KEVIN.jpg' },
  { channel: 'joy-hubx', displayName: 'Joy', pfp: '/joyy.jpg' },
  { channel: 'anjj-hubx', displayName: 'Anjj', pfp: '/ANJJ.jpg' },
  { channel: 'kassandra-hubx', displayName: 'Kassandra', pfp: '/kassandra.jpg' },
];

export function getStreamer(channel: string): Streamer | undefined {
  return STREAMERS.find(s => s.channel.toLowerCase() === channel.toLowerCase());
}
