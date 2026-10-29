import type { Guide, Source, Step } from './guide';

export type ResearchInput = { app: string; website?: string; useCase?: string };
export type ResearchEvent = { title: string; detail: string; status: string };
type Page = { url: string; title: string; text: string; links: { url: string; label: string }[]; index: boolean };
const MAX_BYTES = 1_500_000;
const PAGE_LIMIT = 4;
const TOTAL_TIMEOUT = 58_000;
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.test', '.invalid', '.example', '.onion'];

/** Synchronous URL screening is followed by public DNS and redirect checks before every fetch. */
export function validatePublicUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value.includes('://') ? value : `https://${value}`); }
  catch { throw new Error('Enter a valid public HTTPS website, such as https://linear.app.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Use a public HTTPS website without credentials or a custom port.');
  }
  if (!host.includes('.') || host.endsWith('.') || host.startsWith('[') || /^\d+(?:\.\d+){0,3}$/.test(host) || !/^[a-z0-9.-]+$/.test(host) || host.split('.').some(x => !x || x.startsWith('-') || x.endsWith('-')) || BLOCKED_SUFFIXES.some(s => host.endsWith(s))) {
    throw new Error('Local, private, reserved, and IP-address websites are not supported.');
  }
  if ([...url.searchParams.keys()].some(k => /^(?:token|access_token|client_secret|secret|api_key|password|code)$/i.test(k))) {
    throw new Error('Remove credentials or authorization codes from the website URL.');
  }
  url.hash = '';
  return url;
}

export function validateInput(value: unknown): ResearchInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter an app name or its public website.');
  const raw = value as Record<string, unknown>;
  if (typeof raw.app !== 'string') throw new Error('Enter an app name or its public website.');
  let app = raw.app.trim().replace(/\s+/g, ' ');
  if (!app || app.length > 100 || /[<>\u0000-\u001f]/.test(app)) throw new Error('Use an app name between 1 and 100 characters, without markup.');
  if (raw.website !== undefined && typeof raw.website !== 'string') throw new Error('Website must be a public HTTPS URL.');
  if (raw.useCase !== undefined && typeof raw.useCase !== 'string') throw new Error('Describe the use case in plain text.');
  const useCase = typeof raw.useCase === 'string' ? raw.useCase.trim() : '';
  if (useCase.length > 600 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(useCase)) throw new Error('Keep the use case under 600 characters and omit markup.');
  let website = typeof raw.website === 'string' ? raw.website.trim() : '';
  if (!website && (/^https?:\/\//i.test(app) || /^[a-z0-9-]+\.[a-z]{2,}(?:\/|$)/i.test(app))) {
    website = app;
    app = new URL(validatePublicUrl(app)).hostname.replace(/^www\./, '').split('.')[0];
    app = app.charAt(0).toUpperCase() + app.slice(1);
  }
  if (website.length > 1500) throw new Error('Use a shorter website URL without tracking parameters.');
  return { app, ...(website ? { website: validatePublicUrl(website).href } : {}), ...(useCase ? { useCase } : {}) };
}

function publicIPv4(ip: string): boolean {
  const n = ip.split('.').map(Number);
  if (n.length !== 4 || n.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a,b,c] = n;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 2) || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
function publicIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Public unicast only. Reject mapped IPv4, documentation and private/link-local ranges.
  return /^[23][0-9a-f]{3}:/.test(normalized) && !normalized.startsWith('2001:db8:') && !normalized.startsWith('2001:0:') && !normalized.startsWith('2002:');
}

async function limitedText(response: Response, signal: AbortSignal): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '', size = 0;
  try {
    for (;;) {
      if (signal.aborted) throw new Error('Research timed out. Try the provider’s direct OAuth documentation URL.');
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('This page is too large to inspect safely. Try a direct documentation URL.'); }
      result += decoder.decode(item.value, { stream: true });
    }
    return result + decoder.decode();
  } finally { reader.releaseLock(); }
}

