// Minimal Phantom helpers without wallet-adapter packages
export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction?: (tx: any) => Promise<any>;
  signTransaction?: (tx: any) => Promise<any>;
};

export function getPhantom(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  const p = (window as any).solana as PhantomProvider | undefined;
  if (p && p.isPhantom) return p;
  return null;
}

export async function connectPhantom(): Promise<{ provider: PhantomProvider; publicKey: string }>{
  const provider = getPhantom();
  if (!provider) throw new Error('Phantom wallet not found');
  const { publicKey } = await provider.connect();
  return { provider, publicKey: publicKey.toString() };
}

