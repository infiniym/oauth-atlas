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
import {endpointEvidence,unfilteredQueryRequirements,responseFields} from '../lib/live-guide/grounding.ts';
import {sourceKey,linkScore,selectSourceText,parsePage,publicReader} from '../lib/live-guide/retrieval.ts';
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
test('completion: an optional default filter cannot silently restrict the requested collection',()=>{
 const source={...docs[0],text:docs[0].text+'\nGET /other\nfilters\nstring\noptional query\nIf no filter is to be applied, the client should send an empty array ([]).\nGET /issues\nfilters\nstring\noptional query\nJSON specifying filter conditions. If no filter is to be applied, the client should send an empty array ( [] ), otherwise a default filter is applied.\nGET /issues/archived\nNo query parameters are supported.'};
 assert.equal(unfilteredQueryRequirements('/issues',[source]).length,1);
 assert.deepEqual(unfilteredQueryRequirements('/issues/archived',[source]),[]);
 const candidate=value();
 assert.throws(()=>validateInterpretation(candidate,[source],'Read issue titles including pagination.'),/silently applies a default collection filter/);
 candidate.steps[1].request!.example="curl 'https://api.acme.com/issues?filters=%5B%5D' -H 'Authorization: Bearer <ACCESS_TOKEN>'";
 assert.doesNotThrow(()=>validateInterpretation(candidate,[source],'Read issue titles.'));
 candidate.steps[1].request!.example="curl 'https://api.acme.com/issues' -H 'Authorization: Bearer <ACCESS_TOKEN>'";
 assert.doesNotThrow(()=>validateInterpretation(candidate,[source],'Read active issue titles.'));
});
test('completion: a supported permission verdict cannot override an unresolved response extraction check',async()=>{
 const result=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async()=>aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',missingFact:'none',reason:'The grant supports reading, but the scalar extraction is absent.',checks:{setup:true,grant:true,request:true,response:false,pagination:true,boundary:true}}]}),docs);
 assert.equal(result.value.coverage[0].status,'unresolved');
 assert.equal(result.value.coverage[0].missingFact,'response');
});
test('completion: a linked matching object reference completes a partial operation response sample',()=>{
 const objectUrl='https://acmetasks.example.com/reference/document';
 const operation={...docs[0],text:'GET /documents/{id}\nResponse:\n{"object":"document","id":"sample"}',links:[objectUrl]};
 const reference={...docs[0],id:'s2',url:objectUrl,text:'Document object\n{ "object": "document", "properties": { "Heading": { "type": "title", "title": [{ "plain_text": "Example" }] } } }'};
 assert.ok(responseFields('/documents/{id}',[operation,reference]).some(field=>field.path==='$.properties.Heading.title[].plain_text'));
 assert.ok(!responseFields('/documents/{id}',[{...operation,links:[]},reference]).some(field=>field.path.startsWith('$.properties')));
 assert.ok(!responseFields('/documents/{id}',[operation,{...reference,text:reference.text.replace('"document"','"unrelated"')}]).some(field=>field.path.startsWith('$.properties')));
 const many={...operation,text:operation.text+'\nGET /other\nResponse:\n{"object":"unrelated"}'};
 assert.ok(!responseFields('/documents/{id}',[many,{...reference,text:reference.text.replace('"document"','"unrelated"')}]).some(field=>field.path.startsWith('$.properties')));
});
test('completion: a temporary source connection failure retries the same validated URL once',async()=>{
 let reads=0;const retries:string[]=[];
 const reader=publicReader(async input=>{const address=String(input);if(address.includes('dns-query'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});reads++;if(reads===1)throw new TypeError('fetch failed');assert.equal(address,url);return new Response('Public OAuth documentation.',{headers:{'Content-Type':'text/plain'}});},new AbortController().signal,address=>retries.push(address));
 assert.equal((await reader.read(url)).body,'Public OAuth documentation.');assert.equal(reads,2);assert.deepEqual(retries,[url]);
 let missing=0;const unavailable=publicReader(async input=>{if(String(input).includes('dns-query'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});missing++;return new Response('Missing',{status:404});},new AbortController().signal);
 await assert.rejects(()=>unavailable.read(url),/HTTP 404/);assert.equal(missing,1);
});
test('completion: OAuth error examples cannot define a resource success response',async()=>{
 const {responseExamples}=await import('../lib/live-guide/response-shapes.ts');
 const text='curl https://api.acme.com/graphql\n--data query\nPOST https://api.acme.com/oauth/token HTTP/1.1\nError response:\n{"error":"invalid_grant","error_description":"A different grant is required."}\nPOST https://api.acme.com/oauth/token HTTP/1.1\nResponse:\n{"access_token":"example","token_type":"Bearer"}';
 const paths=responseExamples(text).join('\n');assert.doesNotMatch(paths,/error_description|graphql/);assert.match(paths,/POST https:\/\/api.acme.com\/oauth\/token: \$\.access_token/);
});
test('completion: text segments and nested content cannot be reduced to a first element or one layer',()=>{
 const p=value();p.steps[1].detail+=' Read $.title[0].text.content.';
 assert.throws(()=>validateInterpretation(p,docs,'Read titles and content.'),/first text segment/);
 p.steps[1].detail+=' Join all text segments.';
 assert.doesNotThrow(()=>validateInterpretation(p,docs,'Read titles and content.'));
 const tree={...docs[0],text:docs[0].text+'\nGET /nodes/{id}/children\nReturns only the first level of children; nested children require further requests.\nResponse JSON paths for GET /nodes/{id}/children: $.results (array)'};
 p.steps[1].request={method:'GET',endpoint:'/nodes/{id}/children',example:"curl 'https://api.acme.com/nodes/<NODE_ID>/children' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};
 assert.throws(()=>validateInterpretation(p,[tree],'Read titles and content.'),/one level of a hierarchical response/);
 p.steps[1].detail+=' Recursively fetch each child ID with this request, paginating every parent independently.';
 assert.doesNotThrow(()=>validateInterpretation(p,[tree],'Read titles and content.'));
});
test('completion: instance input normalization preserves strict route validation for authorization metadata',()=>{
 const p=value();p.steps[0].request={method:'GET',endpoint:'<INSTANCE_BASE_URL>/oauth/authorize?client_id=<CLIENT_ID>',example:"curl '<INSTANCE_BASE_URL>/oauth/authorize?client_id=<CLIENT_ID>'"};
 const source={...docs[0],text:docs[0].text+'\nGET /oauth/authorize accepts client_id for the registered application.'};
 const normalized=validateInterpretation(p,[source]);assert.equal(normalized.steps[0].request?.endpoint,'/oauth/authorize?client_id=<CLIENT_ID>');
 p.steps[0].request!.endpoint='<INSTANCE_BASE_URL>/undocumented';assert.throws(()=>validateInterpretation(p,[source]),/not documented/);
});
test('completion: collection protocol evidence stays beside a long paginated operation reference',()=>{
 const collection={...docs[0],id:'s2',url:'https://acmetasks.example.com/api/collections/',title:'Collections',text:'A collection wraps items in _embedded.elements and supplies total and nextByOffset for complete pagination.'};
 const others=Array.from({length:10},(_,index)=>({...docs[0],id:'s'+(index+3),url:'https://acmetasks.example.com/api/endpoints/items-'+index,title:'Items reference',text:'GET /items retrieves item titles and content.'}));
 const selected=planningDocuments([...docs,...others,collection],{app:'Acme',website:url,useCase:'Read item titles including pagination.',audience:'customers',answers:{}},{requestedActions:[{id:'read',title:'Read item titles',operation:'read'}],prohibitions:[]});
 assert.ok(selected.some(document=>document.id==='s2'));assert.ok(selected.length<=8);
});
test('completion: independent response review sees an explicitly linked matching object definition',async()=>{
 const reference={...docs[0],id:'s2',url:'https://acmetasks.example.com/reference/issue',title:'Issue object',text:'Issue object\n{"object":"issue","properties":{"Heading":{"type":"title","title":[{"plain_text":"Sample"}]}}}'};
 const operation={...docs[0],links:[reference.url],text:docs[0].text+'\nGET /issues\nResponse:\n{"object":"issue","id":"example"}'};let visible=false;
 await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{const input=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);visible=input.mappings[0].referenceContext.some((source:any)=>source.sourceId==='s2'&&input.referenceDocuments.find((d:any)=>d.sourceId===source.sourceId)?.passages.some((passage:string)=>passage.includes('plain_text')));return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'unresolved',missingFact:'response',reason:'The response path still needs correction.'}]});},[operation,reference]);assert.ok(visible);
});
test('completion: cursor aliases merge duplicate continuation instructions without merging resource IDs',async()=>{
 const {coalesceRequestSteps}=await import('../lib/live-guide/step-shape.ts');const p=value();const next={...p.steps[1],id:'next-first',request:{method:'POST',endpoint:'/issues/continue',example:"curl 'https://api.acme.com/issues/continue' -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer <ACCESS_TOKEN>' -d '{\"cursor\":\"<CURSOR_FROM_PREVIOUS_RESPONSE>\"}'"}};const duplicate={...next,id:'next-second',detail:'Repeat until the response contains has_more false.',request:{...next.request,example:next.request.example.replace('<CURSOR_FROM_PREVIOUS_RESPONSE>','<NEXT_CURSOR>')}};p.steps.push(next,duplicate);
 const out=coalesceRequestSteps(p);assert.equal(out.steps.filter(s=>s.testKind==='action').length,2);assert.match(out.steps.find(s=>s.id==='next-first')!.detail,/has_more false/);
 p.steps[3].request!.example=next.request.example.replace('<CURSOR_FROM_PREVIOUS_RESPONSE>','<DIFFERENT_RESOURCE_ID>');assert.equal(coalesceRequestSteps(p).steps.filter(s=>s.testKind==='action').length,3);
});
test('completion: next-link lifecycle requests are checked as continuations of their declared collection',async()=>{
 const {assembleStepParts}=await import('../lib/live-guide/plan-parts.ts');const original={steps:[{id:'first',testKind:'action',actionIds:['read'],request:{endpoint:'/projects/{id}/issues',example:"curl 'https://api.acme.com/projects/<ID>/issues'"}},{id:'next',testKind:'lifecycle',actionIds:['read'],dependsOn:['first'],request:{endpoint:'/issues',example:"curl '<NEXT_PAGE_URL>'"}}],continuations:[]};
 const normalized=assembleStepParts(original);assert.equal(normalized.steps[1].testKind,'action');assert.equal(normalized.steps[1].request.endpoint,'/projects/{id}/issues');assert.equal(normalized.steps[1].request.example,original.steps[1].request.example);assert.equal(original.steps[1].request.endpoint,'/issues');
});
test('completion: the handoff recorder recognizes a cited response condition but not an unrelated flag',async()=>{
 const {inspectHandoff}=await import('../scripts/inspect-handoff.mts');const p=value();p.steps[1].detail='Continue while has_more is true. Boundary check: inspect the actual grant and outgoing request log.';p.steps[1].doneWhen='has_more is false on the last page.';p.steps[1].fields=['ACCESS_TOKEN: from the OAuth exchange.'];p.steps[1].evidence=[{sourceId:'s1',quote:'Response properties has_more boolean indicates further pages.'}];
 assert.ok(!inspectHandoff(p)[0].errors.includes('Expected successful response absent'));
 p.steps[1].detail='Wait for completion. Boundary check: inspect the actual grant and outgoing request log.';p.steps[1].doneWhen='unrelated_flag is false.';assert.ok(inspectHandoff(p)[0].errors.includes('Expected successful response absent'));
});
test('completion: batch size is not a concrete pagination continuation',async()=>{
 const {hasContinuationRequest}=await import('../lib/live-guide/request-examples.ts');const {validatePaginationHandoff}=await import('../lib/live-guide/interpretation.ts');const {inspectHandoff,paginationHandoff}=await import('../scripts/inspect-handoff.mts');
 for(const parameter of ['page_size=100','per_page=50','pageSize=20','limit=50'])assert.equal(hasContinuationRequest("curl 'https://api.acme.com/issues?"+parameter+"'"),false);
 assert.equal(hasContinuationRequest("curl 'https://api.acme.com/issues?page=2'"),true);assert.equal(hasContinuationRequest("curl 'https://api.acme.com/issues?start_cursor=<NEXT_CURSOR>'"),true);assert.equal(hasContinuationRequest("curl 'https://api.acme.com/issues' -H 'Content-Type: application/json' -d '{\"cursor\":\"<NEXT_CURSOR>\"}'"),true);
 assert.equal(hasContinuationRequest("curl 'https://api.acme.com/graphql' -H 'Content-Type: application/json' -d '{\"query\":\"{ issues(after: \\\"<CURSOR>\\\") { nodes { title } } }\"}'"),true);
 const p=value();p.steps[1].request!.example="curl 'https://api.acme.com/issues?page_size=100' -H 'Authorization: Bearer <ACCESS_TOKEN>'";p.steps[1].fields=['ACCESS_TOKEN from the OAuth exchange.'];p.steps[1].detail+=' Repeat until has_more is false.';p.steps.push({...structuredClone(p.steps[1]),id:'other-resource',request:{method:'GET',endpoint:'/other',example:"curl 'https://api.acme.com/other' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}});
 assert.throws(()=>validatePaginationHandoff(p,'Read issue titles including pagination.'),/batch\/page-size parameter is not continuation/);assert.equal(paginationHandoff(p,inspectHandoff(p)),false);
});
test('completion: known authorization constants cannot become whole-URL inputs and the stub inspects OAuth setup',async()=>{
 const source={...docs[0],text:docs[0].text+'\nGET https://api.acme.com/oauth/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI starts consent. The callback returns a code.'};const p=value();const auth:any={id:'consent',title:'Authorize the test user',testKind:'authorization',stage:'test',owner:'developer',detail:'Open consent and receive the callback code.',doneWhen:'The callback receives an authorization code.',fields:['CLIENT_ID from the registration','REDIRECT_URI is the registered HTTPS callback'],request:{method:'GET',endpoint:'https://api.acme.com/oauth/authorize',example:"curl '<AUTH_URL>'"},evidence:ev,dependsOn:['register']};p.steps.splice(1,0,auth);
 assert.throws(()=>validateInterpretation(p,[source]),/concrete documented authorization or token URL/);auth.request.example="curl 'https://api.acme.com/oauth/authorize?response_type=code&client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>'";assert.doesNotThrow(()=>validateInterpretation(p,[source]));
 const {inspectHandoff}=await import('../scripts/inspect-handoff.mts');const consent=inspectHandoff(p).find(r=>r.stepId==='consent')!;assert.deepEqual(consent.errors,[]);assert.ok(consent.stub.url?.includes('client_id=test-client-id'));
 const token={...auth,id:'exchange',detail:'Exchange the callback code with Basic client authentication.',doneWhen:'Response contains access_token.',request:{method:'POST',endpoint:'https://api.acme.com/oauth/token',example:"curl 'https://api.acme.com/oauth/token' -u '<CLIENT_ID>:<CLIENT_SECRET>' -H 'Content-Type: application/json' -d '{\"grant_type\":\"authorization_code\",\"code\":\"<CODE_FROM_CALLBACK>\",\"redirect_uri\":\"<REDIRECT_URI>\"}'"}};const checked=inspectHandoff({accessModel:'oauth',steps:[token]})[0];assert.deepEqual(checked.errors,[]);assert.equal(checked.stub.method,'POST');assert.equal(checked.stub.headers.authorization,'Basic '+Buffer.from('test-client-id:test-client-secret').toString('base64'));assert.equal((checked.stub.body[0] as any).grant_type,'authorization_code');assert.equal((checked.stub.body[0] as any).redirect_uri,'https://client.example/callback');assert.equal(checked.executed,false);
});
test('completion: pagination pairs belong to the same resource and preserve zero-based page sequences',async()=>{
 const {hasPaginationPair}=await import('../lib/live-guide/request-examples.ts');const page=(endpoint:string,value:number)=>({actionIds:['read'],request:{endpoint,example:"curl 'https://api.acme.com"+endpoint+'?page='+value+"'"}});
 assert.equal(hasPaginationPair([page('/items',0),page('/items',1)]),true);assert.equal(hasPaginationPair([page('/items',1),page('/items',2)]),true);assert.equal(hasPaginationPair([page('/items',1),page('/items',1)]),false);assert.equal(hasPaginationPair([page('/other',0),page('/items',1)]),false);
 const cursor={actionIds:['read'],request:{endpoint:'/items/{id}/properties/{key}',example:"curl 'https://api.acme.com/items/<ID>/properties/<KEY>?cursor=<NEXT_CURSOR>'"}};assert.equal(hasPaginationPair([page('/items',0),cursor]),false);
 const initial={actionIds:['read'],request:{endpoint:'/items',example:"curl 'https://api.acme.com/items' -H 'Content-Type: application/json' -d '{\"path\":\"\"}'"}},next={actionIds:['read'],request:{endpoint:'/items/continue',example:"curl 'https://api.acme.com/items/continue' -H 'Content-Type: application/json' -d '{\"cursor\":\"<NEXT_CURSOR>\"}'"}};assert.equal(hasPaginationPair([initial,next]),true);
});
test('completion: a named request must identify its expected scalar and source validation still applies',async()=>{
 const {assembleStepParts}=await import('../lib/live-guide/plan-parts.ts');const p=value(),source={...docs[0],text:docs[0].text+'\nResponse JSON paths for GET /issues: $[].title (string)'};
 const named=assembleStepParts({steps:p.steps,continuations:[]});assert.throws(()=>validateInterpretation({...p,steps:named.steps},[source],'Read issue titles.'),/explicit JSON response path/);
 p.steps[1].request!.responsePath='$[].title';const fixed=validateInterpretation(p,[source],'Read issue titles.');assert.equal(fixed.steps[1].request!.responsePath,'$[].title');const plan=researchedPlan(run(fixed).guide);assert.equal(plan.steps[1].request!.responsePath,'$[].title');assert.match(exportPlan(plan),/Response value: `\$\[\]\.title`/);
 p.steps[1].request!.responsePath='$.data.undocumented';assert.throws(()=>validateInterpretation(p,[source],'Read issue titles.'),/response field is not documented/);
 p.steps[1].request!.responsePath='$.unlisted';assert.throws(()=>validateInterpretation(p,[source],'Read issue titles.'),/response field is not documented/);
 const {inspectHandoff}=await import('../scripts/inspect-handoff.mts');const legacy=value();assert.ok(inspectHandoff(legacy,{requireResponsePath:true})[0].errors.includes('Explicit expected JSON response path absent'));
});
test('completion: standard documentation indices discover exact references before broad homepage navigation',async()=>{
 const root='https://acmetasks.example.com/',reads:string[]=[];
 const result=await (await import('../lib/live-guide/retrieval.ts')).retrieve({app:'Acme',website:root,useCase:'Read item titles.',audience:'customers',answers:{}},{},()=>{},new AbortController().signal,async input=>{const address=String(input);if(address.includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});reads.push(address);if(address===root)return new Response('<title>Acme docs</title><main>'+('General documentation navigation. ').repeat(40)+Array.from({length:20},(_,i)=>'<a href="/docs/topic-'+i+'">General topic</a>').join('')+'</main>');if(address===root+'llms.txt')return new Response('# Documentation\n[General guide]('+root+'docs/topic-0)');if(address===root+'sitemap.xml')return new Response('<sitemapindex><sitemap><loc>'+root+'en-us/sitemap.xml</loc></sitemap></sitemapindex>',{headers:{'Content-Type':'application/xml'}});if(address===root+'en-us/sitemap.xml')return new Response('<urlset><url><loc>'+root+'docs/oauth</loc></url><url><loc>'+root+'reference/items</loc></url><url><loc>https://127.0.0.1/private</loc></url></urlset>',{headers:{'Content-Type':'application/xml'}});if(address===root+'docs/oauth')return new Response('<main>Create an OAuth application and register its client ID and redirect URI. The items:read permission permits item reads for the connected person.</main>');if(address===root+'reference/items')return new Response('<main>GET /v1/items retrieves the connected person\'s items. The response is an array of items with a title string and item ID.</main>');return new Response('Missing',{status:404});});
 assert.ok(result.documents.some(document=>document.url===root+'docs/oauth'));assert.ok(result.documents.some(document=>document.url===root+'reference/items'));assert.ok(!result.documents.some(document=>/sitemap/.test(document.url)));assert.ok(!reads.some(address=>address.includes('127.0.0.1')));assert.ok(reads.indexOf(root+'sitemap.xml')<reads.indexOf(root+'reference/items'));
});
test('completion: integration registration outranks internal authorization and implementation files',()=>{
 const input={app:'Acme',website:'https://docs.acme.com/',useCase:'Read issue titles using OAuth for customer accounts.'};
 assert.ok(documentationScore('https://docs.acme.com/integration/oauth_provider/','OAuth provider',input)>documentationScore('https://docs.acme.com/development/graphql_guide/authorization/','GraphQL Authorization',input));
 assert.ok(documentationScore('https://acme.com/org/project/-/blob/main/lib/authorization.rb','Authorization implementation',input)<0);
});
test('completion: a completed independent review replaces a stale rejection explanation',async()=>{
 const candidate=value();candidate.coverage[0].reason='The response path was not documented in the earlier evidence.';
 const reviewed=await reviewMappings(candidate,run().guide.input,bindings,new AbortController().signal,async()=>aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The supplied response object defines the requested field and read permission.'}]}),docs);
 assert.equal(reviewed.value.coverage[0].support,'reviewed');assert.match(reviewed.value.coverage[0].reason,/defines the requested field/);assert.doesNotMatch(reviewed.value.coverage[0].reason,/not documented/);
});
test('completion: action recovery corrects a missing concrete continuation once using its exact validation error',async()=>{
 const old=structuredClone(run());old.guide.input.useCase='Read project issues including pagination.';old.documents[0].text+='\nFollow the cursor and repeat until has_more is false.';const original=JSON.stringify(old);let patchCalls=0,reviewCalls=0;
 const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>{const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently')){reviewCalls++;const audit=JSON.parse(body.messages[0].content);return aiResponse({requestComplete:true,missingActions:[],completenessChecks:audit.completenessEvidence.map((p:any)=>({id:p.id,applies:true,covered:true,stepIds:audit.allResourceRequests.map((s:any)=>s.id),reason:''})),reviews:[{id:'0',status:'supported',reason:'The initial request, concrete continuation and stopping condition are documented.'}]});}patchCalls++;const context=JSON.parse(body.messages[0].content),passage=context.documents.flatMap((d:any)=>d.passages).find((p:any)=>p.citable&&p.text.includes('Follow the cursor'));const citations={primary:passage.id,secondary:'',tertiary:''};const first={stepId:'read-test',title:'Read the first page',detail:'Read the first response. Boundary check: inspect the read grant and outgoing request log.',doneWhen:'Response contains issue objects.',fields:['ACCESS_TOKEN: OAuth exchange.'],request:{...old.guide.steps[1].request,responsePath:'$[].title'},evidence:citations};if(patchCalls===2)assert.match(body.messages.at(-1).content,/Local validation failed:.*concrete pagination request/);
 return aiResponse({findings:[],coverage:{permissions:['issues:read'],status:'mapped',reason:'The read grant supports the documented listing.',evidence:citations},steps:patchCalls===1?[first]:[first,{...first,stepId:'',title:'Read each continuation',detail:'Repeat with the latest cursor until has_more is false. Boundary check: inspect the read grant and outgoing request log.',doneWhen:'Response has_more is false.',fields:['NEXT_CURSOR: latest response cursor.'],request:{method:'GET',endpoint:'/issues',responsePath:'$[].title',example:"curl 'https://api.acme.com/issues?cursor=<NEXT_CURSOR>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}}]});},old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});
 assert.equal(patchCalls,2);assert.equal(reviewCalls,1);assert.equal(updated.guide.engine?.outcome,'accepted');assert.equal(updated.guide.steps.filter(step=>step.testKind==='action').length,2);assert.equal(JSON.stringify(old),original);assert.ok(updated.guide.engine?.validationIssues?.some(issue=>issue.includes('concrete pagination request')));
});
test('completion: native Markdown preserves narrative, published navigation and a fenced operation schema',()=>{
 const markdown=['> Documentation index: https://acmetasks.example.com/llms.txt','# Retrieve content','Report partial output rather than marking it complete.','````yaml get /v1/pages/{id}/content','openapi: 3.1.0','info: {title: Content API, version: 1.0.0}','servers: [{url: https://api.acme.com}]','paths:','  /v1/pages/{id}/content:','    get:','      parameters:','        - name: X-API-Version','          in: header','          required: true','          schema: {type: string, enum: [v2]}','      responses:',"        '200':",'          description: Successful content response','          content:','            application/json:','              schema:','                type: object','                properties:','                  content: {type: string}','                  truncated: {type: boolean}','                  missing_ids: {type: array, items: {type: string}}','````'].join('\n');
 const result=parsePage('https://acmetasks.example.com/reference/content',markdown,'Read page content.');assert.equal(result.title,'Retrieve content');assert.ok(result.links.includes('https://acmetasks.example.com/llms.txt'));assert.match(result.text,/Report partial output/);assert.match(result.text,/Response JSON paths for GET \/v1\/pages\/\{id\}\/content: \$\.truncated \(boolean\)/);assert.match(result.text,/"enum":\["v2"\]/);assert.match(result.text,/Original schema excerpt/);assert.match(result.text,/openapi: 3.1.0/);
 const alias=markdown.replace('type: object','type: &kind object').replace('type: boolean','type: *kind');assert.doesNotMatch(parsePage(url,alias).text,/Extracted official OpenAPI fields/);
});
test('completion: a Markdown HTML example cannot be mistaken for the page document',()=>{
 const result=parsePage(url,'# OAuth documentation\nRegister an application.\n```html\n<title>Example client</title>\n<main>Client rendering example</main>\n```');assert.equal(result.title,'OAuth documentation');assert.match(result.text,/<main>Client rendering example<\/main>/);
});
test('completion: native operation fields keep their linked property reference ahead of broad exports',async()=>{
 const {retrieve}=await import('../lib/live-guide/retrieval.ts');const root='https://docs.acme.com/docs/oauth',operation='https://docs.acme.com/reference/retrieve-an-item',property='https://docs.acme.com/reference/item-properties',broad='https://docs.acme.com/openapi-admin.json';const reads:string[]=[];
 const spec={openapi:'3.1.0',info:{title:'Items',version:'1'},paths:{'/items/{id}':{get:{responses:{200:{description:'Item response',content:{'application/json':{schema:{type:'object',properties:{properties:{type:'object'}}}}}}}}}}};
 const result=await retrieve(normalizeInput({app:'Acme',website:root,useCase:'Read item titles. Never write.',audience:'customers'}),{},()=>{},new AbortController().signal,async(u,init)=>{const address=String(u);if(address.includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});reads.push(address);assert.match(new Headers(init?.headers).get('accept')||'',/^text\/markdown,/);if(address===root)return new Response('# OAuth\nCreate an OAuth application with a redirect URI. The items:read scope allows reading item values.\n[Read an item]('+operation+')\n[API export]('+broad+')');if(address===operation)return new Response('# Retrieve an item\nThe response properties use the linked [Item property values]('+property+').\n```json\n'+JSON.stringify(spec)+'\n```');if(address===property)return new Response('# Item property values\nEach property has a type discriminator. A title property has type title, a title array and plain_text on each element.');return new Response('Missing',{status:404});});
 assert.ok(result.documents.some(document=>document.url===property));assert.ok(!reads.includes(broad)||reads.indexOf(property)<reads.indexOf(broad));
 const selected=planningDocuments(result.documents,normalizeInput({app:'Acme',website:root,useCase:'Read item titles.'}),{requestedActions:[{id:'read',title:'Read item titles',operation:'read'}],prohibitions:[]});assert.ok(selected.some(document=>document.url===property));
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
test('completion: JSON OAuth metadata has exact citable fields without losing the original document',()=>{
 const body=JSON.stringify({issuer:'https://login.acme.com',authorization_endpoint:'https://login.acme.com/authorize',token_endpoint:'https://login.acme.com/token'});
 const page=parsePage('https://login.acme.com/.well-known/oauth-authorization-server',body);
 const passages=sourcePassages([{...docs[0],text:page.text}]);
 assert.ok(passages.some(p=>p.citable&&p.text.includes('JSON field token_endpoint has value "https://login.acme.com/token".')));
 assert.match(page.text,/"authorization_endpoint": "https:\/\/login.acme.com\/authorize"/);
});
test('completion: a documented example hostname becomes an instance input while unlisted hosts stay rejected',()=>{
 const p=value(),sources=[{...docs[0],text:docs[0].text+'\nExample request: https://api.example.com/issues'}];
 p.steps[1].request={method:'GET',endpoint:'https://api.example.com/issues',example:"curl 'https://api.example.com/issues' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};
 const fixed=validateInterpretation(p,sources);
 assert.equal(fixed.steps[1].request?.endpoint,'/issues');
 assert.match(fixed.steps[1].request!.example,/<INSTANCE_BASE_URL>\/issues/);
 assert.ok(fixed.steps[1].fields?.some(field=>field.includes('full HTTPS instance URL')));
 assert.ok(!endpointEvidence('https://api.example.com/issues',sources).supported);
});
test('completion: an OAuth registration guide survives ranking beside endpoint object references',()=>{
 const registration={...docs[0],url:'https://acmetasks.example.com/docs/system-admin/authentication/oauth-applications/'};
 const endpoint={...docs[0],id:'s2',url:'https://acmetasks.example.com/docs/api/endpoints/oauth-2/'};
 assert.ok(planningDocuments([endpoint,registration],run().guide.input).includes(registration));
});
test('completion: a property reference retains its late field definitions in planning and review context',async()=>{
 const {planningContext}=await import('../lib/live-guide/interpretation.ts');
 const source={...docs[0],url:'https://docs.acme.com/reference/item-property-values',text:('General read access and unrelated metadata.\n').repeat(600)+'\nTitle fields have a type discriminator and an array of rich text values. Read each plain_text value from that array.'};
 const context=planningContext(sourcePassages([source]),source,run().guide.input,8);
 assert.ok(context.some(p=>p.text.includes('Read each plain_text value')));
});
test('completion: response evidence gaps retain their classification for targeted recovery',async()=>{
 const result=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async()=>aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'unresolved',missingFact:'response',reason:'The response property needs its type definition.'}]}),docs);
 assert.equal(result.value.coverage[0].missingFact,'response');
 assert.equal(result.value.blockers.find(b=>b.actionId==='read')?.gap?.fact,'request');
});
test('completion: distinct pagination requests survive action reconciliation',()=>{
 const p=value();p.steps.push({...p.steps[1],id:'continue',request:{method:'GET',endpoint:'/issues?cursor=NEXT',example:"curl 'https://api.acme.com/issues?cursor=NEXT'"},dependsOn:['read-test']});
 const out=reconcile(p);assert.equal(out.steps.filter(s=>s.testKind==='action').length,2);assert.deepEqual(out.steps.at(-1)!.dependsOn,['read-test']);
});
test('completion: declared continuations remain resource actions with their initial request dependency',async()=>{
 const {assembleStepParts,stepsSchemaForRequest}=await import('../lib/live-guide/plan-parts.ts');
 const initial=value().steps[1];
 const continuation={...initial,id:'next-page',testKind:'lifecycle',dependsOn:[],request:{...initial.request,example:"curl 'https://api.acme.com/issues?cursor=<CURSOR>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}};
 const result=assembleStepParts({steps:[initial],continuations:[continuation]});
 assert.equal(result.steps[1].testKind,'action');
 assert.deepEqual(result.steps[1].dependsOn,[initial.id]);
 assert.equal(result.steps[1].request.example,continuation.request.example);
 assert.equal((stepsSchemaForRequest(true).properties.continuations as {minItems?:number}).minItems,1);
});
test('completion: response paths retain the correct object and operation through source compression',async()=>{
 const {responseExamples}=await import('../lib/live-guide/response-shapes.ts');
 const sample='GET /projects/{id}/issues\nExample response:\n'+JSON.stringify([{milestone:{title:'Release'},title:'Issue subject'}]);
 const summaries=responseExamples(sample);
 assert.match(summaries.join('\n'),/GET \/projects\/\{id\}\/issues: \$\[\]\.title \(string\)/);
 assert.match(summaries.join('\n'),/\$\[\]\.milestone\.title \(string\)/);
 assert.deepEqual(responseExamples('GET /projects/{id}/issues\nExample response:\n[{"title":'),[]);
 const compressed=selectSourceText(('Unrelated manual.\n').repeat(3000)+sample,'Read project issue titles.',4000);
 assert.match(compressed,/Response JSON paths for GET \/projects\/\{id\}\/issues: \$\[\]\.title/);
});
test('completion: a response claim cannot borrow properties from a different operation',()=>{
 const sources=[{...docs[0],text:docs[0].text+'\nGET /issues/text returns text.\nResponse JSON paths for GET /issues: $.properties.title (string)\nResponse JSON paths for GET /issues/text: $.markdown (string)'}];
 const p=value();p.steps[1].detail='Read properties.title from the returned object. Boundary check: inspect the granted access and outgoing request log.';
 p.steps[1].request={method:'GET',endpoint:'/issues/text',example:"curl 'https://api.acme.com/issues/text' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};
 assert.throws(()=>validateInterpretation(p,sources),/response field is not documented for this operation/);
 p.steps[1].request={method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};
 assert.doesNotThrow(()=>validateInterpretation(p,sources));
});
test('completion: grant definitions and late response samples survive large unrelated sections',async()=>{
 const {responseExamples}=await import('../lib/live-guide/response-shapes.ts');
 const unrelated=Array.from({length:30},()=> 'POST /admin/token\nExample response:\n{"token":"sample"}\n').join('');
 const sample='curl --request GET --url https://api.acme.com/issues/text\n200\n400\n404\n{"markdown":"Body"}';
 assert.match(responseExamples(unrelated+sample,['issues']).join('\n'),/issues\/text: \$\.markdown/);
 const text=('OAuth permission scope metadata reference.\n').repeat(2000)+'\nitems:read\nGrants read-only access to items and projects.\n';
 const selected=selectSourceText(text,'Read item names.',2000);
 assert.match(selected,/items:read\nGrants read-only access to items and projects/);
});
test('completion: operation parameters and response wrappers survive competing schema metadata',()=>{
 const main='## GET /api/v1/records/search | Search for records\nParameter private in query (boolean, optional): include private records accessible to the user\nParameter page in query (integer, optional): page number\nSuccessful response 200: Search results\nResponse JSON paths for GET /api/v1/records/search: $.data[].name (string)\n';
 const metadata=Array.from({length:600},(_,i)=>'Response JSON paths for GET /api/v1/records/{id}/metadata/extra: $.record.metadata_'+i+'.name (string)').join('\n');
 const selected=selectSourceText(main+'\n## GET /api/v1/records/metadata | Metadata for records\n'+metadata,'List record names visible to the connected person, including pagination.',4000);
 assert.match(selected,/include private records accessible to the user/);
 assert.match(selected,/Parameter page in query/);
 assert.match(selected,/records\/search: \$\.data\[\]\.name/);
});
test('completion: overlength presentation repair retains request, grants and evidence',async()=>{
 const p=value();p.coverage[0].reason='Repeated display text. '.repeat(60);const before=structuredClone(p);
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
function aiResponse(data:any){if(Array.isArray(data?.completenessChecks))data={...data,completenessChecks:data.completenessChecks.map((c:any)=>c.applies&&c.covered&&!c.reason?{...c,reason:'The supplied fixture instructions cover this notice.'}:c)};if(Array.isArray(data?.reviews))data={...data,reviews:data.reviews.map((r:any)=>({...r,checks:r.checks||{setup:true,grant:r.status==='supported',request:true,response:true,pagination:true,boundary:true}}))};return Response.json({type:'message',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(data)}],usage:{input_tokens:100,output_tokens:100,output_tokens_details:{thinking_tokens:30}}});}
function wire(v:Interpretation){const all=sourcePassages(docs);const copy=structuredClone(v);for(const step of copy.steps)if(step.request)step.request.responsePath=step.request.responsePath??(step.testKind==='action'?'$[].title':'');for(const item of [...copy.findings,...copy.steps,...copy.coverage])if(item.evidence)(item as unknown as {evidence:unknown[]}).evidence=item.evidence.map(e=>({passageId:all.find(p=>p.text.includes(e.quote))!.id}));return copy;}

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
 const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'documentation',actionId:'read',url:provided,requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>{const u=String(_url);requests.push(u);if(u.startsWith('https://cloudflare-dns.com/'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(u===provided)return new Response('<main>Use GET /issues/TEST-1 to retrieve one issue from a selected test project. The issues:read permission permits this operation.</main>');if(u.includes('anthropic')){const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently')){assert.doesNotMatch(JSON.parse(body.messages[0].content).request,/Read issue comments/);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented read operation.'}]});}const data=JSON.parse(body.messages[0].content),source=data.documents.find((d:{url:string})=>d.url===provided),patch=structuredClone(template.steps[1]);patch.request={method:'GET',endpoint:'/issues/TEST-1',responsePath:'$.title',example:"curl 'https://api.acme.com/issues/TEST-1' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};(patch as unknown as {evidence:{passageId:string}[]}).evidence=[{passageId:source.passages[0].id}];return aiResponse({findings:[],coverage:template.coverage,steps:[patch]});}throw new Error('Unexpected request');},old);
 assert.equal(updated.guide.engine?.outcome,'accepted');assert.equal(updated.documents.length,2);assert.equal(requests.filter(u=>u===provided).length,1);assert.ok(!requests.some(u=>/duckduckgo|firecrawl|oauth$/.test(u)));assert.equal(updated.guide.steps.find(s=>s.id==='read-test')!.request?.endpoint,'/issues/TEST-1');assert.deepEqual(updated.guide.coverage.find(c=>c.actionId==='comments'),old.guide.coverage.find(c=>c.actionId==='comments'));assert.deepEqual(updated.guide.input.answers,old.guide.input.answers);
});
test('endpoint URLs and short code lines remain model context without becoming citable prose',()=>{const source={...docs[0],text:'GraphQL endpoint\nhttps://api.acmetasks.example.com/graphql\ncurl \\\n-X POST \\\n--data \'{ "query": "{ issues { nodes { id title } } }" }\' \\\nUse a read token to retrieve issues from the selected test project.'};const passages=contextPassages(sourcePassages([source]),source.id,'Read project issues');const endpoint=passages.find(p=>p.text.includes('https://api.acmetasks.example.com/graphql'));assert.ok(endpoint);assert.equal(sourcePassages([{...source,text:'https://api.acmetasks.example.com/graphql'}])[0].citable,false);assert.ok(passages.some(p=>p.text.includes('issues { nodes')));});
test('a documented action update clears legacy endpoint gaps while retaining administrator prerequisites',()=>{const p=value();p.coverage[0].support='reviewed';p.blockers=[{title:'Issue-read operation and endpoint are not verified',consequence:'test',owner:'Developer',resolution:'Check the GraphQL documentation and fill the request.',stepIds:['read-test']},{title:'Admin approval',kind:'prerequisite',consequence:'test',owner:'Admin',resolution:'Approve access first.',stepIds:['read-test']}];const updated=reconcile(p);assert.equal(updated.blockers.length,1);assert.equal(updated.blockers[0].title,'Admin approval');});
test('resolving an issue request removes its obsolete endpoint warning while retaining other evidence gaps',()=>{const p=value();p.coverage[0].support='reviewed';p.unknowns=['The issue-read operation and endpoint are not in the supplied passages.','The comment endpoint is not in the supplied passages.','Customer approval policy is unknown.'];const updated=reconcile(p);assert.deepEqual(updated.unknowns,['The comment endpoint is not in the supplied passages.','Customer approval policy is unknown.']);});
test('an unresolved placeholder for another action cannot prevent a valid targeted update',async()=>{const old=run();old.guide.requestedActions.push({id:'comments',title:'Read comments',operation:'read'});old.guide.steps.push({...value().steps[1],id:'comments-test',actionIds:['comments'],request:undefined,evidence:[]});const template=wire(value());const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>JSON.parse(String(init?.body)).system.startsWith('Independently')?aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]}):aiResponse({findings:[],coverage:template.coverage,steps:[template.steps[1]]}),old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});assert.equal(updated.guide.engine?.outcome,'accepted');assert.deepEqual(updated.guide.steps.find(s=>s.id==='comments-test')?.evidence,[]);assert.equal(updated.guide.steps.find(s=>s.id==='read-test')?.request?.endpoint,'/issues');});
test('an unconfigured model produces a retryable saved failure instead of a completed plan',async()=>{const {db}=database(),old=run();old.guide.clarificationUsed=true;await db.prepare('INSERT INTO live_guides (id,payload,created_at) VALUES (?,?,?)').bind(old.guide.id,JSON.stringify(old),old.guide.generatedAt).run();const job=await createJob(db,{...old.guide.input,previousId:old.guide.id},crypto.randomUUID());const done=await runJob(db,job.id,{},()=>{},new AbortController().signal,async()=>{throw new Error('No network');});assert.equal(done.state,'interrupted');assert.equal(await readPlan(done.guide!.id,db),null);});
test('the small structured action response keeps identity and dependency fields under server control',async()=>{const old=run(),template=wire(value());const c=template.coverage[0],s=template.steps[1];const updated=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_url,init)=>{const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]});assert.ok(body.output_config.format.schema.properties.steps);assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.output_config.effort,'low');return aiResponse({findings:[],coverage:{permissions:c.permissions,status:c.status,reason:c.reason,evidence:c.evidence},step:{title:s.title,detail:s.detail,doneWhen:s.doneWhen,evidence:s.evidence,request:s.request}});},old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});assert.equal(updated.guide.engine?.outcome,'accepted');assert.equal(updated.guide.steps[1].id,'read-test');assert.deepEqual(updated.guide.steps[1].dependsOn,['register']);assert.equal(updated.guide.steps[1].owner,'developer');});
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
test('final: oversized action prose repairs only text fields without regenerating requests or reading sources',async()=>{
 const old=run(),p=wire(value());let patchCalls=0,formatCalls=0,reviewCalls=0;
 const result=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(u,init)=>{
  assert.equal(String(u),'https://api.anthropic.com/v1/messages');const body=JSON.parse(String(init?.body));
  if(body.system.startsWith('Shorten ONLY')){formatCalls++;const fields=JSON.parse(body.messages[0].content);assert.ok(fields.some((f:any)=>f.path.join('.')==='coverage.0.reason'&&f.max===400));assert.ok(fields.every((f:any)=>!f.path.includes('request')&&!f.path.includes('evidence')));return aiResponse({values:fields.map((f:any)=>f.path.includes('reason')?p.coverage[0].reason:p.steps[1].detail)});}
  if(body.system.startsWith('Independently')){reviewCalls++;return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Documented.'}]});}
  patchCalls++;return aiResponse({findings:[],coverage:{...p.coverage[0],reason:'R'.repeat(450)},steps:[{...p.steps[1],detail:'A'.repeat(801)}]});
 },old,{checkpoint:{research:{documents:old.documents,website:url,inferred:false,warnings:[]}}});
 assert.equal(patchCalls,1);assert.equal(formatCalls,1);assert.equal(reviewCalls,1);assert.equal(result.guide.engine?.outcome,'accepted');assert.deepEqual(result.documents,old.documents);assert.equal(result.guide.steps[1].detail,p.steps[1].detail);assert.equal(result.guide.steps[1].request!.endpoint,p.steps[1].request!.endpoint);assert.deepEqual(result.guide.coverage[0].permissions,p.coverage[0].permissions);assert.equal(result.guide.engine?.attempts,3);
});

