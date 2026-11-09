import test from 'node:test';
import assert from 'node:assert/strict';
import type {Document,Interpretation,StoredRun,WorkflowCheckpoint} from '../lib/live-guide/contracts.ts';
import {normalizeInput} from '../lib/live-guide/contracts.ts';
import {sourcePassages,attachResourceExamples} from '../lib/live-guide/interpretation.ts';
import {generate} from '../lib/live-guide/workflow.ts';
import {guideReadiness} from '../lib/live-guide/readiness.ts';
import {researchedPlan} from '../lib/plan/adapters.ts';
import {exportPlan} from '../lib/plan/export.ts';
import {nextFromProgress} from '../lib/plan/presentation.ts';
import {requestExampleParts} from '../lib/live-guide/request-examples.ts';
import {documentationScore,parsePage,publicReader,retrieve} from '../lib/live-guide/retrieval.ts';
import {reviewOAuthSetup} from '../lib/live-guide/setup-review.ts';
import {ModelServiceFailure} from '../lib/live-guide/failures.ts';

const url='https://developer.acme.com/oauth';
const document:Document={id:'s1',url,title:'OAuth applications',hash:'fixture',retrievedAt:'2026-11-09T00:00:00Z',text:[
 'Create an OAuth application in the developer console and save its client ID, secret and redirect URI.',
 'The issues:read scope allows reading issue names for the authorized user in their selected project.',
 'Use GET https://api.acme.com/oauth/authorize with response_type=code, client_id, redirect_uri and state. Verify the returned state before using the callback code.',
 'Use POST https://api.acme.com/oauth/token with HTTP Basic client credentials, grant_type=authorization_code, code and redirect_uri. Store tokens and secrets on your backend.',
 'Direct customer authorization is available without provider review. Only the developer who owns the app can change its registered redirect URI.',
 'Use GET https://api.acme.com/issues with a Bearer access token. The response contains issue names.',
].join('\n')};
const passages=sourcePassages([document]);
const passage=(text:string)=>passages.find(p=>p.text.includes(text))!;
const evidence=(text:string)=>[{sourceId:'s1',quote:passage(text).text}];
const ref=(text:string)=>({primary:passage(text).id,secondary:'',tertiary:''});
const intent={requestedActions:[{id:'read',title:'Read issue names',category:'resource' as const,operation:'read' as const}],prohibitions:['Never change issues.']};
function facts():Interpretation{return {
 ...intent,accessModel:'oauth',oauthSupport:'documented',summary:'Set up a customer OAuth app for issue names.',recommendation:'Configure a read-only grant.',nextAction:'Register the app.',
 findings:[
  {kind:'oauth',title:'Register an OAuth app',detail:'Register in the developer console.',scope:'',appliesWhen:'Before testing',evidence:evidence('Create an OAuth')},
  {kind:'permission',title:'Read issue names',detail:'Request issues:read for the selected project.',scope:'issues:read',appliesWhen:'Reading issue names',evidence:evidence('issues:read')},
 ],coverage:[{actionId:'read',action:'Read issue names',status:'mapped',permissions:['issues:read'],reason:'This scope grants the requested reads.',evidence:evidence('issues:read')}],
 steps:[],questions:[],blockers:[],unknowns:[],researchNeeded:[],activeEffort:{range:'',assumptions:''},
};}
function previous():StoredRun{return {documents:[document],guide:{
 ...facts(),id:'lg-'+crypto.randomUUID(),schemaVersion:1,generatedAt:document.retrievedAt,
 input:normalizeInput({app:'Acme',website:url,useCase:'Read issue names. Never change issues.',audience:'customers'}),
 provider:{website:url,identity:'provided'},mode:'interpreted',status:'provisional',notice:'Fixture only',warnings:[],setupTested:false,clarificationUsed:true,
 sources:[document],integration:{message:'Unverified toolkit'},
}};}
function rawStep(id:string,testKind:string,text:string,request={method:'',endpoint:'',example:'',responsePath:''}){
 return {id,testKind,title:id,detail:'Follow the documented '+id+' instructions.',owner:'developer',stage:testKind==='prepare'?'prepare':'test',doneWhen:'Record the configured '+id+' result.',dependsOn:id==='registration'?[]:['registration'],actionIds:[],destination:url,fields:[],request,evidence:ref(text)};
}
function network(launchGap='',reviewDetail='Direct customer authorization is available without provider review.'){
 let calls=0;
 const fetcher:typeof fetch=async(_input,init)=>{
  if(!String(_input).includes('api.anthropic.com'))throw new Error('No additional documentation in this fixture.');
  calls++;
  const payload=JSON.parse(String(init?.body));
  let result:unknown;
  if(payload.system.startsWith('FACTS STAGE')){
   const v=facts();
   result={accessModel:v.accessModel,oauthSupport:v.oauthSupport,summary:v.summary,findings:v.findings.map(f=>({...f,stage:'prepare',evidence:ref(f.kind==='oauth'?'Create an OAuth':'issues:read')})),coverage:v.coverage.map(({action:_action,...c})=>({...c,evidence:ref('issues:read')})),unknowns:[],researchNeeded:[]};
  }else if(payload.system.startsWith('Create a developer handoff')){
   result={steps:[
    rawStep('registration','prepare','Create an OAuth'),
    rawStep('consent','authorization','Use GET https://api.acme.com/oauth/authorize',{method:'GET',endpoint:'https://api.acme.com/oauth/authorize',example:"curl 'https://api.acme.com/oauth/authorize?response_type=code&client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&state=<STATE>'",responsePath:''}),
    rawStep('token-exchange','authorization','Use POST https://api.acme.com/oauth/token',{method:'POST',endpoint:'https://api.acme.com/oauth/token',example:"curl --request POST 'https://api.acme.com/oauth/token' --user '<CLIENT_ID>:<CLIENT_SECRET>' --data 'grant_type=authorization_code&code=<CODE>&redirect_uri=<REDIRECT_URI>'",responsePath:''}),
    {...rawStep('resource','action','Use GET https://api.acme.com/issues',{method:'GET',endpoint:'https://api.acme.com/invented',example:"curl 'https://api.acme.com/invented' -H 'Authorization: Bearer <TOKEN>'",responsePath:'$.names[]'}),actionIds:['read']},
    {...rawStep('launch','launch','Direct customer'),stage:'launch',dependsOn:['resource'],detail:'Confirm representative authorization before direct customer rollout.'},
   ],continuations:[],blockers:[]};
  }else if(payload.system.startsWith('Check this OAuth setup')){
   result={gaps:{registration:'',authorization:'',permissions:'',launch:launchGap},exampleIssue:'',approvals:[
    {kind:'provider-review',applicability:'not-required',detail:reviewDetail,passageIds:[passage('Direct customer').id]},
    {kind:'marketplace-listing',applicability:'unknown',detail:'Check the provider directory policy before listing.',passageIds:[]},
    {kind:'customer-admin',applicability:'unknown',detail:'Check the representative customer’s account policy.',passageIds:[]},
   ]};
  }else assert.fail('Unexpected model stage');
  return Response.json({type:'message',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(result)}],usage:{input_tokens:10,output_tokens:10}});
 };
 return {fetcher,calls:()=>calls};
}

