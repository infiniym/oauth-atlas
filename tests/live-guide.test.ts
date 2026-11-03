import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput, onProvider, publicUrl } from '../lib/live-guide/contracts.ts';
import type { Bindings, Document, Interpretation, StoredRun, LiveGuide,Progress } from '../lib/live-guide/contracts.ts';
import { retrieve, publicReader, boundedText,linkScore,actionLinkScore,parsePage } from '../lib/live-guide/retrieval.ts';
import { evidenceOnly, interpretEvidence, validateInterpretation, sourcePassages, contextPassages,expandPassageReferences } from '../lib/live-guide/interpretation.ts';
import { generate, integrationContext } from '../lib/live-guide/workflow.ts';
import { getGuide, postGuide } from '../lib/live-guide/http.ts';
import type { Store } from '../lib/live-guide/http.ts';
import { readGuideStream } from '../lib/live-guide/stream.ts';
import { markdown } from '../lib/live-guide/export.ts';

const base='https://task.example.com/';
const sourceText='Create an OAuth application in your workspace settings. Configure the client ID and redirect URI for the authorization code flow.\nThe issues:read scope allows reading issues in the connected workspace.\nThe comments:create scope allows creating new comments on issues.\nThe issues:write scope allows modifying existing issues.\nSubmit public marketplace listings for application review before listing.\nThe marketplace review typically takes 10 business days after submission.\nOrganization admins can approve application installation for members.';
const docs:Document[]=[{id:'s1',url:base+'docs/oauth',title:'Task OAuth',retrievedAt:'2026-10-30T00:00:00Z',hash:'abc',text:sourceText}];
const quote='Create an OAuth application in your workspace settings.';
function plan():Interpretation{return {
  accessModel:'oauth',requestedActions:[],prohibitions:[],oauthSupport:'documented',summary:'Task documents a developer-owned OAuth application flow.',recommendation:'Register a test app and request only the permissions for your chosen actions.',nextAction:'Open the OAuth application settings and register a test application.',
  findings:[{kind:'oauth',scope:'',title:'Developer app registration',detail:'Register an OAuth application in workspace settings.',appliesWhen:'Connecting customer workspaces through your own app.',evidence:[{sourceId:'s1',quote}]},{kind:'permission',scope:'comments:create',title:'Create comments',detail:'Use comments:create to post comments.',appliesWhen:'The agent posts issue comments.',evidence:[{sourceId:'s1',quote:'The comments:create scope allows creating new comments on issues.'}]}],
  blockers:[],coverage:[],researchNeeded:[],steps:[{stage:'prepare',destination:'',fields:[],title:'Register a test app',detail:'Create the app in workspace settings.',owner:'developer',doneWhen:'The app appears in workspace settings.',evidence:[{sourceId:'s1',quote}]}],questions:[],activeEffort:{range:'1–3 hours',assumptions:'A developer already has workspace access and an existing callback implementation.'},unknowns:['Customer administrator installation policy needs checking.'],
};}
const ai:Bindings={LIVE_GUIDE_ANTHROPIC_KEY:'test-secret',LIVE_GUIDE_ANTHROPIC_MODEL:'test-model'};
type Context = {documents:{passages:{id:string;text:string;citable:boolean}[]}[]};
function wirePlan(value:unknown,context:Context):unknown{
  const p=structuredClone(value) as Interpretation;
  if(Array.isArray(p.findings)&&Array.isArray(p.steps))for(const item of [...p.findings,...p.steps]){
    (item as unknown as {evidence:{passageId:string}[]}).evidence=item.evidence.map(e=>({passageId:context.documents.flatMap(d=>d.passages).find(p=>p.citable&&p.text.includes(e.quote))?.id||'unknown-passage'}));
  }
  return p;
}
function network(options:{model?:unknown;stop?:string;address?:string;html?:string;modelStatus?:number;firecrawl?:boolean}={}){
  const calls:{url:string;init?:RequestInit}[]=[];
  const fetcher:typeof fetch=async(value,init)=>{
    const url=typeof value==='string'?value:value instanceof URL?value.href:value.url;calls.push({url,init});
    // Cloudflare's edge runtime supports follow/manual but rejects redirect:error.
    assert.notEqual(init?.redirect,'error','Use edge-compatible manual redirects and reject non-2xx API responses.');
    if(init?.signal?.aborted)throw new DOMException('Aborted','AbortError');
    if(url.startsWith('https://cloudflare-dns.com/'))return Response.json({Answer:new URL(url).searchParams.get('type')==='A'?[{type:1,data:options.address||'104.18.40.45'}]:[]});
    if(url==='https://api.anthropic.com/v1/messages'){
      if(options.modelStatus)return new Response('secret upstream failure',{status:options.modelStatus});
      const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);
      const model=wirePlan(options.model||plan(),context);
      return Response.json({type:'message',stop_reason:options.stop||'end_turn',content:[{type:'text',text:JSON.stringify(model)}]});
    }
    if(url==='https://api.firecrawl.dev/v2/search')return Response.json({success:true,data:{web:[{url:base+'docs/oauth',title:'Task OAuth'}]}});
    if(url==='https://api.firecrawl.dev/v2/scrape')return Response.json({success:true,data:{markdown:sourceText,links:[],metadata:{title:'Task OAuth',sourceURL:JSON.parse(String(init?.body)).url}}});
    if(url===base)return new Response(options.html||'<title>Task</title><p>Task offers workspace issue management and a public developer platform for integrations.</p><a href="/docs/oauth">OAuth</a><a href="/docs/review">App review</a>',{headers:{'content-type':'text/html'}});
    if(url===base+'llms.txt')return new Response('# Task\n[OAuth](https://task.example.com/docs/oauth)\n[Review](https://task.example.com/docs/review)',{headers:{'content-type':'text/plain'}});
    if(url===base+'docs/oauth'||url===base+'docs/review')return new Response('<title>Task OAuth</title><main>'+sourceText.split('\n').map(s=>'<p>'+s+'</p>').join('')+'</main>',{headers:{'content-type':'text/html'}});
    return new Response('not found',{status:404});
  };
  return {fetcher,calls};
}
function store(initial?:StoredRun){
  const rows=new Map<string,StoredRun>(initial?[[initial.guide.id,initial]]:[]);let count=0;
  const db:Store={prepare(sql){return{bind(...args){return{
    async first<T>(){if(sql.startsWith('INSERT INTO live_guide_limits'))return {count:++count} as T;const value=rows.get(String(args[0]));return value?{payload:JSON.stringify(value)} as T:null;},
    async run(){rows.set(String(args[0]),JSON.parse(String(args[1])));return {};},
  };}};}};
  return {db,rows};
}
const request=(body:unknown,headers:Record<string,string>={})=>new Request('https://atlas.example.com/api/live-guide',{method:'POST',headers:{origin:'https://atlas.example.com','Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('normalizes URL-only requests and keeps the live-guide input contract isolated',()=>{
  const input=normalizeInput({app:base});assert.equal(input.website,base);assert.equal(input.app,'task.example.com');assert.equal(input.audience,'unknown');
  assert.throws(()=>normalizeInput({app:'Task',secret:'bad'}));assert.throws(()=>normalizeInput({app:'Task',useCase:'<script>x</script>'}));assert.throws(()=>normalizeInput({app:'Task',answers:Object.fromEntries(Array.from({length:25},(_,i)=>[i,'yes']))}));
});
test('rejects local addresses, secret URLs, unsafe schemes and ports',()=>{
  for(const value of ['http://example.com','https://localhost','https://10.0.0.1','https://2130706433','https://[::1]','https://foo.internal','https://user:pass@example.com','https://example.com:8000','https://example.com?access_token=secret','https://example.com?api-key=secret'])assert.throws(()=>publicUrl(value),value);
  assert.equal(onProvider('https://docs.task.example.com/oauth',base),true);assert.equal(onProvider('https://task.example.com.attacker.com',base),false);
});
test('retrieves substantive pages, follows documentation indexes and records source fingerprints',async()=>{
  const net=network(),events:unknown[]=[];const result=await retrieve(normalizeInput({app:'Task',website:base}),{},e=>events.push(e),new AbortController().signal,net.fetcher);
  assert.equal(result.inferred,false);assert.equal(result.documents.length,3);assert.ok(!result.documents.some(d=>d.url.endsWith('llms.txt')));assert.ok(result.documents.every(d=>/^[a-f0-9]{64}$/.test(d.hash)));assert.ok(events.length>3);
});
test('blocks private DNS results before contacting the submitted provider',async()=>{
  const net=network({address:'10.0.0.5'});await assert.rejects(()=>retrieve(normalizeInput({app:'Task',website:base}),{},()=>{},new AbortController().signal,net.fetcher),/No readable/);assert.ok(net.calls.every(c=>c.url.startsWith('https://cloudflare-dns.com/')));
});
test('checks redirects before contacting an off-provider domain',async()=>{
  const net=network();const fetcher:typeof fetch=(value,init)=>String(value)===base?Promise.resolve(new Response('',{status:302,headers:{location:'https://attacker.example.net'}})):net.fetcher(value,init);
  await assert.rejects(()=>publicReader(fetcher,new AbortController().signal).read(base,base),/selected provider/);assert.ok(!net.calls.some(c=>c.url.includes('attacker')));
});
test('caps source response size',async()=>{await assert.rejects(()=>boundedText(new Response('x'.repeat(1_500_001)),new AbortController().signal),/too large/);});
test('unfindable name-only input asks for a website instead of inventing a domain',async()=>{
  const net=network();await assert.rejects(()=>retrieve(normalizeInput({app:'Unfindable'}),{},()=>{},new AbortController().signal,net.fetcher),/official website/);
});
test('Firecrawl discovery uses nested web results and selective markdown scraping',async()=>{
  const net=network();const r=await retrieve(normalizeInput({app:'Task'}),{LIVE_GUIDE_FIRECRAWL_KEY:'fc-test'},()=>{},new AbortController().signal,net.fetcher);
  assert.equal(r.inferred,true);assert.ok(r.documents.length>0);const search=net.calls.find(c=>c.url.endsWith('/search'))!;assert.equal(JSON.parse(String(search.init?.body)).limit,4);assert.equal((search.init?.headers as Record<string,string>).Authorization,'Bearer fc-test');
  assert.deepEqual(JSON.parse(String(net.calls.find(c=>c.url.endsWith('/scrape'))!.init?.body)).formats,['markdown','links']);
});
test('edge adapters reject API redirects without following them',async()=>{
  const net=network();
  const fetcher:typeof fetch=async(url,init)=>{
    if(String(url)==='https://api.anthropic.com/v1/messages'){assert.equal(init?.redirect,'manual');return new Response('',{status:307,headers:{location:'https://attacker.example.net'}});}
    return net.fetcher(url,init);
  };
  const result=await interpretEvidence(normalizeInput({app:'Task'}),docs,ai,new AbortController().signal,fetcher);
  assert.equal(result.mode,'evidence-only');assert.ok(!net.calls.some(c=>c.url.includes('attacker')));
});
test('validates supported OAuth, source references and exact permission identifiers',()=>{
  assert.equal(validateInterpretation(plan(),docs).oauthSupport,'documented');
  const bad=plan();bad.findings[0].evidence[0].sourceId='invented';assert.throws(()=>validateInterpretation(bad,docs));
  const scope=plan();scope.findings[1].scope='issues:admin';assert.throws(()=>validateInterpretation(scope,docs),/permission/);
  const fake=plan();fake.findings[0].evidence[0].quote='Approval is never required for this app.';assert.throws(()=>validateInterpretation(fake,docs),/citation/);
});
test('numbered passages preserve source text and the server supplies exact quotations',()=>{
  const passages=sourcePassages(docs);assert.equal(new Set(passages.map(p=>p.id)).size,passages.length);
  for(const passage of passages.filter(p=>p.citable)){assert.ok(sourceText.replace(/\s+/g,' ').includes(passage.text));assert.ok(passage.text.split(' ').length<=30);}
  const p=wirePlan(plan(),{documents:[{passages}]});const expanded=expandPassageReferences(p,passages);
  assert.equal(validateInterpretation(expanded,docs).findings[1].scope,'comments:create');
  assert.throws(()=>expandPassageReferences({findings:[{evidence:[{passageId:'invented'}]}]},passages),/unknown/);
  assert.throws(()=>expandPassageReferences({findings:[{evidence:[{passageId:passages[0].id,quote:'injected quote'}]}]},passages),/one supplied/);
});
test('requires evidence for provider turnaround and estimate assumptions',()=>{
  const p=plan();p.findings.push({kind:'provider-wait',scope:'',title:'Review wait',detail:'10 business days for marketplace review.',appliesWhen:'Submitting a marketplace listing.',evidence:[{sourceId:'s1',quote:'The marketplace review typically takes 10 business days after submission.'}]});assert.ok(validateInterpretation(p,docs));
  p.findings.at(-1)!.evidence[0].quote=quote;assert.throws(()=>validateInterpretation(p,docs),/published duration/);
  const estimate=plan();estimate.activeEffort.assumptions='';assert.throws(()=>validateInterpretation(estimate,docs),/assumptions/);
});
test('a matching quote cannot justify a contradictory turnaround or guaranteed approval',()=>{
  const p=plan();p.findings.push({kind:'provider-wait',scope:'',title:'Review wait',detail:'Approval is guaranteed within 24 hours.',appliesWhen:'Submitting a marketplace listing.',evidence:[{sourceId:'s1',quote:'The marketplace review typically takes 10 business days after submission.'}]});
  assert.throws(()=>validateInterpretation(p,docs),/does not match/);
  p.findings.at(-1)!.detail='Approval is guaranteed in 10 business days.';assert.throws(()=>validateInterpretation(p,docs),/guaranteed approval/);
  p.findings.at(-1)!.detail='The published estimate is ten business days for marketplace review.';assert.ok(validateInterpretation(p,docs));
});
test('unknown OAuth cannot produce a registration sequence',()=>{const p=plan();p.oauthSupport='unknown';assert.throws(()=>validateInterpretation(p,docs),/setup steps/);});
test('missing AI credentials yields honest findings without scope selection or invented timing',async()=>{
  const result=await interpretEvidence(normalizeInput({app:'Task'}),docs,{},new AbortController().signal,network().fetcher);
  assert.equal(result.mode,'evidence-only');assert.equal(result.value.oauthSupport,'unknown');assert.equal(result.value.steps.length,0);assert.equal(result.value.activeEffort.range,'');assert.ok(result.value.findings.every(f=>!f.scope));
});
test('evidence fallback preserves a local OAuth limitation without applying it to every provider product',()=>{
  const denied=[{...docs[0],text:'Our worker service does not support OAuth applications. Use API tokens for workers.'}];assert.equal(evidenceOnly(denied).oauthSupport,'unknown');assert.ok(evidenceOnly(denied).findings.some(f=>f.title.includes('limits OAuth')));assert.equal(evidenceOnly([{...docs[0],text:'Welcome to the developer platform.'}]).oauthSupport,'unknown');
});
test('model adapter supplies request context, structured schema and saved source text',async()=>{
  const net=network();const result=await interpretEvidence(normalizeInput({app:'Task',useCase:'Post comments',audience:'customers'}),docs,ai,new AbortController().signal,net.fetcher);
  assert.equal(result.mode,'interpreted');const call=net.calls[0];const body=JSON.parse(String(call.init?.body));assert.equal(body.model,'test-model');assert.deepEqual(body.thinking,{type:'adaptive'});assert.equal(body.output_config.effort,'medium');assert.equal(body.max_tokens,4096);assert.equal(body.output_config.format.type,'json_schema');const context=JSON.parse(body.messages[0].content);assert.equal(context.request.useCase,'Post comments');assert.ok(context.documents[0].passages.some((p:{text:string})=>p.text.includes('client ID')));assert.equal(body.system.includes('untrusted data'),true);
});
test('adaptive thinking blocks are accepted while only final text becomes the guide',async()=>{
  const net=network();
  const fetcher:typeof fetch=async(url,init)=>{
    const response=await net.fetcher(url,init);
    if(String(url)!=='https://api.anthropic.com/v1/messages')return response;
    const body=await response.json() as {content:unknown[]};
    return Response.json({...body,usage:{input_tokens:200,output_tokens:130,output_tokens_details:{thinking_tokens:80}},content:[{type:'thinking',thinking:'Private model analysis',signature:'signed-block'},{type:'redacted_thinking',data:'opaque'},...body.content]});
  };
  const run=await generate({app:'Task',website:base},ai,()=>{},new AbortController().signal,fetcher);
  assert.equal(run.guide.mode,'interpreted');assert.equal(run.guide.engine?.thinking,'adaptive');assert.equal(run.guide.engine?.effort,'medium');assert.equal(run.guide.engine?.thinkingTokens,80);
  assert.ok(!JSON.stringify(run).includes('Private model analysis'));assert.ok(!JSON.stringify(run).includes('signed-block'));assert.ok(!JSON.stringify(run).includes('opaque'));
});
test('changed use cases reach the model independently and update selected permissions',async()=>{
  const net=network();const fetcher:typeof fetch=async(value,init)=>{if(String(value)==='https://api.anthropic.com/v1/messages'){const payload=JSON.parse(JSON.parse(String(init?.body)).messages[0].content),p=plan();if(payload.request.useCase==='Modify issues'){p.findings[1].scope='issues:write';p.findings[1].evidence[0].quote='The issues:write scope allows modifying existing issues.';}return Response.json({type:'message',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(wirePlan(p,payload))}]});}return net.fetcher(value,init);};
  const a=await interpretEvidence(normalizeInput({app:'Task',useCase:'Post comments'}),docs,ai,new AbortController().signal,fetcher),b=await interpretEvidence(normalizeInput({app:'Task',useCase:'Modify issues'}),docs,ai,new AbortController().signal,fetcher);assert.equal(a.value.findings[1].scope,'comments:create');assert.equal(b.value.findings[1].scope,'issues:write');
});
test('refusal, truncation, malformed output, fabricated evidence and upstream failures preserve findings',async()=>{
  for(const options of [{stop:'max_tokens'},{stop:'refusal'},{model:{bad:'shape'}},{modelStatus:401}]){const result=await interpretEvidence(normalizeInput({app:'Task'}),docs,ai,new AbortController().signal,network(options).fetcher);assert.equal(result.mode,'evidence-only');assert.ok(!result.notice.includes('test-secret'));}
  const fake=plan();fake.steps[0].evidence[0].quote='Create a secret app with no review needed.';assert.equal((await interpretEvidence(normalizeInput({app:'Task'}),docs,ai,new AbortController().signal,network({model:fake}).fetcher)).mode,'evidence-only');
});
test('one bounded repair retains source context and model while fixing invalid evidence',async()=>{
  const net=network();let attempts=0;const payloads:Record<string,any>[]=[];
  const fetcher:typeof fetch=async(url,init)=>{
    if(String(url)==='https://api.anthropic.com/v1/messages'){
      attempts++;payloads.push(JSON.parse(String(init?.body)));const p=plan();
      if(attempts===1)p.findings[0].evidence[0].quote='This invented source passage cannot be found.';
      return Response.json({type:'message',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:50},content:[{type:'thinking',thinking:'Private analysis',signature:'unchanged-signature'},{type:'text',text:JSON.stringify(wirePlan(p,JSON.parse(payloads.at(-1)!.messages[0].content)))}]});
    }return net.fetcher(url,init);
  };
  const result=await interpretEvidence(normalizeInput({app:'Task'}),docs,ai,new AbortController().signal,fetcher);
  assert.equal(result.mode,'interpreted');assert.equal(result.telemetry.attempts,2);assert.equal(result.telemetry.inputTokens,200);assert.equal(result.telemetry.outputTokens,100);
  assert.equal(payloads[1].model,payloads[0].model);assert.equal(payloads[1].messages.length,3);assert.equal(payloads[1].messages[0].content,payloads[0].messages[0].content);assert.match(payloads[1].messages[2].content,/Repair the complete JSON once/);assert.ok(!JSON.stringify(payloads).includes('test-secret'));
  assert.deepEqual(payloads[1].messages[1].content[0],{type:'thinking',thinking:'Private analysis',signature:'unchanged-signature'});assert.deepEqual(payloads[1].thinking,{type:'adaptive'});
});
test('validation repair stops after two attempts and service errors do not trigger repair',async()=>{
  const p=plan();p.findings[0].evidence[0].quote='This unsupported quotation is never present.';
  const rejected=await interpretEvidence(normalizeInput({app:'Task'}),docs,ai,new AbortController().signal,network({model:p}).fetcher);
  assert.equal(rejected.mode,'evidence-only');assert.equal(rejected.telemetry.attempts,2);assert.equal(rejected.telemetry.outcome,'validation-rejected');assert.equal(rejected.value.steps.length,0);
  const failed=await interpretEvidence(normalizeInput({app:'Task'}),docs,ai,new AbortController().signal,network({modelStatus:401}).fetcher);
  assert.equal(failed.telemetry.attempts,1);assert.equal(failed.telemetry.outcome,'upstream-error');
});
test('questions suppress firm setup steps until answers arrive; refinement reuses saved evidence',async()=>{
  const p=plan();p.questions=[{id:'identity',prompt:'Who should comments appear from?',why:'This changes the app installation model.',options:['The connected person','The app']}];const net=network({model:p});
  const first=await generate({app:'Task',website:base,useCase:'Post comments'},ai,()=>{},new AbortController().signal,net.fetcher);
  assert.equal(first.guide.status,'needs-input');assert.equal(first.guide.steps.length,0);assert.equal(first.guide.activeEffort.range,'');
  assert.match(first.guide.summary,/Confirm the setup choices/);assert.equal(first.guide.engine?.model,'test-model');assert.equal(first.guide.engine?.promptVersion,'live-guide.25');
  const later=network();const refined=await generate({...first.guide.input,previousId:first.guide.id,answers:{identity:'The app'}},ai,()=>{},new AbortController().signal,later.fetcher,first);
  assert.notEqual(refined.guide.id,first.guide.id);assert.equal(refined.guide.previousId,first.guide.id);assert.equal(refined.guide.steps.length,1);assert.ok(later.calls.every(c=>c.url.includes('anthropic')));assert.deepEqual(refined.documents,first.documents);
  const context=JSON.parse(JSON.parse(String(later.calls[0].init?.body)).messages[0].content);
  assert.equal(context.requestContext.confirmedChoices[0].question,'Who should comments appear from?');assert.equal(context.requestContext.confirmedChoices[0].answer,'The app');
  assert.equal(refined.guide.decisions?.[0].answer,'The app');
});
test('refinement rejects changed requests, unknown answers and missing parents',async()=>{
  const first=await generate({app:'Task',website:base},ai,()=>{},new AbortController().signal,network().fetcher);
  await assert.rejects(()=>generate({...first.guide.input,useCase:'Different',previousId:first.guide.id},ai,()=>{},new AbortController().signal,network().fetcher,first),/request changed/);
  await assert.rejects(()=>generate({...first.guide.input,answers:{unknown:'yes'},previousId:first.guide.id},ai,()=>{},new AbortController().signal,network().fetcher,first),/Choose an answer/);
  await assert.rejects(()=>generate({...first.guide.input,previousId:first.guide.id},ai,()=>{},new AbortController().signal,network().fetcher),/previous guide/);
});
test('provider-inferred results require identity confirmation and never claim managed OAuth',async()=>{
  const net=network();const run=await generate({app:'Task'}, {...ai,LIVE_GUIDE_FIRECRAWL_KEY:'fc-test'},()=>{},new AbortController().signal,net.fetcher);
  assert.equal(run.guide.provider.identity,'inferred');assert.ok(run.guide.questions.some(q=>q.id==='provider-identity'));assert.equal(run.guide.steps.length,0);assert.ok(!run.guide.integration.docsUrl);
});
test('catalog presence does not imply auth method, managed availability or action support',()=>{assert.match(integrationContext('Linear').message,/still need checking/);assert.match(integrationContext('Unknown Task Example').message,/does not establish/);});
test('POST streams a saved guide; public GET omits internal source snapshots',async()=>{
  const memory=store();const response=await postGuide(request({app:'Task',website:base,useCase:'Post comments'}),{DB:memory.db,...ai},network().fetcher);
  const guide=await readGuideStream(response,()=>{},new AbortController().signal);assert.equal(memory.rows.size,1);assert.equal(guide.mode,'interpreted');
  const read=await getGuide(guide.id,{DB:memory.db});const body=await read.json() as {guide:LiveGuide;documents?:unknown};assert.equal(body.guide.id,guide.id);assert.equal(body.documents,undefined);assert.equal('text' in body.guide.sources[0],false);assert.equal(JSON.stringify(body).includes('test-secret'),false);
});
test('API rejects cross-origin, oversized, unsafe and malformed requests before research',async()=>{
  const memory=store(),net=network();assert.equal((await postGuide(request({app:'Task'},{origin:'https://attacker.com'}),{DB:memory.db},net.fetcher)).status,403);
  assert.equal((await postGuide(request({app:'x'.repeat(6100)}),{DB:memory.db},net.fetcher)).status,413);
  assert.equal((await postGuide(request({app:'Task',website:'https://127.0.0.1'}),{DB:memory.db},net.fetcher)).status,400);
  assert.equal((await postGuide(request({app:'Task'},{'Content-Type':'text/plain'}),{DB:memory.db},net.fetcher)).status,415);assert.equal(net.calls.length,0);
});
test('API rate limits independently and handles storage failures without leaking details',async()=>{
  const memory=store(),net=network();for(let i=0;i<12;i++){const res=await postGuide(request({app:'Unfindable'}),{DB:memory.db},net.fetcher);await res.text();}const limited=await postGuide(request({app:'Task'}),{DB:memory.db},net.fetcher);assert.equal(limited.status,429);assert.ok(limited.headers.get('Retry-After'));
  const broken:Store={prepare(){throw new Error('database password secret');}};const failed=await postGuide(request({app:'Task'}),{DB:broken});assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('password'));assert.equal((await getGuide('wrong',{DB:memory.db})).status,404);
});
test('stream parser handles split UTF-8, trailing data and premature completion',async()=>{
  const run=await generate({app:'Task',website:base}, {},()=>{},new AbortController().signal,network().fetcher);run.guide.summary='A café guide';const bytes=new TextEncoder().encode(JSON.stringify({type:'complete',guide:run.guide}));
  const response=new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}));assert.equal((await readGuideStream(response,()=>{},new AbortController().signal)).summary,'A café guide');
  await assert.rejects(()=>readGuideStream(new Response('{"type":"progress","event":{}}\n'),()=>{},new AbortController().signal),/before a guide was saved/);
});
test('cancellation propagates into retrieval and prevents saving',async()=>{
  const memory=store();let cancelled=false;
  const fetcher:typeof fetch=async(_url,init)=>new Promise((_resolve,reject)=>{const stop=()=>{cancelled=true;reject(new DOMException('Aborted','AbortError'));};if(init?.signal?.aborted)stop();else init?.signal?.addEventListener('abort',stop,{once:true});});
  const res=await postGuide(request({app:'Task',website:base}),{DB:memory.db},fetcher);await res.body!.cancel();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(memory.rows.size,0);assert.equal(cancelled,true);
});
test('Markdown includes request context, unchecked steps, provenance and integration uncertainty',async()=>{
  const run=await generate({app:'Task',website:base,useCase:'Post comments'},ai,()=>{},new AbortController().signal,network().fetcher);const output=markdown(run.guide);assert.match(output,/Post comments/);assert.match(output,/- \[ \] \*\*Register/);assert.match(output,/SHA-256/);assert.match(output,/Setup tested: no/);assert.match(output,/does not establish/);
});
test('research follows sibling docs domains using registrable domains, including private-hosting boundaries',()=>{
  assert.equal(onProvider('https://developers.acme.co.uk/oauth','https://acme.co.uk'),true);assert.equal(onProvider('https://other.co.uk/oauth','https://acme.co.uk'),false);assert.equal(onProvider('https://tenant-b.github.io/oauth','https://tenant-a.github.io'),false);assert.equal(onProvider('https://docs.task.example.com/oauth','https://app.task.example.com'),true);
});
test('research ranks capability and distribution documentation above unrelated code reviews',()=>{
  assert.ok(linkScore(base+'docs/capabilities')>linkScore(base+'docs/code-and-reviews'));assert.ok(linkScore(base+'docs/marketplace-listing')>linkScore(base+'blog/code-review'));assert.ok(linkScore(base+'docs/settings','Application approval')>linkScore(base+'docs/intro'));
  const page=parsePage(base,'<html><title>OAuth</title><nav>Repeated navigation</nav><main><p>Real OAuth requirements and conditions belong here.</p></main><a href="/docs/capabilities">Read capabilities</a></html>');assert.ok(!page.text.includes('Repeated navigation'));assert.equal(page.labels[base+'docs/capabilities'],'Read capabilities');
});
test('permission follow-up prioritises API references for the requested actions',()=>{
  const request='Read project tasks and create new tasks for customers';assert.ok(actionLinkScore(base+'reference/createtask','',request)>40);assert.ok(actionLinkScore(base+'reference/gettasksforproject','',request)>40);assert.equal(actionLinkScore(base+'reference/deleteusers','',request),0);assert.ok(actionLinkScore(base+'reference/gettasksforproject','',request)>actionLinkScore(base+'reference/gettaskcountsforproject','',request));
});
test('read-only research favours retrieval endpoints and excludes negated write actions',()=>{
 const request='Read the pages users share. Never edit pages or add comments.';assert.ok(actionLinkScore(base+'reference/retrieve-a-page','',request)>0);assert.ok(actionLinkScore(base+'reference/post-page','',request)<0);assert.ok(actionLinkScore(base+'reference/update-agent','',request)<0);
});
test('provider-linked external docs remain readable without allowing unrelated or private destinations',async()=>{
  const net=network();const external='https://task-docs.readme.io/docs/oauth';const fetcher:typeof fetch=async(value,init)=>{
    if(String(value)===base)return new Response('<title>Task</title><main>Developer documentation for creating public OAuth applications.</main><a href="'+external+'">OAuth documentation</a><a href="https://attacker.example.net/collect">Unrelated</a>');
    if(String(value)===external)return new Response('<title>OAuth application</title><main>'+sourceText+'</main>');return net.fetcher(value,init);
  };
  const result=await retrieve(normalizeInput({app:'Task',website:base}),{},()=>{},new AbortController().signal,fetcher);assert.ok(result.documents.some(d=>d.url===external));assert.ok(!net.calls.some(c=>c.url.includes('attacker.example.net')));
});
test('targeted follow-up reads a missing permission source and preserves existing snapshot IDs',async()=>{
  const net=network(),previous={documents:[{...docs[0],links:[base+'docs/permissions']}],website:base,inferred:false,warnings:[]};
  const fetcher:typeof fetch=async(value,init)=>String(value)===base+'docs/permissions'?new Response('<title>Permissions</title><main>'+sourceText+'</main>'):net.fetcher(value,init);
  const result=await retrieve(normalizeInput({app:'Task',website:base}),{},()=>{},new AbortController().signal,fetcher,{previous,topics:['permissions']});assert.deepEqual(result.documents[0],previous.documents[0]);assert.equal(result.documents[1].id,'s2');assert.equal(result.documents[1].url,base+'docs/permissions');assert.ok(!net.calls.some(c=>c.url===base));
});
test('redirect aliases do not count as new follow-up evidence',async()=>{
 const net=network(),previous={documents:[{...docs[0],links:[base+'docs/oauth-alias']}],website:base,inferred:false,warnings:[]};
 const fetcher:typeof fetch=async(value,init)=>String(value)===base+'docs/oauth-alias'?new Response('',{status:302,headers:{location:base+'docs/oauth'}}):net.fetcher(value,init);
 const result=await retrieve(normalizeInput({app:'Task',website:base}),{},()=>{},new AbortController().signal,fetcher,{previous,topics:['registration']});assert.equal(result.documents.length,1);assert.deepEqual(result.documents[0],previous.documents[0]);
});
test('a material evidence gap gets one targeted research round, followed by a new interpretation',async()=>{
  const first=await generate({app:'Task',website:base},ai,()=>{},new AbortController().signal,network().fetcher);first.documents[0].links=[base+'docs/permissions'];let modelCalls=0,permissionReads=0;const net=network(),events:Progress[]=[];
  const fetcher:typeof fetch=async(value,init)=>{if(String(value)===base+'docs/permissions'){permissionReads++;return new Response('<title>Permissions</title><main>'+sourceText+'</main>');}if(String(value)==='https://api.anthropic.com/v1/messages'){modelCalls++;const p=plan();p.researchNeeded=modelCalls===1?['permissions']:[];return network({model:p}).fetcher(value,init);}return net.fetcher(value,init);};
  const run=await generate({...first.guide.input,previousId:first.guide.id},ai,e=>events.push(e),new AbortController().signal,fetcher,first);assert.equal(permissionReads,1);assert.equal(modelCalls,2);assert.equal(run.documents.length,first.documents.length+1);assert.ok(events.some(e=>e.stage==='Checking a missing requirement'));
});
test('invented setup destinations and incomplete action grants are rejected',()=>{
  const p=plan();p.steps[0].destination='https://attacker.example.net/apps';assert.throws(()=>validateInterpretation(p,docs),/destination/);p.steps[0].destination=base+'docs/oauth';p.coverage=[{action:'Read issues',permissions:['issues:read'],status:'mapped',reason:'Required access.'}];assert.throws(()=>validateInterpretation(p,docs),/Action coverage/);p.coverage[0].status='unresolved';assert.equal(validateInterpretation(p,docs).coverage[0].status,'unresolved');
});
test('compact model context retains relevant passages and never invents source text',()=>{
  const long=[{...docs[0],text:Array.from({length:500},(_,i)=>'Unrelated navigation material for section '+i+' without setup details.').join('\n')+'\n'+sourceText}],all=sourcePassages(long),selected=contextPassages(all,'s1','Post comments');assert.ok(selected.reduce((n,p)=>n+p.text.length,0)<=6500);assert.ok(selected.some(p=>p.text.includes('comments:create')));assert.ok(selected.every(p=>all.some(a=>a.id===p.id&&a.text===p.text)));assert.ok(selected.length<all.length);
});
test('exact narrow scopes survive broad paragraphs during context compression',()=>{
 const text=Array.from({length:100},()=> 'OAuth authorization tokens require permissions and public application registration before customers authorize the integration.').join('\n')+'\n* comments:create allows creating issue comments.';
 const all=sourcePassages([{...docs[0],text}]);assert.ok(contextPassages(all,'s1','Post comments as the app').some(p=>p.text.includes('comments:create')));
});
test('identity confirmation happens before research and questions are batched once evidence is read',async()=>{
  const p=plan();p.questions=Array.from({length:3},(_,i)=>({id:'choice-'+i,prompt:'Material choice '+i+'?',why:'Changes the app model.',options:['Option A','Option B']}));
  const net=network({model:p});const first=await generate({app:'Task'},{...ai,LIVE_GUIDE_FIRECRAWL_KEY:'fc-test'},()=>{},new AbortController().signal,net.fetcher);
  assert.equal(first.guide.questions.length,1);assert.equal(first.documents.length,0);assert.ok(!net.calls.some(c=>c.url.includes('anthropic')||c.url.endsWith('/scrape')));
  const second=await generate({...first.guide.input,previousId:first.guide.id,answers:{'provider-identity':'Yes, this is the provider'}},ai,()=>{},new AbortController().signal,network({model:p}).fetcher,first);assert.equal(second.guide.questions.length,3);assert.equal(second.guide.steps.length,0);
  const third=await generate({...second.guide.input,previousId:second.guide.id,answers:{...second.guide.input.answers,...Object.fromEntries(second.guide.questions.map(q=>[q.id,'Option A']))}},ai,()=>{},new AbortController().signal,network().fetcher,second);assert.equal(third.guide.questions.length,0);assert.equal(third.guide.decisions?.length,4);
});
test('shared AI selection enables research with the same key/model and explicit disable wins',async()=>{
  const net=network();const result=await interpretEvidence(normalizeInput({app:'Task'}),docs,{AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'shared-key',ANTHROPIC_MODEL:'shared-model'},new AbortController().signal,net.fetcher);assert.equal(result.mode,'interpreted');assert.equal(result.telemetry.model,'shared-model');
  const disabled=await interpretEvidence(normalizeInput({app:'Task'}),docs,{...ai,AI_PROVIDER:'none'},new AbortController().signal,net.fetcher);assert.equal(disabled.mode,'evidence-only');assert.equal(disabled.telemetry.attempts,0);
});