test('final: independent access review receives source identity alongside exact quoted evidence',async()=>{const p=value();await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_url,init)=>{const body=JSON.parse(String(init?.body)),audit=JSON.parse(body.messages[0].content);assert.deepEqual(audit.mappings[0].sourceContext,[{id:docs[0].id,url:docs[0].url,title:docs[0].title}]);assert.equal(audit.mappings[0].evidence[0].quote,ev[0].quote);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Scope and endpoint occur in the identified reference.'}]});},docs);});


test('completion: a paginated request needs both a concrete continuation and an end condition',()=>{
 const p=value();p.steps[1].request={method:'GET',endpoint:'/issues',example:"curl 'https://api.acme.com/issues?page=1' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};p.steps[1].detail='Read the first page. Boundary check: inspect the outgoing request log.';p.steps[1].doneWhen='Two pages returned issue titles.';
 assert.throws(()=>validateInterpretation(p,docs,'Read all project issues, including pagination.'),/both the initial/);
 p.steps.push({...p.steps[1],id:'next-page',dependsOn:['read-test'],request:{...p.steps[1].request,example:"curl 'https://api.acme.com/issues?page=2' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}});
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
 assert.equal(calls,1);assert.deepEqual(p,before);assert.deepEqual(corrected.findings,before.findings);assert.deepEqual(corrected.coverage,before.coverage);assert.deepEqual(corrected.steps[0],before.steps[0]);assert.deepEqual(corrected.steps[1].request,before.steps[1].request);assert.equal(corrected.steps[1].evidence.length,before.steps[1].evidence.length+1);assert.throws(()=>validateInterpretation(corrected,sources,'Read issues including pagination.'),/both the initial/);
 const paginated=structuredClone(corrected);paginated.steps.push({...corrected.steps[1],id:'next-page',dependsOn:['read-test'],request:{...corrected.steps[1].request!,example:"curl 'https://api.acme.com/issues?page=2' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}});assert.doesNotThrow(()=>validateInterpretation(paginated,sources,'Read issues including pagination.'));
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
  if(body.system.startsWith('Independently')){assert.match(JSON.stringify(context),/NEXT_CURSOR/);return aiResponse({requestComplete:true,missingActions:[],completenessChecks:context.completenessEvidence.map((p:any)=>({id:p.id,applies:true,covered:true,stepIds:['read-test','next-page'],reason:''})),reviews:[{id:'0',status:'supported',reason:'The grant and both requests are documented.'}]});}
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
 const old=run();old.guide.input.useCase+=' Include pagination.';old.guide.steps.push({...old.guide.steps[1],id:'next-page',dependsOn:['read-test'],request:{method:'GET',endpoint:'/issues',responsePath:'$[].title',example:"curl 'https://api.acme.com/issues?cursor=<NEXT_CURSOR>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"},detail:'Continue the listing. Boundary check: inspect the grant and request log.'});old.guide.coverage[0].status='unresolved';old.guide.coverage[0].reason='next-page must use documented page pagination.';const before=structuredClone(old),patch=wire(value());let audited=false;
 const result=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(_u,init)=>{
  const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);
  if(body.system.startsWith('Independently')){assert.ok(context.setupSteps.some((s:any)=>s.id==='register'));const requests=context.mappings[0].requestEvidence;assert.equal(requests.length,2);assert.ok(requests.some((s:any)=>s.request.example.includes('page=2')));audited=true;return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Both requests match the documented pagination.'}]});}
  assert.match(context.currentActionReview.reason,/next-page/);const next={...patch.steps[1],stepId:'next-page',detail:'Continue with the next page until the documented end. Boundary check: inspect the granted read scope and outgoing GET requests.',request:{method:'GET',endpoint:'/issues',responsePath:'$[].title',example:"curl 'https://api.acme.com/issues?page=2' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}};return aiResponse({findings:[],coverage:patch.coverage[0],steps:[next]});
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
 p.steps.splice(1,0,{...value().steps[1],id:'first-page'});p.steps[2].dependsOn=['first-page'];const fixed=validateInterpretation(p,source,'Read issues including pagination.');const {inspectHandoff,paginationHandoff}=await import('../scripts/inspect-handoff.mts');const requests=inspectHandoff(fixed);assert.deepEqual(requests[0].errors,[]);assert.equal(requests[1].stub.url,'https://instance.example/issues?page=2');assert.ok(paginationHandoff(fixed,requests));assert.ok(fixed.steps[2].fields!.some(f=>/Next-page URL/.test(f)));
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
test('completion: a permanent model request failure preserves evidence without repeating paid work or researching another source',async()=>{
 const old=run();old.guide.clarificationUsed=true;let calls=0,checkpoint:any;
 const result=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(url)=>{
  assert.equal(String(url),'https://api.anthropic.com/v1/messages');calls++;
  return Response.json({error:{type:'invalid_request_error',message:'Schema is too complex.'}},{status:400});
 },old,{checkpoint:{research:{website:url,documents:docs,inferred:false,warnings:[]},clarificationUsed:true,facts:value()},save:async saved=>{checkpoint=structuredClone(saved);}});
 assert.equal(calls,1);assert.equal(result.guide.engine?.outcome,'upstream-error');
 assert.match(result.guide.engine?.validationIssues?.join(' ')||'',/HTTP 400/);
 assert.equal(checkpoint.draftAccepted,false);assert.deepEqual(checkpoint.research.documents,docs);
 assert.deepEqual(checkpoint.facts,value());
});
test('completion: exhausted service credits retain the completed draft and retry only its review after access returns',async()=>{
 const {ModelServiceFailure}=await import('../lib/live-guide/failures.ts');const old=run();old.guide.clarificationUsed=true;const research={website:url,documents:docs,inferred:false,warnings:[]};let calls=0,checkpoint:any={research,clarificationUsed:true,draft:value(),draftAccepted:true};
 await assert.rejects(()=>generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async()=>{calls++;return Response.json({error:{type:'invalid_request_error',message:'Your credit balance is too low to access the API. secret-fixture'}},{status:400});},old,{checkpoint,save:async saved=>{checkpoint=structuredClone(saved);}}),error=>{assert.ok(error instanceof ModelServiceFailure);assert.equal(error.failure.serviceCode,'credits');assert.equal(error.failure.modelRequests,1);assert.doesNotMatch(error.message,/secret-fixture/);return true;});
 assert.equal(calls,1);assert.deepEqual(checkpoint.research,research);assert.deepEqual(JSON.parse(JSON.stringify(checkpoint.draft)),value());
 let resumedCalls=0;const resumed=await generate({...old.guide.input,previousId:old.guide.id},bindings,()=>{},new AbortController().signal,async(_u,init)=>{resumedCalls++;assert.ok(JSON.parse(String(init?.body)).system.startsWith('Independently'));return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The saved request is documented.'}]});},old,{checkpoint});assert.equal(resumedCalls,1);assert.equal(guideReadiness(resumed.guide),'usable-guide');
});
test('completion: an unfinished independent review retries the same draft without new source or generation calls',async()=>{
 const old=run();old.guide.clarificationUsed=true;let calls=0;const events:any[]=[];
 const result=await generate({...old.guide.input,previousId:old.guide.id},bindings,event=>events.push(event),new AbortController().signal,async(_u,init)=>{calls++;assert.ok(JSON.parse(String(init?.body)).system.startsWith('Independently'));if(calls===1)return Response.json({type:'message',stop_reason:'max_tokens',content:[{type:'text',text:'{}'}]});return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The saved request and its conditions are documented.'}]});},old,{checkpoint:{research:{website:url,documents:docs,inferred:false,warnings:[]},clarificationUsed:true,draft:value(),draftAccepted:true}});
 assert.equal(calls,2);assert.equal(guideReadiness(result.guide),'usable-guide');assert.ok(events.some(event=>event.stage==='Retrying guide check'));assert.ok(result.guide.engine?.validationIssues?.some(issue=>/max_tokens/.test(issue)));assert.deepEqual(result.documents,docs);
});
test('completion: a job-scoped account failure does not call the provider twice or reinterpret an unrelated HTTP error',async()=>{
 const {modelServiceFetcher}=await import('../lib/live-guide/model-service.ts');let calls=0;const wrapped=modelServiceFetcher(async()=>{calls++;return Response.json({error:{message:'Your credit balance is too low to access the API.'}},{status:400});});
 await assert.rejects(()=>wrapped('https://api.anthropic.com/v1/messages'));await assert.rejects(()=>wrapped('https://api.anthropic.com/v1/messages'));assert.equal(calls,1);
 const ordinary=modelServiceFetcher(async()=>Response.json({error:{message:'The response schema is invalid.'}},{status:400}));const response=await ordinary('https://api.anthropic.com/v1/messages');assert.equal(response.status,400);const errorBody=await response.json() as {error:{message:string}};assert.match(errorBody.error.message,/schema/);
});
test('completion: action recovery saves its corrected draft before review and resumes only that check',async()=>{
 const old=run(),original=JSON.stringify(old);old.guide.coverage[0].status='unresolved';old.guide.coverage[0].support='unresolved';let checkpoint:any={research:{website:url,documents:docs,inferred:false,warnings:[]}},patchCalls=0,reviewCalls=0;const payload=wire(value());const input={...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request' as const,actionId:'read',requestId:crypto.randomUUID()}};
 const first=await generate(input,bindings,()=>{},new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently')){reviewCalls++;if(reviewCalls===1)return Response.json({type:'message',stop_reason:'max_tokens',content:[{type:'text',text:'{}'}]});assert.equal(body.thinking.type,'disabled');return new Response('',{status:503});}patchCalls++;return aiResponse({findings:[],coverage:payload.coverage,steps:[{...payload.steps[1],stepId:'read-test',detail:payload.steps[1].detail+' Read the issue titles from the response.'}]});},old,{checkpoint,save:async saved=>{checkpoint=structuredClone(saved);}});
 assert.equal(patchCalls,1);assert.equal(reviewCalls,2);assert.equal(guideReadiness(first.guide),'research-failure');assert.equal(checkpoint.pendingReviewActionId,'read');assert.match(checkpoint.draft.steps[1].detail,/issue titles/);assert.equal(checkpoint.draft.coverage[0].status,'mapped');
 let resumedCalls=0;const resumed=await generate(input,bindings,()=>{},new AbortController().signal,async(_u,init)=>{resumedCalls++;assert.ok(JSON.parse(String(init?.body)).system.startsWith('Independently'));return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The corrected request is documented.'}]});},old,{checkpoint,save:async saved=>{checkpoint=structuredClone(saved);}});assert.equal(resumedCalls,1);assert.equal(guideReadiness(resumed.guide),'usable-guide');assert.equal(checkpoint.pendingReviewActionId,undefined);assert.match(resumed.guide.steps[1].detail,/issue titles/);assert.equal(old.guide.steps[1].detail,JSON.parse(original).guide.steps[1].detail);
});
test('completion: a compact review retry preserves all criteria and cannot turn a semantic rejection into a pass',async()=>{
 let calls=0,firstSignal:AbortSignal|null|undefined;const result=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{calls++;if(calls===1){firstSignal=init?.signal;return Response.json({type:'message',stop_reason:'max_tokens',content:[{type:'text',text:'{}'}]});}const body=JSON.parse(String(init?.body));assert.equal(init?.signal,firstSignal);assert.equal(body.thinking.type,'disabled');assert.equal(body.output_config.effort,'low');assert.deepEqual(Object.keys(body.output_config.format.schema.properties.reviews.items.properties.checks.properties),['setup','grant','request','response','pagination','boundary']);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'unresolved',missingFact:'response',checks:{setup:true,grant:true,request:true,response:false,pagination:true,boundary:true},affectedStepIds:['read-test'],reason:'The requested value has no documented extraction path.'}]});},docs);assert.equal(calls,2);assert.equal(result.value.coverage[0].status,'unresolved');assert.equal(result.value.coverage[0].missingFact,'response');assert.equal(result.telemetry.attempts,2);
});
test('completion: a failed guide check cannot trigger source research or an action rewrite',async()=>{
 for(const [status,expected] of [[400,1],[503,2]]){const old=run();old.guide.clarificationUsed=true;let calls=0;const events:any[]=[];const result=await generate({...old.guide.input,previousId:old.guide.id},bindings,event=>events.push(event),new AbortController().signal,async(u,init)=>{calls++;assert.equal(String(u),'https://api.anthropic.com/v1/messages');assert.ok(JSON.parse(String(init?.body)).system.startsWith('Independently'));return new Response('',{status});},old,{checkpoint:{research:{website:url,documents:docs,inferred:false,warnings:[]},clarificationUsed:true,draft:value(),draftAccepted:true}});assert.equal(calls,expected);assert.equal(guideReadiness(result.guide),'research-failure');assert.ok(!events.some(event=>/Repairing an incomplete action|Finding missing evidence/.test(event.stage)));assert.ok(result.guide.engine?.validationIssues?.some(issue=>issue.includes('HTTP '+status)));}
});
test('completion: durable jobs expose an account failure while retaining the actual read sources',async()=>{
 const {db}=database();const job=await createJob(db,{app:'Acme',website:url,useCase:'Read issue titles. Never write.',audience:'customers'},crypto.randomUUID());let modelCalls=0;
 const result=await runJob(db,job.id,bindings,()=>{},new AbortController().signal,async u=>{if(String(u).includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});if(String(u)==='https://api.anthropic.com/v1/messages'){modelCalls++;return Response.json({error:{message:'Your credit balance is too low to access the API.'}},{status:400});}return new Response('<main>'+docs[0].text+'</main>');});
 assert.equal(modelCalls,1);assert.equal(result.state,'interrupted');assert.equal(result.failure?.category,'model-service');assert.equal(result.failure?.serviceCode,'credits');const saved=await getJob(db,job.id);assert.ok(saved?.checkpoint?.research.documents.length);assert.equal(saved?.input.useCase,job.input.useCase);assert.match(saved?.error||'',/restore credits/);assert.equal(saved?.guide,undefined);
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
 const {factsSchema,stepsSchemaForRequest}=await import('../lib/live-guide/plan-parts.ts');const template=wire(value()),slots=(e:any[])=>({primary:e[0].passageId,secondary:e[1]?.passageId||'',tertiary:e[2]?.passageId||''});
 const facts={accessModel:'oauth',oauthSupport:'documented',summary:'Read project issues with the documented grant.',findings:template.findings.map(f=>({...f,evidence:slots(f.evidence as any[])})),coverage:template.coverage.map(c=>({...c,evidence:slots(c.evidence as any[])})),unknowns:[],researchNeeded:[]};
 let factCalls=0,stepCalls=0;const result=await interpretEvidence(run().guide.input,docs,bindings,new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body));if(body.system.includes('FACTS STAGE')){factCalls++;assert.deepEqual(body.output_config.format.schema,factsSchema);return aiResponse(facts);}assert.ok(body.system.includes('STEPS STAGE'));assert.deepEqual(body.output_config.format.schema,stepsSchemaForRequest(false));const context=JSON.parse(body.messages[0].content);assert.equal(context.verifiedFacts.findings[1].scope,'issues:read');stepCalls++;const steps=template.steps.map(s=>({...s,evidence:slots(s.evidence as any[])}));if(stepCalls===1)steps[1].request={...steps[1].request!,endpoint:'/undocumented',example:"curl 'https://api.acme.com/undocumented' -H 'Authorization: Bearer <ACCESS_TOKEN>'"};else assert.match(context.repairFeedback.join(' '),/route template is absent/);return aiResponse({steps,blockers:[]});},[],{final:true,intent:{requestedActions:value().requestedActions,prohibitions:value().prohibitions}});
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
test('completion: excluded mutation capabilities do not contradict a documented read capability',async()=>{
 const {contradictsGrant}=await import('../lib/live-guide/consistency.ts');const evidence=[{sourceId:'s1',quote:'Read content gives a connection access to read existing content.'}];
 assert.equal(contradictsGrant('Read existing content. Insert and update capabilities are not requested.',evidence,'Read content'),false);
 assert.equal(contradictsGrant('The write capability is not required. Read content only.',evidence,'Read content'),false);
 assert.equal(contradictsGrant('Read content permits update and delete operations.',evidence,'Read content'),true);
});

test('completion: instruction repair accepts a useful boundary check in the completion criterion',async()=>{
 const v=value();v.steps[1].detail='Read project issues and inspect their titles.';v.steps[1].doneWhen='The titles are returned.';const passages=sourcePassages(docs);const result=await completeTestInstructions(v,docs,'Read issue titles.',bindings,new AbortController().signal,async()=>aiResponse({items:[{index:1,detail:'Read the project issues and expect the returned issue titles.',doneWhen:'Boundary check: inspect the actual granted scope and outgoing request log; confirm only read requests were sent.',citations:{primary:passages.find(p=>p.citable)!.id,secondary:'',tertiary:''}}]}),()=>{});
 assert.match(result.steps[1].doneWhen,/Boundary check: inspect/);assert.deepEqual(result.steps[1].request,v.steps[1].request);
});

test('completion: named continuation requests are retained and validated alongside the first request',async()=>{
 const sources=[{...docs[0],text:docs[0].text+'\nRepeat GET /issues with the returned cursor until next_cursor is null. The response contains issue titles.'}];const v=value();v.steps[1].detail+=' Repeat using the returned cursor until next_cursor is null.';const next={...v.steps[1],id:'continue-read',dependsOn:['read-test'],request:{method:'GET',endpoint:'/issues',responsePath:'$[].title',example:"curl 'https://api.acme.com/issues?cursor=<NEXT_CURSOR>' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}};const template=wire(v),slots=(e:any[])=>({primary:e[0].passageId,secondary:e[1]?.passageId||'',tertiary:e[2]?.passageId||''});let calls=0;
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
 const p=value();p.steps[1].fields=['NEXT_PAGE_URL: '+ 'a'.repeat(220),'TOKEN: '+ 'b'.repeat(220)];let calls=0;
 const result=await repairLongFields(p as unknown as Record<string,unknown>,bindings,new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body)),fields=JSON.parse(body.messages[0].content);assert.equal(body.thinking.type,'disabled');if(calls===1){assert.equal(fields.length,2);return aiResponse({values:['NEXT_PAGE_URL: '+ 'a'.repeat(190),'TOKEN: backend OAuth token.']});}assert.equal(fields.length,1);assert.deepEqual(fields[0].path,['steps',1,'fields',0]);return aiResponse({values:['NEXT_PAGE_URL: prior response next link on the same HTTPS host.']});});
 assert.equal(calls,2);assert.deepEqual((result.steps as typeof p.steps)[1].fields,['NEXT_PAGE_URL: prior response next link on the same HTTPS host.','TOKEN: backend OAuth token.']);assert.deepEqual((result.steps as typeof p.steps)[1].request,p.steps[1].request);
});

test('completion: setup-field recovery changes only named prerequisites and repeats independent review',async()=>{
 const {repairReviewedSetup}=await import('../lib/live-guide/interpretation.ts');const tokenDoc={...docs[0],id:'s2',url:'https://acmetasks.example.com/docs/oauth-token',text:'POST /oauth/token exchanges an authorization code.\nUse client_id, client_secret, code, redirect_uri and grant_type authorization_code in the JSON request.\nThe successful response contains an access_token for the authorizing person.'};const documents=[...docs,tokenDoc],before=value();before.steps.push({id:'exchange-token',title:'Exchange the code',detail:'Exchange the callback code for an access token.',doneWhen:'A token is returned.',testKind:'authorization',stage:'test',owner:'developer',dependsOn:['register'],actionIds:[],request:{method:'',endpoint:'',example:''},fields:[],destination:tokenDoc.url,evidence:[{sourceId:'s2',quote:'POST /oauth/token exchanges an authorization code.'}]});const reviewed=structuredClone(before);reviewed.coverage[0].status='unresolved';reviewed.coverage[0].reason='Setup step exchange-token omits documented client_id and grant_type fields.';const original=structuredClone(before);let calls=0;
 const result=await repairReviewedSetup(before,reviewed,run().guide.input,documents,bindings,new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);if(body.system.startsWith('Independently')){const setup=context.setupSteps.find((s:any)=>s.id==='exchange-token');assert.match(setup.request.example,/client_id/);assert.ok(setup.evidence.some((e:any)=>e.sourceId==='s2'));assert.ok(context.mappings[0].referenceContext.some((d:any)=>d.sourceId==='s2'));return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The prerequisite fields and resource read are documented.'}]});}
 assert.equal(body.thinking.type,'disabled');assert.equal(context.steps.length,1);const ps=context.documents.flatMap((d:any)=>d.passages),citation=ps.find((p:any)=>p.citable&&p.text.includes('Use client_id'));
 return aiResponse({steps:[{stepId:'exchange-token',detail:'After consent, exchange the code on the backend using the registered client credentials and callback URI.',doneWhen:'The response contains access_token; store it securely for the authorizing person.',fields:['Client credentials: OAuth registration','Code and redirect URI: authorization callback'],request:{method:'POST',endpoint:'/oauth/token',example:"curl 'https://api.acme.com/oauth/token' -X POST -H 'Content-Type: application/json' -d '{\"client_id\":\"<CLIENT_ID>\",\"client_secret\":\"<CLIENT_SECRET>\",\"code\":\"<CODE>\",\"redirect_uri\":\"<REDIRECT_URI>\",\"grant_type\":\"authorization_code\"}'"},citations:{primary:citation.id,secondary:'',tertiary:''}}]});});
 assert.equal(calls,2);assert.equal(result!.value.coverage[0].support,'reviewed');assert.deepEqual(result!.value.steps[1],original.steps[1]);assert.deepEqual(result!.value.findings,original.findings);assert.deepEqual(before,original);
});
test('completion: a three-step OAuth correction retains every affected prerequisite',async()=>{
 const {repairReviewedSetup}=await import('../lib/live-guide/interpretation.ts');const before=value();before.steps.push({...before.steps[0],id:'consent',testKind:'authorization'},{...before.steps[0],id:'exchange',testKind:'authorization'});const reviewed=structuredClone(before);reviewed.coverage[0].status='unresolved';reviewed.coverage[0].reason='Use one client type across register, consent and exchange.';const original=structuredClone(before);let targets:string[]=[];
 const result=await repairReviewedSetup(before,reviewed,run().guide.input,docs,bindings,new AbortController().signal,async(_u,init)=>{targets=JSON.parse(JSON.parse(String(init?.body)).messages[0].content).steps.map((step:any)=>step.id);return aiResponse({steps:[]});});
 assert.deepEqual(targets,['register','consent','exchange']);assert.deepEqual(before,original);assert.equal(result!.telemetry.outcome,'incomplete');
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
 const p=value();let calls=0;const result=await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body));if(body.system.startsWith('Independently'))return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'unresolved',reason:'The requested field is not documented. '.repeat(36)}]});return aiResponse({values:JSON.parse(body.messages[0].content).map(()=> 'The requested response field is not documented; retain the access gap.')});},docs);
 assert.equal(calls,2);assert.equal(result.value.coverage[0].status,'unresolved');assert.match(result.value.coverage[0].reason,/retain the access gap/);assert.equal(result.telemetry.attempts,2);assert.ok(result.value.coverage[0].reason.length<=400);
});

test('completion: nested OpenAPI response wrappers retain requested names beyond large object metadata',async()=>{
 const {openApiText}=await import('../lib/live-guide/openapi.ts');const properties=Object.fromEntries([...Array.from({length:60},(_,i)=>['metadata_'+i,{type:'string'}]),['name',{type:'string',description:'The item name'}]]);const api=openApiText(JSON.stringify({swagger:'2.0',info:{title:'Acme'},paths:{'/items':{get:{summary:'List visible items',responses:{200:{schema:{$ref:'#/definitions/Result'}}}}}},definitions:{Result:{type:'object',properties:{data:{type:'array',items:{$ref:'#/definitions/Item'}}}},Item:{type:'object',properties}}}),'List item names including pagination.');assert.match(api!.text,/"name"/);assert.match(api!.text,/The item name/);assert.match(api!.text,/"data"/);
});
test('completion: OpenAPI response alternatives retain referenced dynamic properties and paginated item values',async()=>{
 const {openApiText}=await import('../lib/live-guide/openapi.ts');const ref=(name:string)=>({$ref:'#/components/schemas/'+name});
 const projected=openApiText({openapi:'3.1.0',info:{title:'Item API'},paths:{'/items/{id}':{get:{responses:{200:{content:{'application/json':{schema:{oneOf:[ref('Partial'),ref('Item')]}}}}}}},'/items/{id}/properties/{key}':{get:{responses:{200:{content:{'application/json':{schema:{anyOf:[ref('Property'),ref('List')]}}}}}}}},components:{schemas:{Partial:{type:'object',properties:{id:{type:'string'}}},Item:{type:'object',properties:{properties:{type:'object',additionalProperties:ref('Property')}}},Property:{allOf:[{type:'object',properties:{type:{type:'string',const:'title'}}},{type:'object',properties:{title:{type:'array',items:ref('Text')}}}]},Text:{type:'object',properties:{plain_text:{type:'string'}}},List:{type:'object',properties:{results:{type:'array',items:ref('Property')},has_more:{type:'boolean'},next_cursor:{type:['string','null']}}}}}},'Read item titles.');
 assert.match(projected!.text,/\$\.properties\.\*\.title\[\]\.plain_text \(string\)/);assert.match(projected!.text,/\$\.results\[\]\.title\[\]\.plain_text \(string\)/);assert.match(projected!.text,/\$\.has_more \(boolean\)/);assert.match(projected!.text,/"const": "title"/);
});
test('completion: unrelated schema alternatives cannot consume the requested field projection',async()=>{
 const {openApiText}=await import('../lib/live-guide/openapi.ts');const unrelated=Array.from({length:30},(_,i)=>({type:'object',properties:Object.fromEntries(Array.from({length:12},(_,j)=>['metadata_'+i+'_'+j,{type:'string'}]))}));
 const result=openApiText({openapi:'3.1.0',paths:{'/items':{get:{responses:{200:{content:{'application/json':{schema:{type:'object',properties:{results:{type:'array',items:{anyOf:[...unrelated,{type:'object',properties:{title:{type:'object',properties:{plain_text:{type:'string'}}}}}]}}}}}}}}}}}},'Read item titles.');assert.match(result!.text,/\$\.results\[\]\.title\.plain_text \(string\)/);
});
test('completion: requested nested titles outrank shorter unrelated scalar names in the final field limit',async()=>{
 const {responsePaths}=await import('../lib/live-guide/response-shapes.ts');const properties=Object.fromEntries([...Array.from({length:60},(_,i)=>['metadata_'+i,{type:'object',properties:{name:{type:'string'}}}]),['properties',{type:'object',additionalProperties:{type:'object',properties:{title:{type:'array',items:{type:'object',properties:{plain_text:{type:'string'}}}}}}}]]);
 const paths=responsePaths({type:'object',properties},true,'Read item titles.');assert.ok(paths.includes('$.properties.*.title[].plain_text (string)'));assert.ok(paths.length<=40);
});
test('completion: schema composition is distinct from JSON depth and collection controls survive verbose text variants',async()=>{
 const {openApiText}=await import('../lib/live-guide/openapi.ts');const ref=(name:string)=>({$ref:'#/components/schemas/'+name});const schemas:any={};for(let i=0;i<18;i++)schemas['Layer'+i]={anyOf:[ref(i===17?'Text':'Layer'+(i+1))]};schemas.Text={type:'object',properties:{plain_text:{type:'string'},...Object.fromEntries(Array.from({length:60},(_,i)=>['annotation_'+i,{type:'object',properties:{name:{type:'string'}}}]))}};schemas.Property={type:'object',properties:{title:ref('Layer0')}};schemas.List={type:'object',properties:{results:{type:'array',items:ref('Property')},has_more:{type:'boolean'},next_cursor:{type:['string','null']}}};
 const result=openApiText({openapi:'3.1.0',paths:{'/items/{id}/properties/{key}':{get:{responses:{200:{content:{'application/json':{schema:{anyOf:[ref('Property'),ref('List')]}}}}}}}},components:{schemas}},'Read item titles.');assert.match(result!.text,/\$\.results\[\]\.title\.plain_text \(string\)/);assert.match(result!.text,/\$\.has_more \(boolean\)/);assert.match(result!.text,/\$\.next_cursor \(string,null\)/);
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


test('completion: review sees an uncited full-value reference and rejects an otherwise approved partial request',async()=>{
 const related={...docs[0],id:'s2',url:'https://acmetasks.example.com/reference/issue-details',title:'Complete issue values',text:'GET /issues/{id}/details supplies the full value. The first response may omit additional text. Read every page of the details before reporting a complete issue.'};const sources=[...docs,related];let calls=0;
 const reviewed=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async(_url,init)=>{
  calls++;const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);assert.ok(context.mappings[0].referenceContext.some((d:any)=>d.sourceId==='s2'));assert.ok(context.completenessEvidence.some((p:any)=>p.sourceId==='s2'));
  return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The read grant covers issues.'}],completenessChecks:context.completenessEvidence.map((p:any)=>({id:p.id,applies:true,covered:false,stepIds:['read-test'],reason:'Add the documented full-value request and its complete pagination loop.'}))});
 },sources);
 assert.equal(calls,1);assert.equal(reviewed.value.coverage[0].status,'unresolved');assert.equal(reviewed.value.coverage[0].missingFact,'request');assert.match(reviewed.value.coverage[0].reason,/full-value request/);assert.ok(reviewed.telemetry.validationIssues?.some(s=>s.includes('Read every page')));
});

test('completion: a source completeness notice cannot be silently omitted or marked covered without instructions',async()=>{
 const sources=[{...docs[0],text:docs[0].text+'\nRepeat the returned cursor until no next page remains.'}];
 for(const empty of [true,false]){let calls=0;const reviewed=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async(_url,init)=>{
  calls++;const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Read supported.'}],completenessChecks:empty?[]:context.completenessEvidence.map((p:any)=>({id:p.id,applies:true,covered:true,stepIds:[],reason:''}))});
 },sources);assert.equal(calls,2);assert.equal(reviewed.value.coverage[0].status,'unresolved');assert.equal(reviewed.telemetry.outcome,'incomplete');}
});

test('completion: a source notice about a different field need not invent an extra resource action',async()=>{
 const sources=[{...docs[0],text:docs[0].text+'\nAttachments may be truncated; fetch additional attachment pages for the full value.'}];
 const reviewed=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async(_url,init)=>{
  const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Read supported.'}],completenessChecks:context.completenessEvidence.map((p:any)=>({id:p.id,applies:false,covered:false,stepIds:[],reason:'The requested issue fields do not include attachments.'}))});
 },sources);assert.equal(reviewed.value.coverage[0].support,'reviewed');assert.equal(reviewed.value.requestedActions.length,1);
});


test('completion: GraphQL variable declarations do not change the paginated connection identity',async()=>{
 const {hasPaginationPair}=await import('../lib/live-guide/request-examples.ts');const step=(query:string,variables?:unknown)=>({actionIds:['read'],request:{endpoint:'https://api.acme.com/graphql',example:"curl 'https://api.acme.com/graphql' -H 'Content-Type: application/json' -d '"+JSON.stringify({query,...(variables?{variables}:{})})+"'"}});
 const first=step('query { issues(first: 50) { nodes { title } pageInfo { hasNextPage endCursor } } }');const next=step('query($after: String) { issues(first: 50, after: $after) { nodes { title } pageInfo { hasNextPage endCursor } } }',{after:'<END_CURSOR>'});
 assert.equal(hasPaginationPair([first,next]),true);assert.equal(hasPaginationPair([first,step('query Next($after: String) { projects(first: 50, after: $after) { nodes { title } } }',{after:'<END_CURSOR>'})]),false);assert.equal(hasPaginationPair([first,step('query($after: String) { issues(first: 50, after: $after) { nodes { title } } }',{after:null})]),false);
});

test('completion: the request stub records curl form defaults and rejects JSON sent as a form',async()=>{
 const {inspectHandoff}=await import('../scripts/inspect-handoff.mts');const p=run().guide;p.steps[1]={...p.steps[1],testKind:'authorization',fields:['Client ID and callback code from the registered app.'],request:{method:'POST',endpoint:'/oauth/token',example:"curl 'https://api.acme.com/oauth/token' -d 'client_id=<CLIENT_ID>' --data-urlencode 'code=<AUTH_CODE>'"},doneWhen:'The token response contains access_token.'};
 const form=inspectHandoff(p)[0];assert.equal(form.stub.method,'POST');assert.equal(form.stub.headers['content-type'],'application/x-www-form-urlencoded');assert.deepEqual(form.stub.body,['client_id=test-client-id','code=test-resource-id']);assert.deepEqual(form.errors,[]);
 p.steps[1].request!.example="curl 'https://api.acme.com/oauth/token' -d '{\"code\":\"<AUTH_CODE>\"}'";assert.ok(inspectHandoff(p)[0].errors.some(s=>s.includes('JSON body requires')));p.steps[1].request!.example="curl 'https://api.acme.com/oauth/token' --json '{\"code\":\"<AUTH_CODE>\"}'";assert.equal(inspectHandoff(p)[0].stub.headers['content-type'],'application/json');assert.deepEqual(inspectHandoff(p)[0].errors,[]);
});


test('completion: a generated pagination pair retains its own initial request and dependency',async()=>{
 const {assembleStepParts}=await import('../lib/live-guide/plan-parts.ts');const initial={...value().steps[1],id:'properties-first',request:{method:'GET',endpoint:'/issues/{id}/properties',example:"curl 'https://api.acme.com/issues/<ID>/properties'",responsePath:'$.results[].title'}};const next={...initial,id:'properties-next',dependsOn:[],request:{...initial.request,example:"curl 'https://api.acme.com/issues/<ID>/properties?cursor=<NEXT_CURSOR>'"}};
 const built=assembleStepParts({steps:[value().steps[0]],continuations:[{initial,next}],blockers:[]});assert.deepEqual(built.steps.map((s:any)=>s.id),['register','properties-first','properties-next']);assert.ok(built.steps[2].dependsOn.includes('properties-first'));assert.equal(built.steps[1].testKind,'action');assert.equal(built.steps[2].testKind,'action');
});

test('completion: setup constants preserve the actual authorization URL and adjacent token response',async()=>{
 const {documentedSetup}=await import('../lib/live-guide/interpretation.ts');const source={...docs[0],text:'The authorization URL starts with https://api.acme.com/oauth/authorize and requires a registered client ID.\nUse POST /oauth/token to exchange the returned code.\nThe successful token response contains access_token and token_type bearer.\nThe configured grant does not permit edits.'};const context=documentedSetup([source]);assert.equal(context.length,1);assert.match(JSON.stringify(context),/api.acme.com\/oauth\/authorize/);assert.match(JSON.stringify(context),/successful token response contains access_token/);assert.ok(context[0].passages.every(p=>sourcePassages([source]).some(original=>original.id===p.id&&original.text===p.text)));
});

test('completion: empty-parameter recovery retains the exact official search result among its probes',async()=>{
 const {retrieve}=await import('../lib/live-guide/retrieval.ts');const target='https://acmetasks.example.com/docs/reference-parameter';const links=Array.from({length:9},(_,i)=>'https://acmetasks.example.com/docs/tutorial/example-'+i);const previous={website:url,inferred:false,warnings:[],documents:[{...docs[0],links}]};const reads:string[]=[];
 const result=await retrieve(run().guide.input,{},()=>{},new AbortController().signal,async(u)=>{const s=String(u);if(s.includes('cloudflare-dns'))return Response.json({Answer:[{type:1,data:'104.18.40.45'}]});reads.push(s);if(s.includes('duckduckgo.com'))return new Response('<main><a href="'+target+'">Official parameter reference</a></main>');return new Response('<main>'+(s===target?'The container parameter is an empty string to select the permitted root. This applies to the configured folder.':'This tutorial discusses account metadata and does not establish parameter values.')+'</main>');},{previous,query:'Acme empty container parameter',emptyField:'container',topics:['permissions']});
 assert.ok(reads.includes(target));assert.equal(result.documents.length,2);assert.equal(result.documents[1].url,target);assert.deepEqual(result.documents[0],previous.documents[0]);
});


test('completion: multi-action review shares source text and reserves output for completed checks',async()=>{
 const p=value();p.requestedActions.push({id:'second',title:'Read another issue field',operation:'read'});p.coverage.push({...p.coverage[0],actionId:'second'});p.steps[1].actionIds!.push('second');let calls=0;
 const result=await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);assert.equal(body.thinking.type,'disabled');assert.equal(context.referenceDocuments.length,1);assert.ok(context.mappings.every((m:any)=>m.referenceContext.some((r:any)=>r.sourceId==='s1'&&!r.passages)));assert.match(context.referenceDocuments[0].passages.join(' '),/issues:read/);return aiResponse({requestComplete:true,missingActions:[],reviews:context.mappings.map((m:any)=>({id:m.id,status:'supported',reason:'The supplied instructions and source support the read.'}))});},docs);
 assert.equal(calls,1);assert.ok(result.value.coverage.every(c=>c.support==='reviewed'));assert.equal(result.telemetry.thinking,'disabled');
});

