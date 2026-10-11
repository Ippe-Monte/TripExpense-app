// AI Travel Assistant — pure helpers (no Deno / network APIs) so they can be unit-tested in Node.
// Only "erasable" TypeScript is used (no enums / parameter properties).

export const CATEGORIES = ['hotel', 'cafe', 'restaurant', 'attraction', 'shopping', 'nature', 'activity', 'other'] as const;
export type Category = typeof CATEGORIES[number];
export const CATEGORY_TH: Record<string, string> = {
  hotel: 'ที่พัก', cafe: 'คาเฟ่', restaurant: 'ร้านอาหาร', attraction: 'สถานที่ท่องเที่ยว',
  shopping: 'ช้อปปิ้ง/ตลาด', nature: 'ธรรมชาติ/จุดชมวิว', activity: 'กิจกรรม', other: 'อื่นๆ',
};

export function clampStr(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  // strip control chars, collapse whitespace runs
  const t = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  return t.length > max ? t.slice(0, max) : t;
}
export function intIn(v: unknown, lo: number, hi: number): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r < lo || r > hi ? null : r;
}
export function isHHMM(s: unknown): s is string { return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }
export function toMin(s: string): number { return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)); }
export function fromMin(m: number): string { const h = Math.floor(m / 60) % 24, mm = m % 60; return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
export function isDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z'); return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function validLat(n: unknown): n is number { return typeof n === 'number' && Number.isFinite(n) && n >= -90 && n <= 90; }
export function validLng(n: unknown): n is number { return typeof n === 'number' && Number.isFinite(n) && n >= -180 && n <= 180; }
export function isUuid(s: unknown): s is string { return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, rad = (x: number) => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Only https links on Google Maps hosts are ever returned to the browser / saved.
export function isTrustedMapUrl(u: unknown): u is string {
  if (typeof u !== 'string' || u.length > 2000) return false;
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:') return false;
    return /^(www\.)?google\.[a-z.]{2,7}$/i.test(x.hostname) && x.pathname.startsWith('/maps')
      || /^maps\.google\.[a-z.]{2,7}$/i.test(x.hostname) || /^maps\.app\.goo\.gl$/i.test(x.hostname);
  } catch (_) { return false; }
}

export function normText(s: string): string { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }
export function dedupeKey(date: string, time: string | null, activity: string): string {
  return date + '|' + (time ? time.slice(0, 5) : '') + '|' + normText(activity);
}

// ---------------- request validation ----------------
export type Limits = {
  maxMessageChars: number; maxHistoryTurns: number; maxHistoryChars: number; maxItinerary: number;
  maxApplyItems: number; maxBodyBytes: number;
};
export const DEFAULT_LIMITS: Limits = {
  maxMessageChars: 1000, maxHistoryTurns: 8, maxHistoryChars: 1500, maxItinerary: 24, maxApplyItems: 30, maxBodyBytes: 32768,
};

export type ChatReq = {
  message: string; history: { role: 'user' | 'assistant'; text: string }[]; trip_id: string | null; lang: 'th' | 'en';
  origin: { name: string; lat: number | null; lng: number | null } | null;
};
export function validateChat(b: any, L: Limits = DEFAULT_LIMITS): { ok: true; v: ChatReq } | { ok: false; code: string; msg: string } {
  if (!b || typeof b !== 'object') return { ok: false, code: 'bad_request', msg: 'รูปแบบคำขอไม่ถูกต้อง' };
  const message = clampStr(b.message, L.maxMessageChars + 1);
  if (!message) return { ok: false, code: 'empty_message', msg: 'กรุณาพิมพ์ข้อความ' };
  if (message.length > L.maxMessageChars) return { ok: false, code: 'message_too_long', msg: `ข้อความยาวเกิน ${L.maxMessageChars} ตัวอักษร` };
  const history: ChatReq['history'] = [];
  if (Array.isArray(b.history)) {
    for (const h of b.history.slice(-L.maxHistoryTurns)) {
      if (!h || (h.role !== 'user' && h.role !== 'assistant')) continue;
      const t = clampStr(h.text, L.maxHistoryChars); if (t) history.push({ role: h.role, text: t });
    }
  }
  let trip_id: string | null = null;
  if (b.trip_id != null && b.trip_id !== '') { if (!isUuid(b.trip_id)) return { ok: false, code: 'bad_trip', msg: 'รหัสทริปไม่ถูกต้อง' }; trip_id = b.trip_id; }
  let origin: ChatReq['origin'] = null;
  if (b.origin && typeof b.origin === 'object') {
    const name = clampStr(b.origin.name, 120);
    const lat = validLat(b.origin.lat) ? b.origin.lat : null, lng = validLng(b.origin.lng) ? b.origin.lng : null;
    if (name) origin = { name, lat: lat != null && lng != null ? lat : null, lng: lat != null && lng != null ? lng : null };
  }
  return { ok: true, v: { message, history, trip_id, lang: b.lang === 'en' ? 'en' : 'th', origin } };
}

// Anthropic requires alternating roles starting with "user".
export function normalizeHistory(h: ChatReq['history']): { role: 'user' | 'assistant'; content: string }[] {
  const out: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of h) {
    if (!out.length && m.role === 'assistant') continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n' + m.text; else out.push({ role: m.role, content: m.text });
  }
  while (out.length && out[out.length - 1].role === 'user') out.pop(); // the new user message follows
  return out;
}

