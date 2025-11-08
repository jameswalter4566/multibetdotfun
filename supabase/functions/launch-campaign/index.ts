// Supabase Edge Function: launch-campaign
// Mirrors the clipsdotfun launch flow by proxying to INKWELL's /api/launch-token
// Uses the user's dev private key from public.users to fund launch; if low balance, tops up from env Campaign_private_key.
// On success, updates public.campaigns.mint_address.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import bs58 from 'https://esm.sh/bs58@5.0.0';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from 'https://esm.sh/@solana/web3.js@1.98.2';

const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }
});

async function toBase64FromUrl(url: string): Promise<{ base64: string; type: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const type = resp.headers.get('content-type') || 'image/png';
    const ab = await resp.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
    return { base64: b64, type };
  } catch {
    return null;
  }
}

function symbolFromTitle(title: string): string {
  const clean = (title || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const base = clean.slice(0, 8) || 'TOKEN';
  return base;
}

async function ensureUserHasFunds(connection: Connection, userKey: Keypair, fallbackPk58?: string | null): Promise<'user' | 'fallback' | 'topped_up'> {
  try {
    const bal = await connection.getBalance(userKey.publicKey);
    const minLamports = Math.floor(0.05 * LAMPORTS_PER_SOL); // ~0.05 SOL buffer
    if (bal >= minLamports) return 'user';
    if (!fallbackPk58) return 'fallback';
    // Top up user from fallback treasury
    const treasury = Keypair.fromSecretKey(bs58.decode(fallbackPk58));
    const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: treasury.publicKey, toPubkey: userKey.publicKey, lamports: minLamports }));
    await sendAndConfirmTransaction(connection, tx, [treasury], { commitment: 'confirmed' }).catch(()=>{});
    // Re-check
    const after = await connection.getBalance(userKey.publicKey).catch(()=>0);
    return after >= minLamports ? 'topped_up' : 'fallback';
  } catch {
    return 'fallback';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 200);
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const INKWELL_API_BASE = Deno.env.get('INKWELL_API_BASE') || 'https://blockparty-backend-production.up.railway.app';
    const INKWELL_USER_ID = Deno.env.get('INKWELL_USER_ID') || 'streamforchange';
    const CAMPAIGN_PRIVATE_KEY = Deno.env.get('Campaign_private_key') || Deno.env.get('CAMPAIGN_PRIVATE_KEY') || '';
    const RPC_URL = Deno.env.get('RPC_URL') || 'https://mainnet.helius-rpc.com/?api-key=f06c4460-64a5-427c-a481-9d173d50f50c';

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(()=>({}));
    const user_id: number = Number(body?.user_id || 0) || 0;
    const campaign_id: number = Number(body?.campaign_id || 0) || 0;
    if (!user_id || !campaign_id) return json({ success: false, error: 'user_id and campaign_id required' }, 400);

    // Load user + campaign
    const { data: userRow, error: ue } = await admin.from('users').select('id, username, screename, wallet_private_key').eq('id', user_id).maybeSingle();
    if (ue || !userRow) return json({ success: false, error: 'user not found' }, 404);
    const { data: campRow, error: ce } = await admin.from('campaigns').select('id, title, description, image_url, website_url, x_url').eq('id', campaign_id).maybeSingle();
    if (ce || !campRow) return json({ success: false, error: 'campaign not found' }, 404);

    // Prepare launch payload
    const name: string = String(campRow.title || 'Campaign');
    const symbol = symbolFromTitle(name);
    const description: string = String(campRow.description || '');
    // Force constant branding for all launches
    const website: string | null = 'https://hubx402.app/';
    const twitter: string | null = 'https://x.com/hubx402';
    const initialBuyAmount = Number(body?.initialBuyAmount || 0.01);

    // Fetch image to base64
    let imageBase64: string | null = null;
    let imageType: string = 'image/png';
    if (campRow.image_url) {
      const res = await toBase64FromUrl(String(campRow.image_url));
      if (res) { imageBase64 = res.base64; imageType = res.type; }
    }
    if (!imageBase64) return json({ success: false, error: 'image required for launch' }, 400);

    // Resolve key to fund launch
    const encoded = String((userRow as any).wallet_private_key || '').trim();
    const userKey = encoded ? Keypair.fromSecretKey(bs58.decode(encoded)) : null;
    const connection = new Connection(RPC_URL, 'confirmed');

    let privateKeyToUse = encoded;
    if (userKey) {
      const res = await ensureUserHasFunds(connection, userKey, CAMPAIGN_PRIVATE_KEY || null);
      if (res === 'fallback' && CAMPAIGN_PRIVATE_KEY) privateKeyToUse = CAMPAIGN_PRIVATE_KEY;
      // if topped_up or user, keep using user's key
    } else if (CAMPAIGN_PRIVATE_KEY) {
      privateKeyToUse = CAMPAIGN_PRIVATE_KEY;
    } else {
      return json({ success: false, error: 'no launch key available' }, 500);
    }

    // Call INKWELL API
    const payload = {
      name,
      symbol,
      description,
      website,
      twitter,
      initialBuyAmount,
      userId: INKWELL_USER_ID,
      userPrivateKey: privateKeyToUse,
      imageBase64,
      imageType,
    } as Record<string, unknown>;

    let respData: any = null;
    try {
      const resp = await fetch(`${INKWELL_API_BASE}/api/launch-token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      respData = await resp.json().catch(()=>null);
      if (!resp.ok) return json({ success: false, error: respData || 'launch failed' }, 500);
    } catch (e) {
      return json({ success: false, error: (e as Error)?.message || 'launch failed' }, 500);
    }

    const mintAddress = String(respData?.mintAddress || respData?.mint || '');
    if (mintAddress) {
      await admin.from('campaigns').update({ mint_address: mintAddress }).eq('id', campaign_id);
    }
    return json({ success: true, result: respData, mintAddress });
  } catch (e) {
    try { console.error('[launch-campaign] fatal', (e as Error)?.message); } catch {}
    return json({ success: false, error: (e as Error)?.message || 'internal error' }, 500);
  }
});