test('completion: a consent GET can serialize declared URL metadata without inventing a provider endpoint',()=>{
 const p=value();p.steps[0]={...p.steps[0],testKind:'authorization',request:{method:'GET',endpoint:'https://api.acme.com/oauth/authorize?client_id=<CLIENT_ID>&response_type=code',example:''}};const sources=[{...docs[0],text:docs[0].text+'\nStart consent at https://api.acme.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code and check the callback code.'}];const fixed=validateInterpretation(p,sources,'',false);assert.match(fixed.steps[0].request!.example,/api.acme.com\/oauth\/authorize/);
 const bad=structuredClone(p);bad.steps[0].request!.endpoint='https://attacker.com/oauth/authorize?client_id=<CLIENT_ID>';assert.throws(()=>validateInterpretation(bad,sources,'',false),/not documented/);
});


test('completion: representative example IDs become inputs only at source-declared route variables',async()=>{
 const {completeRequestExamples}=await import('../lib/live-guide/request-examples.ts');const source={...docs[0],text:'API base path is /api/v4. GET /projects/:id/issues lists project issues. Query per_page controls page size.'};const p=value();p.steps[1].request={method:'GET',endpoint:'https://api.acme.com/api/v4/projects/4/issues',example:"curl 'https://api.acme.com/api/v4/projects/4/issues?per_page=100' -H 'Authorization: Bearer <ACCESS_TOKEN>'",responsePath:'$[].title'};
 const fixed=completeRequestExamples(p,[source]);assert.equal(fixed.steps[1].request!.endpoint,'https://api.acme.com/api/v4/projects/{id}/issues');assert.match(fixed.steps[1].request!.example,/api\/v4\/projects\/<id>\/issues\?per_page=100/);assert.ok(fixed.steps[1].fields.some(f=>/id.*provider UI/.test(f)));assert.match(p.steps[1].request!.example,/projects\/4\/issues/);
 const unrelated={...source,text:'GET /projects/:id/milestones lists milestones.'};assert.equal(completeRequestExamples(p,[unrelated]).steps[1].request!.endpoint,p.steps[1].request!.endpoint);
});


