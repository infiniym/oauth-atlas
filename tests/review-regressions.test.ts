import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {generate} from '../lib/live-guide/workflow.ts';
import {interpretEvidence,validateInterpretation,reviewMappings,sourcePassages,contextPassages,PROMPT_VERSION} from '../lib/live-guide/interpretation.ts';
import {documentationScore} from '../lib/live-guide/retrieval.ts';
import {normalizeInput} from '../lib/live-guide/contracts.ts';
import type {Interpretation,StoredRun,Document,LiveGuide} from '../lib/live-guide/contracts.ts';
import {researchedPlan,reviewedPlan} from '../lib/plan/adapters.ts';
import {saveReviewedPlan,readPlan,freezeResearchPlan} from '../lib/plan/storage.ts';
import {emptyAssessment,metadataSnapshot} from '../lib/advisor/providers.ts';
import {recommend} from '../lib/advisor/rules-engine.ts';
import {reconcile} from '../lib/live-guide/consistency.ts';
import {createJob,runJob,getJob} from '../lib/live-guide/jobs.ts';
import {exportPlan} from '../lib/plan/export.ts';
import {interpret} from '../lib/advisor/intent-parser.ts';
import {researchRoute} from '../lib/plan/routing.ts';
import type {Store} from '../lib/live-guide/http.ts';
import {endpointEvidence} from '../lib/live-guide/grounding.ts';
import {sourceKey,linkScore,selectSourceText,parsePage} from '../lib/live-guide/retrieval.ts';
import {repairLongFields,planningDocuments,completeTestInstructions} from '../lib/live-guide/interpretation.ts';
import {guideReadiness} from '../lib/live-guide/readiness.ts';
import {monitorJob} from '../lib/live-guide/job-client.ts';
const url='https://acmetasks.example.com/docs/oauth';
const docs:Document[]=[{id:'s1',url,title:'OAuth setup',hash:'abc',retrievedAt:'2026-11-01T00:00:00Z',text:'Create an OAuth application in workspace settings before testing.\nThe issues:read permission allows reading issues in a selected project.\nUse GET /issues to read the issues in that project.\nAPI base URL: https://api.acme.com. Optional page and cursor query parameters select the next results.'}];
const ev=[{sourceId:'s1',quote:'The issues:read permission allows reading issues in a selected project.'}];
function value():Interpretation{return {accessModel:'oauth',requestedActions:[{id:'read',title:'Read project issues',operation:'read'}],prohibitions:['Never write or delete issues.'],oauthSupport:'documented',summary:'A read-only OAuth app.',recommendation:'Prepare a read-only OAuth application.',nextAction:'Create the test app.',findings:[{kind:'oauth',title:'Create an app',detail:'Register the app.',appliesWhen:'Before testing.',scope:'',evidence:[{sourceId:'s1',quote:'Create an OAuth application in workspace settings before testing.'}]},{kind:'permission',title:'Read issues',detail:'Read issue content.',appliesWhen:'Reading project issues.',scope:'issues:read',evidence:ev}],steps:[{id:'register',title:'Register the app',detail:'Create the test application.',stage:'prepare',owner:'developer',doneWhen:'A test client exists.',fields:[],destination:url,evidence:ev},{id:'read-test',testKind:'action',request:{method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues' -H 'Authorization: Bearer <ACCESS_TOKEN>'"},title:'Read a project issue',detail:'Use GET /issues in a test project. Boundary check: read an excluded project and record the denied response.',stage:'test',owner:'developer',doneWhen:'An issue is returned, and an excluded project is denied.',fields:[],destination:url,evidence:ev,dependsOn:['register'],actionIds:['read']}],coverage:[{actionId:'read',action:'Read project issues',permissions:['issues:read'],status:'mapped',reason:'The quoted permission documents project issue reads.',evidence:ev}],blockers:[],questions:[],unknowns:[],researchNeeded:[],activeEffort:{range:'',assumptions:''}};}
function run(v=value()):StoredRun{const guide:LiveGuide={...v,id:'lg-'+crypto.randomUUID(),schemaVersion:1,generatedAt:'2026-11-01T00:00:00Z',input:normalizeInput({app:'Acme Tasks',website:url,useCase:'Read issues in selected projects. Never write or delete issues.',audience:'customers'}),provider:{website:url,identity:'provided'},mode:'interpreted',status:'provisional',notice:'Not executed.',warnings:[],setupTested:false,sources:docs.map(({text:_text,...d})=>d),integration:{message:'Toolkit compatibility unverified.'}};return {guide,documents:docs};}
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE live_guides(id TEXT PRIMARY KEY,payload TEXT,created_at TEXT); CREATE TABLE launch_plans(id TEXT PRIMARY KEY,payload TEXT,created_at TEXT);');sqlite.exec(readFileSync(new URL('../drizzle/0003_simple_vulcan.sql',import.meta.url),'utf8'));const db:Store={prepare(sql){return{bind(...args){return{async run(){return sqlite.prepare(sql).run(...args as (string|number|null)[]);},async first<T>(){return (sqlite.prepare(sql).get(...args as (string|number|null)[])||null) as T|null;}};}};}};return{db,sqlite};}
const bindings={ANTHROPIC_API_KEY:'fixture-key',ANTHROPIC_MODEL:'fixture-model'};

test('completion: endpoint templates, API hosts and query names are grounded independently',()=>{
 const sources=[{...docs[0],text:'Call GET /v1/pages/{page_id} at https://api.acme.com with limit and cursor query parameters. This returns the page content.'}];
 assert.ok(endpointEvidence('https://api.acme.com/v1/pages/{pageId}?limit=50&cursor=USER_CURSOR',sources).supported);
 assert.ok(endpointEvidence('/v1/pages/{page_id}?cursor=USER_CURSOR',sources).supported);
 assert.ok(!endpointEvidence('https://attacker.com/v1/pages/{page_id}',sources).supported);
 assert.ok(!endpointEvidence('/v1/pages/{page_id}/delete',sources).supported);
 assert.ok(!endpointEvidence('/v1/pages/{page_id}?invented=true',sources).supported);
 assert.ok(!endpointEvidence(url,sources).supported);
});
test('completion: shared pagination fields require a linked parameter declaration for the applicable mode',()=>{
 const reference={...docs[0],id:'s2',title:'REST API',url:'https://docs.acmetasks.example.com/api/rest/',text:[
  'Pagination','Offset-based pagination. The default method.','Offset-based pagination','Parameter Description','page Page number.','Keyset-based pagination','Parameter Required Description','pagination yes keyset (enables keyset pagination).','per_page no Number of items per page.','The response mentions arbitrary and has a link to the next page.',
 ].join('\n')};
 const operation={...docs[0],text:'GET /issues\nThis operation supports offset-based and keyset-based pagination.',links:[reference.url+'#pagination']};
 const source=[operation,reference];
 assert.deepEqual(endpointEvidence('/issues?pagination=keyset&per_page=50',source).sourceIds,['s1','s2']);
 assert.ok(endpointEvidence('/issues?pagination=keyset&per_page=50',source).supported);
 assert.ok(endpointEvidence('/issues?page=2',source).supported);
 assert.ok(!endpointEvidence('/issues?pagination=keyset&page=2',source).supported);
 assert.ok(!endpointEvidence('/issues?pagination=keyset&arbitrary=2',source).supported);
 assert.ok(!endpointEvidence('/issues?pagination=keyset&per_page=50',[{...operation,links:[]},reference]).supported);
});
test('completion: localized aliases and assets cannot consume the documentation budget',()=>{
 assert.equal(sourceKey('https://acme.com/de/docs/api/'),sourceKey('https://acme.com/docs/api'));
 assert.equal(sourceKey('https://acme.com/fr_CA/developers'),sourceKey('https://acme.com/developers'));
 assert.ok(linkScore('https://docs.acme.com/oauth/favicon.ico')<0);
});
test('completion: an OAuth registration guide survives ranking beside endpoint object references',()=>{
 const registration={...docs[0],url:'https://acmetasks.example.com/docs/system-admin/authentication/oauth-applications/'};
 const endpoint={...docs[0],id:'s2',url:'https://acmetasks.example.com/docs/api/endpoints/oauth-2/'};
 assert.ok(planningDocuments([endpoint,registration],run().guide.input).includes(registration));
});
test('completion: distinct pagination requests survive action reconciliation',()=>{
 const p=value();p.steps.push({...p.steps[1],id:'continue',request:{method:'GET',endpoint:'/issues?cursor=NEXT',example:"curl 'https://api.acme.com/issues?cursor=NEXT'"},dependsOn:['read-test']});
 const out=reconcile(p);assert.equal(out.steps.filter(s=>s.testKind==='action').length,2);assert.deepEqual(out.steps.at(-1)!.dependsOn,['read-test']);
});
test('completion: overlength presentation repair retains request, grants and evidence',async()=>{
 const p=value();p.coverage[0].reason='Repeated display text. '.repeat(30);const before=structuredClone(p);
 const out=await repairLongFields(p as unknown as Record<string,unknown>,bindings,new AbortController().signal,async(_u,init)=>{assert.equal(JSON.parse(String(init?.body)).output_config.format.schema.properties.values.type,'array');return aiResponse({values:['The documented scope permits reading issues.']});});
 assert.deepEqual(out.steps,before.steps);assert.deepEqual(out.findings,before.findings);assert.deepEqual((out.coverage as typeof p.coverage)[0].evidence,before.coverage[0].evidence);assert.ok((out.coverage as typeof p.coverage)[0].reason.length<400);
});
test('completion: long reference extraction retains requested read route and exact read-only grant',()=>{
 const text=('Sync task data with unrelated commands and token metadata.\n').repeat(2000)+'\ndata:read\nGrants read-only access to tasks and projects.\nGet Tasks\nGet all active tasks for the user.\nget /api/v1/tasks\ncursor\nUse next_cursor from the response until null.\n';
 const selected=selectSourceText(text,'List active task titles with pagination.',6000,'Acme');assert.match(selected,/get \/api\/v1\/tasks/);assert.match(selected,/data:read/);
});
test('completion: ready job metadata and a request string alone cannot pass usability',()=>{
 const p=run().guide;assert.equal(guideReadiness(p),'research-failure');p.coverage[0].support='reviewed';assert.equal(guideReadiness(p),'usable-guide');p.coverage[0].status='unresolved';assert.equal(guideReadiness(p),'research-failure');
});
test('completion: an automatically recovered truncated plan has the accepted final outcome and retains the failed attempt',async()=>{
 const old=run();old.guide.clarificationUsed=true;old.documents[0]={...old.documents[0],links:['https://acmetasks.example.com/docs/permissions']};let calls=0;
 const result=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(u,init)=>{
  if(String(u).startsWith('https://cloudflare-dns.com/'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});
  if(!String(u).includes('anthropic'))return new Response('<title>Permissions</title><main>'+docs[0].text+'</main>');
  const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The documented permission supports issue reads.'}]});
  calls++;if(calls<=2)return Response.json({type:'message',stop_reason:'max_tokens',content:[{type:'text',text:'{"truncated"'}],usage:{input_tokens:100,output_tokens:100}});return aiResponse(wire(value()));
 },old);
 assert.equal(result.guide.engine?.outcome,'accepted');assert.equal(result.guide.engine?.followupOutcome,'accepted');assert.ok(result.guide.engine!.attempts>=3);assert.equal(guideReadiness(result.guide),'usable-guide');
});
test('completion: unquoted HTML navigation retains setup and requested endpoint links',async()=>{
 const {parsePage}=await import('../lib/live-guide/retrieval.ts');const p=parsePage('https://docs.acme.com/api/oauth/','<main>OAuth registration documentation for individual user access.</main><a href=/api/issues/>Issues API</a><a href=/integrations/oauth_provider/>OAuth scopes</a>');assert.ok(p.links.includes('https://docs.acme.com/api/issues/'));assert.equal(p.labels['https://docs.acme.com/api/issues/'],'Issues API');
});
test('completion: exhausted generation retries the same evidence once at lower effort before retrieval',async()=>{
 let calls=0;const result=await interpretEvidence(run().guide.input,docs,bindings,new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body));calls++;assert.equal(body.output_config.effort,'low');if(calls===1)return Response.json({type:'message',stop_reason:'max_tokens',content:[],usage:{input_tokens:50,output_tokens:16000}});return aiResponse(wire(value()));},[],{final:true,intent:{requestedActions:value().requestedActions,prohibitions:[]}});
 assert.equal(calls,2);assert.equal(result.mode,'interpreted');assert.equal(result.telemetry.outcome,'accepted');assert.match(result.telemetry.validationIssues!.join(' '),/exhausted the output budget/);
});
test('completion: source editing controls cannot outrank published documentation',()=>{
 const input=run().guide.input;
 assert.ok(documentationScore('https://code.acme.example/-/ide/project/docs/edit/main/api/oauth.md','Edit in Web IDE',input)<0);
 assert.ok(documentationScore('https://code.acme.example/docs/commits/branch/latest/api.md','History',input)<0);
 assert.ok(documentationScore('https://docs.acme.example/api/usage/','API Usage',input)>0);
});
test('completion: name discovery ranks the requested product area instead of the first OAuth search hit',async()=>{
 const {discoverProvider}=await import('../lib/live-guide/retrieval.ts');
 const seed=await discoverProvider(normalizeInput({app:'Acme',useCase:'Read page titles shared by the connected customer.'}),{},()=>{},new AbortController().signal,async u=>String(u).includes('cloudflare-dns')?Response.json({Answer:[{type:1,data:'104.18.40.45'}]}):new Response('<main>Official results</main><a href="https://docs.acme.example.com/workers/oauth">Worker OAuth</a><a href="https://docs.acme.example.com/guides/oauth">OAuth applications</a>'));
 assert.equal(seed,'https://docs.acme.example.com/guides/oauth');
});
test('completion: an OAuth handoff cannot substitute personal or CI token authentication',()=>{
 const p=value();p.steps[1].request!.example="curl 'https://api.acme.com/issues' -H 'PRIVATE-TOKEN: <token>'";
 assert.throws(()=>validateInterpretation(p,docs),/personal\/API\/CI token header/);
});
test('completion: an OpenAPI reference retains the base path, pagination, security and response fields',async()=>{
 const {openApiText}=await import('../lib/live-guide/openapi.ts');const api=openApiText(JSON.stringify({swagger:'2.0',info:{title:'Acme API'},basePath:'/api/v1',paths:{'/user/items':{get:{summary:'List items visible to the authenticated user',parameters:[{name:'page',in:'query',type:'integer'}],responses:{200:{description:'List of items',schema:{type:'array',items:{$ref:'#/definitions/Item'}}}}}}},definitions:{Item:{type:'object',properties:{id:{type:'integer'},name:{type:'string'}}}}}),'List item names with pagination.');assert.match(api!.text,/GET \/api\/v1\/user\/items/);assert.match(api!.text,/Parameter page in query/);assert.match(api!.text,/"name"/);assert.match(api!.text,/List of items/);
});
test('completion: a stalled event stream recovers the saved terminal job without starting duplicate work',async()=>{
 const {db}=database(),job=await createJob(db,run().guide.input,crypto.randomUUID());let posts=0,reads=0,cancelled=false;
 const completed={...job,state:'ready' as const,guide:run().guide};
 const result=await monitorJob(job,{signal:AbortSignal.timeout(1000),pollMs:1,fetcher:async(_u,init)=>{if(init?.method==='POST'){posts++;return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(JSON.stringify({type:'progress',event:{stage:'Reading',detail:'Source saved',status:'working'}})+'\n'));},cancel(){cancelled=true;}}),{headers:{'Content-Type':'application/x-ndjson'}});}reads++;return Response.json({job:completed});}});
 assert.equal(result.state,'ready');assert.equal(posts,1);assert.equal(reads,1);await new Promise(r=>setTimeout(r,1));assert.ok(cancelled);
});
test('completion: version constants survive a small context budget ahead of incidental pagination and JSON examples',()=>{
 const source={...docs[0],text:'Versioning\nThe current Acme-Version is 2026-10-01 for every resource request.\n'+('"rich_text" : [ "metadata example" ]\nPass pagination cursors back unchanged; do not parse their contents.\n').repeat(40)};
 const selected=contextPassages(sourcePassages([source]),source.id,'Read page titles and content.',1000).map(p=>p.text).join(' ');assert.match(selected,/Acme-Version is 2026-10-01/);
});
test('completion: a simple default scope definition survives alongside namespaced grants',()=>{
 const d={...docs[0],text:'OAuth permissions\n* `inspect` - (Default) Read access to the connected account. Always present.\n* `items:create` - Allows creating and updating items.\n'+('Token request example and unrelated authorization lifecycle details.\n').repeat(80)};
 const selected=contextPassages(sourcePassages([d]),d.id,'Read item titles.',600).map(p=>p.text).join(' ');assert.match(selected,/inspect.*Read access/);assert.match(selected,/items:create/);
});
test('completion: the requested nested route takes priority over response JSON and a generic collection',()=>{
 const d={...docs[0],text:'GET /issues\nLists all visible issues.\n'+('"title": "Example response title", "_links": { "self": "/issues/42" }\n').repeat(60)+'\nList project issues\nGET /projects/:id/issues\nLists issues within one project. Accepts page and per_page; use the Link header for the next page.\n'};
 const selected=contextPassages(sourcePassages([d]),d.id,'Read issue titles in a project, including pagination.',900).map(p=>p.text).join(' ');assert.match(selected,/GET \/projects\/:id\/issues/);assert.match(selected,/per_page/);
});
test('completion: documented base paths and named variables with spaces are grounded without accepting unrelated suffixes',()=>{
 const ds=[{...docs[0],text:'The path must start with /api/v8.\nGET /projects/:id/issues\nRead issues with the documented read grant.'},{...docs[0],id:'s2',text:'Use GET https://api.acme.com/api/v8/items/{id or name}/ to retrieve an item by ID or name.'}];
 assert.ok(endpointEvidence('/api/v8/projects/{project_id}/issues',ds).supported);
 assert.ok(endpointEvidence('https://api.acme.com/api/v8/items/{item}/',ds).supported);
 assert.equal(endpointEvidence('/arbitrary/projects/:id/issues',ds).supported,false);
});
test('completion: pagination prose cannot pass without a concrete continuation request',()=>{
 const p=value();p.steps[1].detail+=' Repeat until every page has been read.';
 assert.throws(()=>validateInterpretation(p,docs,'Read issues including pagination.'),/no concrete pagination request/);
 p.steps.push({...p.steps[1],id:'next',request:{...p.steps[1].request!,example:"curl 'https://api.acme.com/issues?cursor=NEXT_CURSOR' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}});
 assert.doesNotThrow(()=>validateInterpretation(p,docs,'Read issues including pagination.'));
});
test('completion: resource search definitions precede an operation index and retain referenced success schemas',async()=>{
 const {openApiText}=await import('../lib/live-guide/openapi.ts');
 const paths=Object.fromEntries(Array.from({length:40},(_,i)=>['/users/{id}/items/'+i+'/notifications',{get:{summary:'List the notifications for the user in an item'}}]));
 paths['/items/search']={get:{summary:'Search for items',parameters:[{in:'query',name:'private',type:'boolean',description:'Include private items the connected account can access.'},{in:'query',name:'page',type:'integer',description:'Page number, starting at one.'}],responses:{200:{$ref:'#/responses/Results'}}}} as any;
 const api=openApiText(JSON.stringify({swagger:'2.0',basePath:'/v1',info:{title:'Acme'},paths,responses:{Results:{description:'Matching accessible items',schema:{type:'object',properties:{data:{type:'array',items:{type:'object',properties:{name:{type:'string'}}}}}}}}}),'List item names visible to the connected person, including pagination. Read only.');
 assert.ok(api!.text.indexOf('Parameter private')<api!.text.indexOf('Operation index:'));assert.match(api!.text,/Matching accessible items/);assert.match(api!.text,/"name"/);
});
test('completion: a large schema index cannot displace search access conditions from model context',()=>{
 const d={...docs[0],text:'Schema version: 1\nSecurity definitions: {}\n## GET /v1/items/search | Search for items\nParameter private in query (boolean, optional): include private items this user has access to.\nParameter page in query (integer, optional): page number.\nSuccessful response 200: Matching items with names.\nOperation index:\n'+Array.from({length:100},(_,i)=>'GET /v1/items/{id}/related/'+i+' | List related items').join('\n')};
 const selected=contextPassages(sourcePassages([d]),d.id,'List item names visible to the connected person.',1000).map(p=>p.text).join(' ');assert.match(selected,/include private items/);assert.match(selected,/Parameter page/);assert.doesNotMatch(selected,/related\/99/);
});
function aiResponse(data:unknown){return Response.json({type:'message',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(data)}],usage:{input_tokens:100,output_tokens:100,output_tokens_details:{thinking_tokens:30}}});}
function wire(v:Interpretation){const all=sourcePassages(docs);const copy=structuredClone(v);for(const item of [...copy.findings,...copy.steps,...copy.coverage])if(item.evidence)(item as unknown as {evidence:unknown[]}).evidence=item.evidence.map(e=>({passageId:all.find(p=>p.text.includes(e.quote))!.id}));return copy;}

test('review: confirming an older identity exposes saved material questions with zero network calls',async()=>{
 const old=run();old.guide.provider.identity='inferred';old.guide.input.website='';old.guide.questions=[{id:'provider-identity',prompt:'Confirm provider?',why:'Identity.',options:['Yes, this is the provider','No, I will enter its website']}];old.guide.pendingQuestions=[{id:'actor',prompt:'Who should act?',why:'Changes installation.',options:['The app','The person']}];let calls=0;
 const result=await generate({...old.guide.input,previousId:old.guide.id,answers:{'provider-identity':'Yes, this is the provider'}},bindings,()=>{},new AbortController().signal,async()=>{calls++;throw new Error();},old);
 assert.equal(calls,0);assert.equal(result.guide.questions[0].id,'actor');assert.equal(result.guide.phase,'clarification');assert.deepEqual(result.documents,old.documents);
});
test('review: decision-first clarification returns no full guide and retains actions and prohibitions',async()=>{
 const result=await interpretEvidence(normalizeInput({app:'Acme Tasks',website:url,useCase:'A bot that understands tickets'}),docs,bindings,new AbortController().signal,async()=>aiResponse({outcome:'clarification',requestedActions:[{id:'read',title:'Read issues',operation:'read'}],prohibitions:['No writes'],questions:[{id:'actor',prompt:'Act as the app or the connected person?',why:'Changes authorization.',options:['The app','The person']}],plan:null}));
 assert.equal(result.mode,'interpreted');assert.equal(result.value.questions.length,1);assert.equal(result.value.steps.length,0);assert.equal(result.value.findings.length,0);assert.deepEqual(result.value.prohibitions,['No writes']);
});
test('review: a final-stage ambiguity becomes a partial guide rather than another question loop',async()=>{
 const old=run();old.guide.clarificationUsed=true;old.guide.questions=[{id:'actor',prompt:'Actor?',why:'Identity.',options:['The app','The person']}];const p=value();p.questions=[{id:'new-choice',prompt:'Another preference?',why:'Could change permissions.',options:['A','B']}];
 const result=await generate({...old.guide.input,previousId:old.guide.id,answers:{actor:'The app'}},bindings,()=>{},new AbortController().signal,async()=>aiResponse(wire(p)),old);assert.equal(result.guide.questions.length,0);assert.equal(result.guide.phase,'ready');assert.ok(result.guide.blockers.some(b=>b.title==='Another preference?'));
});
test('review: a genuine read citation cannot validate a delete permission claim or mapping',()=>{
 const p=value();p.findings[1].detail='Use issues:read to delete existing issues.';assert.throws(()=>validateInterpretation(p,docs),/contradicts/);p.findings[1].detail='Read issues';p.coverage[0].action='Delete issues';assert.throws(()=>validateInterpretation(p,docs),/contradicts/);
});
test('review: semantic support is separately checked and cannot claim execution success',async()=>{
 const audit=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async()=>aiResponse({reviews:[{id:'0',status:'unresolved',reason:'The citation does not establish access to the specified project endpoint.'}]}));assert.equal(audit.value.coverage[0].status,'unresolved');assert.equal(audit.value.coverage[0].support,'unresolved');const p=researchedPlan(run(audit.value).guide);assert.equal(p.coverage![0].execution,'untested');assert.ok(p.steps.find(s=>s.id==='read-test')!.blockedBy!.length);
});
test('review: incomplete semantic reviews fail closed, and reviewed relationships do not get reviewed again',async()=>{
 const failed=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async()=>aiResponse({reviews:[]}));assert.equal(failed.value.coverage[0].status,'unresolved');const p=value();p.coverage[0].support='reviewed';let calls=0;await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async()=>{calls++;throw new Error();});assert.equal(calls,0);
});
test('review: mapped labels cannot coexist with an unresolved mapping explanation',()=>{
 const p=value();p.coverage[0].reason='Its effect on page reads still needs verification.';const result=researchedPlan(run(p).guide);assert.equal(result.coverage![0].status,'unresolved');assert.ok(result.blockers.some(b=>b.consequence==='test'));
});
test('review: every requested action has coverage and a representative API test',()=>{
 const p=value();p.requestedActions.push({id:'create',title:'Create tasks',operation:'create'});const result=reconcile(p);assert.ok(result.coverage.some(c=>c.actionId==='create'&&c.status==='unresolved'));assert.ok(result.steps.some(s=>s.actionIds?.includes('create')&&s.stage==='test'));
});
test('review: a blocked first test is never the immediate next action; independent preparation is available',()=>{
 const p=value();p.blockers=[{title:'Scope mapping unresolved',consequence:'test',owner:'Developer',resolution:'Read the endpoint scope requirement.',stepIds:['read-test']}];let plan=researchedPlan(run(p).guide);assert.equal(plan.next!.id,'register');assert.ok(plan.steps.find(s=>s.id==='read-test')!.blockedBy!.length);p.steps=p.steps.filter(s=>s.stage==='test');p.steps[0].dependsOn=[];plan=researchedPlan(run(p).guide);assert.match(plan.next!.title,/Resolve:/);assert.notEqual(plan.next!.id,'read-test');
});
test('review: prerequisite placement and dependencies remain attached to affected steps',()=>{
 const p=value();p.findings.push({...p.findings[0],kind:'prerequisite',stage:'prepare',stepIds:['register'],title:'Callback configuration',appliesWhen:'Before the first authorization test.'});p.blockers=[{title:'Registration blocked',owner:'Developer',consequence:'test',resolution:'Confirm the redirect configuration.',stepIds:['register']}];const plan=researchedPlan(run(p).guide);assert.equal(plan.requirements[0].stage,'prepare');assert.ok(plan.steps.find(s=>s.id==='read-test')!.blockedBy!.length);
});
test('review: invalid dependency cycles and missing blocker targets are rejected',()=>{
 const p=value();p.steps[0].dependsOn=['read-test'];assert.throws(()=>validateInterpretation(p,docs),/cycle/);p.steps[0].dependsOn=[];p.blockers=[{title:'Missing',consequence:'test',owner:'Developer',resolution:'Resolve.',stepIds:['absent']}];assert.throws(()=>validateInterpretation(p,docs),/missing step/);
});
test('review: server metadata, visible output, share and export preserve the same custom route',async()=>{
 const {db}=database(),a={...emptyAssessment('gmail'),capabilities:['read'],stage:'test' as const,audience:'organization' as const,branding:'no' as const,dataHandling:'servers' as const,orgPolicy:'standard' as const};const metadata={...metadataSnapshot('gmail'),origin:'Live Composio API' as const,managedMethods:[]};const shown=reviewedPlan(a,recommend(a,metadata)),saved=await saveReviewedPlan(a,db,metadata),reopened=await readPlan(saved.id,db);assert.equal(shown.next!.title,saved.next!.title);assert.deepEqual(reopened,saved);assert.match(exportPlan(saved),/Create a Google Cloud project/);assert.equal(saved.metadata!.origin,'Live Composio API');
});
test('review: research snapshots freeze output instead of rerunning changed adapters',async()=>{
 const {db}=database(),r=run();const first=await freezeResearchPlan(r.guide,db);r.guide.recommendation='Changed adapter input';const second=await freezeResearchPlan(r.guide,db);assert.deepEqual(second,first);assert.deepEqual(await readPlan(first.id,db),first);
});
test('review: long requests and terminal prohibitions survive routing, normalization and storage',async()=>{
 const text='Read task details. '.repeat(70)+'Never send messages or delete tasks.';assert.ok(text.length>600&&text.length<1500);const routed=new URL(researchRoute('Acme Tasks',text),'https://atlas.example.com');assert.equal(normalizeInput({app:routed.searchParams.get('app'),useCase:routed.searchParams.get('useCase')}).useCase,text);assert.throws(()=>normalizeInput({app:'Acme',useCase:'x'.repeat(1501)}));const {db}=database(),job=await createJob(db,{app:'Acme Tasks',useCase:text},crypto.randomUUID());assert.equal((await getJob(db,job.id))!.input.useCase,text);
});
test('review: an unfamiliar provider name survives structured intake',async()=>{
 const r=await interpret('A Linear bot reads issues',{provider:'anthropic',key:'fixture',model:'fixture'},async()=>aiResponse({provider:null,providerCandidate:'Linear',capabilities:[],background:'unknown',audience:'unknown',repoAccess:'unknown',slackIdentity:'unknown',unresolved:[]}));assert.equal(r.intent.providerCandidate,'Linear');
});
test('review: duplicate submissions share one persistent job and changed requests use a new job',async()=>{
 const {db}=database(),key=crypto.randomUUID();const [a,b]=await Promise.all([createJob(db,{app:'Acme Tasks',website:url},key),createJob(db,{app:'Acme Tasks',website:url},key)]);assert.equal(a.id,b.id);const fresh=await createJob(db,{app:'Acme Tasks',website:url},crypto.randomUUID());assert.notEqual(fresh.id,a.id);const changed=await createJob(db,{app:'Acme Tasks',website:url,useCase:'Create tasks'},key);assert.notEqual(changed.id,a.id);
});
test('review: concurrent process execution and replay perform paid work only once',async()=>{
 const {db}=database(),job=await createJob(db,{app:'Acme Tasks',website:url},crypto.randomUUID());let calls=0,release!:()=>void;const gate=new Promise<void>(r=>{release=r;});const fetcher:typeof fetch=async(_url,init)=>{if(String(_url).startsWith('https://cloudflare-dns.com/'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(String(_url).includes('anthropic')){calls++;await gate;const payload=JSON.parse(String(init?.body));if(payload.system.startsWith('Independently'))return aiResponse({reviews:[{id:'0',status:'supported',reason:'Explicit read access.'}]});return aiResponse(wire(value()));}return new Response('<main>'+docs[0].text+'</main>');};
 const first=runJob(db,job.id,bindings,()=>{},new AbortController().signal,fetcher);while(!calls)await new Promise(r=>setTimeout(r,1));const duplicate=await runJob(db,job.id,bindings,()=>{},new AbortController().signal,fetcher);assert.equal(duplicate.state,'running');release();const done=await first;assert.equal(done.state,'ready');const before=calls;const reopened=await runJob(db,job.id,bindings,()=>{},new AbortController().signal,fetcher);assert.equal(reopened.state,'ready');assert.equal(calls,before);assert.equal(before,2);
});
test('review: stale processing is interrupted, not automatically rerun',async()=>{
 const {db,sqlite}=database(),job=await createJob(db,{app:'Acme Tasks',website:url},crypto.randomUUID());sqlite.prepare("UPDATE guide_jobs SET state='running',lease_until=1 WHERE id=?").run(job.id);assert.equal((await getJob(db,job.id))!.state,'interrupted');let calls=0;const result=await runJob(db,job.id,bindings,()=>{},new AbortController().signal,async()=>{calls++;throw new Error();});assert.equal(result.state,'interrupted');assert.equal(calls,0);
});
test('completion: a transient checkpoint write does not prevent the durable interruption record',async()=>{
 const {db}=database(),job=await createJob(db,{app:'Acme Tasks',website:url},crypto.randomUUID());
 let failed=false;
 const unreliable:Store={prepare(sql){
  if(!sql.startsWith('UPDATE guide_jobs SET payload='))return db.prepare(sql);
  return {bind(...args){
   const statement=db.prepare(sql).bind(...args);
   return {...statement,async run(){
    if(!failed){failed=true;throw new Error('Transient database error');}
    return statement.run();
   }};
  }};
 }};
 const result=await runJob(unreliable,job.id,bindings,()=>{},new AbortController().signal,async()=>assert.fail('The failing save precedes generation'));
 assert.ok(failed);
 assert.equal(result.state,'interrupted');
 assert.equal((await getJob(db,job.id))?.state,'interrupted');
 assert.equal((await getJob(db,job.id))?.leaseUntil,0);
});
test('review: a public API gets a concrete request test without OAuth registration',()=>{
 const p=value();p.oauthSupport='unknown';p.accessModel='public';p.findings=[];p.coverage=[{actionId:'read',action:'Read public sample posts',permissions:[],status:'mapped',reason:'GET /posts is public.',evidence:ev,support:'reviewed'}];p.steps=[{...p.steps[1],dependsOn:[],title:'GET a public sample post'}];const plan=researchedPlan(run(validateInterpretation(p,docs)).guide);assert.equal(plan.next!.title,'GET a public sample post');assert.equal(plan.permissions.length,0);assert.match(exportPlan(plan),/Request: GET \/issues/);
});

test('review: no-question requirements pass proceeds automatically to the final plan without a second click',async()=>{
 const old=run();old.guide.questions=[];let calls=0;
 const result=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(_url,init)=>{calls++;const payload=JSON.parse(String(init?.body));if(payload.system.startsWith('Identify'))return aiResponse({outcome:'requirements',intent:{requestedActions:value().requestedActions,prohibitions:value().prohibitions,accessModel:'oauth'},questions:[]});if(payload.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The quoted scope permits reads.'}]});return aiResponse(wire(value()));},old);
 assert.equal(result.guide.phase,'ready');assert.equal(result.guide.questions.length,0);assert.equal(result.guide.coverage[0].support,'reviewed');assert.equal(calls,3);
});
test('review: a semantic reviewer can identify a missing requested action without inventing a grant',async()=>{
 const result=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async()=>aiResponse({requestComplete:false,missingActions:[{id:'comments',title:'Read issue comments',operation:'read'}],reviews:[{id:'0',status:'supported',reason:'Documented read access.'}]}));assert.ok(result.value.coverage.some(c=>c.actionId==='comments'&&c.status==='unresolved'&&!c.permissions.length));
});
test('review: an interrupted process retries from its saved evidence and planning checkpoint',async()=>{
 const {db,sqlite}=database(),job=await createJob(db,{app:'Acme Tasks',website:url},crypto.randomUUID()),p=value();p.coverage[0].support='reviewed';job.checkpoint={research:{documents:docs,website:url,inferred:false,warnings:[]},clarificationUsed:true,followupDone:true,intent:{requestedActions:p.requestedActions,prohibitions:p.prohibitions},draft:p};
 sqlite.prepare("UPDATE guide_jobs SET payload=?,state='interrupted',lease_until=0 WHERE id=?").run(JSON.stringify(job),job.id);let calls=0;const result=await runJob(db,job.id,bindings,()=>{},new AbortController().signal,async()=>{calls++;throw new Error();},true);assert.equal(result.state,'ready');assert.equal(calls,0);assert.ok(result.guide!.steps.length);
});

test('review: authorization success cannot masquerade as the requested issue-read test',()=>{
 const p=value();p.steps[1].testKind='authorization';p.steps[1].title='Authorize and read the viewer profile';const plan=researchedPlan(run(p).guide);assert.ok(plan.steps.some(s=>s.id==='test-read'&&s.blockedBy?.length));assert.ok(plan.blockers.some(b=>b.title.includes('API test specification')));
});
test('review: pending launch-policy research does not delay independent test preparation',async()=>{
 const old=run();old.guide.clarificationUsed=true;const p=value();p.researchNeeded=['distribution'];let external=0;
 const result=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(url,init)=>{if(!String(url).includes('anthropic')){external++;throw new Error();}const payload=JSON.parse(String(init?.body));return payload.system.startsWith('Independently')?aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented read.'}]}):aiResponse(wire(p));},old);assert.equal(external,0);assert.equal(result.guide.phase,'ready');
});
test('review: reordered duplicate answers refer to the same continuation job',async()=>{
 const {db}=database(),id='lg-'+crypto.randomUUID();const a=await createJob(db,{app:'Acme Tasks',previousId:id,answers:{b:'B',a:'A'}},crypto.randomUUID()),b=await createJob(db,{app:'Acme Tasks',previousId:id,answers:{a:'A',b:'B'}},crypto.randomUUID());assert.equal(a.id,b.id);
});

test('follow-up instructions and verification checks do not disable registration or authorization',()=>{
 const p=value();p.steps.splice(1,0,{...p.steps[1],id:'authorize',testKind:'authorization',request:undefined,dependsOn:['register']});p.steps[2].dependsOn=['authorize'];
 p.blockers=[{title:'Keep read-only',consequence:'follow-up',owner:'Developer',resolution:'Do not request write permissions.',stepIds:['register']},{title:'Check member consent',kind:'verification',consequence:'test',owner:'Developer',resolution:'Test authorization with a non-admin member.',stepIds:['authorize'],resolutionStepIds:['authorize']}];
 const plan=researchedPlan(run(p).guide);assert.ok(plan.steps.every(s=>!s.blockedBy?.length));assert.equal(plan.next!.id,'register');
 p.blockers.push({title:'Admin must approve first',kind:'prerequisite',consequence:'test',owner:'Admin',resolution:'Obtain administrator approval.',stepIds:['authorize']});const gated=researchedPlan(run(p).guide);assert.equal(gated.steps[0].blockedBy?.length,0);assert.ok(gated.steps.find(s=>s.id==='authorize')!.blockedBy!.length);assert.ok(gated.steps.find(s=>s.id==='read-test')!.blockedBy!.length);
});
test('missing action requests augment the existing test and never block sign-in',()=>{
 const p=value();p.coverage[0].status='unresolved';p.steps[1].request=undefined;p.steps.splice(1,0,{...p.steps[1],id:'authorize',testKind:'authorization',dependsOn:['register']});const reconciled=reconcile(p),plan=researchedPlan(run(reconciled).guide);
 assert.equal(reconciled.steps.filter(s=>s.testKind==='action'&&s.actionIds?.includes('read')).length,1);assert.equal(plan.steps.find(s=>s.id==='authorize')!.blockedBy?.length,0);assert.ok(plan.steps.find(s=>s.id==='read-test')!.blockedBy!.length);
});
test('empty fallback findings never claim that preparation can continue or emit Guide ready',async()=>{
 const old=run();old.guide.clarificationUsed=true;const events: string[]=[];const result=await generate({...old.guide.input,previousId:old.guide.id},{},e=>events.push(e.stage),new AbortController().signal,async()=>{throw new Error();},old);
 assert.equal(result.guide.steps.length,0);assert.ok(!events.includes('Guide ready'));assert.ok(events.includes('Guide unfinished'));assert.doesNotMatch(reconcile(result.guide).recommendation,/Preparation can continue/);
});
test('a targeted action update retains choices and unrelated steps and saves a new immutable version',async()=>{
 const old=run(reconcile({...value(),steps:value().steps.map(s=>s.id==='read-test'?{...s,request:undefined}:s)}));old.guide.decisions=[{id:'access',question:'Access?',answer:'Read-only'}];old.guide.input.answers={access:'Read-only'};
 const before=structuredClone(old),wirePlan=wire(value());let calls=0;
 const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Explicitly documented.'}]});assert.ok(body.system.startsWith('Resolve ONE'));assert.deepEqual(JSON.parse(body.messages[0].content).answers,{access:'Read-only'});return aiResponse({findings:wirePlan.findings.filter(f=>f.kind==='permission'),coverage:wirePlan.coverage,steps:wirePlan.steps.filter(s=>s.testKind==='action')});},old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});
 assert.equal(calls,2);assert.deepEqual(old,before);assert.notEqual(updated.guide.id,old.guide.id);assert.equal(updated.guide.previousId,old.guide.id);assert.deepEqual(updated.guide.decisions,old.guide.decisions);assert.deepEqual(updated.guide.steps[0],old.guide.steps[0]);assert.equal(updated.guide.coverage[0].support,'reviewed');assert.equal(updated.guide.steps[1].request?.endpoint,'/issues');assert.equal(researchedPlan(updated.guide).steps[1].blockedBy?.length,0);assert.equal(updated.guide.setupTested,false);
 const {db}=database();await freezeResearchPlan(old.guide,db);await freezeResearchPlan(updated.guide,db);assert.deepEqual(await readPlan(old.guide.id,db),JSON.parse(JSON.stringify(researchedPlan(before.guide))));
});
test('recording a developer check needs no network and cannot establish missing documentation',async()=>{
 const old=run();old.guide.blockers=[{title:'Admin approval',kind:'prerequisite',consequence:'test',owner:'Admin',resolution:'Obtain approval.',stepIds:['read-test']}];
 const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'observation',blockerTitle:'Admin approval',note:'Our admin approved the test account.',satisfied:true,requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async()=>{throw new Error('No network allowed');},old);
 assert.equal(updated.guide.observations![0].reportedBy,'developer');assert.equal(updated.guide.setupTested,false);assert.equal(researchedPlan(updated.guide).steps[1].blockedBy?.length,0);assert.match(exportPlan(researchedPlan(updated.guide)),/Product has not verified this result/);
 old.guide.blockers[0].kind='missing-evidence';await assert.rejects(()=>generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'observation',blockerTitle:'Admin approval',note:'Checked.',satisfied:true,requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,fetch,old),/Missing documentation/);
});
test('failed action updates preserve the earlier guide and expose a retry without a false ready event',async()=>{
 const old=run(),events:string[]=[];const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,e=>events.push(e.stage),new AbortController().signal,async()=>new Response('',{status:503}),old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});assert.notEqual(updated.guide.engine!.outcome,'accepted');assert.deepEqual(updated.guide.steps,old.guide.steps);assert.ok(!events.includes('Guide ready'));
});
test('a missing request is blocked even if mistakenly listed as its own resolution step',()=>{const p=value();p.steps[1].request=undefined;p.blockers=[{title:'Missing issue query',kind:'missing-evidence',consequence:'test',owner:'Developer',resolution:'Find the documented query.',stepIds:['read-test'],resolutionStepIds:['read-test']}];const plan=researchedPlan(run(p).guide);assert.ok(plan.steps[1].blockedBy?.length);assert.equal(reconcile(p).steps.length,2);});
test('refreshing a legacy guide corrects rules without mutating its saved version or calling a model',async()=>{const old=run();old.guide.blockers=[{title:'Keep read-only',consequence:'follow-up',owner:'Developer',resolution:'Do not request writes.',stepIds:['register']}];old.guide.steps.push({...old.guide.steps[1],id:'duplicate'});const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'refresh',requestId:crypto.randomUUID()}},{},()=>{},new AbortController().signal,async()=>{throw new Error('No calls');},old);assert.equal(updated.guide.steps.filter(s=>s.testKind==='action').length,1);assert.ok(researchedPlan(updated.guide).steps.every(s=>!s.blockedBy?.length));assert.equal(old.guide.steps.length,3);assert.equal(updated.guide.engine?.attempts,0);});
test('legacy coverage blockers are retargeted away from authorization when refreshed',()=>{const p=value();p.coverage[0].status='unresolved';p.steps.splice(1,0,{...p.steps[1],id:'authorize',testKind:'authorization',request:undefined});p.blockers=[{title:p.coverage[0].action,consequence:'test',owner:'Developer',resolution:'Mapping missing.',stepIds:['authorize','read-test']}];const plan=researchedPlan(run(p).guide);assert.equal(plan.steps.find(s=>s.id==='authorize')!.blockedBy?.length,0);assert.ok(plan.steps.find(s=>s.id==='read-test')!.blockedBy?.length);});
test('adding a public documentation page updates only the selected action and reuses prior evidence',async()=>{
 const old=run();old.guide.requestedActions.push({id:'comments',title:'Read issue comments',operation:'read'});old.guide.coverage.push({actionId:'comments',action:'Read issue comments',permissions:[],status:'unresolved',reason:'Not documented.'});old.guide.input.useCase='Read issues and issue comments. Never write or delete issues.';
 const provided='https://docs.acmetasks.example.com/api/read-issue',requests:string[]=[],template=wire(value());
 const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'documentation',actionId:'read',url:provided,requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>{const u=String(_url);requests.push(u);if(u.startsWith('https://cloudflare-dns.com/'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(u===provided)return new Response('<main>Use GET /issues/TEST-1 to retrieve one issue from a selected test project. The issues:read permission permits this operation.</main>');if(u.includes('anthropic')){const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently')){assert.doesNotMatch(JSON.parse(body.messages[0].content).request,/Read issue comments/);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented read operation.'}]});}const data=JSON.parse(body.messages[0].content),source=data.documents.find((d:{url:string})=>d.url===provided),patch=structuredClone(template.steps[1]);patch.request={method:'GET',endpoint:'/issues/TEST-1',example:"curl 'https://api.acme.com/issues/TEST-1' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};(patch as unknown as {evidence:{passageId:string}[]}).evidence=[{passageId:source.passages[0].id}];return aiResponse({findings:[],coverage:template.coverage,steps:[patch]});}throw new Error('Unexpected request');},old);
 assert.equal(updated.guide.engine?.outcome,'accepted');assert.equal(updated.documents.length,2);assert.equal(requests.filter(u=>u===provided).length,1);assert.ok(!requests.some(u=>/duckduckgo|firecrawl|oauth$/.test(u)));assert.equal(updated.guide.steps.find(s=>s.id==='read-test')!.request?.endpoint,'/issues/TEST-1');assert.deepEqual(updated.guide.coverage.find(c=>c.actionId==='comments'),old.guide.coverage.find(c=>c.actionId==='comments'));assert.deepEqual(updated.guide.input.answers,old.guide.input.answers);
});
test('endpoint URLs and short code lines remain model context without becoming citable prose',()=>{const source={...docs[0],text:'GraphQL endpoint\nhttps://api.acmetasks.example.com/graphql\ncurl \\\n-X POST \\\n--data \'{ "query": "{ issues { nodes { id title } } }" }\' \\\nUse a read token to retrieve issues from the selected test project.'};const passages=contextPassages(sourcePassages([source]),source.id,'Read project issues');const endpoint=passages.find(p=>p.text.includes('https://api.acmetasks.example.com/graphql'));assert.ok(endpoint);assert.equal(sourcePassages([{...source,text:'https://api.acmetasks.example.com/graphql'}])[0].citable,false);assert.ok(passages.some(p=>p.text.includes('issues { nodes')));});
test('a documented action update clears legacy endpoint gaps while retaining administrator prerequisites',()=>{const p=value();p.coverage[0].support='reviewed';p.blockers=[{title:'Issue-read operation and endpoint are not verified',consequence:'test',owner:'Developer',resolution:'Check the GraphQL documentation and fill the request.',stepIds:['read-test']},{title:'Admin approval',kind:'prerequisite',consequence:'test',owner:'Admin',resolution:'Approve access first.',stepIds:['read-test']}];const updated=reconcile(p);assert.equal(updated.blockers.length,1);assert.equal(updated.blockers[0].title,'Admin approval');});
test('resolving an issue request removes its obsolete endpoint warning while retaining other evidence gaps',()=>{const p=value();p.coverage[0].support='reviewed';p.unknowns=['The issue-read operation and endpoint are not in the supplied passages.','The comment endpoint is not in the supplied passages.','Customer approval policy is unknown.'];const updated=reconcile(p);assert.deepEqual(updated.unknowns,['The comment endpoint is not in the supplied passages.','Customer approval policy is unknown.']);});
test('an unresolved placeholder for another action cannot prevent a valid targeted update',async()=>{const old=run();old.guide.requestedActions.push({id:'comments',title:'Read comments',operation:'read'});old.guide.steps.push({...value().steps[1],id:'comments-test',actionIds:['comments'],request:undefined,evidence:[]});const template=wire(value());const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>JSON.parse(String(init?.body)).system.startsWith('Independently')?aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]}):aiResponse({findings:[],coverage:template.coverage,steps:[template.steps[1]]}),old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});assert.equal(updated.guide.engine?.outcome,'accepted');assert.deepEqual(updated.guide.steps.find(s=>s.id==='comments-test')?.evidence,[]);assert.equal(updated.guide.steps.find(s=>s.id==='read-test')?.request?.endpoint,'/issues');});
test('an unconfigured model produces a retryable saved failure instead of a completed plan',async()=>{const {db}=database(),old=run();old.guide.clarificationUsed=true;await db.prepare('INSERT INTO live_guides (id,payload,created_at) VALUES (?,?,?)').bind(old.guide.id,JSON.stringify(old),old.guide.generatedAt).run();const job=await createJob(db,{...old.guide.input,previousId:old.guide.id},crypto.randomUUID());const done=await runJob(db,job.id,{},()=>{},new AbortController().signal,async()=>{throw new Error('No network');});assert.equal(done.state,'interrupted');assert.equal(await readPlan(done.guide!.id,db),null);});
test('the small structured action response keeps identity and dependency fields under server control',async()=>{const old=run(),template=wire(value());const c=template.coverage[0],s=template.steps[1];const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>{const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]});assert.ok(body.output_config.format.schema.properties.steps);assert.deepEqual(body.thinking,{type:'adaptive'});assert.equal(body.output_config.effort,'medium');return aiResponse({findings:[],coverage:{permissions:c.permissions,status:c.status,reason:c.reason,evidence:c.evidence},step:{title:s.title,detail:s.detail,doneWhen:s.doneWhen,evidence:s.evidence,request:s.request}});},old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});assert.equal(updated.guide.engine?.outcome,'accepted');assert.equal(updated.guide.steps[1].id,'read-test');assert.deepEqual(updated.guide.steps[1].dependsOn,['register']);assert.equal(updated.guide.steps[1].owner,'developer');});
test('targeted replacement redirects legacy duplicate dependencies to the retained action step',async()=>{const old=run();old.guide.steps.push({...old.guide.steps[1],id:'duplicate'});old.guide.steps.push({...old.guide.steps[0],id:'launch',stage:'launch',dependsOn:['duplicate']});old.guide.blockers=[{title:'Launch approval',kind:'prerequisite',consequence:'launch',owner:'Admin',resolution:'Approve deployment.',stepIds:['launch'],resolutionStepIds:['duplicate']}];const template=wire(value());const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>JSON.parse(String(init?.body)).system.startsWith('Independently')?aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]}):aiResponse({findings:[],coverage:template.coverage,steps:[template.steps[1]]}),old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});assert.equal(updated.guide.engine?.outcome,'accepted');assert.equal(updated.guide.steps.filter(s=>s.testKind==='action').length,1);assert.deepEqual(updated.guide.steps.find(s=>s.id==='launch')!.dependsOn,['read-test']);assert.deepEqual(updated.guide.blockers.find(b=>b.title==='Launch approval')!.resolutionStepIds,['read-test']);});

