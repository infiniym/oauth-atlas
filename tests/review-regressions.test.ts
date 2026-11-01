import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {generate} from '../lib/live-guide/workflow.ts';
import {interpretEvidence,validateInterpretation,reviewMappings,sourcePassages} from '../lib/live-guide/interpretation.ts';
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
const url='https://acmetasks.example.com/docs/oauth';
const docs:Document[]=[{id:'s1',url,title:'OAuth setup',hash:'abc',retrievedAt:'2026-11-01T00:00:00Z',text:'Create an OAuth application in workspace settings before testing.\nThe issues:read permission allows reading issues in a selected project.\nUse GET /issues to read the issues in that project.'}];
const ev=[{sourceId:'s1',quote:'The issues:read permission allows reading issues in a selected project.'}];
function value():Interpretation{return {accessModel:'oauth',requestedActions:[{id:'read',title:'Read project issues',operation:'read'}],prohibitions:['Never write or delete issues.'],oauthSupport:'documented',summary:'A read-only OAuth app.',recommendation:'Prepare a read-only OAuth application.',nextAction:'Create the test app.',findings:[{kind:'oauth',title:'Create an app',detail:'Register the app.',appliesWhen:'Before testing.',scope:'',evidence:[{sourceId:'s1',quote:'Create an OAuth application in workspace settings before testing.'}]},{kind:'permission',title:'Read issues',detail:'Read issue content.',appliesWhen:'Reading project issues.',scope:'issues:read',evidence:ev}],steps:[{id:'register',title:'Register the app',detail:'Create the test application.',stage:'prepare',owner:'developer',doneWhen:'A test client exists.',fields:[],destination:url,evidence:ev},{id:'read-test',testKind:'action',request:{method:'GET',endpoint:'/issues',example:'GET /issues'},title:'Read a project issue',detail:'Use GET /issues in a test project.',stage:'test',owner:'developer',doneWhen:'An issue is returned, and an excluded project is denied.',fields:[],destination:url,evidence:ev,dependsOn:['register'],actionIds:['read']}],coverage:[{actionId:'read',action:'Read project issues',permissions:['issues:read'],status:'mapped',reason:'The quoted permission documents project issue reads.',evidence:ev}],blockers:[],questions:[],unknowns:[],researchNeeded:[],activeEffort:{range:'',assumptions:''}};}
function run(v=value()):StoredRun{const guide:LiveGuide={...v,id:'lg-'+crypto.randomUUID(),schemaVersion:1,generatedAt:'2026-11-01T00:00:00Z',input:normalizeInput({app:'Acme Tasks',website:url,useCase:'Read issues in selected projects. Never write or delete issues.',audience:'customers'}),provider:{website:url,identity:'provided'},mode:'interpreted',status:'provisional',notice:'Not executed.',warnings:[],setupTested:false,sources:docs.map(({text:_text,...d})=>d),integration:{message:'Toolkit compatibility unverified.'}};return {guide,documents:docs};}
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE live_guides(id TEXT PRIMARY KEY,payload TEXT,created_at TEXT); CREATE TABLE launch_plans(id TEXT PRIMARY KEY,payload TEXT,created_at TEXT);');sqlite.exec(readFileSync(new URL('../drizzle/0003_simple_vulcan.sql',import.meta.url),'utf8'));const db:Store={prepare(sql){return{bind(...args){return{async run(){return sqlite.prepare(sql).run(...args as (string|number|null)[]);},async first<T>(){return (sqlite.prepare(sql).get(...args as (string|number|null)[])||null) as T|null;}};}};}};return{db,sqlite};}
const bindings={ANTHROPIC_API_KEY:'fixture-key',ANTHROPIC_MODEL:'fixture-model'};
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
