// Supabase Edge Function: media-push (Start/stop Agora Media Push via REST API)
// NOTE: This is a scaffold. You must set env vars and wire the Agora REST call.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

type Body = {
  action: 'start' | 'stop'
  channel: string
  url: string
  transcoding?: Record<string, unknown> | null
  region?: 'na' | 'eu' | 'ap' | 'cn'
  converterId?: string
  hostUid?: number | string | null
}

serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors })
    const body = (await req.json()) as Body
    const { action, channel, url, converterId, hostUid } = body || ({} as Body)
    if (!action || !channel || !url) {
      return new Response(JSON.stringify({ error: 'Missing action|channel|url' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
    }

    // Use hardcoded credentials exclusively (testing only)
    const AGORA_APP_ID = '950e9a1a1b4b4e65b28aff4afeee3c62'
    const AGORA_CUSTOMER_ID = '980a5120e8bc4bcea9fa681de22383e0'
    const AGORA_CUSTOMER_SECRET = 'cee3a29bd24642349aef792057d513f8'
    const region: 'na'|'eu'|'ap'|'cn' = 'na'
    const basicAuth = 'Basic ' + btoa(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`)

    if (action === 'start') {
      // Create a Converter and push to the provided RTMP(S) URL
      const endpoint = `https://api.agora.io/${region}/v1/projects/${AGORA_APP_ID}/rtmp-converters`
      const name = `conv_${channel}_${Date.now()}`

      // Always use transcoding mode for robust compatibility across CDNs
      if (hostUid == null) {
        return new Response(JSON.stringify({ error: 'hostUid required (join as host first)' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
      }
      const tx = (body.transcoding as any) || {}
      const width = tx.width ?? 1280
      const height = tx.height ?? 720
      const frameRate = tx.videoFramerate ?? 30
      const bitrate = tx.videoBitrate ?? 3420 // 720p@30fps recommended
      const audioBitrate = tx.audioBitrate ?? 96
      const audioChannels = tx.audioChannels ?? 2
      const sampleRate = tx.audioSampleRate ?? 48000

      // Normalize host UID to a number
      const host = typeof hostUid === 'string' ? Number(hostUid) : hostUid
      if (!host || !Number.isFinite(host as number)) {
        return new Response(JSON.stringify({ error: 'Invalid hostUid' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
      }

      const converter = {
        name,
        transcodeOptions: {
          rtcChannel: channel,
          audioOptions: {
            codecProfile: 'LC-AAC',
            sampleRate,
            bitrate: audioBitrate,
            audioChannels,
            rtcStreamUids: [ host ]
          },
          videoOptions: {
            canvas: { width, height, color: 0 },
            // Per Agora REST docs, layoutType can be only 0 or 1
            // Use 0 with an explicit layout mapping full-canvas to host
            layoutType: 0,
            layout: [
              {
                rtcStreamUid: host,
                region: { xPos: 0, yPos: 0, zIndex: 1, width, height },
                fillMode: 'fill',
                placeholderImageUrl: 'https://via.placeholder.com/1'
              }
            ],
            codec: 'H.264',
            codecProfile: 'high',
            frameRate,
            gop: frameRate * 2,
            bitrate
          }
        },
        rtmpUrl: url,
        idleTimeout: 300
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': basicAuth,
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify({ converter })
      })
      if (!resp.ok) {
        const t = await resp.text().catch(()=> '')
        return new Response(JSON.stringify({ error: `Agora REST failed ${resp.status}: ${t || resp.statusText}` }), { status: 502, headers: { 'Content-Type': 'application/json', ...cors } })
      }
      const xrid = resp.headers.get('X-Resource-ID') || ''
      const data = await resp.json().catch(()=> ({}))
      return new Response(JSON.stringify({ ok: true, converterId: xrid, data }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } })
    }

    if (action === 'stop') {
      if (!converterId) {
        return new Response(JSON.stringify({ error: 'Missing converterId for stop' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
      }
      const endpoint = `https://api.agora.io/${region}/v1/projects/${AGORA_APP_ID}/rtmp-converters/${encodeURIComponent(converterId)}`
      const resp = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': basicAuth,
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID(),
        }
      })
      if (!resp.ok) {
        const t = await resp.text().catch(()=> '')
        return new Response(JSON.stringify({ error: `Agora REST stop failed ${resp.status}: ${t || resp.statusText}` }), { status: 502, headers: { 'Content-Type': 'application/json', ...cors } })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } })
    }

    // Optional: query converter status for debugging
    if (action === 'status') {
      if (!converterId) {
        return new Response(JSON.stringify({ error: 'Missing converterId for status' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
      }
      const endpoint = `https://api.agora.io/${region}/v1/projects/${AGORA_APP_ID}/rtmp-converters/${encodeURIComponent(converterId)}`
      const resp = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': basicAuth,
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID(),
        }
      })
      const txt = await resp.text().catch(()=> '')
      if (!resp.ok) {
        return new Response(JSON.stringify({ ok: false, status: resp.status, error: txt || resp.statusText }), { status: 502, headers: { 'Content-Type': 'application/json', ...cors } })
      }
      let data: any = {}
      try { data = JSON.parse(txt) } catch {}
      return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e || 'unknown') }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } })
  }
})
