// Supabase Edge Function: generate-wallet
// Generates a new Solana ed25519 keypair and returns base58-encoded public and private keys.
// Note: For maximum security, generate keys client-side and never transmit private keys.
import nacl from 'https://esm.sh/tweetnacl@1.0.3';
import bs58 from 'https://esm.sh/bs58@5.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
  });
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    });
  }
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // Generate keypair
    const kp = nacl.sign.keyPair();
    const publicKey = bs58.encode(kp.publicKey);
    const privateKey = bs58.encode(kp.secretKey); // 64-byte secret key (ed25519)
    // Parse body for user_id
    const body = await req.json().catch(()=>({}));
    const user_id = Number(body?.user_id || 0) || null;
    // Default response metadata
    let updated = false;
    let updateError: string | null = null;
    if (!user_id) {
      try { console.warn('[generate-wallet] missing user_id; not persisting'); } catch  {}
      return json({ publicKey, privateKey, updated, warning: 'missing user_id, not persisted' });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      try { console.error('[generate-wallet] missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY'); } catch  {}
      return json({ publicKey, privateKey, updated, error: 'server not configured' }, 500);
    }
    // Persist to users table
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await admin.from('users').update({
      wallet_public_key: publicKey,
      wallet_private_key: privateKey
    }).eq('id', user_id);
    if (error) {
      updateError = (error as any).message || 'failed to update users row';
      try { console.error('[generate-wallet] update error', { user_id, err: updateError }); } catch  {}
    } else {
      updated = true;
      try { console.log('[generate-wallet] persisted', { user_id, pubSuffix: publicKey.slice(-6) }); } catch  {}
    }
    return json({ publicKey, privateKey, updated, updateError });
  } catch (e) {
    try { console.error('[generate-wallet] fatal', (e as any)?.message); } catch  {}
    return json({ error: (e as any).message || 'failed to generate wallet' }, 500);
  }
});

