import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectPhantom, getPhantom } from '@/lib/phantom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WalletCredentialsModal from '@/components/WalletCredentialsModal';

export default function SignIn() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [profileUrl, setProfileUrl] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'connect'|'details'>('connect');
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletPub, setWalletPub] = useState<string|null>(null);
  const [walletPriv, setWalletPriv] = useState<string|null>(null);

  useEffect(()=>{ setStep('connect'); setWallet(''); setUsername(''); setProfileUrl(''); }, []);

  const connect = async () => {
    const p = getPhantom();
    if (!p) { window.open('https://phantom.app', '_blank'); return; }
    const { publicKey } = await connectPhantom();
    setWallet(publicKey);
    const placeholder = `user_${publicKey.slice(0,6)}`;
    setProfileUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${publicKey}`);
    try {
      // Check if this Phantom wallet (userdid) already exists and has a completed profile
      const { data: existing } = await supabase
        .from('users')
        .select('id, userdid, username, screename, profile_picture_url, wallet_public_key, auth_method')
        .eq('userdid', publicKey)
        .maybeSingle();

      const hasAccount = !!existing && (
        !!(existing as any).wallet_public_key ||
        !!(existing as any).username ||
        !!(existing as any).profile_picture_url
      );

      if (hasAccount) {
        // Existing user: hydrate session locally and navigate to profile
        try {
          localStorage.setItem('current_user_id', String((existing as any).id || ''));
          localStorage.setItem('current_user_userdid', (existing as any).userdid || '');
          localStorage.setItem('current_user_username', (existing as any).username || '');
          localStorage.setItem('current_user_screename', (existing as any).screename || '');
          if ((existing as any).profile_picture_url) localStorage.setItem('current_user_profile_url', (existing as any).profile_picture_url);
          window.dispatchEvent(new Event('clips:user_updated'));
        } catch {}
        const handle =
          (existing as any).screename ||
          (existing as any).username ||
          (existing as any).userdid ||
          publicKey;
        navigate(`/profile/${encodeURIComponent(handle || '')}`);
        return; // Do not proceed to onboarding
      }

      // New user (or incomplete): ensure a row exists, then proceed to details step
      await supabase.from('users').upsert({
        userdid: publicKey,
        username: placeholder,
        screename: placeholder,
        auth_method: 'phantom',
      }, { onConflict: 'userdid', ignoreDuplicates: true });
    } catch {}
    setStep('details');
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !files.length) return; const f = files[0]; setFile(f); setProfileUrl(URL.createObjectURL(f));
  };

  const uploadProfilePicture = async (): Promise<string | null> => {
    if (!file || !wallet) return null;
    try {
      setUploading(true);
      const ext = file.name.split('.').pop() || 'png';
      const path = `avatars/${wallet}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('profilepics').upload(path, file, {
        upsert: false,
        contentType: file.type || 'image/png',
      });
      if (error) throw error;
      const { data } = supabase.storage.from('profilepics').getPublicUrl(path);
      return data.publicUrl || null;
    } catch { return null; } finally { setUploading(false); }
  };

  const create = async () => {
    if (!wallet || !username.trim()) return;
    setLoading(true);
    try {
      let openedModal = false;
      let uploadedUrl: string | null = null; if (file) uploadedUrl = await uploadProfilePicture();
      const updatePayload: any = { username: username.trim(), screename: username.trim() };
      if (uploadedUrl) updatePayload.profile_picture_url = uploadedUrl;
      await supabase.from('users').update(updatePayload).eq('userdid', wallet);

      const { data: me } = await supabase
        .from('users')
        .select('id, username, screename, userdid, profile_picture_url, wallet_public_key')
        .eq('userdid', wallet)
        .single();
      if (me) {
        localStorage.setItem('current_user_id', String((me as any).id));
        localStorage.setItem('current_user_userdid', (me as any).userdid || '');
        localStorage.setItem('current_user_username', (me as any).username || '');
        localStorage.setItem('current_user_screename', (me as any).screename || '');
        if ((me as any).profile_picture_url) localStorage.setItem('current_user_profile_url', (me as any).profile_picture_url);
        // Notify listeners (headers/nav) that user changed
        try { window.dispatchEvent(new Event('clips:user_updated')); } catch {}
      }
      // Only generate and show wallet credentials if the user doesn't already have a persisted wallet
      if (me && !(me as any).wallet_public_key) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-wallet', { body: { user_id: (me as any).id } });
          if (!error && data) {
            const pub = (data as any).publicKey || null; const priv = (data as any).privateKey || null;
            if (pub && priv) { setWalletPub(pub); setWalletPriv(priv); setWalletOpen(true); openedModal = true; }
          }
        } catch {}
      }

      // If we didn't open the wallet credentials modal, navigate user to their profile now
      if (!openedModal) {
        const handle =
          localStorage.getItem('current_user_screename') ||
          localStorage.getItem('current_user_username') ||
          localStorage.getItem('current_user_userdid') ||
          username ||
          wallet;
        navigate(`/profile/${encodeURIComponent(handle || '')}`);
      }
    } catch (e) { alert((e as any)?.message || 'Failed to create account'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-24 pb-10 max-w-3xl">
        <div className="ios-card p-6">
          <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
          <p className="text-muted-foreground text-sm mb-4">Connect your Phantom wallet, pick a username, and finish your profile.</p>
          {step === 'connect' ? (
            <div className="space-y-3">
              <Button className="w-full h-12 text-base flex items-center justify-center gap-2" onClick={connect}>
                <img src="/USETHISFUCKINGLOGO.png" alt="Phantom" className="h-5 w-5 rounded" />
                Connect Phantom
              </Button>
              <p className="text-xs text-muted-foreground">You will be prompted by Phantom to connect.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">Connected: {wallet.slice(0,4)}...{wallet.slice(-4)}</div>
              <div>
                <label className="text-sm">Username</label>
                <Input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="yourname" />
              </div>
              <div>
                <label className="text-sm">Profile picture</label>
                <div
                  className="mt-1 border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-accent/10"
                  onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
                  onClick={()=>{ const input = document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=()=>handleFiles(input.files); input.click(); }}
                >
                  <div className="text-xs text-muted-foreground">Select a file or drag and drop</div>
                  <div className="mt-2 h-16 w-16 rounded-full overflow-hidden bg-accent/50 mx-auto flex items-center justify-center">
                    {profileUrl ? <img src={profileUrl} alt="preview" className="h-full w-full object-cover" /> : <div className="text-xs text-muted-foreground">preview</div>}
                  </div>
                </div>
                {uploading && <div className="text-xs text-muted-foreground mt-1">Uploading...</div>}
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="iosOutline" onClick={()=>setStep('connect')}>Back</Button>
                <Button onClick={create} disabled={loading || uploading || !wallet || !username.trim()} className="bg-primary text-primary-foreground">Create account</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <WalletCredentialsModal
        open={walletOpen}
        publicKey={walletPub}
        privateKey={walletPriv}
        onClose={() => {
          setWalletOpen(false);
          const handle =
            localStorage.getItem('current_user_screename') ||
            localStorage.getItem('current_user_username') ||
            localStorage.getItem('current_user_userdid') ||
            username ||
            wallet;
          navigate(`/profile/${encodeURIComponent(handle || '')}`);
        }}
      />
    </div>
  );
}