test('submission: OAuth consent is a lifecycle requirement rather than a second resource request',()=>{const p=value();p.requestedActions.push({id:'consent',title:'Each customer authorizes the app',operation:'authorize'});p.coverage.push({actionId:'consent',action:'Each customer authorizes the app',permissions:[],status:'unresolved',reason:'Consent is not a resource endpoint.'});p.steps.push({...p.steps[1],id:'authorization',testKind:'authorization',actionIds:['consent'],request:undefined});p.steps.push({...p.steps[1],id:'test-consent',actionIds:['consent'],request:undefined});p.blockers.push({title:'Consent needs an API request',kind:'missing-evidence',consequence:'test',owner:'Developer',resolution:'Find it.',actionId:'consent',stepIds:['test-consent']});const out=reconcile(p);assert.equal(out.steps.filter(s=>s.testKind==='action').length,1);assert.ok(out.steps.some(s=>s.testKind==='authorization'));assert.ok(!out.coverage.some(c=>c.actionId==='consent'));assert.ok(!out.blockers.some(b=>b.actionId==='consent'));});
test('submission: removing a duplicate consent test retains its administrator prerequisite',()=>{const p=value();p.requestedActions.push({id:'consent',title:'Authorize the app',operation:'authorize'});p.steps.push({...p.steps[1],id:'authorization',testKind:'authorization',actionIds:['consent'],request:undefined});p.steps.push({...p.steps[1],id:'test-consent',actionIds:['consent'],request:undefined});p.blockers.push({title:'Administrator approval required',kind:'prerequisite',consequence:'test',owner:'Admin',resolution:'Obtain approval before consent.',actionId:'consent',stepIds:['test-consent']});const out=reconcile(p);assert.deepEqual(out.blockers[0].stepIds,['authorization']);const plan=researchedPlan(run(out).guide);assert.ok(plan.steps.find(s=>s.id==='authorization')!.blockedBy?.length);assert.ok(!out.steps.some(s=>s.id==='test-consent'));});
test('submission: structured request gaps resolve independently of human wording, while permission gaps require review',()=>{for(const title of ['Project endpoint not in supplied sources','Waiting on a request','Any unrelated title']){const p=value();p.blockers=[{title,kind:'missing-evidence',gap:{actionId:'read',fact:'request'},consequence:'test',owner:'Developer',resolution:'Resolve the gap.',stepIds:['read-test']}];assert.equal(reconcile(p).blockers.length,0);}const p=value();p.blockers=[{title:'Permission',kind:'missing-evidence',gap:{actionId:'read',fact:'permission'},consequence:'test',owner:'Developer',resolution:'Verify permission.',stepIds:['read-test']}];assert.equal(reconcile(p).blockers.length,1);p.coverage[0].support='reviewed';assert.equal(reconcile(p).blockers.length,0);});
test('submission: legacy project gap migrates once and launch policy never disables registration',()=>{const p=value();p.coverage[0].support='reviewed';p.blockers=[{title:'Project endpoint not in supplied sources',consequence:'test',owner:'Developer',resolution:'Find the documented project endpoint.',stepIds:['read-test']},{title:'Customer distribution needs checking',consequence:'launch',owner:'Developer',resolution:'Check before rollout.',stepIds:['register']}];const out=reconcile(p);assert.equal(out.semanticsVersion,2);assert.ok(!out.blockers.some(b=>b.title.startsWith('Project endpoint')));assert.ok(researchedPlan(run(out).guide).steps.every(s=>!s.blockedBy?.length));out.blockers.push({title:'Administrator approval',kind:'prerequisite',consequence:'test',owner:'Admin',resolution:'Obtain approval.',stepIds:['register']});assert.ok(researchedPlan(run(out).guide).steps[1].blockedBy?.length);});
test('submission: a read grant with explicit negative write constraints is not a mutation request',()=>{const p=value();p.findings[1].detail='Read issues. Never write or delete issues.';assert.doesNotThrow(()=>validateInterpretation(p,docs));p.findings[1].detail='Delete issues using this grant.';assert.throws(()=>validateInterpretation(p,docs),/contradicts/);});
test('submission: scope labels remain attached to the source description when converted to citations',()=>{const d={...docs[0],text:'data:read\nGrants read-only access to tasks, projects, labels and filters.\ndata:read_write\nGrants write access to tasks and projects.'};const passages=sourcePassages([d]);const grant=passages.find(p=>p.text.startsWith('data:read '));assert.ok(grant?.citable);assert.ok(grant.text.includes('read-only'));assert.ok(!grant.text.includes('write access'));assert.ok(d.text.replace(/\s+/g,' ').includes(grant.text));});
test('submission: model access review receives the documented request context rather than only a scope label',async()=>{await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async(_url,init)=>{const body=JSON.parse(String(init?.body)),data=JSON.parse(body.messages[0].content);assert.equal(data.mappings[0].requestEvidence[0].request.endpoint,'/issues');assert.ok(data.mappings[0].conditions.length);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The source-backed request reads issues.'}]});});});
test('submission: the bounded citation slots normalize to ordinary evidence without changing the action',async()=>{const old=run(),p=wire(value()),passage=(p.steps[1].evidence[0] as unknown as {passageId:string}).passageId;const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>JSON.parse(String(init?.body)).system.startsWith('Independently')?aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]}):aiResponse({findings:[],coverage:{...p.coverage[0],evidence:{primary:passage,secondary:'',tertiary:''}},step:{...p.steps[1],evidence:{primary:passage,secondary:'',tertiary:''}}}),old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});assert.equal(updated.guide.engine?.outcome,'accepted');assert.equal(updated.guide.steps[1].evidence.length,1);});
test('submission: a full resource reference cannot crowd registration and capability evidence out of planning',async()=>{const {planningDocuments}=await import('../lib/live-guide/interpretation.ts');const documents=[{...docs[0],id:'auth',url:'https://docs.acmetasks.example.com/guides/authorization'},{...docs[0],id:'permission',url:'https://docs.acmetasks.example.com/reference/capabilities'},...Array.from({length:6},(_,i)=>({...docs[0],id:'resource'+i,title:'Read project issues',url:'https://docs.acmetasks.example.com/api/issues/list-'+i}))];const selected=planningDocuments(documents,run().guide.input,{requestedActions:value().requestedActions,prohibitions:[]});assert.ok(selected.some(d=>d.id==='auth'));assert.ok(selected.some(d=>d.id==='permission'));assert.ok(selected.some(d=>d.id.startsWith('resource')));assert.ok(selected.length<=4);});
test('submission: permission display and prepared rationale use the newly verified action evidence',()=>{const p=value();p.coverage[0].support='reviewed';p.coverage[0].reason='The documented read request uses issues:read for project issues.';p.findings[1].detail='This relationship is unresolved and needs confirmation.';const plan=researchedPlan(run(p).guide);assert.equal(plan.permissions[0].detail,p.coverage[0].reason);assert.doesNotMatch(plan.preparation.find(p=>p.title==='Permissions rationale')!.text,/unresolved/);p.coverage[0].status='unresolved';p.steps[0].fields=['issues:read'];const tentative=researchedPlan(run(p).guide);assert.match(tentative.permissions[0].detail,/Candidate only/);assert.match(tentative.steps[0].title,/Draft:/);});
test('completion: distinct retrieved operations for one resource survive tied relevance scores',async()=>{
 const {planningDocuments}=await import('../lib/live-guide/interpretation.ts');
 const documents=[{...docs[0],id:'auth',url:'https://docs.acme.example/guides/authorization'},...['metadata','properties','content'].map((name,i)=>({...docs[0],id:'op'+i,title:'Retrieve issues '+name,url:'https://docs.acme.example/reference/retrieve-issues-'+name,text:'Retrieve issues '+name+' using GET /issues/{id}/'+name+'. Requires issues:read permission.'}))];
 const selected=planningDocuments(documents,run().guide.input,{requestedActions:value().requestedActions,prohibitions:[]});
 assert.ok(selected.some(d=>d.id==='auth'));for(const d of documents.slice(1))assert.ok(selected.includes(d),d.url);
});
test('submission: an application deadline cannot become provider approval waiting time',()=>{const source={...docs[0],text:docs[0].text+'\nApply for production status within 2 weeks of reaching the limit.'};const p=value();p.findings.push({kind:'provider-wait',title:'Production approval',detail:'Wait 2 weeks for approval.',scope:'',appliesWhen:'After submitting.',evidence:[{sourceId:'s1',quote:'Apply for production status within 2 weeks of reaching the limit.'}]});assert.throws(()=>validateInterpretation(p,[source]),/deadline to apply/);});

