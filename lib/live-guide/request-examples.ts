import type {Document} from './contracts.ts';

// Parse only the single curl command, then quote arguments literally. Never
// execute generated text. Newlines inside JSON/headers stay inside their word.
export function curlArguments(example:string):string[]{
 const text=example.replace(/\\\r?\n/g,' ').replace(/\\ (?=-[A-Za-z])/g,' ');
 if(!/^curl\s/.test(text.trim()))return [];
 const words:string[]=[];let word='',quote='',active=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quote){if(ch===quote)quote='';else if(ch==='\\'&&quote==='"'&&/["\\$`]/.test(text[i+1]||''))word+=text[++i];else word+=ch;active=true;continue;}
  if(ch==='"'||ch==="'"){quote=ch;active=true;continue;}
  if(ch==='\\'&&i+1<text.length){word+=text[++i];active=true;continue;}
  if(/\s/.test(ch)){if(active){words.push(word);word='';active=false;}continue;}
  word+=ch;active=true;
 }
 if(quote)throw new Error('A request example has an unclosed shell quote.');
 if(active)words.push(word);
 if(words.some(w=>/^(?:\||&&|;|>)$/.test(w)))throw new Error('A request example must contain one curl command.');
 return words;
}
export function shellSafeCurl(example:string):string{
 const words=curlArguments(example);if(!words.length)return example;
 return words.map((w,i)=>i===0?w:"'"+w.replace(/'/g,"'\\''")+"'").join(' ');
}
export function requestExampleParts(example:string){
 const args=curlArguments(example),values=(...flags:string[])=>args.flatMap((a,i)=>flags.includes(a)&&args[i+1]?[args[i+1]]:[]);
 const bodies=values('-d','--data','--data-raw','--data-binary','--data-urlencode','--json'),headers=Object.fromEntries(values('-H','--header').map(h=>{const at=h.indexOf(':');return [h.slice(0,at).toLowerCase(),h.slice(at+1).trim()];}));
 if(bodies.length&&!headers['content-type'])headers['content-type']=args.includes('--json')?'application/json':'application/x-www-form-urlencoded';
 return {method:(values('-X','--request')[0]||(bodies.length?'POST':'GET')).toUpperCase(),url:values('--url')[0]||args.find(a=>/^https:\/\//.test(a)||a.startsWith('<INSTANCE_BASE_URL>')||/^<(?:NEXT|CONTINUATION)(?:_PAGE)?_(?:URL|LINK)>$/.test(a))||'',headers,bodies};
}
function paginationState(example:string){
 const parts=requestExampleParts(example);
 const values=new Map<string,string>();
 const add=(name:string,value:unknown)=>{
  const key=name.replace(/[^a-z0-9]/gi,'').toLowerCase();
  if(/^(?:pagesize|perpage|limit|maxresults|maxpagesize)$/.test(key)||value===null||value===undefined||value==='')return;
  if(/cursor|^(?:page|pagenumber|offset|skip|start|after|before|pagetoken|nexttoken|continuationtoken|marker)$/.test(key))values.set(key,String(value));
 };
 try{const url=new URL(parts.url.replace(/^<INSTANCE_BASE_URL>/,'https://instance.invalid'));for(const [name,value] of url.searchParams)add(name,value);}catch{}
 const walk=(body:unknown)=>{if(body&&typeof body==='object')for(const [name,value] of Object.entries(body)){if(typeof value==='string'||typeof value==='number')add(name,value);else walk(value);}};
 let connection='';for(const body of parts.bodies)try{const parsed=JSON.parse(body);walk(parsed);if(typeof parsed.query==='string'){
  // Operation variable declarations are not connection field arguments.
  const query=parsed.query.replace(/^\s*(?:query|mutation|subscription)\b\s*(?:[A-Za-z_]\w*\s*)?(?:\([^)]*\))?\s*/,'');
  connection=query.match(/\b(\w+)\s*\([^)]*\b(?:after|before|first|last)\s*:/)?.[1]||query.match(/\{\s*(\w+)\s*(?:\([^)]*\))?\s*\{/)?.[1]||'';
  for(const match of query.matchAll(/\b(after|before)\s*:\s*("[^"\s]+"|\$([a-zA-Z_][\w]*))/g))add(match[1],match[3]?parsed.variables?.[match[3]]:match[2].slice(1,-1));
 }}catch{}
 return {values,nextUrl:/^<(?:NEXT|CONTINUATION)(?:_PAGE)?_(?:URL|LINK)>$/.test(parts.url),connection};
}
export function hasContinuationRequest(example:string):boolean{const state=paginationState(example);return state.nextUrl||state.values.size>0;}
export function hasPaginationPair(steps:{actionIds?:string[];request?:{endpoint:string;example:string}}[]):boolean{
 const rows=steps.filter(step=>step.request?.endpoint).map(step=>{const state=paginationState(step.request!.example);let path='';try{path=new URL(step.request!.endpoint,'https://instance.invalid').pathname.replace(/\{[^}]+\}|<[^>]+>|:[a-zA-Z_][\w-]*/g,'{input}').replace(/\/(?:continue|next)\/?$/,'').replace(/\/$/,'');}catch{}return {step,state,key:path+'#'+state.connection};});
 return rows.some((next,index)=>rows.some((first,prior)=>{
  if(index===prior||next.key!==first.key||first.state.nextUrl||next.step.actionIds?.length&&first.step.actionIds?.length&&!next.step.actionIds.some(id=>first.step.actionIds!.includes(id)))return false;
  if(next.state.nextUrl)return true;
  return [...next.state.values].some(([key,value])=>{const before=first.state.values.get(key);if(before===undefined)return true;return /^(?:page|pagenumber|offset|skip|start)$/.test(key)&&/^\d+$/.test(value)&&/^\d+$/.test(before)&&Number(value)>Number(before);});
 }));
}
export function completeRequestExamples<T extends {steps?:unknown}>(raw:T,documents:Document[]):T{
 const result=structuredClone(raw);
 if(!Array.isArray(result.steps))return result;
 const source=documents.map(d=>d.text).join('\n');
 for(const step of result.steps){
  if(step?.request?.endpoint){
   // A consent GET already declares its full URL and parameters. Serializing
   // that metadata as curl adds no endpoint, parameter or provider fact.
   if(step.testKind==='authorization'&&step.request.method?.toUpperCase()==='GET'&&!step.request.example?.trim()){
    const endpoint=String(step.request.endpoint);step.request.example='curl '+JSON.stringify(endpoint.startsWith('/')?'<INSTANCE_BASE_URL>'+endpoint:endpoint);
   }
   // Metadata is a route template; the executable curl retains the instance
   // input. Normalizing that representation does not establish the route.
   step.request.endpoint=String(step.request.endpoint).replace(/^<INSTANCE_BASE_URL>(?=\/)/,'');
   // Source examples contain representative IDs. Use an actual documented
   // route template to locate inputs, leaving every constant segment intact.
   const endpoint=String(step.request.endpoint),path=endpoint.replace(/^https:\/\/[^/]+/,'').split('?')[0],segments=path.split('/').filter(Boolean);
   const variable=(s:string)=>s.match(/^\{([\w-]+)\}$|^:([\w-]+)$|^<([\w-]+)>$/)?.slice(1).find(Boolean);
   const templates=[...source.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s?`"'<>]+)/gi)].filter(m=>m[1].toUpperCase()===step.request.method?.toUpperCase()).map(m=>m[2].replace(/\/$/,'').split('/').filter(Boolean)).filter(parts=>parts.some(variable)&&parts.length<=segments.length&&parts.every((part,i)=>variable(part)||part===segments[i+segments.length-parts.length])).sort((a,b)=>b.length-a.length);
   if(templates[0]){const template=templates[0],shift=segments.length-template.length;for(const [i,part] of template.entries()){const key=variable(part);if(key)segments[i+shift]='{'+key+'}';}step.request.endpoint=endpoint.replace(path,'/'+segments.join('/'));}
  }
  if(!step?.request?.example)continue;
  let example=String(step.request.example).replace(/\$\{([A-Z][A-Z0-9_]*)\}|\$([A-Z][A-Z0-9_]*)/g,(_whole,a,b)=>'<'+(a||b)+'>');
  let instanceInput=false;
  example=example.replace(/(^|[\s'"])(?:<([^>]+)>|\[([^\]]+)\]|\{([^}]+)\}|([A-Z][A-Z0-9_]*))(?=\/)/g,(whole,prefix,...groups)=>{const key=groups.slice(0,4).find(Boolean)||'';if(!/instance|base.*url|url.*base|(?:^|_)host(?:$|_)/i.test(key))return whole;instanceInput=true;return prefix+'<INSTANCE_BASE_URL>';});
  example=example.replace(/https:\/\/((?:<[^>]+>|\[[^\]]+\]|\{[^}]+\}|[^/\s'"])+)/g,(whole,authority)=>{
   if(!/[<\[{]/.test(authority)&&!(/^[A-Z][A-Z0-9_.-]+$/.test(authority)&&/[A-Z]{3}/.test(authority)))return whole;
   instanceInput=true;return '<INSTANCE_BASE_URL>';
  });
  const reservedHost=(host:string)=>/(?:^|\.)(?:example\.(?:com|net|org)|example|invalid|test)$/.test(host);
  const target=requestExampleParts(example).url;
  if(target.startsWith('https://')){
   const url=new URL(target);
   if(reservedHost(url.hostname)&&source.includes(url.origin)){example=example.replace(target,'<INSTANCE_BASE_URL>'+url.pathname+url.search);instanceInput=true;}
  }
  if(String(step.request.endpoint||'').startsWith('https://')){
   const url=new URL(step.request.endpoint);
   if(reservedHost(url.hostname)&&source.includes(url.origin))step.request.endpoint=url.pathname+url.search;
  }
  if(instanceInput){
   const caption='INSTANCE_BASE_URL: your full HTTPS instance URL, without a trailing slash';
   const at=(step.fields||[]).findIndex((f:string)=>/instance|\bhost\b|_HOST|base.?url/i.test(f));
   step.fields=step.fields||[];if(at>=0)step.fields[at]=caption;else if(step.fields.length<8)step.fields.push(caption);
  }
  if(/<(?:NEXT|CONTINUATION)(?:_PAGE)?_(?:URL|LINK)>/.test(example)){step.fields=step.fields||[];if(step.fields.length<8&&!step.fields.some((f:string)=>/next.+(?:url|link)|(?:url|link).+next/i.test(f)))step.fields.push('Next-page URL: full next link from the prior response; keep the original HTTPS host');}
  // Normalize values only at the route variables declared by endpoint metadata.
  // A real sample ID and PAGE_ID are both developer inputs, not new API paths.
  const template=String(step.request.endpoint||'').split('?')[0].replace(/^https:\/\/[^/]+/,'').split('/').filter(Boolean);
  const parts=requestExampleParts(example);
  if(/^https:\/\/|^<INSTANCE_BASE_URL>\//.test(parts.url)){let path=parts.url.replace(/^https:\/\/[^/]+|^<INSTANCE_BASE_URL>/,'').split('?')[0];const segments=path.split('/').filter(Boolean),shift=segments.length-template.length;
   if(shift>=0){let changed=false;for(const [i,segment] of template.entries())if(/^\{[^}]+\}$|^:[\w-]+$|^<[^>]+>$/.test(segment)){const at=i+shift,key=segment.replace(/^[{<:]|[}>]$/g,'');if(segments[at]&&!/^<[^>]+>$/.test(segments[at])){segments[at]='<'+key+'>';changed=true;}}
    const normalized='/'+segments.join('/')+(path.endsWith('/')?'/':'');if(changed&&normalized!==path)example=example.replace(parts.url,parts.url.replace(path,normalized));
   }
  }
  // Documentation-derived version headers are facts, not developer inputs.
  example=example.replace(/([\w-]+-Version):\s*(<[^>]+>|[A-Z][A-Z_]+|\d{4}-\d{2}-\d{2})/gi,(whole,header,current)=>{
   const literal=[...source.matchAll(new RegExp(header+':?\\s*["\'`]?\\s*(\\d{4}-\\d{2}-\\d{2})','gi'))].map(m=>m[1]).sort().at(-1);
   if(!literal){if(!/^\d{4}-\d{2}-\d{2}$/.test(current))throw new Error('A required request version is not established by the supplied sources.');return whole;}
   return header+': '+literal;
  });
  step.request.example=shellSafeCurl(example);
  step.fields=step.fields||[];
  if(step.fields.length<8&&/Bearer\s+(?:<[^>]+>|[A-Z][A-Z_]+)/.test(example)&&!step.fields.some((s:string)=>/token/i.test(s)))step.fields.push('Access token: backend OAuth exchange for the test account; keep it out of this guide');
  for(const match of String(step.request.endpoint||'').matchAll(/\{([\w]{1,45})\}/g))if(step.fields.length<8&&!step.fields.some((s:string)=>new RegExp('(?:^|[^a-zA-Z0-9_])'+match[1]+'(?:[^a-zA-Z0-9_]|$)','i').test(s)))step.fields.push(match[1]+': test resource ID from provider UI/list response');
 }
 return result;
}
