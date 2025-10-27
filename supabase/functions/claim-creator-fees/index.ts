import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Connection, Keypair, VersionedTransaction, LAMPORTS_PER_SOL } from 'https://esm.sh/@solana/web3.js@1.93.0'
import bs58 from 'https://esm.sh/bs58@5.0.0'

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PUMP_TRADE_LOCAL_URL = 'https://pumpportal.fun/api/trade-local'

type ClaimBody = {
  userId?: number | string | null
  campaignId?: number | string | null
  priorityFee?: number // in SOL, default 0.000001
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing required secret: ${name}`)
  return v
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json() as ClaimBody
    const rpcEndpoint = Deno.env.get('RPC_ENDPOINT') || 'https://mainnet.helius-rpc.com/?api-key=f06c4460-64a5-427c-a481-9d173d50f50c'
    const supabaseUrl = requireEnv('SUPABASE_URL')
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const admin = createClient(supabaseUrl, serviceKey)

    // resolve user id
    let userId: number | null = null
    if (body.userId !== undefined && body.userId !== null) {
      userId = Number(body.userId)
    } else if (body.campaignId !== undefined && body.campaignId !== null) {
      const { data: c, error: ce } = await admin.from('campaigns').select('user_id').eq('id', Number(body.campaignId)).maybeSingle()
      if (ce) throw new Error(`Failed to fetch campaign: ${ce.message}`)
      userId = (c as any)?.user_id ?? null
    }
    if (!userId) throw new Error('userId or campaignId is required')

    // fetch user's wallet
    const { data: u, error: ue } = await admin.from('users').select('wallet_private_key').eq('id', userId).maybeSingle()
    if (ue || !u) throw new Error('Creator wallet not found')
    const sk = String((u as any).wallet_private_key || '')
    if (!sk) throw new Error('Creator wallet not available')

    const signer = Keypair.fromSecretKey(bs58.decode(sk))
    const publicKey = signer.publicKey.toBase58()

    const priorityFee = typeof body.priorityFee === 'number' ? body.priorityFee : 0.000001

    // get transaction from Pump Portal
    const res = await fetch(PUMP_TRADE_LOCAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey,
        action: 'collectCreatorFee',
        priorityFee,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ success: false, error: `PumpPortal error: ${res.status} ${res.statusText}`, details: text }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // sign and send
    const bytes = new Uint8Array(await res.arrayBuffer())
    const tx = VersionedTransaction.deserialize(bytes)
    tx.sign([signer])
    const conn = new Connection(rpcEndpoint, 'confirmed')
    // Estimate fee and balances to infer claimed amount
    let feeLamports = 0
    try { feeLamports = await (conn as any).getFeeForMessage?.(tx.message, 'confirmed') ?? 0 } catch {}
    const pre = await conn.getBalance(signer.publicKey).catch(()=>0)
    const sig = await conn.sendTransaction(tx)
    await conn.confirmTransaction(sig, 'confirmed')
    // Try to compute claimed amount precisely from transaction meta
    let claimedSol: number | null = null
    try {
      const txResp: any = await (conn as any).getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
      const keys: string[] = (txResp?.transaction?.message?.accountKeys || []).map((k: any) => (typeof k === 'string' ? k : k?.toString?.() ))
      const i = keys.findIndex((k) => k === publicKey)
      const preB = Number(txResp?.meta?.preBalances?.[i] ?? 0)
      const postB = Number(txResp?.meta?.postBalances?.[i] ?? 0)
      const fee = Number(txResp?.meta?.fee ?? 0)
      const delta = postB - preB
      const lamports = delta + fee
      if (lamports > 0) claimedSol = lamports / LAMPORTS_PER_SOL
    } catch {}
    // Fallback to balance diff + fee estimation
    if (claimedSol === null) {
      const post = await conn.getBalance(signer.publicKey).catch(()=>pre)
      const delta = post - pre
      const claimedLamports = delta + feeLamports
      if (claimedLamports > 0) claimedSol = claimedLamports / LAMPORTS_PER_SOL
    }

    // Try Enhanced Helius to derive precise native transfers to signer
    try {
      const keyFromEnv = Deno.env.get('HELIUS_API_KEY') || ''
      const keyFromRpc = (() => { try { const u = new URL(rpcEndpoint); return u.searchParams.get('api-key') || '' } catch { return '' } })()
      const apiKey = keyFromEnv || keyFromRpc || 'f06c4460-64a5-427c-a481-9d173d50f50c'
      const url = `https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`
      const hx = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ transactions: [sig] }) })
      if (hx.ok) {
        const arr = await hx.json().catch(()=>[])
        const item = Array.isArray(arr) ? arr[0] : null
        const transfers = (item?.nativeTransfers || []) as Array<any>
        const totalLamports = transfers.filter(t => (t?.toUserAccount === publicKey)).reduce((s, t) => s + Number(t?.amount || 0), 0)
        if (totalLamports > 0) {
          claimedSol = totalLamports / LAMPORTS_PER_SOL
        }
      }
    } catch {}

    // Record a donations row for creator fee and update totals (if campaign provided)
    try {
      const campaignId = body.campaignId ? Number(body.campaignId) : null
      if (campaignId && claimedSol && claimedSol > 0) {
        await admin.from('donations').insert({
          campaign_id: campaignId,
          user_id: userId,
          amount_sol: claimedSol,
          is_superchat: false,
          is_creator_fee: true,
          tx_signature: sig,
        })
        // Update aggregate total for the campaign by recomputing
        try { await fetch(`${Deno.env.get('SITE_URL') || ''}/functions/v1/update-campaign-total`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId }) }) } catch {}
      }
    } catch {}

    return new Response(JSON.stringify({ success: true, signature: sig, claimedSol, explorerTxUrl: `https://solscan.io/tx/${sig}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
