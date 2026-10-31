import { normalizeText, onProvider, publicUrl } from './contracts.ts';
import type { Bindings, Document, GuideInput, Progress, Research } from './contracts.ts';

type Page = { url: string; title: string; text: string; links: string[] };
type Fetcher = typeof fetch;
const MAX_BYTES = 1_500_000;
export async function boundedText(response: Response, signal: AbortSignal): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader(); let size = 0, result = ''; const decoder = new TextDecoder();
  try {
    while (true) {
      signal.throwIfAborted(); const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Source response is too large.'); }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally { reader.releaseLock(); }
}
function publicAddress(ip: string): boolean {
  if (ip.includes(':')) return /^[23][0-9a-f]{3}:/i.test(ip) && !/^(?:2001:(?:db8|0):|2002:)/i.test(ip);
  const n = ip.split('.').map(Number), [a,b,c] = n;
  return n.length === 4 && n.every(x => Number.isInteger(x) && x >= 0 && x < 256) &&
    !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168 || b === 2 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
export function publicReader(fetcher: Fetcher, signal: AbortSignal) {
  const checked = new Set<string>();
  async function check(host: string) {
    if (checked.has(host)) return;
    const answers = await Promise.all(['A','AAAA'].map(async type => {
      const res = await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, {
        headers: { accept: 'application/dns-json' }, signal: AbortSignal.any([signal, AbortSignal.timeout(4500)]), redirect: 'error',
      });
      if (!res.ok) throw new Error('Could not check the public website address.');
      const data = JSON.parse(await boundedText(res, signal)) as { Answer?: { type: number; data: string }[] };
      return (data.Answer || []).filter(a => a.type === 1 || a.type === 28);
    }));
    if (!answers.flat().length || answers.flat().some(a => !publicAddress(a.data))) throw new Error('Website has no verifiable public address.');
    checked.add(host);
  }
  return { check, async read(value: string, allowed?: string): Promise<{ url: string; body: string }> {
    let url = publicUrl(value);
    for (let hop = 0; hop < 4; hop++) {
      if (allowed && !onProvider(url.href, allowed)) throw new Error('Source left the selected provider domain. Use its direct documentation URL.');
      await check(url.hostname);
      const res = await fetcher(url.href, { redirect: 'manual', signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]), headers: { accept: 'text/html,text/markdown,text/plain', 'user-agent': 'OAuthLaunchGuide/1.0 public documentation reader' } });
      if ([301,302,303,307,308].includes(res.status)) {
        const location = res.headers.get('location'); await res.body?.cancel();
        if (!location) throw new Error('Incomplete source redirect.'); url = publicUrl(new URL(location, url).href); continue;
      }
      if (!res.ok) { await res.body?.cancel(); throw new Error(`Source returned HTTP ${res.status}.`); }
      if (!/text\/(?:html|plain|markdown)|application\/(?:json|xhtml\+xml)/i.test(res.headers.get('content-type') || 'text/plain')) { await res.body?.cancel(); throw new Error('Use a public HTML or Markdown documentation page.'); }
      return { url: url.href, body: await boundedText(res, signal) };
    }
    throw new Error('Too many source redirects.');
  } };
}
const decode = (s: string) => s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n) => String.fromCodePoint(Math.min(Number(n),0x10ffff)));
export function parsePage(url: string, body: string): Page {
  const html = /<(?:html|title|main|body)\b/i.test(body);
  const title = decode(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || body.match(/^#\s+(.+)$/m)?.[1] || new URL(url).hostname).replace(/<[^>]*>/g,'').slice(0,160);
  const links: string[] = [];
  const add = (href: string) => { try { links.push(publicUrl(new URL(decode(href),url).href).href); } catch { /* Skip unsafe/non-web links. */ } };
  for (const m of body.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of body.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) add(m[1]);
  const text = decode(html ? body.replace(/<(script|style|svg|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,'\n').replace(/<\/(?:p|li|h[1-6]|div|tr|section)>|<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ') : body.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1'));
  return { url, title, text: text.replace(/[\t ]+/g,' ').replace(/\n\s*\n/g,'\n').trim(), links: [...new Set(links)] };
}
const score = (url: string) => (/oauth/i.test(url) ? 30 : 0) + (/review|approval|verification|distribution|marketplace/i.test(url) ? 20 : 0) + (/scope|permission|authentication|authorization/i.test(url) ? 15 : 0) + (/developer|docs/i.test(url) ? 5 : 0) - (/blog|changelog|login|signup|privacy|terms|\.(?:png|svg|jpg|pdf|js|css)(?:\?|$)/i.test(url) ? 60 : 0);

export async function retrieve(input: GuideInput, bindings: Bindings, emit: (event: Progress) => void, outer: AbortSignal, fetcher: Fetcher = fetch): Promise<Research> {
  const signal = AbortSignal.any([outer, AbortSignal.timeout(42000)]);
  const reader = publicReader(fetcher, signal); const warnings: string[] = [];
  let seed = input.website;
  const firecrawl = async (path: string, body: object) => {
    const res = await fetcher('https://api.firecrawl.dev/v2/' + path, { method:'POST', redirect:'error', signal: AbortSignal.any([signal,AbortSignal.timeout(12000)]), headers:{'Content-Type':'application/json',Authorization:'Bearer '+bindings.LIVE_GUIDE_FIRECRAWL_KEY},body:JSON.stringify(body) });
    if (!res.ok) { await res.body?.cancel(); throw new Error('The configured retrieval service is unavailable.'); }
    const data = JSON.parse(await boundedText(res, signal)); if (!data.success) throw new Error('Retrieval did not return readable content.'); return data;
  };
  if (!seed) {
    emit({stage:'Finding the provider',detail:`Searching for ${input.app} OAuth documentation.`,status:'working'});
    if (bindings.LIVE_GUIDE_FIRECRAWL_KEY) {
      const data = await firecrawl('search',{query:`${input.app} official OAuth developer documentation`,limit:4,sources:[{type:'web'}]});
      seed = (data.data?.web || []).find((x: {url:string}) => { try { return !/composio|zapier|pipedream|reddit|medium|youtube/.test(new URL(x.url).hostname) && !!publicUrl(x.url); } catch { return false; } })?.url || '';
    } else {
      for (const url of [`https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.app+' official OAuth developer documentation')}`,`https://search.brave.com/search?q=${encodeURIComponent(input.app+' official OAuth developer documentation')}`]) {
        try {
          const result = await reader.read(url); const candidates = parsePage(result.url,result.body).links.map(x => {
            const u = new URL(x); return u.searchParams.get('uddg') || x;
          }).filter(x => {
            try { const host = publicUrl(x).hostname; return !/duckduckgo|brave\.com|github\.com|composio|zapier|pipedream|reddit|medium|youtube/.test(host) && input.app.toLowerCase().split(/\W+/).filter(t=>t.length>2).some(t => host.includes(t)); } catch { return false; }
          }).sort((a,b)=>score(b)-score(a));
          if (candidates.length) { seed = candidates[0]; break; }
        } catch { /* Try another public discovery route. */ }
      }
    }
    if (!seed) throw new Error('Could not identify this app confidently. Add its official website or direct OAuth documentation URL.');
  }
  seed = publicUrl(seed).href;
  const queue = [seed, new URL('/llms.txt',seed).href]; const attempted = new Set<string>(); const pages: Page[] = [];
  const topics = new Set<string>();
  while (queue.length && pages.length < 6 && attempted.size < 10 && !signal.aborted) {
    const url = queue.shift()!; if (attempted.has(url) || !onProvider(url,seed)) continue; attempted.add(url);
    emit({stage:'Reading documentation',detail:new URL(url).hostname+new URL(url).pathname,status:'working'});
    try {
      let page: Page;
      if (bindings.LIVE_GUIDE_FIRECRAWL_KEY) {
        await reader.check(new URL(url).hostname);
        const result = await firecrawl('scrape',{url,formats:['markdown','links'],onlyMainContent:true,timeout:10000,maxAge:0});
        const finalUrl = publicUrl(result.data?.metadata?.sourceURL || url).href;
        if (!onProvider(finalUrl,seed)) throw new Error('Source left the selected domain.');
        page = parsePage(finalUrl,result.data?.markdown || '');
        page.links.push(...(result.data?.links || []).filter((x: unknown) => typeof x === 'string').flatMap((x:string) => {try{return [publicUrl(x).href];}catch{return [];}}));
        page.title = result.data?.metadata?.title?.slice(0,160) || page.title;
      } else { const result = await reader.read(url,seed); page = parsePage(result.url,result.body); }
      const index = /\/llms(?:-full)?\.txt(?:\?|$)/.test(page.url);
      if ((!index && page.text.length < 80) || (index && !page.links.length) || /just a moment|verify.*human|access denied|checking your browser/i.test(page.title)) throw new Error('Page requires browser verification or contains no readable documentation.');
      if (!index && !pages.some(p=>p.url===page.url)) pages.push(page);
      const links = page.links.filter(l => onProvider(l,seed) && !attempted.has(l) && score(l)>0).sort((a,b)=>score(b)-score(a));
      for (const topic of ['oauth','review','scope']) {
        const match = links.find(l => new RegExp(topic==='review'?'review|approval|distribution|marketplace':topic,'i').test(l));
        if (match && !topics.has(topic)) { queue.push(match); topics.add(topic); }
      }
      queue.push(...links.slice(0,8));
      emit({stage:'Source read',detail:page.title+(index?' · documentation index':''),status:'done'});
    } catch {
      outer.throwIfAborted(); warnings.push(`Could not read ${new URL(url).hostname}${new URL(url).pathname}.`);
      emit({stage:'Source unavailable',detail:warnings.at(-1)!,status:'warning'});
    }
  }
  outer.throwIfAborted();
  if (!pages.length) throw new Error('No readable documentation found. Try a direct public OAuth documentation URL.');
  if (signal.aborted) warnings.push('Research reached its source-reading deadline; findings are partial.');
  const documents: Document[] = await Promise.all(pages.map(async (p,i) => {
    // Preserve relevant sections when pages contain long navigation/schema preambles.
    const lines = p.text.split('\n'); const first = lines.findIndex(l=>/oauth|client[_ -]?id|authentication/i.test(l));
    const text = lines.slice(Math.max(0,first-4)).join('\n').slice(0,16000);
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizeText(text)));
    return {id:'s'+(i+1),url:p.url,title:p.title,retrievedAt:new Date().toISOString(),hash:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join(''),text};
  }));
  return { documents,website:seed,inferred:!input.website,warnings };
}