test('curl GET data parameters retain their actual method and remain available to endpoint grounding',()=>{
 const parts=requestExampleParts("curl --get 'https://api.acme.com/oauth/authorize?response_type=code' --data-urlencode 'client_id=<CLIENT_ID>' --data-urlencode 'redirect_uri=https://app.example.com/callback?a=1&b=2' --data 'state=<STATE>'");
 assert.equal(parts.method,'GET');
 assert.deepEqual(parts.bodies,[]);
 const url=new URL(parts.url);
 assert.equal(url.searchParams.get('client_id'),'<CLIENT_ID>');
 assert.equal(url.searchParams.get('redirect_uri'),'https://app.example.com/callback?a=1&b=2');
 assert.equal(url.searchParams.get('state'),'<STATE>');
 assert.equal(requestExampleParts("curl 'https://api.acme.com/oauth/token' --data 'code=<CODE>'").method,'POST');
});

test('OAuth setup generation retains a sound handoff when an optional request is unsupported',async()=>{
 const old=previous(),net=network(),checkpoints:WorkflowCheckpoint[]=[];
 const result=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,net.fetcher,old,{oauthSetup:true,save:async c=>{checkpoints.push(structuredClone(c));}});
 assert.equal(net.calls(),3);
 assert.equal(guideReadiness(result.guide),'usable-guide');
 assert.equal(result.guide.steps.filter(s=>s.testKind==='action').length,0);
 assert.match(result.guide.oauthSetup!.exampleNotes[0],/omitted.*not documented/i);
 assert.ok(checkpoints.at(-1)?.exampleNotes?.length);
 const plan=researchedPlan(result.guide),markdown=exportPlan(plan);
 assert.equal(plan.blockers.filter(b=>b.consequence==='test').length,0);
 assert.equal(plan.examples!.length,0);
 assert.deepEqual(plan.steps.find(s=>s.id==='launch')!.dependsOn,[]);
 assert.match(plan.steps.find(s=>s.id==='launch')!.detail,/representative authorization/);
 assert.match(markdown,/Optional resource examples/);
 assert.match(markdown,/Direct customer authorization is available/);
 assert.match(markdown,/omitted/);
 assert.ok(!markdown.includes('/invented'));
 assert.equal(nextFromProgress(plan,[])!.id,'registration');
 for(const check of ['registration','authorization','permissions','launch'] as const){
  const incomplete=structuredClone(result.guide);
  incomplete.oauthSetup!.review!.gaps[check]='Missing essential '+check;
  assert.equal(guideReadiness(incomplete),'research-failure');
 }
 const missingReview=structuredClone(result.guide);
 delete missingReview.oauthSetup!.review;
 assert.equal(guideReadiness(missingReview),'research-failure');
});

