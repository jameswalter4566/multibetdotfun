import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Connection, Keypair, VersionedTransaction } from 'https://esm.sh/@solana/web3.js@1.93.0'
import bs58 from 'https://esm.sh/bs58@5.0.0'

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// External APIs
const PUMP_IPFS_URL = 'https://pump.fun/api/ipfs'
const PUMP_TRADE_LOCAL_URL = 'https://pumpportal.fun/api/trade-local'

type LaunchBody = {
  name: string
  symbol: string
  description?: string
  website?: string
  x?: string // twitter handle/url
  initialBuy?: string | number // SOL
  videoUrl?: string
  imageBase64?: string // raw base64 or data: URL
  imageMime?: string // default image/png
  imageUrl?: string
  userId?: number | string | null
  walletAddress?: string | null
  campaignId?: number | string | null
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing required secret: ${name}`)
  return v
}

function isBase64DataUrl(s: string): boolean {
  return /^data:\\w+\/[\-+.\\w]+;base64,/.test(s)
}

function stripTrailingSlash(s: string): string {
  let out = s || ''
  while (out.endsWith('/')) out = out.slice(0, -1)
  return out
}

function resolveSiteBase(req: Request): string | null {
  const envUrl = Deno.env.get('SITE_URL') || ''
  if (envUrl) return stripTrailingSlash(envUrl)
  const origin = req.headers.get('origin') || ''
  if (origin) return origin.endsWith('/') ? origin.slice(0, -1) : origin
  const referer = req.headers.get('referer') || ''
  try { if (referer) return new URL(referer).origin } catch {}
  return null
}

async function fetchFaviconAsFile(baseUrl: string): Promise<File | null> {
  const base = stripTrailingSlash(baseUrl)
  const candidates = [
    '/liberated.png',
    '/favicon.ico',
    '/favicon.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/logo.png',
  ]
  for (const path of candidates) {
    try {
      const url = base + path
      const resp = await fetch(url)
      if (!resp.ok) continue
      const ct = resp.headers.get('content-type') || 'image/png'
      const ab = await resp.arrayBuffer()
      if (ab.byteLength === 0) continue
      return new File([ab], 'favicon', { type: ct })
    } catch {}
  }
  return null
}

function decodeBase64ToUint8Array(b64: string): Uint8Array {
  const cleaned = b64.replace(/^data:\\w+\/[\-+.\\w]+;base64,/, '')
  const bin = atob(cleaned)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function imageInputToFile(body: LaunchBody, req: Request): Promise<File> {
  // Always use the fixed image if reachable (liberated.png in public root)
  const base = resolveSiteBase(req)
  if (!base) throw new Error('SITE_URL or Origin/Referer required to fetch public/liberated.png')
  const fixed = await fetchFaviconAsFile(base)
  if (fixed) return fixed
  throw new Error(`Could not fetch ${base}/liberated.png`)
}

async function uploadMetadataToPumpIPFS(file: File, fields: {
  name: string
  symbol: string
  description?: string
  twitter?: string
  telegram?: string
  website?: string
  showName?: boolean
}): Promise<{ metadataUri: string; metadata: any }>
{
  const form = new FormData()
  form.append('file', file)
  if (fields.name) form.append('name', fields.name)
  if (fields.symbol) form.append('symbol', fields.symbol)
  if (fields.description) form.append('description', fields.description)
  if (fields.twitter) form.append('twitter', fields.twitter)
  if (fields.telegram) form.append('telegram', fields.telegram)
  if (fields.website) form.append('website', fields.website)
  form.append('showName', String(fields.showName ?? true))

  const res = await fetch(PUMP_IPFS_URL, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Pump IPFS upload failed: ${res.status} ${res.statusText}`)
  const j = await res.json().catch(async () => ({ raw: await res.text() }))
  const uri = j?.metadataUri
  const meta = j?.metadata
  if (!uri) throw new Error(`Pump IPFS response missing metadataUri`)
  return { metadataUri: uri, metadata: meta }
}