function createReader(signal: AbortSignal) {
  const checked = new Set<string>();
  const timeoutSignal = (ms: number) => AbortSignal.any([signal, AbortSignal.timeout(ms)]);
  async function checkDns(host: string) {
    if (checked.has(host)) return;
    const answers = await Promise.all(['A','AAAA'].map(async type => {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: 'application/dns-json' }, signal: timeoutSignal(5000), redirect: 'manual' });
      if (!res.ok) throw new Error('Public website address could not be verified. Try again or use another official documentation URL.');
      const data = await res.json() as { Status?: number; Answer?: {type:number;data:string}[] };
      if (data.Status !== 0) return [];
      return (data.Answer || []).filter(a => a.type === 1 || a.type === 28);
    }));
    const ips = answers.flat();
    if (!ips.length) throw new Error('This website has no verifiable public address. Check the spelling or provide its official website.');
    if (ips.some(a => a.type === 1 ? !publicIPv4(a.data) : !publicIPv6(a.data))) throw new Error('This website resolves to a private or reserved address and cannot be researched.');
    checked.add(host);
  }
  return async (value: string): Promise<{ url: string; body: string }> => {
    let url = validatePublicUrl(value);
    for (let hop = 0; hop < 4; hop++) {
      await checkDns(url.hostname);
      const res = await fetch(url.href, { redirect: 'manual', headers: { accept: 'text/html,text/markdown,text/plain;q=0.9', 'user-agent': 'OAuthAtlas-SourceReader/0.1 (+public-documentation-research)' }, signal: timeoutSignal(9500) });
      if ([301,302,303,307,308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) throw new Error('The provider returned an incomplete redirect. Try its documentation URL.');
        await res.body?.cancel();
        url = validatePublicUrl(new URL(location, url).href);
        continue;
      }
      if (!res.ok) { await res.body?.cancel(); throw new Error(`The provider returned HTTP ${res.status}. Try its public OAuth documentation URL.`); }
      const contentType = res.headers.get('content-type') || '';
      if (contentType && !/text\/(?:html|plain|markdown)|application\/(?:xhtml\+xml|json)/i.test(contentType)) { await res.body?.cancel(); throw new Error('This URL is not a readable documentation page. Use a public HTML or Markdown page.'); }
      return { url: url.href, body: await limitedText(res, signal) };
    }
    throw new Error('Too many redirects. Supply the final official documentation URL.');
  };
}

