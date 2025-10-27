import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const campaignId: number | null = body?.campaignId ? Number(body.campaignId) : null;

    if (campaignId) {
      // Aggregate totals for a single campaign
      const { data, error } = await admin
        .from('donations')
        .select('amount_sol', { count: 'exact', head: false })
        .eq('campaign_id', campaignId);
      if (error) throw error;
      const total = (data || []).reduce((s: number, r: any) => s + Number(r.amount_sol || 0), 0);
      await admin.from('campaigns').update({ total_received_sol: total }).eq('id', campaignId);
      return new Response(JSON.stringify({ success: true, campaignId, total, count: (data || []).length }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Aggregate all campaigns (bulk)
    const { data: rows, error: e2 } = await admin.from('donations').select('campaign_id, amount_sol');
    if (e2) throw e2;
    const acc = new Map<number, { total: number; count: number }>();
    for (const r of rows || []) {
      const id = Number((r as any).campaign_id);
      const amt = Number((r as any).amount_sol || 0);
      const cur = acc.get(id) || { total: 0, count: 0 };
      cur.total += amt; cur.count += 1;
      acc.set(id, cur);
    }
    for (const [id, v] of acc) {
      await admin.from('campaigns').update({ total_received_sol: v.total }).eq('id', id);
    }
    return new Response(JSON.stringify({ success: true, updated: acc.size }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