export type ApplyItem = {
  date: string; time: string | null; activity: string; category: string | null; note: string;
  location_name: string | null; location_url: string | null; location_lat: number | null; location_lng: number | null;
};
export function validateApply(b: any, L: Limits = DEFAULT_LIMITS): { ok: true; trip_id: string; items: ApplyItem[] } | { ok: false; code: string; msg: string } {
  if (!b || typeof b !== 'object') return { ok: false, code: 'bad_request', msg: 'รูปแบบคำขอไม่ถูกต้อง' };
  if (!isUuid(b.trip_id)) return { ok: false, code: 'bad_trip', msg: 'กรุณาเลือกทริป' };
  if (b.confirmed !== true) return { ok: false, code: 'not_confirmed', msg: 'ต้องยืนยันก่อนบันทึก' };
  if (!Array.isArray(b.items) || !b.items.length) return { ok: false, code: 'no_items', msg: 'ไม่มีรายการที่เลือก' };
  if (b.items.length > L.maxApplyItems) return { ok: false, code: 'too_many', msg: `เพิ่มได้ครั้งละไม่เกิน ${L.maxApplyItems} รายการ` };
  const items: ApplyItem[] = [];
  for (let i = 0; i < b.items.length; i++) {
    const x = b.items[i];
    if (!x || typeof x !== 'object') return { ok: false, code: 'bad_item', msg: `รายการที่ ${i + 1} ไม่ถูกต้อง` };
    if (!isDate(x.date)) return { ok: false, code: 'bad_date', msg: `รายการที่ ${i + 1}: วันที่ไม่ถูกต้อง` };
    const time = x.time == null || x.time === '' ? null : (isHHMM(x.time) ? x.time : 'BAD');
    if (time === 'BAD') return { ok: false, code: 'bad_time', msg: `รายการที่ ${i + 1}: เวลาไม่ถูกต้อง` };
    const activity = clampStr(x.activity, 160);
    if (!activity) return { ok: false, code: 'bad_item', msg: `รายการที่ ${i + 1}: ไม่มีชื่อกิจกรรม` };
    const hasLL = validLat(x.lat) && validLng(x.lng);
    const url = x.url == null || x.url === '' ? null : (isTrustedMapUrl(x.url) ? x.url : 'BAD');
    if (url === 'BAD') return { ok: false, code: 'bad_url', msg: `รายการที่ ${i + 1}: ลิงก์แผนที่ไม่ถูกต้อง` };
    const cat = clampStr(x.category, 40) || null;
    items.push({
      date: x.date, time, activity, category: cat ? (CATEGORY_TH[cat] || cat).slice(0, 40) : null,
      note: clampStr(x.note, 500), location_name: clampStr(x.location_name, 160) || null,
      location_url: url, location_lat: hasLL ? x.lat : null, location_lng: hasLL ? x.lng : null,
    });
  }
  return { ok: true, trip_id: b.trip_id, items };
}