test('completion: a page-number offset cannot be added to an item count to terminate pagination',async()=>{
 const {validatePaginationHandoff}=await import('../lib/live-guide/interpretation.ts');const p=value();p.steps[1].detail='Read issues until count plus offset covers total. Boundary check: inspect the actual grant and outgoing request log.';const pageSource={...docs[0],text:docs[0].text+'\noffset The page number that is requested from the paginated collection Integer'};
 assert.throws(()=>validatePaginationHandoff(p,'',[pageSource]),/mixes pagination units/);assert.doesNotThrow(()=>validatePaginationHandoff(p,'',docs));p.steps[1].detail='Read issues; use the returned next link. Boundary check: inspect the actual grant and outgoing request log.';assert.doesNotThrow(()=>validatePaginationHandoff(p,'',[pageSource]));
});


test('completion: a format retry retains completed semantic rejections until the instructions change',async()=>{
 const sources=[{...docs[0],text:docs[0].text+'\nAttachments may be truncated; fetch additional pages for the full value.'}];let calls=0;
 const result=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{calls++;const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:calls===1?'unresolved':'supported',missingFact:calls===1?'request':'none',reason:calls===1?'The requested full-value follow-up is missing.':'A later check says supported.'}],completenessChecks:context.completenessEvidence.map((p:any)=>({id:p.id,applies:false,covered:false,stepIds:[],reason:calls===1?'':'Attachments are not requested.'}))});},sources);
 assert.equal(calls,2);assert.equal(result.telemetry.outcome,'accepted');assert.equal(result.value.coverage[0].status,'unresolved');assert.match(result.value.coverage[0].reason,/full-value follow-up is missing/);assert.ok(result.telemetry.validationIssues?.some(s=>s.startsWith('Retained completed action rejection')));
});

