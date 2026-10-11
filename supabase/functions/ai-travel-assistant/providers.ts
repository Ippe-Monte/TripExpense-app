// AI provider abstraction. The rest of the code only sees neutral messages / blocks.
// Adapters: "gemini" (default, official Gemini API) and "anthropic". Add another adapter here to switch providers.
// A provider is chosen ONLY by the AI_PROVIDER secret — there is never an automatic fallback to another / paid provider.

export type Block = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: any };
export type ToolDef = { name: string; description: string; input_schema: Record<string, any> };
export type Step =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text?: string; raw?: any }                       // raw = provider-native message to replay exactly (e.g. Gemini thought signatures)
  | { role: 'tool'; results: { id: string; name: string; content: string; isError: boolean }[] };
export type CallArgs = { system: string; steps: Step[]; tools: ToolDef[]; forceTool: string | null; maxOut: number; temperature: number; timeoutMs: number };
export type CallResult = { blocks: Block[]; raw: any; usage: { input: number; output: number } };
export type Fetch = (url: string, init?: any) => Promise<any>;

export class AiError extends Error {
  code: string; status: number; retryAfterS: number | null;
  constructor(code: string, status: number, m: string, retryAfterS: number | null = null) { super(m); this.code = code; this.status = status; this.retryAfterS = retryAfterS; }
}
export type Provider = { name: string; model: string; call(a: CallArgs): Promise<CallResult> };

async function post(f: Fetch, url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<any> {
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), timeoutMs);
  try { return await f(url, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }); }
  catch (e: any) { throw new AiError(e?.name === 'AbortError' ? 'ai_timeout' : 'ai_unreachable', e?.name === 'AbortError' ? 504 : 502, String(e?.message || e)); }
  finally { clearTimeout(to); }
}
async function safeJson(r: any): Promise<any> { try { return await r.json(); } catch (_) { return null; } }

// ---------------- Gemini (Google AI Studio / Gemini Developer API) ----------------
function parseRetryS(j: any, r: any): number | null {
  const d = Array.isArray(j?.error?.details) ? j.error.details.find((x: any) => typeof x?.retryDelay === 'string') : null;
  const m = d?.retryDelay ? /^(\d+(?:\.\d+)?)s$/.exec(d.retryDelay) : null;
  if (m) return Math.ceil(Number(m[1]));
  const h = r?.headers?.get ? r.headers.get('retry-after') : null; const n = h ? Number(h) : NaN;
  return Number.isFinite(n) ? Math.ceil(n) : null;
}
export function geminiProvider(o: { key: string; model: string; fetch: Fetch; thinkingBudget: number | null }): Provider {
  const base = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(o.model) + ':generateContent';
  return {
    name: 'gemini', model: o.model,
    async call(a) {
      const contents: any[] = [];
      for (const s of a.steps) {
        if (s.role === 'user') contents.push({ role: 'user', parts: [{ text: s.text }] });
        else if (s.role === 'assistant') contents.push(s.raw ? s.raw : { role: 'model', parts: [{ text: s.text || '' }] });
        else contents.push({ role: 'user', parts: s.results.map(r => ({ functionResponse: { name: r.name, response: r.isError ? { error: r.content } : { result: r.content } } })) });
      }
      const body: Record<string, unknown> = {
        systemInstruction: { parts: [{ text: a.system }] }, contents,
        generationConfig: { temperature: a.temperature, maxOutputTokens: a.maxOut, ...(o.thinkingBudget != null ? { thinkingConfig: { thinkingBudget: o.thinkingBudget } } : {}) },
      };
      if (a.tools.length) {
        body.tools = [{ functionDeclarations: a.tools.map(t => ({ name: t.name, description: t.description, parameters: t.input_schema })) }];
        body.toolConfig = { functionCallingConfig: a.forceTool ? { mode: 'ANY', allowedFunctionNames: [a.forceTool] } : { mode: 'AUTO' } };
      }
      const r = await post(o.fetch, base, { 'x-goog-api-key': o.key }, body, a.timeoutMs);
      const j = await safeJson(r);
      if (!r.ok) {
        const msg = String(j?.error?.message || '').slice(0, 200);
        if (r.status === 429) throw new AiError('ai_quota', 429, msg || 'quota', parseRetryS(j, r));
        if (r.status === 401 || r.status === 403 || (r.status === 400 && /api key/i.test(msg))) throw new AiError('ai_auth', 503, msg);
        if (r.status === 404 || r.status === 400) throw new AiError('ai_config', 503, msg);
        throw new AiError('ai_unavailable', 502, 'http ' + r.status);
      }
      if (j?.promptFeedback?.blockReason) throw new AiError('ai_blocked', 422, String(j.promptFeedback.blockReason));
      const cand = j?.candidates?.[0];
      const parts: any[] = Array.isArray(cand?.content?.parts) ? cand.content.parts : [];
      if (!parts.length) throw new AiError(cand?.finishReason === 'SAFETY' ? 'ai_blocked' : 'ai_malformed', cand?.finishReason === 'SAFETY' ? 422 : 502, 'empty ' + (cand?.finishReason || ''));
      const blocks: Block[] = []; let n = 0;
      for (const p of parts) {
        if (p?.functionCall?.name) blocks.push({ type: 'tool_use', id: String(p.functionCall.id || 'call_' + (n++)), name: String(p.functionCall.name), input: p.functionCall.args ?? {} });
        else if (typeof p?.text === 'string' && !p.thought) blocks.push({ type: 'text', text: p.text });
      }
      return { blocks, raw: { role: 'model', parts }, usage: { input: j?.usageMetadata?.promptTokenCount || 0, output: (j?.usageMetadata?.candidatesTokenCount || 0) + (j?.usageMetadata?.thoughtsTokenCount || 0) } };
    },
  };
}