// ---------------- places & model answer ----------------
export type Place = {
  ref: string; id: string | null; name: string; category: string; address: string | null;
  lat: number | null; lng: number | null; url: string | null;
  rating: number | null; ratings_count: number | null; price_level: string | null; hours: string[] | null;
};
export type Card = {
  verified: boolean; ref: string | null; name: string; category: string; address: string | null;
  lat: number | null; lng: number | null; url: string | null;
  rating: number | null; ratings_count: number | null; price_level: string | null; hours: string[] | null; why: string | null;
};
export type StopOut = Card & {
  start_time: string | null; duration_min: number | null; duration_is_estimate: true;
  note: string | null; est_cost_thb: number | null; cost_is_estimate: true; hop_km_from_prev: number | null;
};
export type DayOut = { day: number; items: StopOut[] };
export type ItinOut = { title: string; destination: string | null; end_by: string | null; days: DayOut[] };
export type Answer = { reply: string; questions: string[]; recommendations: Card[]; itinerary: ItinOut | null; warnings: string[] };

function cat(v: unknown): string { return typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v) ? v : 'other'; }

// Data about a real place (coordinates, links, rating, hours) can ONLY come from provider results (refs),
// never from the model's own text.
export function toCard(p: Place | null, fallbackName: string, category: string, why: string | null): Card | null {
  if (p) return { verified: true, ref: p.ref, name: p.name, category: p.category || category, address: p.address, lat: p.lat, lng: p.lng, url: p.url, rating: p.rating, ratings_count: p.ratings_count, price_level: p.price_level, hours: p.hours, why };
  const name = clampStr(fallbackName, 120);
  if (!name) return null;
  return { verified: false, ref: null, name, category, address: null, lat: null, lng: null, url: null, rating: null, ratings_count: null, price_level: null, hours: null, why };
}

export function sanitizeAnswer(raw: any, places: Map<string, Place>, o: { maxItinerary: number; longHopKm: number }): Answer {
  const r = raw && typeof raw === 'object' ? raw : {};
  const reply = clampStr(r.reply, 4000) || 'ขออภัย ผมยังตอบเรื่องนี้ไม่ได้ ลองพิมพ์ใหม่อีกครั้งนะครับ';
  const questions = Array.isArray(r.questions) ? r.questions.map((q: unknown) => clampStr(q, 200)).filter(Boolean).slice(0, 3) : [];
  const recommendations: Card[] = [];
  const seen = new Set<string>();
  if (Array.isArray(r.recommendations)) {
    for (const x of r.recommendations.slice(0, 10)) {
      if (!x || typeof x !== 'object') continue;
      const p = typeof x.place_ref === 'string' ? places.get(x.place_ref) || null : null;
      const c = toCard(p, x.name, cat(x.category), clampStr(x.why, 300) || null);
      if (!c) continue; const k = (c.ref || '') + '|' + normText(c.name); if (seen.has(k)) continue; seen.add(k); recommendations.push(c);
    }
  }
  let itinerary: ItinOut | null = null; const warnings: string[] = [];
  const it = r.itinerary;
  if (it && typeof it === 'object' && Array.isArray(it.days)) {
    let count = 0; const days: DayOut[] = [];
    for (const d of it.days.slice(0, 14)) {
      const dayNo = intIn(d?.day, 1, 60); if (dayNo == null || !Array.isArray(d.items)) continue;
      const items: StopOut[] = [];
      for (const x of d.items) {
        if (count >= o.maxItinerary) { warnings.push(`ตัดรายการให้เหลือ ${o.maxItinerary} รายการตามขีดจำกัด`); break; }
        if (!x || typeof x !== 'object') continue;
        const p = typeof x.place_ref === 'string' ? places.get(x.place_ref) || null : null;
        const c = toCard(p, x.name, cat(x.category), null); if (!c) continue;
        const st = isHHMM(x.start_time) ? x.start_time : null;
        const dur = intIn(x.duration_min, 5, 720);
        const cost = intIn(x.est_cost_thb, 0, 1_000_000);
        items.push({ ...c, start_time: st, duration_min: dur, duration_is_estimate: true, note: clampStr(x.note, 300) || null, est_cost_thb: cost, cost_is_estimate: true, hop_km_from_prev: null });
        count++;
      }
      if (items.length) days.push({ day: dayNo, items });
    }
    if (days.length) {
      days.sort((a, b) => a.day - b.day);
      for (const d of days) d.items.sort((a, b) => (a.start_time && b.start_time) ? toMin(a.start_time) - toMin(b.start_time) : 0);
      itinerary = { title: clampStr(it.title, 120) || 'ตารางเที่ยวที่เสนอ', destination: clampStr(it.destination, 80) || null, end_by: isHHMM(it.end_by) ? it.end_by : null, days };
      warnings.push(...itineraryWarnings(itinerary, o.longHopKm));
    }
  }
  return { reply, questions, recommendations, itinerary, warnings };
}

