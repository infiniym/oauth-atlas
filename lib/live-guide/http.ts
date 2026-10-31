import { normalizeInput } from './contracts.ts';
import type { Bindings, StoredRun } from './contracts.ts';
import { generate } from './workflow.ts';

export interface Store {
  prepare(sql: string): { bind(...args: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<unknown> } };
}
type Environment = Bindings & { DB?: Store };
const json = (body: unknown, status = 200) => Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function load(store: Store, id: string): Promise<StoredRun | null> {
  if (!/^lg-[a-f0-9-]{36}$/.test(id)) return null;
  const row = await store.prepare('SELECT payload FROM live_guides WHERE id = ?').bind(id).first<{payload:string}>();
  return row ? JSON.parse(row.payload) as StoredRun : null;
}
export async function getGuide(id: string, env: Environment): Promise<Response> {
  if (!/^lg-[a-f0-9-]{36}$/.test(id)) return json({error:'Guide not found.'},404);
  if (!env.DB) return json({error:'The live-guide store is unavailable.'},503);
  try { const run = await load(env.DB,id); return run ? json({guide:run.guide}) : json({error:'Guide not found.'},404); }
  catch { return json({error:'The live-guide store is unavailable. Apply its database migration before previewing.'},503); }
}
export async function postGuide(request: Request, env: Environment, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error:'Start research from this site.'},403);
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) return json({error:'Send app details as JSON.'},415);
  if (!env.DB) return json({error:'The live-guide store is unavailable.'},503);
  let input;
  try {
    const reader = request.body?.getReader(); if (!reader) return json({error:'Enter an app name or website.'},400);
    const decoder = new TextDecoder(); let body = '', bytes = 0;
    try {
      while (true) { const {value,done} = await reader.read(); if (done) break; bytes += value.byteLength; if(bytes>6000){await reader.cancel();return json({error:'Keep app details under 6 KB.'},413);} body += decoder.decode(value,{stream:true}); }
    } finally { reader.releaseLock(); }
    input = normalizeInput(JSON.parse(body+decoder.decode()));
  } catch { return json({error:'Enter valid app details and a public HTTPS website.'},400); }
  let previous: StoredRun | null = null;
  try {
    const hour = Math.floor(Date.now()/3_600_000), address = request.headers.get('cf-connecting-ip') || 'local-preview';
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(hour+':'+address));
    const bucket = hour+':'+Array.from(new Uint8Array(digest).slice(0,12),x=>x.toString(16).padStart(2,'0')).join('');
    const result = await env.DB.prepare('INSERT INTO live_guide_limits (bucket,count) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket).first<{count:number}>();
    if ((result?.count || 0)>12) return new Response(JSON.stringify({error:'This connection has reached 12 research runs this hour. Try again after the hour changes.'}),{status:429,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':String(3600-Math.floor(Date.now()/1000)%3600)}});
    if (input.previousId) { previous = await load(env.DB,input.previousId); if(!previous)return json({error:'Previous guide not found. Start fresh research.'},404); }
  } catch { return json({error:'The live-guide database is not ready. Apply the isolated migration.'},503); }
  const db = env.DB; const abort = new AbortController();
  const signal = AbortSignal.any([request.signal,abort.signal,AbortSignal.timeout(110000)]);
  const encoder = new TextEncoder(); let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => { if(!closed && !signal.aborted) {try{controller.enqueue(encoder.encode(JSON.stringify(data)+'\n'));}catch{closed=true;abort.abort();}} };
      try {
        const run = await generate(input,env,event=>send({type:'progress',event}),signal,fetcher,previous || undefined);
        signal.throwIfAborted();
        await db.prepare('INSERT INTO live_guides (id,payload,created_at) VALUES (?,?,?)').bind(run.guide.id,JSON.stringify(run),run.guide.generatedAt).run();
        send({type:'complete',guide:run.guide});
      } catch(error) {
        if (!request.signal.aborted && !closed) {
          // Never forward upstream response bodies, environment values or database errors.
          const message = error instanceof Error && /^(?:Could not identify|No readable|The request changed|Choose an answer|Answers must|The previous guide)/.test(error.message) ? error.message : 'Research could not finish. Try a direct public OAuth documentation URL. Your previous guide is unchanged.';
          if (!signal.aborted) send({type:'error',error:message});
          else if(!closed) controller.enqueue(encoder.encode(JSON.stringify({type:'error',error:'Research reached its time limit. Retry with a direct OAuth documentation URL.'})+'\n'));
        }
      } finally { if(!closed){closed=true;controller.close();} }
    },
    cancel() { closed=true;abort.abort(); },
  });
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
