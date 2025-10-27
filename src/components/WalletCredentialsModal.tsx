import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type Props = {
  open: boolean;
  publicKey: string | null;
  privateKey: string | null;
  onClose: () => void;
};

export default function WalletCredentialsModal({ open, publicKey, privateKey, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, value: string | null) => {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); setCopied(label); setTimeout(()=>setCopied(null), 1500); } catch {}
  };
  return (
    <Dialog open={open} onOpenChange={(v)=>{ if(!v) onClose(); }}>
      <DialogContent className="max-w-lg rounded-2xl border border-border/50 bg-background">
        <DialogHeader>
          <DialogTitle>Wallet Credentials</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-foreground/90">
            This is your wallet credentials that you will use to launch your streams and claim rewards. Save your private key and never share it with anyone.
          </p>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Public key</label>
            <div className="flex items-center gap-2">
              <button onClick={()=>copy('pub', publicKey)} title="Copy" className="p-2 rounded bg-secondary hover:bg-secondary/80">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>
              </button>
              <div className="font-mono break-all text-xs flex-1 select-all">{publicKey}</div>
              {copied==='pub' && <span className="text-xs text-green-500">Copied</span>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Private key</label>
            <div className="flex items-center gap-2">
              <button onClick={()=>copy('priv', privateKey)} title="Copy" className="p-2 rounded bg-secondary hover:bg-secondary/80">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>
              </button>
              <div className="font-mono break-all text-xs flex-1 select-all">{privateKey}</div>
              {copied==='priv' && <span className="text-xs text-green-500">Copied</span>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