test('completion: a source-declared paginated value needs its own pair even without a pagination keyword in the request',async()=>{
 const {paginationNeeded,validatePaginationHandoff}=await import('../lib/live-guide/interpretation.ts');const p=value(),sources=[{...docs[0],text:docs[0].text+'\nPaginated properties `summary` and `contributors` return a paginated list. Continue with the returned cursor until there are no more items.'}];p.steps[1].request!.responsePath='$.properties.*.summary[].text';assert.ok(paginationNeeded(p,'Read the complete issue summary.',sources));assert.throws(()=>validatePaginationHandoff(p,'Read the complete issue summary.',sources),/source-declared paginated value/);
 const first={...p.steps[1],id:'summary-first',request:{...p.steps[1].request!,endpoint:'/issues/{id}/summary',example:"curl 'https://api.acme.com/issues/<ID>/summary'",responsePath:'$.results[].summary.text'}};const next={...first,id:'summary-next',request:{...first.request,example:"curl 'https://api.acme.com/issues/<ID>/summary?cursor=<NEXT_CURSOR>'"},detail:'Repeat with the returned cursor until no further page remains. Boundary check: inspect the read grant and outgoing request log.'};p.steps.push(first,next);assert.doesNotThrow(()=>validatePaginationHandoff(p,'Read the complete issue summary.',sources));assert.equal(paginationNeeded(value(),'Read issue names.',sources),false);
});