function decode(text: string): string {
  return text.replace(/&#x([0-9a-f]+);/gi, (_,n) => String.fromCodePoint(Math.min(parseInt(n,16),0x10ffff))).replace(/&#(\d+);/g, (_,n) => String.fromCodePoint(Math.min(parseInt(n,10),0x10ffff))).replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ');
}
function textOf(html: string): string {
  return decode(html.replace(/<(script|style|svg|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,'\n').replace(/<!--[^]*?-->/g,' ').replace(/<\/(?:p|li|h[1-6]|div|section|article|tr)>|<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[\t ]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
}
function parsePage(url: string, body: string): Page {
  const html = /<(?:html|body|article|title)\b/i.test(body);
  const title = html ? decode(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || new URL(url).hostname).replace(/<[^>]+>/g,'').trim() : body.match(/^#\s+(.+)$/m)?.[1] || new URL(url).pathname.split('/').pop() || new URL(url).hostname;
  const links: {url:string;label:string}[] = [];
  const add = (href:string,label:string) => {
    try {
      const link = validatePublicUrl(new URL(decode(href),url).href);
      if (!/\.(?:png|jpe?g|gif|svg|webp|pdf|zip|js|css)(?:\?|$)/i.test(link.pathname)) links.push({url:link.href,label:textOf(label).slice(0,160)});
    } catch { /* Unsafe/non-web links are never followed. */ }
  };
  if (html) for (const match of body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) add(match[1],match[2]);
  else for (const match of body.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)) add(match[2],match[1]);
  const text = html ? textOf(body) : body.replace(/^```[^]*?^```/gm,'\n').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[`*_#]/g,'').replace(/\r/g,'').trim();
  return {url,title:title.slice(0,160),text,links,index:/\/llms(?:-full)?\.txt(?:$|\?)/.test(url)};
}
function rootDomain(host: string): string {
  const p = host.replace(/^www\./,'').split('.');
  return p.slice(/\.(?:co|com|org|net)\.(?:uk|au|in|jp|nz|za)$/.test(host) ? -3 : -2).join('.');
}
function linkScore(link: {url:string;label:string}): number {
  const text = `${link.url} ${link.label}`.toLowerCase();
  let score = 0;
  if (/oauth/.test(text)) score += 30;
  if (/app[- /]?(?:review|approval)|marketplace|verification/.test(text)) score += 20;
  if (/authentication|authorization|register.*app|create.*app/.test(text)) score += 12;
  if (/developer|documentation|\/docs|developers/.test(text)) score += 5;
  if (/scope|permission/.test(text)) score += 8;
  if (/blog|changelog|pricing|sign.?in|login|signup|privacy|terms/.test(text)) score -= 8;
  if (/oauth.*(?:2|authentication)|authentication.*oauth/.test(text)) score += 8;
  return score;
}
function searchLinks(body: string, base: string): {url:string;label:string}[] {
  const links: {url:string;label:string}[] = [];
  for (const match of body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      let url = new URL(decode(match[1]),base);
      const target = url.searchParams.get('uddg');
      if (target) url = new URL(target);
      if (/duckduckgo\.com$|search\.brave\.com$|brave\.com$/.test(url.hostname)) continue;
      url = validatePublicUrl(url.href);
      if (/github\.com$|reddit\.com$|youtube\.com$|stackoverflow\.com$|medium\.com$|composio\.dev$|zapier\.com$|pipedream\.com$/.test(url.hostname)) continue;
      links.push({url:url.href,label:textOf(match[2]).slice(0,160)});
    } catch { /* Search results are untrusted input too. */ }
  }
  return [...new Map(links.map(x=>[x.url,x])).values()];
}
function pageSignals(page: Page) {
  const t = page.text;
  const deniesOAuth = /(?:does? not|do not|doesn.t|don.t|not currently).{0,25}(?:support|offer|provide|allow).{0,35}(?:oauth|third.party app)/i.test(t);
  const oauth = !deniesOAuth && /\boauth(?:\s*2)?\b/i.test(t) && /client[_ -]?id|client secret|authorization code|redirect[_ -]?(?:uri|url)|register.{0,50}(?:application|client)|access token/i.test(t);
  return {
    oauth,
    registration: oauth && /creat(?:e|ing).{0,80}(?:oauth|app|application)|register.{0,80}(?:app|client)|OAuth.{0,60}(?:settings|application)/i.test(t),
    redirect: oauth && /redirect[_ -]?(?:uri|url)|callback url/i.test(t),
    scopes: oauth && /\bscopes?\b|permissions/i.test(t),
    review: /(?:app|application).{0,12}(?:review|verification)|submit.{0,60}(?:review|verification)|marketplace.{0,80}(?:review|approval|requirement)|verification.{0,25}(?:process|app)/i.test(t),
    adminApproval: /(?:workspace|organization|admin).{0,120}(?:approv|restrict.{0,30}install)|(?:approv|restrict).{0,80}(?:workspace|organization) admin/i.test(t),
    test: /test users|development mode|sandbox|test(?:ing)? (?:your |an? )?(?:oauth )?app|development workspace/i.test(t),
    credentials: oauth && /client secret|client_secret/.test(t),
  };
}
function excerpt(page: Page): string {
  const lines = page.text.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>35 && x.length<1600);
  const score = (t:string) => (/\boauth\b/i.test(t)?4:0) + (/(?:create|register).{0,80}(?:app|application)|(?:settings|dashboard).{0,70}(?:oauth|application)/i.test(t)?8:0) + (/client[_ -]?(?:id|secret)|redirect|register|creat.{0,30}app/i.test(t)?3:0) + (/review|approval|restricted|must|required/i.test(t)?2:0);
  const line = lines.sort((a,b)=>score(b)-score(a))[0] || page.text;
  // One excerpt per document, and no source prose is repeated elsewhere in the guide.
  const words = line.replace(/https?:\/\/\S+/g,'[link]').split(/\s+/).filter(Boolean);
  return words.slice(0,18).join(' ') + (words.length>18?'…':'');
}

export async function researchProvider(value: ResearchInput, emit: (event: ResearchEvent)=>void): Promise<Guide> {
  const input = validateInput(value);
  const abort = new AbortController();
  const deadline = setTimeout(()=>abort.abort(),TOTAL_TIMEOUT);
  const log: ResearchEvent[] = [];
  const report = (title:string,detail:string,status='complete') => { const event={title,detail,status}; log.push(event); emit(event); };
  const read = createReader(abort.signal);
  const pages: Page[] = [];
  const failures: string[] = [];
  const attempted = new Set<string>();
  let seed = input.website || '';
  let inferred = !seed;
  try {
    if (!seed) {
      report('Finding the provider',`Searching for official OAuth documentation for ${input.app}.`,'running');
      const query = `${input.app} OAuth official developer documentation`;
      let candidates: {url:string;label:string}[] = [];
      const searchers = [
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`,
      ];
      for (const searchUrl of searchers) {
        try {
          const res = await read(searchUrl);
          candidates = searchLinks(res.body,res.url);
          const terms = input.app.toLowerCase().replace(/[^a-z0-9 ]/g,'').split(' ').filter(t=>t.length>2);
          candidates = candidates.filter(c=>terms.some(t=>`${new URL(c.url).hostname} ${c.label}`.toLowerCase().includes(t))).sort((a,b)=>linkScore(b)-linkScore(a));
          if (candidates.length) break;
          report('Search needs another route',`${new URL(searchUrl).hostname} returned no usable provider result; trying the next public search source.`,'warning');
        } catch { report('Search source unavailable',`${new URL(searchUrl).hostname} could not be read; trying the next source.`,'warning'); }
      }
      if (!candidates.length) throw new Error('Could not identify this provider confidently. Enter its official website or direct OAuth documentation URL and try again.');
      seed = candidates[0].url;
      report('Provider candidate found',`${new URL(seed).hostname} was inferred from search results. Confirm this is the app you meant.`);
    } else report('Website accepted',`Research will start at ${new URL(seed).hostname}. No account sign-in or app creation is performed.`);
    const trustedRoot = rootDomain(new URL(seed).hostname);
    async function collect(url: string, optional = false): Promise<Page | undefined> {
      if (attempted.has(url) || pages.length >= PAGE_LIMIT) return;
      attempted.add(url);
      report('Reading a public source',`${new URL(url).hostname}${new URL(url).pathname}`,'running');
      try {
        const result = await read(url);
        // Keep content provenance even when a provider legitimately redirects between its own hosts.
        if (rootDomain(new URL(result.url).hostname) !== trustedRoot) throw new Error('Redirect left the selected provider domain. Supply the final official documentation website explicitly.');
        const page = parsePage(result.url,result.body);
        if (page.text.length < 80 || /verify (?:you are|you're) human|checking your browser|enable javascript and cookies|just a moment|access denied/i.test(page.title) || (!pageSignals(page).oauth && page.text.length < 1800 && /couldn.t load the required files|sign in to (?:continue|create)|need to sign in|enable javascript to/i.test(page.text))) throw new Error('This page requires browser verification or has no readable documentation.');
        pages.push(page);
        report('Source read',`${page.title} · ${pageSignals(page).oauth?'OAuth setup evidence found':page.index?'documentation index found':'checking linked documentation'}`);
        return page;
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Could not read this source.';
        failures.push(`${new URL(url).hostname}${new URL(url).pathname}: ${detail}`);
        report(optional?'Optional source unavailable':'Source could not be read',detail,'warning');
      }
    }
    const first = await collect(seed);
    // llms.txt is a provider-published URL index, never treated as instructions for this agent.
    if (pages.length < PAGE_LIMIT && !abort.signal.aborted) {
      await collect(`${new URL(seed).origin}/llms.txt`,true);
    }
    while (pages.length < PAGE_LIMIT && attempted.size < 8 && !abort.signal.aborted) {
      const candidates = pages.flatMap(p=>p.links).filter(l=>rootDomain(new URL(l.url).hostname)===trustedRoot && !attempted.has(l.url) && linkScore(l)>=5).sort((a,b)=>linkScore(b)-linkScore(a));
      const unique = [...new Map(candidates.map(x=>[x.url,x])).values()];
      if (!unique.length) break;
      // Prefer different topics once an OAuth page has been read; approval is a separate question.
      const hasOAuth = pages.some(p=>pageSignals(p).oauth);
      const next = hasOAuth ? unique.find(x=>/review|approval|marketplace|verification/i.test(`${x.url} ${x.label}`)) || unique[0] : unique[0];
      await collect(next.url);
    }
    if (!pages.length) throw new Error(failures[0] || 'No readable public documentation found. Try a direct OAuth documentation URL.');
    report('Assessing the evidence',`Read ${pages.length} provider page${pages.length===1?'':'s'}. Separating documented topics from unresolved requirements.`,'running');
    const dated = new Date().toISOString().slice(0,10);
    const useful = pages.filter(p=>!p.index);
    const relevant = useful.filter(p=>pageSignals(p).oauth || pageSignals(p).registration || pageSignals(p).adminApproval || pageSignals(p).review);
    const oauthPages = useful.filter(p=>pageSignals(p).oauth);
    const reviewPages = useful.filter(p=>pageSignals(p).review);
    const sources: Source[] = pages.map((p,i)=>({id:`live-${i+1}`,title:p.title,url:p.url,retrievedAt:dated,kind:'Live public source',supports:p.index?'Provider-published documentation index.':[
      pageSignals(p).oauth?'OAuth configuration':'',pageSignals(p).registration?'application registration':'',pageSignals(p).redirect?'callback configuration':'',pageSignals(p).scopes?'permissions':'',pageSignals(p).review?'review/distribution topic':'',pageSignals(p).adminApproval?'customer-admin installation policy':''
    ].filter(Boolean).join(', ') || 'Provider context; OAuth support not established by this page.'}));
    const sourceFor = (p:Page) => sources[pages.indexOf(p)].id;
    const evidence = (predicate:(p:Page)=>boolean) => useful.find(predicate);
    const steps: Step[] = [];
    const registration = evidence(p=>pageSignals(p).registration);
    const redirect = evidence(p=>pageSignals(p).redirect);
    const scopes = evidence(p=>pageSignals(p).scopes);
    const oauth = oauthPages[0];
    const adminApproval = evidence(p=>pageSignals(p).adminApproval);
    if (registration) steps.push({title:'Register the provider OAuth app',detail:'Open the linked registration documentation and follow its console instructions. Confirm the account/workspace that should own the app. This source reader has not created an app.',owner:'You · account access',doneWhen:'You can identify the app in the provider console and locate its client configuration.',sourceIds:[sourceFor(registration)],url:registration.url});
    if (redirect) steps.push({title:'Configure the callback for your integration',detail:'Use the provider’s documented callback requirements. Copy the callback URL from your integration runtime or Composio auth configuration, then verify the configured value in the provider console. Do not substitute a guessed callback.',owner:'Agent prepares · you apply',doneWhen:'The provider callback configuration matches the URL your integration will use.',sourceIds:[sourceFor(redirect)],url:redirect.url});
    if (scopes) steps.push({title:'Map your use case to the smallest permissions',detail:`Use the provider’s documented permission/scopes section to map each action${input.useCase?' in your use case':''} to required access. Scope names and approval implications need a developer check; this draft has not selected or granted scopes.`,owner:'Agent can map · you confirm',doneWhen:'Each requested permission has a concrete feature justification.',sourceIds:[sourceFor(scopes)],url:scopes.url});
    if (oauth) steps.push({title:'Run one complete connection test',detail:'Suggested verification: implement the documented authorization flow, authorize a dedicated test account, exercise one intended API action, and verify disconnect/revocation. Keep secrets in your backend or secret manager. This has not been executed by the source reader.',owner:'Agent implements · you authorize',doneWhen:'A test connection completes and the minimum intended action succeeds.',sourceIds:[sourceFor(oauth)],url:oauth.url});
    if (reviewPages[0]) steps.push({title:'Resolve the review and distribution requirements',detail:'A provider page discusses review or distribution. Read the linked criteria for your exact audience, permissions and product type; confirm whether a submission is required. No review decision or turnaround has been verified.',owner:'You · provider decision',doneWhen:'You have confirmed applicable review requirements and recorded the provider’s response or dashboard status.',sourceIds:[sourceFor(reviewPages[0])],url:reviewPages[0].url});
    if (!oauth) steps.push({title:'Confirm provider OAuth support first',detail:'The fetched pages did not establish a developer-owned OAuth application flow. Find a public OAuth registration guide or ask provider support whether third-party customer connections are supported. Do not interpret missing evidence as unsupported OAuth.',owner:'You · provider clarification',doneWhen:'An official source identifies app registration and an OAuth flow for this use case.',sourceIds:sources.filter(s=>!s.url.endsWith('/llms.txt')).map(s=>s.id).slice(0,1),url:seed});
    if (adminApproval) steps.push({title:'Check customer-admin installation policies',detail:'The documentation discusses workspace or organization approval controls. Confirm whether each customer needs an admin to allow installation. This is separate from the provider reviewing your OAuth application.',owner:'Customer workspace admin',doneWhen:'A target customer can authorize installation under their organization policy.',sourceIds:[sourceFor(adminApproval)],url:adminApproval.url});
    if (!reviewPages.length) steps.push({title:'Confirm the production approval path',detail:'No clear app-review requirement was established in this bounded search. Ask the provider or inspect the authenticated app console for distribution rules before committing to a launch date. Missing review evidence does not mean no review.',owner:'You · provider clarification',doneWhen:'Production eligibility and approval requirements are confirmed for your permissions and audience.',sourceIds:[],url:seed});
    const observedScopes = oauthPages.flatMap(p => {
      const found = [...p.text.matchAll(/(?:^|\n)\s*(read|write|admin|offline_access|[a-z][a-zA-Z0-9_-]*:[a-zA-Z0-9_:-]+)\s*(?:[-–—]|:)\s+[^\n]{8,}/g)].map(m=>m[1]);
      return [...new Set(found)].slice(0,4).map(scope=>({scope,category:'Observed identifier',purpose:'Appears in the provider documentation. Confirm the applicable feature and least-privilege choice before requesting it.',sourceIds:[sourceFor(p)]}));
    });
    const uniqueScopes = [...new Map(observedScopes.map(s=>[s.scope,s])).values()];
    const nextAction = !oauth ? 'Confirm whether this provider supports developer-owned OAuth apps for your use case.' : steps[0]?.title + ' using the linked provider documentation.';
    const guide: Guide = {
      id:`draft-${crypto.randomUUID()}`,name:input.app,website:input.website || new URL(seed).origin,category:'Live research',color:'#597452',initials:input.app.slice(0,2).toUpperCase(),
      difficulty:'unknown',difficultyLabel:'Needs verification',headline:oauth?'OAuth-related documentation found. Validate the launch path.':'OAuth support needs confirmation.',
      summary:oauth?'This live source reader found OAuth-related documentation on the selected domain. A supported developer-owned flow is not yet established. Validate registration, permissions and applicability using the linked sources.':'This live search found provider pages but did not establish a developer-owned OAuth setup flow. The guide records what was read and gives a safe next step rather than inventing requirements.',
      scenario:input.useCase || 'Developer-owned OAuth app for users connecting their accounts to an AI agent.',nextAction,
      checkedAt:dated,status:'draft',evidenceLabel:'Live source reader · unreviewed draft',
      effort:'Not estimated',effortBasis:'Public documentation was read; setup was not timed or executed. Scope, account access and implementation details can change the effort.',
      wait:'Not verified',waitBasis:reviewPages.length?'Review/distribution material was found, but this reader has not verified an applicable turnaround for your app.':'No definitive approval path was found in this bounded search. Absence of evidence does not establish zero wait.',
      test:oauth?'OAuth-related material was found. Confirm it describes the app type you need, then follow its testing instructions with a dedicated account. No test connection has been completed.':'Testing is blocked until the provider’s OAuth support and registration path are confirmed.',
      production:'Production readiness is unresolved. Confirm applicable provider review, distribution rules, scope restrictions and customer-admin requirements before launch.',
      caveat:inferred?'Provider identity was inferred from public search results. Confirm the website matches the app you meant. The agent is a deterministic source reader; it does not use an LLM or enter authenticated consoles.':'This agent is a deterministic source reader. It extracts documented topics and a small excerpt from each page; it does not use an LLM, create apps, or enter authenticated consoles.',
      steps,
      blockers:[
        ...(!oauth?[{trigger:'OAuth application support is not established',action:'Provide the direct official OAuth documentation URL or ask the provider whether your intended third-party connection flow is supported.',owner:'You / provider',sourceIds:[]}]:[]),
        {trigger:'Production approval requirements remain unverified',action:'Inspect the provider console or contact provider support with your exact scopes, audience and use case. Record the answer before setting a launch date.',owner:'You / provider',sourceIds:reviewPages.map(sourceFor)},
        ...(adminApproval?[{trigger:'Customer-admin approval may block installation',action:'Ask the target workspace or organization admin to confirm installation policy. This is a customer permission dependency, separate from provider app review.',owner:'Customer admin',sourceIds:[sourceFor(adminApproval)]}]:[]),
        ...(failures.length?[{trigger:'Some documentation could not be read',action:'Open the failed sources manually or rerun with a direct public OAuth documentation URL. Network failures and sign-in pages are not proof of missing support.',owner:'You',sourceIds:[]}]:[])
      ],
      agentCan:['Read linked public provider documentation and identify OAuth configuration topics.','Prepare a permission map, callback implementation and verification checklist once requirements are confirmed.','Draft provider questions and review materials for your approval.'],
      humanMust:['Confirm the selected provider and applicability to your use case.','Sign in to the owning account and authorize app creation or test connections.','Handle credentials in a secret manager; never paste them into this guide.','Confirm policies, submit any required review and respond to the provider.'],
      attempts:[...pages.map(p=>({action:`Fetched public source: ${new URL(p.url).hostname}${new URL(p.url).pathname}`,observation:p.index?'Readable provider documentation index.':pageSignals(p).oauth?'Readable source includes OAuth configuration concepts.':'Readable provider context; no claim of completed setup.',result:'Public source read',notTested:'Authenticated console, app creation, permissions, token exchange, API calls, submission and approval.'})),...failures.slice(0,4).map(f=>({action:'Attempted public source fetch',observation:f,result:'Could not verify'}))],
      scopes:uniqueScopes,corrections:[],uncertainties:[...(inferred?['Provider identity is inferred from search and must be confirmed.']:[]),'This is a maximum-four-page extractive investigation, not exhaustive provider research.','OAuth support evidence may describe only some app types; confirm it applies to this integration.','Exact scope names, account prerequisites and review applicability need human verification.','Active effort, approval wait, paid-plan requirements and provider acceptance are not established.','DNS screening checks public records before fetch; fetch uses the runtime resolver, so this is not DNS pinning.','No setup operation, OAuth connection or provider approval was completed.'],sources,
      findings:relevant.map(p=>({category:pageSignals(p).review?'Review/distribution excerpt':pageSignals(p).adminApproval?'Customer-admin approval excerpt':pageSignals(p).oauth?'OAuth documentation excerpt':'Provider context excerpt',text:`“${excerpt(p)}”`,sourceIds:[sourceFor(p)],confidence:'Exact excerpt · applicability unreviewed'})),
      researchLog:log
    };
    report('Draft ready',`${oauthPages.length?'OAuth setup topics found':'OAuth support unresolved'}; timing and launch readiness remain explicitly unverified.`);
    guide.researchLog=[...log];
    return guide;
  } catch (error) {
    if (abort.signal.aborted) throw new Error('Research reached its time limit. Try again with the provider’s direct public OAuth documentation URL.');
    throw error;
  } finally { clearTimeout(deadline); }
}