test('a launch gap survives the bounded correction and cannot become a usable saved guide',async()=>{
 const old=previous(),net=network('Production access needs a documented application step.');
 let checkpoint:WorkflowCheckpoint|undefined;
 const result=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,net.fetcher,old,{oauthSetup:true,save:async c=>{checkpoint=structuredClone(c);}});
 assert.equal(net.calls(),6);
 assert.equal(guideReadiness(result.guide),'research-failure');
 assert.match(result.guide.oauthSetup!.review!.gaps.launch!,/Production access/);
 assert.match(exportPlan(researchedPlan(result.guide)),/Complete launch guidance/);
 const resumed=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,async()=>assert.fail('Completed negative checks must be reused until instructions or sources change.'),old,{oauthSetup:true,checkpoint});
 assert.equal(guideReadiness(resumed.guide),'research-failure');
 assert.equal(resumed.guide.oauthSetup!.review!.gaps.launch,result.guide.oauthSetup!.review!.gaps.launch);
});

test('a resource example with mismatched evidence is omitted without changing the core instructions',()=>{
 const core=facts(),step={...rawStep('resource','action','Use GET https://api.acme.com/issues'),actionIds:['read'],stage:'test' as const,owner:'developer' as const,testKind:'action' as const,evidence:[{sourceId:'s1',quote:'This quotation does not occur in any source.'}],request:{method:'GET',endpoint:'https://api.acme.com/issues',example:"curl 'https://api.acme.com/issues' -H 'Authorization: Bearer <TOKEN>'",responsePath:'$.names[]'}};
 const result=attachResourceExamples(core,[step],[document],'Read issue names. Never change issues.');
 assert.deepEqual(result.value,core);
 assert.match(result.exampleNotes[0],/citation/i);
});

test('review explanation length cannot discard a grounded verdict or clear a negative decision',async()=>{
 const old=previous(),longDetail='Direct customer authorization is available without provider review. '.repeat(12),net=network('',longDetail);
 const complete=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,net.fetcher,old,{oauthSetup:true});
 assert.equal(guideReadiness(complete.guide),'usable-guide');
 assert.equal(complete.guide.oauthSetup!.review!.approvals[0].detail,longDetail.trim());
 const gap='Production access requires the documented application step. '.repeat(10),negative=network(gap);
 const incomplete=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,negative.fetcher,old,{oauthSetup:true});
 assert.equal(guideReadiness(incomplete.guide),'research-failure');
 assert.equal(incomplete.guide.oauthSetup!.review!.gaps.launch,gap.trim());
});

