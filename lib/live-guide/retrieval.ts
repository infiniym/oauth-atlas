import { normalizeText, onProvider, publicUrl } from './contracts.ts';
import type { Bindings, Document, GuideInput, Progress, Research } from './contracts.ts';

type Page = { url: string; title: string; text: string; links: string[]; labels:Record<string,string> };
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
        headers: { accept: 'application/dns-json' }, signal: AbortSignal.any([signal, AbortSignal.timeout(4500)]), redirect: 'manual',
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
  const labels:Record<string,string>={};
  const add = (href: string) => { try { links.push(publicUrl(new URL(decode(href),url).href).href); } catch { /* Skip unsafe/non-web links. */ } };
  for (const m of body.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of body.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) add(m[1]);
  for(const m of body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))try{labels[new URL(decode(m[1]),url).href]=decode(m[2].replace(/<[^>]*>/g,' ')).trim().slice(0,140);}catch{}
  for(const m of body.matchAll(/\[([^\]]*)\]\(([^\s)]+)\)/g))try{labels[new URL(decode(m[2]),url).href]=m[1].slice(0,140);}catch{}
  // Prefer the article body over large client-rendered navigation payloads.
  const main=body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||body.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||body;
  const text = decode(html ? main.replace(/<(script|style|svg|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,'\n').replace(/<\/(?:p|li|h[1-6]|div|tr|section)>|<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ') : body.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1'));
  return { url, title, text: text.replace(/[\t ]+/g,' ').replace(/\n\s*\n/g,'\n').trim(), links: [...new Set(links)],labels };
}
export const topicPatterns={registration:/oauth|register.{0,20}app|creat.{0,20}(?:app|integration|connection)|app.{0,12}setup/i,permissions:/scopes?|permissions?|capabilities|access.types/i,identity:/actor|app.authentication|bot|agents?|user.authentication/i,distribution:/app.{0,15}review|oauth.{0,15}review|approval|verification|distribution|marketplace|integration.directory|publish|public.connection/i};
export function sourceKey(value:string):string{const url=new URL(value);url.pathname=url.pathname.replace(/\.md$/,'').replace(/\/$/,'')||'/';url.searchParams.delete('noRedirect');return url.href;}
export type ResearchTopic=keyof typeof topicPatterns;
export function linkScore(url:string,label=''):number{
  const text=url+' '+label;return (/oauth/i.test(text)?30:0)+(topicPatterns.permissions.test(text)?28:0)+(topicPatterns.distribution.test(text)?26:0)+(topicPatterns.identity.test(text)?12:0)+(/developer|docs/i.test(text)?5:0)-(/blog|changelog|login|signup|privacy|terms|code.and.reviews|pull.request|\.(?:png|svg|jpg|pdf|js|css)(?:\?|$)/i.test(text)?80:0);
}
export function actionLinkScore(url:string,label:string,useCase:string):number{
  const path=new URL(url).pathname.toLowerCase(),text=path+' '+label.toLowerCase(),stop=new Set(['read','create','write','with','from','their','only','when','they','that','this','then','them','will','into','have','other','customer','customers','request','requests','should','connect','connected','never','without','internal','user','users','account','accounts','workspace','workspaces','shared','explicitly','public']);
  const positive=useCase.replace(/\b(?:never|not|no|without|don't)\b[^.!?;\n]*/gi,'');
  const writes=/\b(?:create|add|post|insert|edit|update|modify|write|delete|remove)\b/i.test(positive);
  if(!writes&&/\/(?:create|post|insert|update|modify|delete|remove|patch|put|add|set)[\w-]*(?:\.md)?$/i.test(path))return -60;
  const words=useCase.toLowerCase().split(/\W+/).filter(t=>t.length>3&&!stop.has(t)).map(t=>t.replace(/s$/,''));
  const terms=[...new Set(words)],resources=terms.filter(t=>text.includes(t)).length;
  const direct=terms.reduce((n,t)=>n+(new RegExp('(?:get|list|retrieve|create|post|update|delete)[-_ ]*(?:(?:all|a|an)[-_ ]*)?'+t+'s?(?:[-_ ]|for|by|$|\\.)').test(text)?Math.min(2,words.filter(w=>w===t).length)*20:0),0);
  return resources&&/\/reference\/|\/api\/|endpoint/i.test(text)?40+Math.min(resources,3)*8+direct:0;
}

export async function discoverProvider(input:GuideInput,bindings:Bindings,emit:(event:Progress)=>void,outer:AbortSignal,fetcher:Fetcher=fetch):Promise<string>{
  if(input.website)return publicUrl(input.website).href;
  const signal=AbortSignal.any([outer,AbortSignal.timeout(12000)]),reader=publicReader(fetcher,signal);let seed='';
  const search=async(body:object)=>{const response=await fetcher('https://api.firecrawl.dev/v2/search',{method:'POST',redirect:'manual',signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+bindings.LIVE_GUIDE_FIRECRAWL_KEY},body:JSON.stringify(body)});if(!response.ok)throw new Error('Search unavailable.');return JSON.parse(await boundedText(response,signal));};
  if (!seed) {
    emit({stage:'Finding the provider',detail:`Searching for ${input.app} OAuth documentation.`,status:'working'});
    if (bindings.LIVE_GUIDE_FIRECRAWL_KEY) {
      const data = await search({query:`${input.app} official OAuth developer documentation`,limit:4,sources:[{type:'web'}]});
      seed = (data.data?.web || []).find((x: {url:string}) => { try { return !/composio|zapier|pipedream|reddit|medium|youtube/.test(new URL(x.url).hostname) && !!publicUrl(x.url); } catch { return false; } })?.url || '';
    } else {
      for (const url of [`https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.app+' official OAuth developer documentation')}`,`https://search.brave.com/search?q=${encodeURIComponent(input.app+' official OAuth developer documentation')}`]) {
        try {
          const result = await reader.read(url); const candidates = parsePage(result.url,result.body).links.map(x => {
            const u = new URL(x); return u.searchParams.get('uddg') || x;
          }).filter(x => {
            try { const host = publicUrl(x).hostname; return !/duckduckgo|brave\.com|github\.com|composio|zapier|pipedream|reddit|medium|youtube/.test(host) && input.app.toLowerCase().split(/\W+/).filter(t=>t.length>2).some(t => host.includes(t)); } catch { return false; }
          }).sort((a,b)=>linkScore(b)-linkScore(a));
          if (candidates.length) { seed = candidates[0]; break; }
        } catch { /* Try another public discovery route. */ }
      }
    }
    if (!seed) throw new Error('Could not identify this app confidently. Add its official website or direct OAuth documentation URL.');
  }
  outer.throwIfAborted();return publicUrl(seed).href;
}

export async function retrieve(input: GuideInput, bindings: Bindings, emit: (event: Progress) => void, outer: AbortSignal, fetcher: Fetcher = fetch, options:{previous?:Research;topics?:ResearchTopic[]}={}): Promise<Research> {
  const signal = AbortSignal.any([outer, AbortSignal.timeout(options.previous?18000:38000)]);
  const reader = publicReader(fetcher, signal); const warnings: string[] = [];
  let seed = options.previous?.website||input.website;
  const firecrawl = async (path: string, body: object) => {
    const res = await fetcher('https://api.firecrawl.dev/v2/' + path, { method:'POST', redirect:'manual', signal: AbortSignal.any([signal,AbortSignal.timeout(12000)]), headers:{'Content-Type':'application/json',Authorization:'Bearer '+bindings.LIVE_GUIDE_FIRECRAWL_KEY},body:JSON.stringify(body) });
    if (!res.ok) { await res.body?.cancel(); throw new Error('The configured retrieval service is unavailable.'); }
    const data = JSON.parse(await boundedText(res, signal)); if (!data.success) throw new Error('Retrieval did not return readable content.'); return data;
  };
  if(!seed)seed=await discoverProvider(input,bindings,emit,outer,fetcher);
  seed = publicUrl(seed).href;
  const score=(url:string,label='')=>linkScore(url,label)+actionLinkScore(url,label,input.useCase);
  const previous=options.previous?.documents||[];
  const topics=options.topics||(['registration','permissions','identity','distribution'] as ResearchTopic[]);
  const candidates=new Map<string,string>();
  for(const d of previous)for(const link of d.links||[])if(!previous.some(p=>p.url===link))candidates.set(link,'');
  const queue = previous.length?[...candidates.keys()].filter(l=>topics.some(t=>topicPatterns[t].test(l))||(topics.includes('permissions')&&actionLinkScore(l,'',input.useCase)>0)).sort((a,b)=>score(b)-score(a)).slice(0,12):[seed,new URL('/llms.txt',seed).href];
  if(previous.length&&!queue.length){
    emit({stage:'Finding missing evidence',detail:'Looking for '+topics.join(', ')+' documentation.',status:'working'});
    try{const query=`site:${new URL(seed).hostname.replace(/^(docs|developers|developer)\./,'')} ${input.app} OAuth ${topics.join(' ')}`;
      if(bindings.LIVE_GUIDE_FIRECRAWL_KEY){const data=await firecrawl('search',{query,limit:4,sources:[{type:'web'}]});queue.push(...(data.data?.web||[]).map((x:{url:string})=>x.url));}
      else{const result=await reader.read('https://html.duckduckgo.com/html/?q='+encodeURIComponent(query));queue.push(...parsePage(result.url,result.body).links.map(l=>new URL(l).searchParams.get('uddg')||l));}
    }catch{warnings.push('The targeted follow-up search was unavailable.');}
  }
  const attempted = new Set<string>(previous.map(d=>sourceKey(d.url))); const pages: Page[] = [];
  const covered=new Set<ResearchTopic>();
  const allowedExternal=new Set<string>(previous.filter(d=>!onProvider(d.url,seed)).map(d=>new URL(d.url).hostname));
  const allowed=(url:string)=>onProvider(url,seed)||allowedExternal.has(new URL(url).hostname);
  while (queue.length && pages.length < (previous.length?3:8) && attempted.size < previous.length+16 && !signal.aborted) {
    const url = queue.shift()!; if (attempted.has(sourceKey(url)) || !allowed(url)) continue; attempted.add(sourceKey(url));
    emit({stage:'Reading documentation',detail:new URL(url).hostname+new URL(url).pathname,status:'working'});
    try {
      let page: Page;
      if (bindings.LIVE_GUIDE_FIRECRAWL_KEY) {
        await reader.check(new URL(url).hostname);
        const result = await firecrawl('scrape',{url,formats:['markdown','links'],onlyMainContent:true,timeout:10000,maxAge:0});
        const finalUrl = publicUrl(result.data?.metadata?.sourceURL || url).href;
        if (!allowed(finalUrl)) throw new Error('Source left the selected domain.');
        page = parsePage(finalUrl,result.data?.markdown || '');
        page.links.push(...(result.data?.links || []).filter((x: unknown) => typeof x === 'string').flatMap((x:string) => {try{return [publicUrl(x).href];}catch{return [];}}));
        page.title = result.data?.metadata?.title?.slice(0,160) || page.title;
      } else { const result = await reader.read(url,onProvider(url,seed)?seed:new URL(url).origin); page = parsePage(result.url,result.body); }
      const index = /\/llms(?:-full)?\.txt(?:\?|$)/.test(page.url);
      if ((page.text.length < 80 && !page.links.length) || (index && !page.links.length) || /just a moment|verify.*human|access denied|checking your browser/i.test(page.title)) throw new Error('Page requires browser verification or contains no readable documentation.');
      const substantive=!index&&page.text.length>=80;
      attempted.add(sourceKey(page.url));
      if (substantive && !pages.some(p=>p.url===page.url)&&!previous.some(d=>d.url===page.url)) pages.push(page);
      for(const link of page.links){
        if(!onProvider(link,seed)&&/docs|developers?|readme\.io|gitbook|readthedocs|mintlify/i.test(link)&&linkScore(link,page.labels[link])>15)allowedExternal.add(new URL(link).hostname);
        if(allowed(link)&&!attempted.has(sourceKey(link))&&score(link,page.labels[link])>0)candidates.set(link,page.labels[link]||'');
      }
      if(substantive)for(const topic of topics)if(topicPatterns[topic].test(page.url+' '+page.title))covered.add(topic);
      const ranked=[...candidates].filter(([l])=>!attempted.has(sourceKey(l))).sort((a,b)=>score(b[0],b[1])-score(a[0],a[1]));
      const priority=topics.filter(t=>!covered.has(t)).flatMap(t=>{const candidate=ranked.find(([l,label])=>topicPatterns[t].test(l+' '+label))||(t==='permissions'?ranked.find(([l,label])=>actionLinkScore(l,label,input.useCase)>0):undefined);return candidate?[candidate[0]]:[];});
      // Re-rank after each source so a missing permissions/distribution topic wins over generic docs.
      queue.splice(index?0:queue.length,0,...priority.filter(l=>!queue.includes(l)));
      for(const [link] of ranked.slice(0,8))if(!queue.includes(link))queue.push(link);
      emit({stage:'Source read',detail:page.title+(index?' · documentation index':''),status:'done'});
    } catch {
      outer.throwIfAborted(); warnings.push(`Could not read ${new URL(url).hostname}${new URL(url).pathname}.`);
      emit({stage:'Source unavailable',detail:warnings.at(-1)!,status:'warning'});
    }
  }
  outer.throwIfAborted();
  if (!pages.length&&!previous.length) throw new Error('No readable documentation found. Try a direct public OAuth documentation URL.');
  if (signal.aborted) warnings.push('Research reached its source-reading deadline; findings are partial.');
  const documents: Document[] = await Promise.all(pages.map(async (p,i) => {
    // Preserve relevant sections when pages contain long navigation/schema preambles.
    const lines = p.text.split('\n'); const first = lines.findIndex(l=>/oauth|client[_ -]?id|authentication/i.test(l));
    const text = lines.slice(Math.max(0,first-4)).join('\n').slice(0,32000);
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizeText(text)));
    return {id:'s'+(previous.length+i+1),url:p.url,title:p.title,retrievedAt:new Date().toISOString(),hash:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join(''),text,links:p.links.filter(l=>score(l,p.labels[l])>0).sort((a,b)=>score(b,p.labels[b])-score(a,p.labels[a])).slice(0,60)};
  }));
  return { documents:[...previous,...documents],website:seed,inferred:options.previous?.inferred??!input.website,warnings:[...(options.previous?.warnings||[]),...warnings] };
}
