// Supabase Edge Function: ai-travel-assistant
// Deploy:  supabase functions deploy ai-travel-assistant      (verify_jwt stays ON — default)
// Secrets: supabase secrets set GEMINI_API_KEY=...  [AI_PROVIDER=gemini|anthropic] [AI_MODEL=...] [GOOGLE_PLACES_API_KEY=...] ...
// Every database call below runs with the CALLER's JWT, so Row Level Security decides what is visible/writable.
// The service-role key is never used and never needed.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handle } from './core.ts';
import { DEFAULT_LIMITS } from './lib.ts';

const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') || 'https://ippe-monte.github.io').split(',').map(s => s.trim()).filter(Boolean);
function cors(origin: string | null): Record<string, string> {
  const ok = origin && ALLOWED.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin! : ALLOWED[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  };
}
const json = (status: number, body: unknown, h: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async (req: Request) => {
  const h = cors(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' }, h);
  const auth = req.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return json(401, { ok: false, error: 'unauthorized', message: 'กรุณาเข้าสู่ระบบ' }, h);

  const len = Number(req.headers.get('content-length') || '0');
  if (len > DEFAULT_LIMITS.maxBodyBytes) return json(413, { ok: false, error: 'too_large', message: 'คำขอใหญ่เกินไป' }, h);
  let text = ''; try { text = await req.text(); } catch (_) { /* ignore */ }
  if (text.length > DEFAULT_LIMITS.maxBodyBytes) return json(413, { ok: false, error: 'too_large', message: 'คำขอใหญ่เกินไป' }, h);
  let body: any = null; try { body = JSON.parse(text); } catch (_) { return json(400, { ok: false, error: 'bad_json', message: 'รูปแบบคำขอไม่ถูกต้อง' }, h); }

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const jwt = auth.replace(/^Bearer\s+/i, '');
  try {
    const out = await handle(body, true, {
      env: (k) => Deno.env.get(k), fetch: (u, i) => fetch(u, i),
      log: (o) => console.log(JSON.stringify(o)),     // operational metrics only — never message text, tokens or keys
      db: {
        async getUserId() { const { data, error } = await sb.auth.getUser(jwt); return error || !data?.user ? null : data.user.id; },
        async getTrip(id) { const { data } = await sb.from('trips').select('id,name,start_date,end_date,status').eq('id', id).maybeSingle(); return data || null; },
        async listSchedules(tripId) {
          const { data } = await sb.from('schedules').select('schedule_date,schedule_time,activity,location_name').eq('trip_id', tripId).order('schedule_date').order('schedule_time').limit(300);
          return data || [];
        },
        async insertSchedules(rows) { const { error } = await sb.from('schedules').insert(rows); return { error: error ? { message: error.message } : null }; },
        async usageHit(userLimit, globalLimit) {      // optional: needs sql v22_ai_usage.sql; falls back to an in-memory limiter when absent
          const { data, error } = await sb.rpc('te_ai_usage_hit', { p_user_limit: userLimit, p_global_limit: globalLimit });
          if (error) return 'unavailable';
          return data === 'ok' ? 'ok' : data === 'global' ? 'global' : data === 'user' ? 'limit' : 'unavailable';
        },
      },
    });
    return json(out.status, out.body, h);
  } catch (e) {
    console.error(JSON.stringify({ evt: 'ai_unhandled', name: (e as Error)?.name }));
    return json(500, { ok: false, error: 'internal', message: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่' }, h);
  }
});