test('all approval citations are checked when a policy uses more than three passages',async()=>{
 const ids=passages.filter(p=>p.citable).slice(0,4).map(p=>p.id);
 const net:typeof fetch=async(_input,init)=>{
  const schema=JSON.parse(String(init?.body)).output_config.format.schema;
  const allowed=schema.properties.approvals.items.properties.passageIds.items.enum;
  assert.ok(allowed.length>0);
  assert.ok(allowed.every((id:string)=>passages.some(p=>p.id===id&&p.citable)));
  assert.ok(!allowed.includes('s1-p9999'));
  return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({gaps:{registration:'',authorization:'',permissions:'',launch:''},exampleIssue:'',approvals:[
  {kind:'provider-review',applicability:'not-required',detail:'Direct authorization follows the documented path.',passageIds:ids},
  {kind:'marketplace-listing',applicability:'unknown',detail:'Listing policy is unresolved.',passageIds:[]},
  {kind:'customer-admin',applicability:'unknown',detail:'Check the customer policy.',passageIds:[]},
 ]})}]});
 };
 const result=await reviewOAuthSetup(facts(),previous().guide.input,[document],{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},new AbortController().signal,net);
 assert.equal(result.telemetry.outcome,'accepted');
 assert.equal(result.review!.approvals[0].evidence.length,4);
 ids.push('s1-p9999');
 const rejected=await reviewOAuthSetup(facts(),previous().guide.input,[document],{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},new AbortController().signal,net);
 assert.equal(rejected.telemetry.outcome,'validation-rejected');
 assert.equal(rejected.review,undefined);
});

const yaml='openapi: 3.1.0\ninfo:\n  title: Acme OAuth\n  version: 1\n  description: Create an OAuth application in the developer console before customer authorization.\nexternalDocs:\n  url: https://developer.acme.com/docs/app-review\nservers:\n  - url: https://auth.acme.com\npaths:\n  /oauth/token:\n    post:\n      summary: Exchange an authorization code\n      description: Use client credentials and the callback code to obtain the user token.\n      parameters:\n        - name: grant_type\n          in: query\n          required: true\n          schema:\n            type: string\n            enum: [authorization_code]\n      responses:\n        "200":\n          description: Returns the user access token.\n';
test('public YAML schemas retain registration descriptions, operation fields and documentation links',async()=>{
 const fetcher:typeof fetch=async input=>String(input).includes('dns-query')?Response.json({Answer:[{type:1,data:'1.1.1.1'}]}):new Response(yaml,{headers:{'Content-Type':'application/x-yaml; charset=utf-8'}});
 const read=await publicReader(fetcher,new AbortController().signal).read('https://developer.acme.com/openapi/oauth.yaml');
 const page=parsePage(read.url,read.body);
 assert.match(page.text,/POST \/oauth\/token/);
 assert.match(page.text,/grant_type/);
 assert.match(page.text,/Create an OAuth application/);
 assert.ok(page.links.includes('https://developer.acme.com/docs/app-review'));
});

test('a short documentation index is followed to OAuth specifications and launch evidence',async()=>{
 const calls:string[]=[];
 const fetcher:typeof fetch=async input=>{
  const address=String(input);
  if(address.includes('dns-query'))return Response.json({Answer:[{type:1,data:'1.1.1.1'}]});
  calls.push(address);
  if(address==='https://developer.acme.com/openapi.yaml')return new Response('<html><title>Available APIs</title><main>Select an API to view its OpenAPI specification. <a href="/openapi/oauth.yaml">Acme OAuth</a></main></html>',{headers:{'Content-Type':'text/html'}});
  if(address.endsWith('/openapi/oauth.yaml'))return new Response(yaml,{headers:{'Content-Type':'application/x-yaml'}});
  if(address.endsWith('/docs/app-review'))return new Response('# App review\nProvider review is required before production access. Register a client with an exact redirect URI.',{headers:{'Content-Type':'text/markdown'}});
  return new Response('Unavailable',{status:404});
 };
 const result=await retrieve(normalizeInput({app:'Acme',website:'https://developer.acme.com/openapi.yaml',useCase:'Read item names.',audience:'customers'}),{},()=>{},new AbortController().signal,fetcher,{oauthSetup:true});
 assert.ok(result.documents.some(d=>d.title==='Acme OAuth'));
 assert.ok(result.documents.some(d=>d.url.endsWith('/docs/app-review')));
 assert.ok(!result.documents.some(d=>d.title==='Available APIs'));
 assert.ok(calls.includes('https://developer.acme.com/openapi/oauth.yaml'));
});