test('final: new documentation on saved continuation invalidates a stale draft and appends evidence',async()=>{const old=run(),added='https://docs.acmetasks.example.com/reference/issues';const before=structuredClone(old);let reads=0;const result=await generate({...old.guide.input,previousId:old.guide.id,documentationUrl:added},{},()=>{},new AbortController().signal,async u=>{if(String(u).includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(String(u)===added){reads++;return new Response('<main>The issues:read permission allows reading issues in a selected project. Use GET /issues for the selected project and no write permission.</main>');}return new Response('',{status:404});},old,{checkpoint:{research:{website:url,documents:old.documents,inferred:false,warnings:[]},draft:value()}});assert.equal(reads,1);assert.ok(result.documents.some(d=>d.url===added));assert.equal(result.guide.mode,'evidence-only');assert.deepEqual(old,before);});
test('final: failed documentation recovery cannot silently reuse only the previous sources',async()=>{const old=run();await assert.rejects(()=>generate({...old.guide.input,previousId:old.guide.id,documentationUrl:'https://docs.acmetasks.example.com/missing'},{},()=>{},new AbortController().signal,async u=>String(u).includes('cloudflare-dns')?Response.json({Answer:[{type:1,data:'104.18.40.45'}]}):new Response('',{status:404}),old),/readable|documentation/i);});
test('final: targeted repair recovery prioritizes the supplied URL even with a checkpoint',async()=>{const old=run(),added='https://docs.acmetasks.example.com/reference/issues',patch=wire(value());old.guide.requestedActions.push({id:'comments',title:'Read comments',operation:'read'});old.guide.coverage.push({actionId:'comments',action:'Read comments',permissions:[],status:'unresolved',reason:'Missing comments evidence.'});let fetched=false;const result=await generate({...old.guide.input,previousId:old.guide.id,documentationUrl:added,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(u,init)=>{if(String(u).includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(String(u)===added){fetched=true;return new Response('<main>The issues:read permission allows reading issues in a selected project. The new API reference documents GET /issues for reading project issues.</main>');}const body=JSON.parse(String(init?.body));return aiResponse(body.system.startsWith('Independently')?{requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]}:{findings:[],coverage:patch.coverage,steps:[patch.steps[1]]});},old,{checkpoint:{research:{website:url,documents:old.documents,inferred:false,warnings:[]}}});assert.ok(fetched);assert.ok(result.documents.some(d=>d.url===added));assert.equal(result.guide.coverage.find(c=>c.actionId==='read')?.support,'reviewed');assert.equal(result.guide.coverage.find(c=>c.actionId==='comments')?.status,'unresolved');assert.deepEqual(result.guide.input.answers,old.guide.input.answers);});
test('final: live curl examples quote query URLs, preserve JSON and resolve documented version headers',async()=>{const {shellSafeCurl,completeRequestExamples}=await import('../lib/live-guide/request-examples.ts');const {spawnSync}=await import('node:child_process');const example=shellSafeCurl('curl --request GET --url https://api.acme.com/v1/pages/TEST_PAGE?filter=title&limit=1 -H "Authorization: Bearer TEST_TOKEN"');const result=spawnSync('/bin/zsh',['-fc','function curl() { printf "%s\\n" "$@"; }; '+example],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/TEST_PAGE\?filter=title&limit=1/);assert.match(result.stdout,/Authorization: Bearer TEST_TOKEN/);const raw={steps:[{request:{example:'curl https://api.acme.com/v1/pages/TEST -H "Notion-Version: <notion-version>"'}}]};const fixed=completeRequestExamples(raw,[{...docs[0],text:'Every request requires Notion-Version: 2026-03-11.'}]);assert.match(fixed.steps[0].request.example,/2026-03-11/);assert.match(raw.steps[0].request.example,/<notion-version>/);assert.throws(()=>completeRequestExamples(raw,docs),/not established/);});
test('final: every reviewed action has a parseable backend request with actual payloads and input guidance',async()=>{const {reviewedRequests}=await import('../lib/plan/reviewed-requests.ts');const {capabilities}=await import('../lib/advisor/providers.ts');const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;for(const provider of ['gmail','slack','github'] as const){const a={...emptyAssessment(provider),capabilities:capabilities[provider].map(c=>c.id)};const requests=reviewedRequests(a).steps;assert.equal(requests.length,a.capabilities.length);for(const s of requests){assert.ok(s.fields.length);assert.match(s.doneWhen,/HTTP/);const calls:unknown[]=[];await new AsyncFunction('session','Buffer',s.request!.example)({proxyExecute:async (args:unknown)=>{calls.push(args);return {resultType:'completed',status:200,data:{}};}},Buffer);assert.equal(calls.length,1);assert.ok(!s.request!.example.includes('REPLACE_WITH_RAW'));}}});
test('final: next action follows personal progress without changing saved verification',async()=>{const {nextFromProgress,featureSummary}=await import('../lib/plan/presentation.ts');const a={...emptyAssessment('gmail'),capabilities:['send'],audience:'public' as const,stage:'test' as const,branding:'no' as const};const p=reviewedPlan(a,recommend(a));const original=structuredClone(p);assert.equal(nextFromProgress(p,[])?.id,p.steps[0].id);assert.equal(nextFromProgress(p,[p.steps[0].id])?.id,p.steps[1].id);assert.equal(nextFromProgress(p,p.steps.map(s=>s.id)),null);assert.equal(nextFromProgress(p,[])?.id,p.steps[0].id);assert.deepEqual(p,original);assert.match(featureSummary(p).join(' · '),/Send email.*Customer accounts.*Testing/);assert.ok(!p.steps.some(s=>s.id==='gate-GOOGLE-MANAGED'));});
test('final: Markdown retains request code, route code, administrator timing and reported resolution',()=>{const a={...emptyAssessment('gmail'),capabilities:['send'],audience:'public' as const,stage:'test' as const,branding:'no' as const},p=reviewedPlan(a,recommend(a));p.blockers.push({id:'reported',title:'Test administrator check',consequence:'follow-up',owner:'Developer',resolution:'Check the installation.',resolved:true});const out=exportPlan(p);assert.ok(out.includes(p.code!));assert.ok(out.includes(p.timing.external));assert.ok(out.includes(p.steps.find(s=>s.request)!.request!.example));assert.match(out,/```javascript/);assert.match(out,/Reported complete · product has not verified: Test administrator check/);assert.ok(!out.includes('Outstanding follow-up: Test administrator check'));});
test('final: font failures do not become provider setup follow-ups',()=>{const old=run();old.guide.warnings=['Could not read docs.acmetasks.example.com/fonts/text.woff2.'];assert.ok(!researchedPlan(old.guide).blockers.some(b=>b.title.includes('woff2')));});
test('final: completing preparation cannot highlight customer launch while the first test is blocked',async()=>{const {nextFromProgress}=await import('../lib/plan/presentation.ts');const p=researchedPlan(run().guide);p.steps.push({...p.steps[0],id:'launch',stage:'launch'});p.steps[1].blockedBy=['missing-evidence'];assert.equal(nextFromProgress(p,[p.steps[0].id]),null);});
test('final: oversized action prose gets one bounded format repair without repeating source reads',async()=>{const old=run(),p=wire(value());let calls=0;const result=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]});calls++;const s={...p.steps[1],detail:calls===1?'A'.repeat(801):p.steps[1].detail};return aiResponse({findings:[],coverage:p.coverage,steps:[s]});},old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});assert.equal(calls,2);assert.equal(result.guide.engine?.outcome,'accepted');assert.equal(result.documents.length,old.documents.length);assert.equal(result.guide.steps[1].detail,p.steps[1].detail);assert.equal(result.guide.engine?.attempts,3);});
test('final: independent access review receives source identity alongside exact quoted evidence',async()=>{const p=value();await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_url,init)=>{const body=JSON.parse(String(init?.body)),audit=JSON.parse(body.messages[0].content);assert.deepEqual(audit.mappings[0].sourceContext,[{id:docs[0].id,url:docs[0].url,title:docs[0].title}]);assert.equal(audit.mappings[0].evidence[0].quote,ev[0].quote);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Scope and endpoint occur in the identified reference.'}]});},docs);});


test('completion: a paginated request needs both a concrete continuation and an end condition',()=>{
 const p=value();p.steps[1].request={method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues?page=1' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};p.steps[1].detail='Read the first page. Boundary check: inspect the outgoing request log.';p.steps[1].doneWhen='Two pages returned issue titles.';
 assert.throws(()=>validateInterpretation(p,docs,'Read all project issues, including pagination.'),/stopping condition/);
 p.steps[1].detail+=' Repeat with increasing page until the documented empty collection.';
 assert.doesNotThrow(()=>validateInterpretation(p,docs,'Read all project issues, including pagination.'));
});
test('completion: source-backed instruction correction retains requests, permissions and bounded supporting citations',async()=>{
 const sources=[...docs,{...docs[0],id:'s2',url:'https://acmetasks.example.com/docs/pagination',text:'The page parameter starts at one. Repeat with the next page number until the returned issues array is empty.'}];
 const p=value();p.steps[1].request={method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues?page=1' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};p.steps[1].detail='Read project issue titles. Boundary check: inspect the granted permission and outgoing request log.';p.steps[1].doneWhen='Two pages of issues are returned.';const before=structuredClone(p);let calls=0;
 const corrected=await completeTestInstructions(p,sources,'Read issues including pagination.',bindings,new AbortController().signal,async(_u,init)=>{
  calls++;const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content),passage=context.documents.flatMap((d:any)=>d.passages).find((x:any)=>x.citable&&x.text.includes('array is empty'));
  assert.equal(context.paginationRequired,true);assert.ok(passage);
  return aiResponse({items:[{index:1,detail:'Read project issue titles. Repeat with the next page number until the issues array is empty. Boundary check: inspect the grant and outgoing request log; never write.',doneWhen:'Every returned issue title is collected and the final response has an empty issues array.',citations:{primary:context.documents.flatMap((d:any)=>d.passages).find((x:any)=>x.citable&&x.text.includes('issues:read permission'))!.id,secondary:passage.id,tertiary:''}}]});
 },()=>{});
 assert.equal(calls,1);assert.deepEqual(p,before);assert.deepEqual(corrected.findings,before.findings);assert.deepEqual(corrected.coverage,before.coverage);assert.deepEqual(corrected.steps[0],before.steps[0]);assert.deepEqual(corrected.steps[1].request,before.steps[1].request);assert.equal(corrected.steps[1].evidence.length,before.steps[1].evidence.length+1);assert.doesNotThrow(()=>validateInterpretation(corrected,sources,'Read issues including pagination.'));
});
test('completion: instance URL inputs have one HTTPS scheme and retain their documented route',async()=>{
 const {completeRequestExamples}=await import('../lib/live-guide/request-examples.ts');
 const {inspectHandoff}=await import('../scripts/inspect-handoff.mts');
 for(const placeholder of ['<instance-base-url>','[YOUR-INSTANCE]','{instanceHost}','YOUR-INSTANCE-HOST']){
  const p=value();p.steps[1].request={method:'GET',endpoint:'/issues',example:`curl 'https://${placeholder}/issues?page=1' -H 'Authorization: Bearer <ACCESS_TOKEN>'`};p.steps[1].fields=['Instance host from your deployment'];const before=structuredClone(p);
  const fixed=completeRequestExamples(p,docs),request=inspectHandoff(fixed)[0];
  assert.equal(request.stub.url,'https://instance.example/issues?page=1');assert.deepEqual(request.errors,[]);assert.match(fixed.steps[1].fields![0],/full HTTPS instance URL/);assert.equal(fixed.steps[1].request!.endpoint,'/issues');assert.deepEqual(p,before);
 }
});
test('completion: targeted repair validates a retained continuation together with its replacement',async()=>{
 const old=run();old.guide.input.useCase+=' Include pagination.';old.documents=[...docs,{...docs[0],id:'s2',url:'https://acmetasks.example.com/docs/pagination',text:'Use cursor with the returned next_cursor. Repeat requests until next_cursor is null.'}];old.guide.steps.push({...old.guide.steps[1],id:'next-page',dependsOn:['read-test'],request:{method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues?cursor=<NEXT_CURSOR>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"},detail:'Repeat using the returned next_cursor until next_cursor is null. Boundary check: inspect the read-only grant and request log.'});const before=structuredClone(old),patch=wire(value());let calls=0;
 const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>{
  calls++;const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);
  if(body.system.startsWith('Independently')){assert.match(JSON.stringify(context),/NEXT_CURSOR/);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The grant and both requests are documented.'}]});}
  assert.equal(context.retainedActionSteps.length,2);return aiResponse({findings:[],coverage:patch.coverage,steps:[patch.steps[1]]});
 },old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});
 assert.equal(calls,2);assert.equal(updated.guide.engine!.outcome,'accepted');assert.equal(updated.guide.coverage[0].support,'reviewed');assert.deepEqual(updated.guide.steps.find(s=>s.id==='next-page'),before.guide.steps.find(s=>s.id==='next-page'));assert.deepEqual(old,before);
});
test('completion: a grant rejection identifies its exact field and quoted evidence',()=>{
 const p=value();p.findings[1].scope='issues:read,issues:write';
 assert.throws(()=>validateInterpretation(p,docs),(error:any)=>/not present/.test(error.message)&&error.message.includes('"path":["findings",1,"scope"]')&&error.message.includes('issues:read,issues:write')&&error.message.includes(ev[0].quote));
});


test('completion: the actual curl URL, method and JSON are validated independently of metadata',()=>{
 const p=value();p.steps[1].request!.example="curl 'https://api.acme.com/undocumented' -H 'Authorization: Bearer <ACCESS_TOKEN>'";
 assert.throws(()=>validateInterpretation(p,docs),/example is not documented/);
 p.steps[1].request!.example="curl -X POST 'https://api.acme.com/issues' -H 'Authorization: Bearer <ACCESS_TOKEN>'";
 assert.throws(()=>validateInterpretation(p,docs),/different method/);
 p.steps[1].request!.example="curl 'https://api.acme.com/issues?invented=1' -H 'Authorization: Bearer <ACCESS_TOKEN>'";
 assert.throws(()=>validateInterpretation(p,docs),/Undocumented query fields: invented/);
 p.steps[1].request!.method='POST';p.steps[1].request!.example="curl 'https://api.acme.com/issues' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: application/json' -d '{bad}'";
 assert.throws(()=>validateInterpretation(p,docs),/malformed JSON/);
});
test('completion: a boundary label without a check cannot pass the handoff',()=>{
 const p=value();p.steps[1].detail='Read the issues. Boundary check: none in this step.';p.steps[1].doneWhen='Response 200.';
 assert.throws(()=>validateInterpretation(p,docs),/safe nonmutating Boundary check/);
});
test('completion: targeted repair can correct a continuation while preserving other action requests',async()=>{
 const old=run();old.guide.input.useCase+=' Include pagination.';old.guide.steps.push({...old.guide.steps[1],id:'next-page',dependsOn:['read-test'],request:{method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues?cursor=<NEXT_CURSOR>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"},detail:'Continue the listing. Boundary check: inspect the grant and request log.'});old.guide.coverage[0].status='unresolved';old.guide.coverage[0].reason='next-page must use documented page pagination.';const before=structuredClone(old),patch=wire(value());let audited=false;
 const result=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_u,init)=>{
  const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);
  if(body.system.startsWith('Independently')){assert.ok(context.setupSteps.some((s:any)=>s.id==='register'));const requests=context.mappings[0].requestEvidence;assert.equal(requests.length,2);assert.ok(requests.some((s:any)=>s.request.example.includes('page=2')));audited=true;return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Both requests match the documented pagination.'}]});}
  assert.match(context.currentActionReview.reason,/next-page/);const next={...patch.steps[1],stepId:'next-page',detail:'Continue with the next page until the documented end. Boundary check: inspect the granted read scope and outgoing GET requests.',request:{method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues?page=2' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}};return aiResponse({findings:[],coverage:patch.coverage[0],steps:[next]});
 },old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});
 assert.ok(audited);assert.equal(result.guide.engine!.outcome,'accepted');assert.deepEqual(result.guide.steps.find(s=>s.id==='read-test'),before.guide.steps.find(s=>s.id==='read-test'));assert.match(result.guide.steps.find(s=>s.id==='next-page')!.request!.example,/page=2/);assert.deepEqual(old,before);
});
test('completion: common pagination concepts remain in a full planning context',()=>{
 const endpointDocs=Array.from({length:8},(_,i)=>({...docs[0],id:'e'+i,url:'https://acmetasks.example.com/reference/list-issues-'+i,text:'GET /issues/'+i+' lists project issues.'}));const pagination={...docs[0],id:'p',url:'https://acmetasks.example.com/api/general-concepts/',text:'Pagination follows the returned next link until it is absent.'};
 const selected=planningDocuments([...docs,...endpointDocs,pagination],{...run().guide.input,useCase:'Read project issues including pagination.'},value());assert.ok(selected.includes(pagination));assert.ok(selected.length<=8);
});

test('completion: disabled write capabilities are negative constraints, not requested mutations',()=>{
 const p=value();p.findings[1].detail='Read issues. Disable write and update capabilities.';assert.doesNotThrow(()=>validateInterpretation(p,docs));
 p.findings[1].detail='Read issues and update their content.';assert.throws(()=>validateInterpretation(p,docs),/contradicts/);
});


test('completion: compact structured transport preserves action grants, requests and exact citations',async()=>{
 const {decodeWirePlan}=await import('../lib/live-guide/wire.ts');const {factsSchema}=await import('../lib/live-guide/plan-parts.ts');const ps=sourcePassages(docs),permission=ps.find(p=>p.text.includes('issues:read permission'))!.id,oauth=ps.find(p=>p.text.includes('Create an OAuth'))!.id;
 const wire={tableVersion:'launch-guide-table.v1',summary:'Read project issues with the documented grant.',accessModel:'oauth',oauthSupport:'documented',actions:[['read','Read project issues','read']],prohibitions:['Never write or delete issues.'],findings:[['oauth','Register an app','Create a test OAuth app.','','','prepare',oauth],['permission','Read issues','Read issue content.','issues:read','','test',permission]],steps:[['read-test','Read project issues','Read the test project issue titles. Boundary check: inspect the actual grant and outgoing GET requests.','developer','Response 200 contains the issue titles.','test','action','','read','GET','/issues',"curl 'https://api.acme.com/issues' -H 'Authorization: Bearer $ACCESS_TOKEN'",'', 'ACCESS_TOKEN: test account OAuth token',permission]],coverage:[['read','issues:read','mapped','The source permits issue reads.',permission]],blockers:[],unknowns:[],researchNeeded:[]};
 const result=await interpretEvidence(run().guide.input,docs,bindings,new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body));assert.deepEqual(body.output_config.format.schema,factsSchema);return aiResponse(wire);},[],{final:true,intent:{requestedActions:value().requestedActions,prohibitions:value().prohibitions}});
 assert.equal(result.mode,'interpreted');assert.equal(result.telemetry.attempts,1);assert.equal(result.value.findings[1].scope,'issues:read');assert.deepEqual(result.value.coverage[0].permissions,['issues:read']);assert.match(result.value.steps[0].request!.example,/<ACCESS_TOKEN>/);assert.deepEqual(result.value.steps[0].evidence,ev);assert.equal(result.value.prohibitions[0],'Never write or delete issues.');
 assert.throws(()=>decodeWirePlan({...wire,steps:[wire.steps[0].slice(1)]}),/exactly 15 string columns/);
});
test('completion: shell variable inputs are normalized before actual request grounding',()=>{
 const p=value();p.steps[1].request={method:'GET',endpoint:'/issues/{issue_id}',example:"curl 'https://api.acme.com/issues/$ISSUE_ID' -H 'Authorization: Bearer ${ACCESS_TOKEN}'"};const source=[{...docs[0],text:docs[0].text+'\nGET /issues/{issue_id} returns the requested issue.'}];
 const fixed=validateInterpretation(p,source);assert.match(fixed.steps[1].request!.example,/issues\/<ISSUE_ID>/);assert.match(fixed.steps[1].request!.example,/Bearer <ACCESS_TOKEN>/);
});
test('completion: returned next-link requests retain grounding and input provenance',async()=>{
 const p=value();p.steps[1].request={method:'GET',endpoint:'/issues',example:"curl '<NEXT_PAGE_URL>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};p.steps[1].detail='Follow the next Link URL unchanged until no next link is returned. Boundary check: inspect the actual grant and outgoing GET requests.';p.steps[1].evidence=[...ev,{sourceId:'s1',quote:'Follow the Link header next URL until it is absent.'}];const source=[{...docs[0],text:docs[0].text+'\nFollow the Link header next URL until it is absent.'}];
 const fixed=validateInterpretation(p,source,'Read issues including pagination.');const {inspectHandoff,paginationHandoff}=await import('../scripts/inspect-handoff.mts');const requests=inspectHandoff(fixed);assert.deepEqual(requests[0].errors,[]);assert.equal(requests[0].stub.url,'https://instance.example/issues?page=2');assert.ok(paginationHandoff(fixed,requests));assert.ok(fixed.steps[1].fields!.some(f=>/Next-page URL/.test(f)));
 assert.throws(()=>validateInterpretation({...p,steps:p.steps.map(s=>({...s,evidence:ev}))},docs,'Read issues including pagination.'),/without documented next-link/);
});
test('completion: escaped markup links cannot become malformed public documentation paths',()=>{
 const p=parsePage('https://docs.acme.com/api/','<main>Documentation for the public developer API.</main><a href="/oauth">OAuth</a><script>const example="<a href=\\"https://other.example.com/page\\">click</a>"</script>');assert.ok(p.links.includes('https://docs.acme.com/oauth'));assert.ok(p.links.every(l=>!/%22|%3C|%3E/.test(l)));
});

test('completion: a full instance URL variable retains the required HTTPS input contract',()=>{
 for(const token of ['$INSTANCE_URL','${BASE_URL}','<INSTANCE_BASE_URL>']){const p=value();p.steps[1].request!.example=`curl '${token}/issues' -H 'Authorization: Bearer <ACCESS_TOKEN>'`;const fixed=validateInterpretation(p,docs);assert.match(fixed.steps[1].request!.example,/<INSTANCE_BASE_URL>\/issues/);assert.ok(fixed.steps[1].fields!.some(f=>/full HTTPS instance URL/.test(f)));}
});


test('completion: a stalled response body is cancelled as soon as its stage aborts',async()=>{
 const {boundedText}=await import('../lib/live-guide/retrieval.ts');let cancelled=false;const controller=new AbortController();const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('partial'));},cancel(){cancelled=true;}});const result=boundedText(new Response(body),controller.signal);controller.abort(new DOMException('Stage expired','TimeoutError'));await assert.rejects(()=>result,/Stage expired/);assert.equal(cancelled,true);
});
test('completion: documented route variables accept literal representative IDs without accepting invented paths',()=>{
 const p=value();p.steps[1].request={method:'GET',endpoint:'/issues/{issue_id}',example:"curl 'https://api.acme.com/issues/ISSUE_ID' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};const source=[{...docs[0],text:docs[0].text+'\nGET /issues/{issue_id} returns the issue.'}];const fixed=validateInterpretation(p,source);assert.match(fixed.steps[1].request!.example,/issues\/<issue_id>/);
 p.steps[1].request!.example="curl 'https://attacker.example.com/issues/ISSUE_ID' -H 'Authorization: Bearer <ACCESS_TOKEN>'";assert.throws(()=>validateInterpretation(p,source),/API host is not documented/);
 p.steps[1].request!.example="curl 'https://api.acme.com/undocumented/issues/ISSUE_ID' -H 'Authorization: Bearer <ACCESS_TOKEN>'";assert.throws(()=>validateInterpretation(p,source),/route template is absent/);
});
test('completion: permission descriptions can include OAuth app registration without granting resource writes',()=>{
 const p=value();p.findings[1].detail='Create a scoped app and select issues:read to read issue content.';assert.doesNotThrow(()=>validateInterpretation(p,docs));p.findings[1].detail='Create issue content using issues:read.';assert.throws(()=>validateInterpretation(p,docs),/contradicts/);
});
test('completion: named compact transport enforces citation shape without relaxing the local contract',async()=>{
 const {wireColumns,wireSchema,decodeWirePlan}=await import('../lib/live-guide/wire.ts');const raw:any={tableVersion:'launch-guide-table.v2',summary:'Test',accessModel:'oauth',oauthSupport:'documented',actions:[],prohibitions:[],findings:[],steps:[],coverage:[],blockers:[],unknowns:[],researchNeeded:[]};
 raw.actions=[{id:'read',title:'Read issues',operation:'read'}];raw.coverage=[{actionId:'read',permissions:'issues:read',status:'mapped',reason:'Source-backed.',passageIds:'s1-p1,s1-p2'}];const decoded=decodeWirePlan(raw);assert.deepEqual((decoded.coverage as any[])[0].permissions,['issues:read']);assert.deepEqual((decoded.coverage as any[])[0].evidence,[{passageId:'s1-p1'},{passageId:'s1-p2'}]);
 const pattern=new RegExp((wireSchema.properties.facts as any).properties.coverage.items.properties.citations.properties.primary.pattern);assert.ok(pattern.test('s1-p1'));assert.equal(pattern.test(''),false);assert.equal(pattern.test('s1-p1,s1-p2,s1-p3,s1-p4'),false);assert.ok(wireColumns.steps.includes('example'));
});


test('completion: redirects may reuse an already established official documentation host',async()=>{
 const {publicReader}=await import('../lib/live-guide/retrieval.ts');const calls:string[]=[];const reader=publicReader(async u=>{const s=String(u);calls.push(s);if(s.includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(s==='https://acme.example.com/old')return new Response('',{status:302,headers:{location:'https://docs.acmeapi.example.net/start'}});if(s==='https://docs.acmeapi.example.net/start')return new Response('The previously established official documentation page.');return new Response('',{status:404});},new AbortController().signal);
 const result=await reader.read('https://acme.example.com/old',['https://acme.example.com','https://docs.acmeapi.example.net']);assert.equal(result.url,'https://docs.acmeapi.example.net/start');assert.ok(calls.includes(result.url));
 await assert.rejects(()=>reader.read('https://acme.example.com/old','https://acme.example.com'),/outside the selected provider/);
});
test('completion: pagination transport requires a separate concrete continuation from ordinary input',async()=>{
 const {wireSchemaForRequest}=await import('../lib/live-guide/wire.ts');const schema=wireSchemaForRequest('List issue titles including pagination.');assert.equal((schema.properties.continuations as any).minItems,1);assert.equal((wireSchemaForRequest('Read a shared page.').properties.continuations as any).minItems,undefined);
});
test('completion: pagination end conditions and title aliases survive response-example noise',()=>{
 const d={...docs[0],text:('Response example has a next_cursor value and unrelated metadata.\n').repeat(100)+'\nsubject The text describing this work item, shown as its title.\nWhen next_cursor is null, you have reached the end of the results.\nGET /issues lists issue titles.'};const context=contextPassages(sourcePassages([d]),d.id,'Read issue titles, including pagination.',1400).map(p=>p.text).join(' ');assert.match(context,/next_cursor is null/);assert.match(context,/subject The text/);
});


test('completion: malformed links on an established provider resolve to cited instructions, while external destinations remain rejected',async()=>{
 const {repairDocumentationLinks}=await import('../lib/live-guide/interpretation.ts');const p=value();p.steps[0].destination='https://acmetasks.example.com/apps/guessed';const fixed=repairDocumentationLinks(p,docs);assert.equal(fixed.corrected,1);assert.equal(fixed.value.steps[0].destination,docs[0].url);assert.deepEqual(fixed.value.steps[1].request,p.steps[1].request);assert.doesNotThrow(()=>validateInterpretation(fixed.value,docs));
 p.steps[0].destination='https://attacker.example.net/apps';const rejected=repairDocumentationLinks(p,docs);assert.equal(rejected.corrected,0);assert.throws(()=>validateInterpretation(rejected.value,docs),/destination/);
});
test('completion: repeated transport rows merge only identical facts and keep distinct continuation requests',async()=>{
 const {decodeWirePlan}=await import('../lib/live-guide/wire.ts');const row=['read-test','Read issues','Read issues.','developer','Response has titles.','test','action','','read','GET','/issues',"curl 'https://api.acme.com/issues'",'', '', 's1-p1'];const partial=[...row];partial[3]='';partial[4]='';const raw:any={tableVersion:'launch-guide-table.v1',summary:'Test',accessModel:'oauth',oauthSupport:'documented',actions:[['read','Read issues','read']],prohibitions:[],findings:[],steps:[row,partial],coverage:[],blockers:[],unknowns:[],researchNeeded:[]};
 const decoded=decodeWirePlan(raw);assert.equal((decoded.steps as any[]).length,1);assert.equal((decoded.steps as any[])[0].owner,'developer');assert.equal((decoded.steps as any[])[0].doneWhen,'Response has titles.');
 const conflict=[...row];conflict[10]='/other';assert.throws(()=>decodeWirePlan({...raw,steps:[row,conflict]}),/conflicting duplicate/);const next=[...row];next[0]='next';next[11]="curl 'https://api.acme.com/issues?page=2'";assert.equal((decodeWirePlan({...raw,steps:[row,next]}).steps as any[]).length,2);
});


test('completion: malformed transport rows repair only column shape and retain every nonempty value',async()=>{
 const {repairWireShape}=await import('../lib/live-guide/wire.ts');const raw:any={meta:{tableVersion:'launch-guide-table.v4'},intent:{actions:[]},facts:{findings:[],coverage:[],blockers:[]},steps:[{values:['step','Title','Detail','developer','Done','prepare','prepare','','','','','',''],citations:{primary:'s1-p1',secondary:'',tertiary:''}}],continuations:[]};const before=structuredClone(raw);let calls=0;
 const fixed=await repairWireShape(raw,async rows=>{calls++;return rows.map(r=>({section:r.section,index:r.index,values:[...r.values,'']}));},()=>{});assert.equal(calls,1);assert.equal(fixed.steps[0].values.length,14);assert.deepEqual(fixed.steps[0].values.filter(Boolean),raw.steps[0].values.filter(Boolean));assert.deepEqual(fixed.steps[0].citations,raw.steps[0].citations);assert.deepEqual(raw,before);
 await assert.rejects(()=>repairWireShape(raw,async rows=>rows.map(r=>({section:r.section,index:r.index,values:[...r.values.slice(0,2),'Rewritten fact',...r.values.slice(3),'']})),()=>{}),/changed a nonempty value/);
 const extra=structuredClone(fixed);extra.steps[0].values.push('');const trimmed=await repairWireShape(extra,async()=>{throw new Error('No call needed for an extra empty column');},()=>{});assert.equal(trimmed.steps[0].values.length,14);
});


test('completion: explicit retry repeats a failed planning stage and reuses its saved sources',async()=>{
 const old=run();old.guide.clarificationUsed=true;let checkpoint:any;const failed=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async()=>new Response('',{status:503}),old,{save:async value=>{checkpoint=structuredClone(value);}});
 assert.equal(failed.guide.mode,'evidence-only');assert.equal(checkpoint.draftAccepted,false);assert.equal(checkpoint.draft,undefined);const before=structuredClone(checkpoint.research.documents);let calls=0;
 const retried=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(u,init)=>{assert.equal(String(u),'https://api.anthropic.com/v1/messages');calls++;const body=JSON.parse(String(init?.body));return aiResponse(body.system.startsWith('Independently')?{requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]}:wire(value()));},old,{checkpoint});
 assert.ok(calls>=2);assert.equal(guideReadiness(retried.guide),'usable-guide');assert.deepEqual(retried.documents,before);assert.deepEqual(retried.guide.input.answers,old.guide.input.answers);
});


test('completion: resumed completed planning counts only the new access review and strips old engine metadata',async()=>{
 const old=run();old.guide.clarificationUsed=true;const draft={...value(),engine:{outcome:'accepted',attempts:99,promptVersion:'obsolete'}} as any;let calls=0;
 const result=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(_u,init)=>{calls++;assert.ok(JSON.parse(String(init?.body)).system.startsWith('Independently'));return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]});},old,{checkpoint:{research:{website:url,documents:docs,inferred:false,warnings:[]},clarificationUsed:true,draft,draftAccepted:true}});
 assert.equal(calls,1);assert.equal(result.guide.engine!.attempts,1);assert.equal(result.guide.engine!.promptVersion,PROMPT_VERSION);assert.equal(guideReadiness(result.guide),'usable-guide');
});


test('completion: independent review distinguishes named broad default scopes from unscoped OAuth',async()=>{
 const p=value();p.coverage[0].permissions=[];let audited=false;const result=await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body));assert.match(body.system,/named default or broad scope must be listed verbatim/);assert.match(body.system,/Do not approve an empty list merely because the named scope is broad/);const context=JSON.parse(body.messages[0].content);assert.ok(context.mappings[0].conditions.length);audited=true;return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'unresolved',reason:'Map the documented named grant; broad does not mean unscoped.'}]});},docs);assert.ok(audited);assert.equal(result.value.coverage[0].status,'unresolved');
});


test('completion: named fact and step contracts retain all actions and reuse accepted facts for a request correction',async()=>{
 const {factsSchema,stepsSchema}=await import('../lib/live-guide/plan-parts.ts');const template=wire(value()),slots=(e:any[])=>({primary:e[0].passageId,secondary:e[1]?.passageId||'',tertiary:e[2]?.passageId||''});
 const facts={accessModel:'oauth',oauthSupport:'documented',summary:'Read project issues with the documented grant.',findings:template.findings.map(f=>({...f,evidence:slots(f.evidence as any[])})),coverage:template.coverage.map(c=>({...c,evidence:slots(c.evidence as any[])})),unknowns:[],researchNeeded:[]};
 let factCalls=0,stepCalls=0;const result=await interpretEvidence(run().guide.input,docs,bindings,new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body));if(body.system.includes('FACTS STAGE')){factCalls++;assert.deepEqual(body.output_config.format.schema,factsSchema);return aiResponse(facts);}assert.ok(body.system.includes('STEPS STAGE'));assert.deepEqual(body.output_config.format.schema,stepsSchema);const context=JSON.parse(body.messages[0].content);assert.equal(context.verifiedFacts.findings[1].scope,'issues:read');stepCalls++;const steps=template.steps.map(s=>({...s,evidence:slots(s.evidence as any[])}));if(stepCalls===1)steps[1].request={...steps[1].request!,endpoint:'/undocumented',example:"curl 'https://api.acme.com/undocumented' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};else assert.match(context.repairFeedback.join(' '),/route template is absent/);return aiResponse({steps,blockers:[]});},[],{final:true,intent:{requestedActions:value().requestedActions,prohibitions:value().prohibitions}});
 assert.equal(result.mode,'interpreted');assert.equal(factCalls,1);assert.equal(stepCalls,2);assert.equal(result.telemetry.attempts,3);assert.deepEqual(result.value.requestedActions,value().requestedActions.map(a=>({...a,category:'resource'})));assert.deepEqual(result.value.coverage[0].permissions,['issues:read']);assert.deepEqual(result.value.findings[1].evidence,ev);assert.equal(result.value.steps[1].request!.endpoint,'/issues');
});


test('completion: resumed named planning reuses validated facts and counts only unfinished step generation',async()=>{
 const template=wire(value()),slots=(e:any[])=>({primary:e[0].passageId,secondary:e[1]?.passageId||'',tertiary:e[2]?.passageId||''});let calls=0;
 const facts=validateInterpretation({...value(),steps:[]},docs,'',false);
 const result=await interpretEvidence(run().guide.input,docs,bindings,new AbortController().signal,async(_u,init)=>{calls++;assert.ok(JSON.parse(String(init?.body)).system.includes('STEPS STAGE'));return aiResponse({steps:template.steps.map(s=>({...s,evidence:slots(s.evidence as any[])})),blockers:[]});},[],{final:true,intent:{requestedActions:value().requestedActions,prohibitions:value().prohibitions},facts});
 assert.equal(result.mode,'interpreted');assert.equal(calls,1);assert.equal(result.telemetry.attempts,1);assert.deepEqual(result.value.findings,facts.findings);assert.equal(result.value.steps[1].request!.endpoint,'/issues');
});


test('completion: a tutorial supplying root parameter semantics remains beside endpoint references',()=>{
 const sources=Array.from({length:10},(_,i)=>({...docs[0],id:'r'+i,url:'https://acmetasks.example.com/reference/list-folders-'+i,text:'GET /folders/'+i+' returns folder names and list metadata.'}));const tutorial={...docs[0],id:'root',url:'https://acmetasks.example.com/tutorial/writing-a-script',text:'For the folder permission model, the empty path string represents the root of your permitted folder. This only lists names.'};const input={...run().guide.input,useCase:'List folder names within the configured permitted folder only.'};assert.ok(planningDocuments([...docs,...sources,tutorial],input,{...value(),requestedActions:[{id:'folders',title:'List folder names',operation:'read'}]}).includes(tutorial));
});


test('completion: an operation summary remains visible beside a distant route and long parameter table',()=>{
 const d={...docs[0],text:('OAuth clients require scopes and authorization codes.\n').repeat(60)+'\nGet Items Get all active items for the user.\n'+('Optional query parameter describing unrelated metadata.\n').repeat(60)+'\nGET /items Returns matching items.\nWhen next_cursor is null, the result is complete.'};const context=contextPassages(sourcePassages([d]),d.id,'List active item titles including pagination.',2400).map(p=>p.text).join(' ');assert.match(context,/Get all active items/);assert.match(context,/next_cursor is null/);
});


test('completion: navigation indexes do not displace exact requests and their continuation',async()=>{
 const {retrieve}=await import('../lib/live-guide/retrieval.ts');const home='https://acme.example.com/docs/',auth=home+'oauth',first=home+'reference/list-items',next=home+'reference/list-items-next';const links=[auth,first,next,...Array.from({length:24},(_,i)=>home+'guides/overview-'+i)];const reads:string[]=[];
 const result=await retrieve(normalizeInput({app:'Acme',website:home,useCase:'List item names including pagination. Read only.',audience:'customers'}),bindings,()=>{},new AbortController().signal,async(u,init)=>{const s=String(u);if(s.includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(s.includes('anthropic')){const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);return aiResponse({requests:context.links.filter((l:any)=>l.url===first||l.url===next).map((l:any)=>l.index),setup:context.links.filter((l:any)=>l.url===auth).map((l:any)=>l.index),support:[]});}reads.push(s);if(s===home)return new Response('<title>API index</title><main>Browse the official API documentation.</main>'+links.map(l=>`<a href="${l}">${l.includes('/reference/')?'List items API request':'OAuth guide overview'}</a>`).join(''));if(s===auth)return new Response('<main>Create an OAuth application with a client ID and redirect URI. The items:read scope allows reading items.</main>');if(s===first)return new Response('<main>GET /items lists item names. Required scope: items:read. Pass the returned cursor to continue listing.</main>');if(s===next)return new Response('<main>GET /items?cursor=NEXT_CURSOR continues the item list. Required scope: items:read. Stop when next_cursor is null.</main>');return new Response('<main>Supplementary guide for OAuth setup and item behavior.</main>');});
 assert.ok(result.documents.some(d=>d.url===first));assert.ok(result.documents.some(d=>d.url===next));assert.ok(!result.documents.some(d=>d.url===home));assert.ok(reads.indexOf(first)<reads.findIndex(l=>l.includes('/guides/'))||!reads.some(l=>l.includes('/guides/')));
});


test('completion: a failed named request stage retains accepted facts through later checkpoint saves',async()=>{
 const old=run();old.guide.clarificationUsed=true;const template=wire(value()),slots=(e:any[])=>({primary:e[0].passageId,secondary:e[1]?.passageId||'',tertiary:e[2]?.passageId||''});const facts={accessModel:'oauth',oauthSupport:'documented',summary:'Read project issues.',findings:template.findings.map(f=>({...f,evidence:slots(f.evidence as any[])})),coverage:template.coverage.map(c=>({...c,evidence:slots(c.evidence as any[])})),unknowns:[],researchNeeded:[]};let checkpoint:any;
 const failed=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(u,init)=>{if(!String(u).includes('anthropic'))return new Response('',{status:404});return JSON.parse(String(init?.body)).system.includes('FACTS STAGE')?aiResponse(facts):new Response('',{status:503});},old,{save:async saved=>{checkpoint=structuredClone(saved);}});
 assert.equal(failed.guide.mode,'evidence-only');assert.equal(checkpoint.facts.findings[1].scope,'issues:read');assert.equal(checkpoint.draft,undefined);let stepCalls=0;
 const retried=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]});assert.ok(body.system.includes('STEPS STAGE'));stepCalls++;return aiResponse({steps:template.steps.map(s=>({...s,evidence:slots(s.evidence as any[])})),blockers:[]});},old,{checkpoint});assert.equal(stepCalls,1);assert.equal(guideReadiness(retried.guide),'usable-guide');
});

test('completion: missing registration evidence blocks usable status even when resource access passed review',()=>{
 const g=run().guide;g.coverage[0].support='reviewed';g.researchNeeded=['registration'];g.blockers=[{title:'App registration unknown',kind:'missing-evidence',consequence:'launch',owner:'developer',resolution:'Find registration details.'}];assert.equal(guideReadiness(g),'research-failure');g.researchNeeded=['distribution'];g.blockers=[];assert.equal(guideReadiness(g),'usable-guide');
});

test('completion: a bounded setup article retains registration beside other credential models',async()=>{
 const {planningContext}=await import('../lib/live-guide/interpretation.ts');const d={...docs[0],text:'Personal tokens use account settings.\n'+('Access tokens grant read access only to authorized resources.\n').repeat(65)+'\nOAuth integration registration\nCreate a new OAuth integration in Developer settings. Configure its redirect URI and obtain the client ID and client secret.\nAfter consent, exchange the returned authorization code at the token endpoint.\n'+('Access tokens are sent with the bearer authorization header.\n').repeat(60)};
 const selected=planningContext(sourcePassages([d]),d,run().guide.input).map(p=>p.text).join(' ');assert.match(selected,/Configure its redirect URI/);assert.match(selected,/obtain the client ID and client secret/);assert.match(selected,/exchange the returned authorization code/);
});

test('completion: a broader-scope comparison does not turn a read grant into a mutation claim',async()=>{
 const {contradictsGrant}=await import('../lib/live-guide/consistency.ts');const evidence=[{sourceId:'s1',quote:'read_items Grants read access to the API and its items.'}];
 assert.equal(contradictsGrant('read_items grants read access. It is read-only and the api scope adds write access.',evidence,'read_items'),false);
 assert.equal(contradictsGrant('The read_items scope grants write access to items.',evidence,'read_items'),true);
 assert.equal(contradictsGrant('Delete an item',evidence),true);
});

test('completion: instruction repair accepts a useful boundary check in the completion criterion',async()=>{
 const v=value();v.steps[1].detail='Read project issues and inspect their titles.';v.steps[1].doneWhen='The titles are returned.';const passages=sourcePassages(docs);const result=await completeTestInstructions(v,docs,'Read issue titles.',bindings,new AbortController().signal,async()=>aiResponse({items:[{index:1,detail:'Read the project issues and expect the returned issue titles.',doneWhen:'Boundary check: inspect the actual granted scope and outgoing request log; confirm only read requests were sent.',citations:{primary:passages.find(p=>p.citable)!.id,secondary:'',tertiary:''}}]}),()=>{});
 assert.match(result.steps[1].doneWhen,/Boundary check: inspect/);assert.deepEqual(result.steps[1].request,v.steps[1].request);
});

test('completion: named continuation requests are retained and validated alongside the first request',async()=>{
 const sources=[{...docs[0],text:docs[0].text+'\nRepeat GET /issues with the returned cursor until next_cursor is null. The response contains issue titles.'}];const v=value();v.steps[1].detail+=' Repeat using the returned cursor until next_cursor is null.';const next={...v.steps[1],id:'continue-read',dependsOn:['read-test'],request:{method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues?cursor=<NEXT_CURSOR>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}};const template=wire(v),slots=(e:any[])=>({primary:e[0].passageId,secondary:e[1]?.passageId||'',tertiary:e[2]?.passageId||''});let calls=0;
 const result=await interpretEvidence({...run().guide.input,useCase:'List issue titles including pagination.'},sources,bindings,new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body));if(body.system.includes('FACTS STAGE'))return aiResponse({accessModel:'oauth',oauthSupport:'documented',summary:'Read project issues.',findings:template.findings.map(f=>({...f,evidence:slots(f.evidence as any[])})),coverage:template.coverage.map(c=>({...c,evidence:slots(c.evidence as any[])})),unknowns:[],researchNeeded:[]});assert.equal(JSON.parse(body.messages[0].content).paginationRequired,true);assert.ok(body.output_config.format.schema.$defs.step);return aiResponse({steps:template.steps.map(s=>({...s,evidence:slots(s.evidence as any[])})),continuations:[{...next,evidence:slots((template.steps[1].evidence as any[]))}],blockers:[]});},[],{final:true,intent:{requestedActions:v.requestedActions,prohibitions:v.prohibitions}});
 assert.equal(result.mode,'interpreted');assert.equal(calls,2);assert.equal(result.value.steps.filter(s=>s.testKind==='action').length,2);assert.equal(result.value.steps.at(-1)!.id,'continue-read');
});

test('completion: style and script internals cannot create documentation navigation targets',()=>{
 const p=parsePage('https://docs.acme.com/oauth','<title>OAuth</title><style>a[href="base-ui-disable-scrollbar"] {display:none}</style><script>const link="href=internal-state";</script><main>Register an OAuth app in developer settings.</main><a href="/docs/oauth/register">Register an OAuth app</a>');assert.deepEqual(p.links,['https://docs.acme.com/docs/oauth/register']);
});

test('completion: negated scope exclusions never certify writes and positive claims still reject',async()=>{
 const {contradictsGrant}=await import('../lib/live-guide/consistency.ts');
 assert.equal(contradictsGrant('Read issues. It cannot create, update or delete issues.',ev,'issues:read'),false);
 assert.equal(contradictsGrant('Write scopes such as issues:create and write are not needed for this read-only request.',ev,'issues:read'),false);
 assert.equal(contradictsGrant('Write scopes are not needed, but this read grant allows deleting issues.',ev,'issues:read'),true);
});

test('completion: a generic nonmutating boundary procedure needs no provider fact or model call',async()=>{
 const v=value();v.steps[1].detail='Read the project issue titles. Boundary check: none.';v.steps[1].doneWhen='HTTP 200 returns issue titles.';const before=structuredClone(v);let calls=0,corrected='';
 const result=await completeTestInstructions(v,docs,'Read project issue titles.',bindings,new AbortController().signal,async()=>{calls++;throw new Error('No model is needed for the generic check.');},()=>{},reason=>{corrected=reason;});
 assert.equal(calls,0);assert.match(corrected,/requests and sources unchanged/);assert.match(result.steps[1].doneWhen,/inspect the actual grant/);assert.match(result.steps[1].doneWhen,/outgoing request log/);assert.deepEqual(result.steps[1].request,before.steps[1].request);assert.deepEqual(result.steps[1].evidence,before.steps[1].evidence);assert.deepEqual(v,before);assert.doesNotThrow(()=>validateInterpretation(result,docs));
});

test('completion: an empty request value requires its own documented parameter meaning',()=>{
 const p=value();p.steps[1].request={method:'POST',endpoint:'/issues',example:"curl 'https://api.acme.com/issues' -X POST -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: application/json' -d '{\"container\":\"\"}'"};
 assert.throws(()=>validateInterpretation(p,docs),/A request constant is not documented.*container/);
 const unrelated=[{...docs[0],text:docs[0].text+'\nAn empty cursor string resets polling.'}];assert.throws(()=>validateInterpretation(p,unrelated),/A request constant is not documented/);
 const supported=[{...docs[0],text:docs[0].text+'\nThe container parameter may be the empty string to select the permitted root.'}];assert.doesNotThrow(()=>validateInterpretation(p,supported));
});

test('completion: provider identity words cannot make unrelated API operations relevant',async()=>{
 const {actionLinkScore}=await import('../lib/live-guide/retrieval.ts');const request='Customers authorize an Acme web app to list folder names with OAuth. Never write.';
 assert.ok(actionLinkScore('https://docs.acme.com/acme-api/api-reference/tokens/convert-legacy','Convert legacy token',request,'Acme')<20);
 assert.ok(actionLinkScore('https://docs.acme.com/acme-api/api-reference/files/list-folders','List folders',request,'Acme')>20);
});

test('completion: blocked public search screens the suggested docs and homepage before identity confirmation',async()=>{
 const {discoverProvider}=await import('../lib/live-guide/retrieval.ts');let calls=0;const events:any[]=[];const site=await discoverProvider(normalizeInput({app:'Acme Tasks',useCase:'Read issue titles.'}),bindings,e=>events.push(e),new AbortController().signal,async(u,init)=>{const url=String(u);if(url.includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(url.includes('anthropic')){assert.match(JSON.parse(String(init?.body)).system,/no guessed documentation or API path/);return aiResponse({website:'https://docs.acmetasks.example.com/',homepage:'https://acmetasks.example.com/'});}if(url==='https://acmetasks.example.com/')return new Response('<title>Acme Tasks official project</title><main>Acme Tasks developer resources and documentation.</main>');return new Response('Search unavailable.',{status:403});},()=>{calls++;});
 assert.equal(site,'https://acmetasks.example.com/');assert.equal(calls,1);assert.ok(events.some(e=>e.stage==='Checking a suggested provider website'));
});

test('completion: a precise parameter gap retains matching source text after bounded parallel reference checks',async()=>{
 const {retrieve}=await import('../lib/live-guide/retrieval.ts');const links=['https://acmetasks.example.com/docs/tutorial/first-example','https://acmetasks.example.com/docs/tutorial/second-example','https://acmetasks.example.com/docs/tutorial/request-example'];const previous={website:url,inferred:false,warnings:[],documents:[{...docs[0],links}]};const reads:string[]=[];
 const result=await retrieve(run().guide.input,{},()=>{},new AbortController().signal,async(u)=>{const s=String(u);if(s.includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});reads.push(s);return new Response('<main>'+ (s.endsWith('/request-example')?'The container parameter is an empty string to select the permitted root. The read operation returns the item titles.':'This example explains unrelated account metadata and does not establish the required container parameter meaning.')+'</main>');},{previous,emptyField:'container',topics:['permissions']});
 assert.equal(reads.filter(s=>s.includes('/docs/tutorial/')).length,3);assert.equal(result.documents.length,2);assert.equal(result.documents[1].url,links[2]);assert.match(result.documents[1].text,/empty string to select the permitted root/);assert.deepEqual(result.documents[0],previous.documents[0]);
});

test('completion: next-link syntax may attach an already retrieved exact pagination citation without inventing evidence',()=>{
 const p=value();p.steps[1].request={method:'GET',endpoint:'/issues',example:"curl '<NEXT_PAGE_URL>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};p.steps[1].detail+=' Follow the next link until it is absent.';
 assert.throws(()=>validateInterpretation(p,docs),/without documented next-link pagination/);
 const pagination={...docs[0],id:'s2',url:'https://acmetasks.example.com/docs/pagination',text:'For collection reads, follow the next Link URL unchanged until no next link is returned.'};const result=validateInterpretation(p,[...docs,pagination]);assert.ok(result.steps[1].evidence.some(e=>e.sourceId==='s2'&&pagination.text.includes(e.quote)));assert.deepEqual(p.steps[1].evidence,ev);
});

test('completion: a remaining overlength input is corrected without repeating completed field edits',async()=>{
 const p=value();p.steps[1].fields=['NEXT_PAGE_URL: '+ 'a'.repeat(110),'TOKEN: '+ 'b'.repeat(110)];let calls=0;
 const result=await repairLongFields(p as unknown as Record<string,unknown>,bindings,new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body)),fields=JSON.parse(body.messages[0].content);assert.equal(body.thinking.type,'disabled');if(calls===1){assert.equal(fields.length,2);return aiResponse({values:['NEXT_PAGE_URL: '+ 'a'.repeat(90),'TOKEN: backend OAuth token.']});}assert.equal(fields.length,1);assert.deepEqual(fields[0].path,['steps',1,'fields',0]);return aiResponse({values:['NEXT_PAGE_URL: prior response next link on the same HTTPS host.']});});
 assert.equal(calls,2);assert.deepEqual((result.steps as typeof p.steps)[1].fields,['NEXT_PAGE_URL: prior response next link on the same HTTPS host.','TOKEN: backend OAuth token.']);assert.deepEqual((result.steps as typeof p.steps)[1].request,p.steps[1].request);
});

test('completion: setup-field recovery changes only named prerequisites and repeats independent review',async()=>{
 const {repairReviewedSetup}=await import('../lib/live-guide/interpretation.ts');const tokenDoc={...docs[0],id:'s2',url:'https://acmetasks.example.com/docs/oauth-token',text:'POST /oauth/token exchanges an authorization code.\nUse client_id, client_secret, code, redirect_uri and grant_type authorization_code in the JSON request.\nThe successful response contains an access_token for the authorizing person.'};const documents=[...docs,tokenDoc],before=value();before.steps.push({id:'exchange-token',title:'Exchange the code',detail:'Exchange the callback code for an access token.',doneWhen:'A token is returned.',testKind:'authorization',stage:'test',owner:'developer',dependsOn:['register'],actionIds:[],request:{method:'',endpoint:'',example:''},fields:[],destination:tokenDoc.url,evidence:[{sourceId:'s2',quote:'POST /oauth/token exchanges an authorization code.'}]});const reviewed=structuredClone(before);reviewed.coverage[0].status='unresolved';reviewed.coverage[0].reason='Setup step exchange-token omits documented client_id and grant_type fields.';const original=structuredClone(before);let calls=0;
 const result=await repairReviewedSetup(before,reviewed,run().guide.input,documents,bindings,new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);if(body.system.startsWith('Independently')){const setup=context.setupSteps.find((s:any)=>s.id==='exchange-token');assert.match(setup.request.example,/client_id/);assert.ok(setup.evidence.some((e:any)=>e.sourceId==='s2'));assert.ok(context.mappings[0].referenceContext.some((d:any)=>d.sourceId==='s2'));return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The prerequisite fields and resource read are documented.'}]});}
 assert.equal(body.thinking.type,'disabled');assert.equal(context.steps.length,1);const ps=context.documents.flatMap((d:any)=>d.passages),citation=ps.find((p:any)=>p.citable&&p.text.includes('Use client_id'));
 return aiResponse({steps:[{stepId:'exchange-token',detail:'After consent, exchange the code on the backend using the registered client credentials and callback URI.',doneWhen:'The response contains access_token; store it securely for the authorizing person.',fields:['Client credentials: OAuth registration','Code and redirect URI: authorization callback'],request:{method:'POST',endpoint:'/oauth/token',example:"curl 'https://api.acme.com/oauth/token' -X POST -H 'Content-Type: application/json' -d '{\"client_id\":\"<CLIENT_ID>\",\"client_secret\":\"<CLIENT_SECRET>\",\"code\":\"<CODE>\",\"redirect_uri\":\"<REDIRECT_URI>\",\"grant_type\":\"authorization_code\"}'"},citations:{primary:citation.id,secondary:'',tertiary:''}}]});});
 assert.equal(calls,2);assert.equal(result!.value.coverage[0].support,'reviewed');assert.deepEqual(result!.value.steps[1],original.steps[1]);assert.deepEqual(result!.value.findings,original.findings);assert.deepEqual(before,original);
});

test('completion: dotted grant identifiers inside a negated clause do not become positive writes',async()=>{
 const {contradictsGrant}=await import('../lib/live-guide/consistency.ts');const evidence=[{sourceId:'s1',quote:'Required scope files.metadata.read covers reading file and folder metadata.'}];
 assert.equal(contradictsGrant('This grant does not cover downloading or modifying content, which needs files.content.read or files.content.write.',evidence,'files.metadata.read'),false);
 assert.equal(contradictsGrant('This grant does not cover writes. It also permits deleting content.',evidence,'files.metadata.read'),true);
});

test('completion: independent review separates unresolved launch policy from a documented credential identity',async()=>{
 const p=value();p.researchNeeded=['identity'];p.unknowns=['Whether customer administrators require approval before wider rollout.'];
 const result=await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);assert.equal(context.firstTestGaps.length,2);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The user OAuth grant and resource read are documented.'}],gapReviews:context.firstTestGaps.map((g:any)=>({id:g.id,status:'launch-only',reason:'Administrator rollout policy is separate from the documented connected-person first test.',passageId:''}))});},docs);
 assert.deepEqual(result.value.researchNeeded,['distribution']);assert.deepEqual(result.value.unknowns,p.unknowns);assert.equal(result.value.coverage[0].support,'reviewed');assert.ok(result.telemetry.validationIssues?.some(s=>s.includes('launch-only')));
});

test('completion: a resolved essential gap needs a supplied citable source and invalid review retains the gap',async()=>{
 const p=value();p.researchNeeded=['registration'];p.unknowns=['Application registration is undocumented.'];p.blockers=[{title:'Registration missing',kind:'missing-evidence',consequence:'test',owner:'developer',resolution:'Find registration instructions.',stepIds:['register']}];
 const result=await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Scope supported.'}],gapReviews:context.firstTestGaps.map((g:any)=>({id:g.id,status:'resolved',reason:'Registration is supposedly documented.',passageId:'s1-p999999'}))});},docs);
 assert.deepEqual(result.value.researchNeeded,['registration']);assert.deepEqual(result.value.unknowns,p.unknowns);assert.equal(result.value.coverage[0].status,'unresolved');assert.ok(result.value.blockers.some(b=>b.title==='Registration missing'));
});

test('completion: identical continuations merge instructions and inputs while distinct requests and action IDs remain',async()=>{
 const {coalesceRequestSteps}=await import('../lib/live-guide/step-shape.ts');const p=value(),first={...p.steps[1],id:'next-a',dependsOn:['read-test'],detail:'Repeat with the next link until no next link is returned.',doneWhen:'Every issue title is collected.',fields:['NEXT_PAGE_URL: previous response Link header'],request:{method:'GET',endpoint:'/issues',example:"curl '<NEXT_PAGE_URL>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}},duplicate={...first,id:'next-b',dependsOn:[],detail:'Inspect the actual grant and outgoing GET request log.',doneWhen:'No prohibited operations were sent.',fields:['Keep the same HTTPS host and token.'],request:{...first.request,example:"curl '<NEXT_PAGE_URL>' '-H' 'Authorization: Bearer <ACCESS_TOKEN>'"}};
 p.steps.push(first,duplicate);p.blockers.push({title:'Follow-up check',kind:'verification',consequence:'follow-up',owner:'developer',resolution:'Inspect pagination.',stepIds:['next-b']});const out=coalesceRequestSteps(p);assert.equal(out.steps.filter(s=>s.testKind==='action').length,2);assert.match(out.steps.find(s=>s.id==='next-a')!.detail,/next link.*actual grant/);assert.equal(out.steps.find(s=>s.id==='next-a')!.fields.length,2);assert.deepEqual(out.blockers[0].stepIds,['next-a']);assert.equal(p.steps.length,4);
 p.steps[3].actionIds=['other-action'];assert.equal(coalesceRequestSteps(p).steps.filter(s=>s.testKind==='action').length,3);
});

test('completion: long combined references retain actual response fields within the requested operation',()=>{
 const text='OAuth registration uses a client ID and redirect URI.\nitems:read Grants read-only access to items.\nGet Items Get all active items for the connected user.\nGET /api/v1/items\n'+('A query parameter describes optional metadata and filtering.\n').repeat(650)+'\nSuccessful response 200\n{ "results": [ { "content": "The item title" } ], "next_cursor": null }\nGET /api/v1/unrelated\n{ "name": "Unrelated object" }';
 const selected=selectSourceText(text,'List active item titles including pagination.',6000,'Acme');assert.match(selected,/GET \/api\/v1\/items/);assert.match(selected,/"content": "The item title"/);assert.match(selected,/next_cursor/);
});

test('completion: long independent-review text is corrected without changing its rejection',async()=>{
 const p=value();let calls=0;const result=await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'unresolved',reason:'The requested field is not documented. '.repeat(18)}]});return aiResponse({values:JSON.parse(body.messages[0].content).map(()=> 'The requested response field is not documented; retain the access gap.')});},docs);
 assert.equal(calls,2);assert.equal(result.value.coverage[0].status,'unresolved');assert.match(result.value.coverage[0].reason,/retain the access gap/);assert.equal(result.telemetry.attempts,2);assert.ok(result.value.coverage[0].reason.length<=400);
});

test('completion: nested OpenAPI response wrappers retain requested names beyond large object metadata',async()=>{
 const {openApiText}=await import('../lib/live-guide/openapi.ts');const properties=Object.fromEntries([...Array.from({length:60},(_,i)=>['metadata_'+i,{type:'string'}]),['name',{type:'string',description:'The item name'}]]);const api=openApiText(JSON.stringify({swagger:'2.0',info:{title:'Acme'},paths:{'/items':{get:{summary:'List visible items',responses:{200:{schema:{$ref:'#/definitions/Result'}}}}}},definitions:{Result:{type:'object',properties:{data:{type:'array',items:{$ref:'#/definitions/Item'}}}},Item:{type:'object',properties}}}),'List item names including pagination.');assert.match(api!.text,/"name"/);assert.match(api!.text,/The item name/);assert.match(api!.text,/"data"/);
});

test('completion: a collection reference wins before adjacent API utilities and the reader skips linked execution URLs',async()=>{
 const {retrieve}=await import('../lib/live-guide/retrieval.ts');
 const website='https://docs.acme.com/integrations/oauth';
 const primary='https://docs.acme.com/api/issues/';
 const utility='https://docs.acme.com/api/project_statistics/';
 const execution='https://community.acme.com/api/v3/issues';
 const html='<main>Register an OAuth application and configure a redirect URI. The read_api scope grants read access.</main>';
 const links='<a href="'+utility+'">Project statistics and issue access</a><a href="'+execution+'">Live issue collection</a><a href="'+primary+'">Issues API</a>';
 const reads:string[]=[];
 await retrieve(normalizeInput({app:'Acme',website,useCase:'Read issue titles in a project with pagination.'}),{},()=>{},new AbortController().signal,async u=>{
  const url=String(u);
  if(url.includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});
  reads.push(url);
  return new Response(url===website?html+links:'<main>GET /projects/{project_id}/issues lists the project issues and their titles.</main>');
 });
 assert.equal(reads[1],primary);
 assert.ok(!reads.includes(execution));
});