// Straight-line distance only — NOT a routing result. Always labelled as an estimate in the UI.
export function itineraryWarnings(it: ItinOut, longHopKm: number): string[] {
  const w: string[] = [];
  let unverified = 0, noTime = 0;
  for (const d of it.days) {
    let prev: StopOut | null = null;
    for (const s of d.items) {
      if (!s.verified) unverified++;
      if (!s.start_time) noTime++;
      if (prev && prev.lat != null && prev.lng != null && s.lat != null && s.lng != null) {
        s.hop_km_from_prev = Math.round(haversineKm({ lat: prev.lat, lng: prev.lng }, { lat: s.lat, lng: s.lng }) * 10) / 10;
        if (s.hop_km_from_prev > longHopKm) w.push(`วันที่ ${d.day}: "${prev.name}" → "${s.name}" ห่างกันประมาณ ${s.hop_km_from_prev} กม. (เส้นตรง) อาจใช้เวลาเดินทางนาน`);
      }
      if (prev && prev.start_time && s.start_time) {
        const end = toMin(prev.start_time) + (prev.duration_min ?? 0);
        if (prev.duration_min != null && end > toMin(s.start_time)) w.push(`วันที่ ${d.day}: เวลาของ "${prev.name}" ทับกับ "${s.name}"`);
      }
      prev = s;
    }
    const last = d.items[d.items.length - 1];
    if (it.end_by && last && last.start_time) {
      const end = toMin(last.start_time) + (last.duration_min ?? 0);
      if (end > toMin(it.end_by)) w.push(`วันที่ ${d.day}: รายการสุดท้ายจบหลัง ${it.end_by} น.`);
    }
  }
  if (unverified) w.push(`${unverified} รายการเป็นคำแนะนำจาก AI ที่ยังไม่ยืนยันกับแหล่งข้อมูลสถานที่จริง กรุณาตรวจสอบก่อนไป`);
  if (noTime) w.push(`${noTime} รายการยังไม่มีเวลาเริ่ม`);
  w.push('ระยะเวลาเที่ยวและค่าใช้จ่ายเป็นการประมาณ ระบบยังไม่ได้ตรวจเวลาเปิด-ปิดกับตารางที่จัดไว้ และยังไม่ได้คำนวณเวลาเดินทางจริง');
  return w;
}

// Conflicts with what is already in the trip's schedule (same day, start within `windowMin` of each other).
export function scheduleConflicts(existing: { schedule_date: string; schedule_time: string | null; activity: string }[], items: { date: string; time: string | null; activity: string }[], windowMin = 30): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (!it.time) continue;
    for (const e of existing) {
      if (e.schedule_date !== it.date || !e.schedule_time) continue;
      const a = toMin(e.schedule_time.slice(0, 5)), b = toMin(it.time);
      if (Math.abs(a - b) < windowMin) out.push(`${it.date} ${it.time}: "${it.activity}" ใกล้กับรายการเดิม "${e.activity}" (${e.schedule_time.slice(0, 5)})`);
    }
  }
  return out;
}

// Best-effort per-instance limiter (used when the optional usage RPC is not installed).
export function makeMemoryLimiter(now: () => number = Date.now) {
  const day = new Map<string, { d: string; n: number }>(); const min = new Map<string, number[]>(); let g = { d: '', n: 0 };
  return {
    hit(uid: string, dailyLimit: number, burstPerMin: number, globalLimit = 0): { ok: true } | { ok: false; reason: 'daily' | 'burst' | 'global' } {
      const t = now(); const d = new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
      if (g.d !== d) g = { d, n: 0 };
      const arr = (min.get(uid) || []).filter(x => t - x < 60000);
      if (arr.length >= burstPerMin) { min.set(uid, arr); return { ok: false, reason: 'burst' }; }
      const cur = day.get(uid); const n = cur && cur.d === d ? cur.n : 0;
      if (n >= dailyLimit) return { ok: false, reason: 'daily' };
      if (globalLimit > 0 && g.n >= globalLimit) return { ok: false, reason: 'global' };
      arr.push(t); min.set(uid, arr); day.set(uid, { d, n: n + 1 }); g.n++;
      if (day.size > 5000) day.clear();
      return { ok: true };
    },
  };
}