async function buildCreateTransaction(payload: {
  publicKey: string
  mint: string
  amount: number
  slippage: number
  priorityFee: number
  name: string
  symbol: string
  uri: string
}) {
  const body = {
    publicKey: payload.publicKey,
    action: 'create',
    tokenMetadata: {
      name: payload.name,
      symbol: payload.symbol,
      uri: payload.uri,
    },
    mint: payload.mint,
    denominatedInSol: 'true',
    amount: payload.amount,
    slippage: payload.slippage,
    priorityFee: payload.priorityFee,
    pool: 'pump',
  }

  const res = await fetch(PUMP_TRADE_LOCAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Pump trade-local error: ${res.status} ${res.statusText} — ${txt}`)
  }
  const buf = new Uint8Array(await res.arrayBuffer())
  return VersionedTransaction.deserialize(buf)
}

async function signAndSend(connection: Connection, tx: VersionedTransaction, signers: Keypair[]): Promise<string> {
  tx.sign(signers)
  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction(sig, 'confirmed')
  return sig
}

function inferInsufficientFunds(e: unknown): boolean {
  const s = String((e as any)?.message || e || '').toLowerCase()
  if (s.includes('insufficient') || s.includes('lamport') || s.includes('balance')) return true
  // Common simulation/funding errors
  if (s.includes('simulation failed')) return true
  if (s.includes('attempt to debit an account')) return true
  if (s.includes('prior credit')) return true
  if (s.includes('sendtransactionerror')) return true
  return false
}

function keypairFromBs58(sk: string): Keypair {
  const raw = bs58.decode(sk)
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

async function fetchUserKeypairById(admin: ReturnType<typeof createClient>, userId: number | string | null | undefined): Promise<Keypair | null> {
  if (userId === null || userId === undefined) return null
  try {
    const { data, error } = await admin.from('users').select('wallet_private_key').eq('id', Number(userId)).maybeSingle()
    if (error || !data) return null
    const sk = (data as any)?.wallet_private_key
    if (!sk) return null
    return keypairFromBs58(String(sk))
  } catch {
    return null
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: LaunchBody = await req.json();

    if (!body?.name || !body?.symbol) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields (name, symbol)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Secrets
    const rpcEndpoint = Deno.env.get('RPC_ENDPOINT') || 'https://mainnet.helius-rpc.com/?api-key=f06c4460-64a5-427c-a481-9d173d50f50c'
    const platformSkBs58 = requireEnv('PLATFORM_PRIVATE_KEY_BS58')
    const supabaseUrl = requireEnv('SUPABASE_URL')
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

    // Admin client
    const admin = createClient(supabaseUrl, serviceKey)

    // Prepare image + metadata
    const file = await imageInputToFile(body, req)
    const ipfs = await uploadMetadataToPumpIPFS(file, {
      name: String(body.name).slice(0, 32),
      symbol: 'liberated',
      description: body.description || String(body.name),
      twitter: 'https://x.com/liberatedorg',
      website: 'https://liberatetheworld.com/',
      showName: true,
    })
    const metaName = ipfs.metadata?.name || body.name
    const metaSymbol = 'liberated'
    const metadataUri = ipfs.metadataUri

    // Payer keys
    const platformKeypair = keypairFromBs58(platformSkBs58)
    const userKeypair = await fetchUserKeypairById(admin, body.userId)

    // Connection
    const connection = new Connection(rpcEndpoint, 'confirmed')

    // Mint key
    const mintKeypair = Keypair.generate()
    const mintAddress = mintKeypair.publicKey.toBase58()

    // Enforce max dev buy of 0.01 SOL (never higher)
    const devBuyAmount = 0.01
    const fallbackMinRaw = Number(Deno.env.get('PLATFORM_FALLBACK_MIN_SOL') || '0.01')
    const fallbackMinBuy = Math.min(isFinite(fallbackMinRaw) ? fallbackMinRaw : 0.01, 0.01)
    const slippage = 10
    const priorityFee = 0.0005

    const attempt = async (payer: Keypair, amount: number) => {
      const tx = await buildCreateTransaction({
        publicKey: payer.publicKey.toBase58(),
        mint: mintAddress,
        amount,
        slippage,
        priorityFee,
        name: metaName,
        symbol: metaSymbol,
        uri: metadataUri,
      })
      const sig = await signAndSend(connection, tx, [mintKeypair, payer])
      return sig
    }

    const platformAttemptsOrder: number[] = (() => {
      const arr: number[] = []
      const pushUnique = (v: number) => { if (!arr.includes(v) && v > 0) arr.push(v) }
      pushUnique(0.01)
      if (fallbackMinBuy < 0.01) pushUnique(fallbackMinBuy)
      return arr
    })()

    let fundedBy: 'user' | 'platform' = 'platform'
    let signature = ''
    if (userKeypair) {
      try {
        fundedBy = 'user'
        signature = await attempt(userKeypair, devBuyAmount)
      } catch (e) {
        if (inferInsufficientFunds(e)) {
          fundedBy = 'platform'
          let lastErr: any = e
          for (const amt of platformAttemptsOrder) {
            try {
              signature = await attempt(platformKeypair, amt)
              lastErr = null
              break
            } catch (ee) {
              lastErr = ee
              if (!inferInsufficientFunds(ee)) break
            }
          }
          if (!signature) {
            // bubble last error if all attempts failed
            throw lastErr
          }
        } else {
          try { console.error('[launch-token] user attempt failed:', (e as any)?.message || e) } catch {}
          throw e
        }
      }
    } else {
      let lastErr: any = null
      for (const amt of platformAttemptsOrder) {
        try {
          signature = await attempt(platformKeypair, amt)
          break
        } catch (e) {
          lastErr = e
          if (!inferInsufficientFunds(e)) break
        }
      }
      if (!signature) throw lastErr || new Error('Failed to create token with platform wallet')
    }

    // Update campaigns.mint_address if provided
    try {
      const campaignId = body.campaignId ? Number(body.campaignId) : null
      if (campaignId) await admin.from('campaigns').update({ mint_address: mintAddress }).eq('id', campaignId)
    } catch (_) {}

    return new Response(
      JSON.stringify({ success: true, mintAddress, signature, explorerTxUrl: `https://solscan.io/tx/${signature}`, fundedBy }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