// ---------------- Anthropic (optional alternative) ----------------
export function anthropicProvider(o: { key: string; model: string; fetch: Fetch }): Provider {
  return {
    name: 'anthropic', model: o.model,
    async call(a) {
      const messages: any[] = [];
      for (const s of a.steps) {
        if (s.role === 'user') messages.push({ role: 'user', content: s.text });
        else if (s.role === 'assistant') messages.push({ role: 'assistant', content: s.raw ? s.raw : (s.text || '') });
        else messages.push({ role: 'user', content: s.results.map(r => ({ type: 'tool_result', tool_use_id: r.id, content: r.content, is_error: r.isError })) });
      }
      const body: Record<string, unknown> = { model: o.model, max_tokens: a.maxOut, system: a.system, messages, temperature: a.temperature, tools: a.tools };
      if (a.forceTool) body.tool_choice = { type: 'tool', name: a.forceTool };
      const r = await post(o.fetch, 'https://api.anthropic.com/v1/messages', { 'x-api-key': o.key, 'anthropic-version': '2023-06-01' }, body, a.timeoutMs);
      if (!r.ok) {
        if (r.status === 429 || r.status === 529) throw new AiError('ai_quota', 429, 'rate', parseRetryS(null, r));
        if (r.status === 401 || r.status === 403) throw new AiError('ai_auth', 503, 'auth');
        if (r.status === 400 || r.status === 404) throw new AiError('ai_config', 503, 'bad request/model');
        throw new AiError('ai_unavailable', 502, 'http ' + r.status);
      }
      const j = await safeJson(r); if (!j) throw new AiError('ai_malformed', 502, 'bad json');
      const content: any[] = Array.isArray(j.content) ? j.content : [];
      const blocks: Block[] = content.flatMap((b: any): Block[] => b?.type === 'tool_use' ? [{ type: 'tool_use', id: String(b.id), name: String(b.name), input: b.input ?? {} }] : b?.type === 'text' ? [{ type: 'text', text: String(b.text || '') }] : []);
      return { blocks, raw: content, usage: { input: j?.usage?.input_tokens || 0, output: j?.usage?.output_tokens || 0 } };
    },
  };
}

export const DEFAULT_MODELS: Record<string, string> = { gemini: 'gemini-2.5-flash', anthropic: 'claude-haiku-5-5' };
export function makeProvider(env: (k: string) => string | undefined, f: Fetch): { provider: Provider | null; name: string; keyVar: string } {
  const name = (env('AI_PROVIDER') || 'gemini').toLowerCase();
  const model = env('AI_MODEL') || DEFAULT_MODELS[name] || '';
  if (name === 'gemini') {
    const key = env('GEMINI_API_KEY') || '';
    const tb = env('GEMINI_THINKING_BUDGET'); const n = tb == null || tb === '' ? NaN : Number(tb);
    return { name, keyVar: 'GEMINI_API_KEY', provider: key ? geminiProvider({ key, model, fetch: f, thinkingBudget: Number.isFinite(n) ? Math.round(n) : null }) : null };
  }
  if (name === 'anthropic') { const key = env('ANTHROPIC_API_KEY') || ''; return { name, keyVar: 'ANTHROPIC_API_KEY', provider: key ? anthropicProvider({ key, model, fetch: f }) : null }; }
  return { name, keyVar: 'AI_PROVIDER', provider: null };
}