test('completion: a covered format-limitation check must point to an actual instruction reporting that limit',async()=>{
 const sources=[{...docs[0],text:docs[0].text+'\nUnsupported embedded media types are not supported in the text format.'}];
 const check=async(p:Interpretation)=>reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{const context=JSON.parse(JSON.parse(String(init?.body)).messages[0].content);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Read supported.'}],completenessChecks:context.completenessEvidence.map((p:any)=>({id:p.id,applies:true,covered:true,stepIds:['read-test'],reason:''}))});},sources);
 const missing=await check(value());assert.equal(missing.value.coverage[0].status,'unresolved');assert.match(missing.value.coverage[0].reason,/unsupported formats/);const p=value();p.steps[1].detail+=' Report unsupported embedded media as not read.';assert.equal((await check(p)).value.coverage[0].support,'reviewed');
});


test('completion: common response field names are not discarded by URL-ranking stopwords',async()=>{
 const {paginationNeeded,validatePaginationHandoff}=await import('../lib/live-guide/interpretation.ts');const sources=[{...docs[0],text:docs[0].text+'\nPaginated properties `title` and `name` return a paginated list. Continue with the cursor until the end.'}];const p=value();p.steps[1].request!.responsePath='$.properties.*.title[].text';assert.ok(paginationNeeded(p,'Read page titles and content.',sources));assert.throws(()=>validatePaginationHandoff(p,'Read page titles and content.',sources),/source-declared paginated value/);assert.ok(paginationNeeded(p,'Read record names.',sources));assert.equal(paginationNeeded(p,'Read summaries. Never read titles or names.',sources),false);
});

test('completion: isolated completeness notices retain their source heading and adjacent credential context',async()=>{
 const {completenessEvidence}=await import('../lib/live-guide/interpretation.ts');const source={...docs[0],title:'Personal Access Token Scope',url:'https://acmetasks.example.com/docs/personal-token-scopes',text:'# Personal Access Token Scope\nThe following rules govern personal access tokens created by the user.\n(no scope) Not supported. A scope is required even for public repositories.\nOAuth authorization follows the separate OAuth guide.'};const notices=completenessEvidence([source],run().guide.input);assert.ok(notices.length);assert.equal(notices[0].title,source.title);assert.equal(notices[0].url,source.url);assert.match(notices[0].context.join(' '),/personal access tokens/);assert.match(notices[0].context.join(' '),/separate OAuth guide/);
});


test('completion: source-declared returned-ID follow-ups cannot be replaced with prose',async()=>{
 const {validatePaginationHandoff}=await import('../lib/live-guide/interpretation.ts');const p=value();p.steps[1].request={method:'GET',endpoint:'/items/{id}/content',example:"curl 'https://api.acme.com/items/<ITEM_ID>/content'",responsePath:'$.text'};const source={...docs[0],text:'GET /items/{id}/content returns text content at https://api.acme.com.\nThe endpoint also accepts non-navigable IDs returned in `missing_ids` from a truncated response. Pass these IDs to fetch additional subtrees.'};
 assert.throws(()=>validatePaginationHandoff(p,'Read item content.',[source]),/source-declared follow-up/);p.steps.push({...p.steps[1],id:'missing-subtree',request:{...p.steps[1].request,example:"curl 'https://api.acme.com/items/<RETURNED_ID>/content'"},fields:['RETURNED_ID: each entry from missing_ids in the previous response'],detail:'Fetch each missing subtree until no returned IDs remain. Boundary check: inspect the grant and outgoing request log.'});assert.doesNotThrow(()=>validatePaginationHandoff(p,'Read item content.',[source]));
});

test('completion: explicit unscoped OAuth cannot borrow a personal-token permission',()=>{
 const source={...docs[0],text:docs[0].text+'\nOAuth2 scopes are not yet implemented. Personal tokens use issues:read for reading project issues.'};const p=value();p.findings[0].evidence=[{sourceId:'s1',quote:'OAuth2 scopes are not yet implemented.'}];assert.throws(()=>validateInterpretation(p,[source],'',false),/OAuth grant family/);p.findings=p.findings.filter(f=>f.kind!=='permission');p.coverage[0].permissions=[];assert.doesNotThrow(()=>validateInterpretation(p,[source],'',false));
});


test('completion: a consent URL example is serialized as a request without changing its source-derived parameters',()=>{
 const p=value();p.steps[0]={...p.steps[0],testKind:'authorization',request:{method:'GET',endpoint:'https://api.acme.com/oauth/authorize',example:'https://api.acme.com/oauth/authorize?client_id=<CLIENT_ID>&response_type=code'}};const sources=[{...docs[0],text:docs[0].text+'\nStart consent at https://api.acme.com/oauth/authorize?client_id=CLIENT_ID&response_type=code and check the callback code.'}];const fixed=validateInterpretation(p,sources,'',false);assert.match(fixed.steps[0].request!.example,/^curl /);assert.match(fixed.steps[0].request!.example,/client_id=<CLIENT_ID>&response_type=code/);assert.equal(p.steps[0].request!.example.startsWith('https://'),true);
});

test('completion: Sonnet 5.5 uses its documented no-up-front-thinking transport without changing the guide contract',async()=>{
 const fixture=wire(value());let calls=0;const result=await interpretEvidence(run().guide.input,docs,{...bindings,ANTHROPIC_MODEL:'claude-sonnet-5-5'},new AbortController().signal,async(_u,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.equal(body.model,'claude-sonnet-5-5');assert.equal(body.thinking.type,'between_tools');assert.equal(body.max_tokens,9000);return aiResponse({steps:fixture.steps,continuations:[],blockers:[]});},[],{final:true,facts:value(),intent:{requestedActions:value().requestedActions,prohibitions:value().prohibitions}});assert.equal(calls,1);assert.equal(result.telemetry.outcome,'accepted');assert.equal(result.value.coverage[0].permissions[0],'issues:read');
});


test('completion: conditional resource follow-ups retain their operation while token refresh stays lifecycle',async()=>{
 const {assembleStepParts}=await import('../lib/live-guide/plan-parts.ts');const initial={...value().steps[1],request:{...value().steps[1].request,responsePath:'$.text'}};const followup={...initial,id:'subtree',testKind:'boundary'};const negative={...followup,id:'denied-read',request:{...followup.request,responsePath:''}};const refresh={...initial,id:'refresh',testKind:'lifecycle',request:{method:'POST',endpoint:'/oauth/token',example:"curl 'https://api.acme.com/oauth/token' -d 'grant_type=refresh_token'",responsePath:'$.access_token'}};
 const result=assembleStepParts({steps:[initial,followup,negative,refresh],continuations:[]});assert.equal(result.steps[1].testKind,'action');assert.equal(result.steps[2].testKind,'boundary');assert.equal(result.steps[3].testKind,'lifecycle');assert.deepEqual(result.steps[1].actionIds,followup.actionIds);assert.deepEqual(result.steps[1].request,followup.request);
});

test('completion: a source-backed instruction rejection is corrected without researching the same fact again',async()=>{
 const old=run(),patch=wire(value());old.guide.coverage[0]={...old.guide.coverage[0],status:'unresolved',support:'unresolved',missingFact:'request',reason:'Uncovered source requirement 0:s1-p3: Supply the documented resource request.'};let calls=0;const before=structuredClone(old);
 const result=await generate({...old.guide.input,previousId:old.guide.id,resolution:{kind:'find-request',actionId:'read',requestId:crypto.randomUUID()}},bindings,()=>{},new AbortController().signal,async(u,init)=>{
  assert.equal(String(u),'https://api.anthropic.com/v1/messages');calls++;const body=JSON.parse(String(init?.body));return body.system.startsWith('Independently')?aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The corrected request and grant are documented.'}]}):aiResponse({findings:[],coverage:patch.coverage,steps:[patch.steps[1]]});
 },old);
 assert.equal(calls,2);assert.equal(result.guide.coverage[0].support,'reviewed');assert.deepEqual(result.documents,old.documents);assert.deepEqual(old,before);
});


test('completion: independent review uses current instructions without the planner conclusion and keeps a stable ID grammar',async()=>{
 const schemas:any[]=[];for(const id of ['s1','s9']){const p=value();p.coverage[0].reason='This stale planner conclusion must not decide the review.';const sources=[{...docs[0],id,text:docs[0].text+'\nAttachments may be truncated and are retrieved through the separate attachment API.'}];p.findings=p.findings.map(f=>({...f,evidence:f.evidence.map(e=>({...e,sourceId:id}))}));p.coverage[0].evidence=p.coverage[0].evidence!.map(e=>({...e,sourceId:id}));p.steps=p.steps.map(s=>({...s,evidence:s.evidence.map(e=>({...e,sourceId:id}))}));
 await reviewMappings(p,run().guide.input,bindings,new AbortController().signal,async(_u,init)=>{const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);schemas.push(body.output_config.format.schema);assert.equal(context.mappings[0].reason,undefined);assert.equal(context.allResourceRequests[0].detail,p.steps[1].detail);return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'The actual request and source support the read.'}],completenessChecks:context.completenessEvidence.map((p:any)=>({id:p.id,applies:false,covered:false,stepIds:[],reason:'Attachments are not requested.'}))});},sources);}
 assert.deepEqual(schemas[0],schemas[1]);
});

test('completion: a source notice outside the exact supplied ID set cannot pass the review',async()=>{
 const sources=[{...docs[0],text:docs[0].text+'\nAttachments may be truncated.'}];let calls=0;const result=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async()=>{calls++;return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:'supported',reason:'Read supported.'}],completenessChecks:[{id:'0:invented-p999',applies:false,covered:false,stepIds:[],reason:'Unrelated.'}]});},sources);assert.equal(calls,2);assert.equal(result.telemetry.outcome,'incomplete');assert.equal(result.value.coverage[0].status,'unresolved');
});


test('completion: an empty explanation cannot erase an already completed negative check',async()=>{
 let calls=0;const result=await reviewMappings(value(),run().guide.input,bindings,new AbortController().signal,async()=>{calls++;return aiResponse({requestComplete:true,missingActions:[],reviews:[{id:'0',status:calls===1?'unresolved':'supported',missingFact:'request',checks:{setup:true,grant:true,request:calls!==1,response:true,pagination:true,boundary:true},reason:calls===1?'':'The later response approves it.'}]});},docs);assert.equal(calls,2);assert.equal(result.value.coverage[0].status,'unresolved');assert.match(result.value.coverage[0].reason,/request unresolved without an explanation/);
});