test('OAuth setup retrieval prioritizes launch policy over unrelated operation and agent references',()=>{
 const input=normalizeInput({app:'Acme',website:'https://developer.acme.com',useCase:'Read file names. Never administer teams or the workspace.',audience:'customers'});
 const policy=documentationScore('https://developer.acme.com/docs/marketplace-listing','Listing and review',input,true);
 const operation=documentationScore('https://developer.acme.com/api-reference/team/resend-verification-emails','Send verification emails',input,true);
 assert.ok(policy>operation);
 assert.ok(documentationScore('https://developer.acme.com/guides/mcp/tools-agents','Agent delegation',input,true)<0);
 assert.ok(documentationScore('https://developer.acme.com/openapi-adminApi.json','Admin API',input,true)<0);
});

test('a temporary starting-page failure searches the same provider without accepting off-provider results',async()=>{
 const calls:string[]=[];
 const fetcher:typeof fetch=async input=>{
  const address=String(input);
  if(address.includes('dns-query'))return Response.json({Answer:[{type:1,data:'1.1.1.1'}]});
  calls.push(address);
  if(address==='https://www.acme.com/developers')throw new TypeError('fetch failed');
  if(/html.duckduckgo.com|search.brave.com/.test(address))return new Response('<html><a href="https://docs.acme.com/oauth">OAuth setup</a><a href="https://unrelated.example/oauth">OAuth setup</a></html>');
  if(address==='https://docs.acme.com/oauth')return new Response('# OAuth setup\n'+document.text);
  assert.fail('Unexpected source '+address);
 };
 const result=await retrieve(normalizeInput({app:'Acme',website:'https://www.acme.com/developers',useCase:'Read issue names.',audience:'customers'}),{},()=>{},new AbortController().signal,fetcher,{oauthSetup:true});
 assert.equal(calls.filter(url=>url==='https://www.acme.com/developers').length,2);
 assert.ok(result.documents.some(source=>source.url==='https://docs.acme.com/oauth'));
 assert.ok(result.warnings.some(warning=>warning.includes('www.acme.com/developers')));
 assert.ok(!calls.some(url=>url.startsWith('https://unrelated.example')));
});

test('a missing starting page stays recoverable without substituting a different source',async()=>{
 const calls:string[]=[];
 const fetcher:typeof fetch=async input=>{
  const address=String(input);
  if(address.includes('dns-query'))return Response.json({Answer:[{type:1,data:'1.1.1.1'}]});
  calls.push(address);return new Response('Not found',{status:404});
 };
 await assert.rejects(()=>retrieve(normalizeInput({app:'Acme',website:'https://www.acme.com/missing',useCase:'Read issue names.',audience:'customers'}),{},()=>{},new AbortController().signal,fetcher,{oauthSetup:true}));
 assert.deepEqual(calls,['https://www.acme.com/missing']);
});

test('an account usage cap preserves a focused draft and resumes only its unfinished review',async()=>{
 const old=previous(),net=network();let checkpoint:WorkflowCheckpoint|undefined;
 const input={...old.guide.input,previousId:old.guide.id},bindings={ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'};
 await generate(input,bindings,()=>{},new AbortController().signal,net.fetcher,old,{oauthSetup:true,save:async saved=>{checkpoint=structuredClone(saved);}});
 checkpoint!.setupReview=undefined;
 const draft=structuredClone(checkpoint!.draft),sources=structuredClone(checkpoint!.research.documents);let calls=0;
 await assert.rejects(()=>generate(input,bindings,()=>{},new AbortController().signal,async()=>{
  calls++;return Response.json({error:{type:'invalid_request_error',message:'You have reached your specified API usage limits. You will regain access on 2026-12-01 at 00:00 UTC. secret-fixture'}},{status:400});
 },old,{oauthSetup:true,checkpoint,save:async saved=>{checkpoint=structuredClone(saved);}}),error=>{
  assert.ok(error instanceof ModelServiceFailure);assert.equal(error.failure.serviceCode,'usage-limit');assert.equal(error.failure.modelRequests,1);assert.doesNotMatch(error.message,/secret-fixture/);return true;
 });
 assert.equal(calls,1);assert.deepEqual(JSON.parse(JSON.stringify(checkpoint!.draft)),JSON.parse(JSON.stringify(draft)));assert.deepEqual(checkpoint!.research.documents,sources);
 const resumed=network();
 const result=await generate(input,bindings,()=>{},new AbortController().signal,resumed.fetcher,old,{oauthSetup:true,checkpoint});
 assert.equal(resumed.calls(),1);assert.equal(guideReadiness(result.guide),'usable-guide');assert.deepEqual(result.documents,sources);
});
