import test from 'node:test';
import assert from 'node:assert/strict';
import guides from '../data/guides.json' with {type:'json'};
import type {Guide} from '../lib/guide.ts';
import type {Assessment} from '../lib/advisor/types.ts';
import {emptyAssessment} from '../lib/advisor/providers.ts';
import {recommend} from '../lib/advisor/rules-engine.ts';
import {reviewedPlan,researchedPlan,referencePlan} from '../lib/plan/adapters.ts';
import {exportPlan} from '../lib/plan/export.ts';
import {reviewedProvider,researchRoute} from '../lib/plan/routing.ts';
import {saveReviewedPlan,readPlan} from '../lib/plan/storage.ts';
import {resolveIntentAiConfig} from '../lib/ai/config.ts';
import type {Store} from '../lib/live-guide/http.ts';
import type {LiveGuide} from '../lib/live-guide/contracts.ts';
const assessments:Assessment[]=[
 {...emptyAssessment('gmail'),capabilities:['read','draft'],audience:'public',stage:'production',branding:'yes',dataHandling:'servers'},
 {...emptyAssessment('slack'),capabilities:['post'],audience:'pilot',stage:'test',branding:'yes',slackIdentity:'bot'},
 {...emptyAssessment('github'),capabilities:['contents','review'],repoAccess:'selected'},
];
const at='2026-10-31T12:00:00Z',url='https://tasks.example.com/docs/oauth';
const evidence=[{sourceId:'s1',quote:'Create an application and request tasks:read to read tasks.'}];
function researched():LiveGuide{return {
 schemaVersion:1,id:'lg-'+crypto.randomUUID(),generatedAt:at,input:{app:'Tasks',website:url,useCase:'Read tasks for customers',audience:'customers',answers:{}},provider:{website:url,identity:'provided'},mode:'interpreted',status:'provisional',notice:'Source excerpts matched; policy applicability is not independently verified.',warnings:[],setupTested:false,
 accessModel:'oauth',requestedActions:[],prohibitions:[],oauthSupport:'documented',summary:'OAuth app with read-only access',recommendation:'Create a test application with tasks:read.',nextAction:'Register the test app',
 findings:[{kind:'oauth',title:'OAuth app',scope:'',detail:'Register a developer app.',appliesWhen:'Connecting customer accounts.',evidence},{kind:'permission',title:'Read tasks',scope:'tasks:read',detail:'Read task data.',appliesWhen:'This requested feature.',evidence}],
 steps:[{title:'Register',detail:'Create the test app.',owner:'developer',doneWhen:'Test client exists.',stage:'prepare',destination:url,fields:['App name','Callback URI'],evidence},{title:'Test read',detail:'Connect a test account and read one task.',owner:'developer',doneWhen:'A task is returned.',stage:'test',destination:url,fields:[],evidence},{title:'Launch review',detail:'Submit required review materials.',owner:'developer',doneWhen:'Provider review decision is recorded.',stage:'launch',destination:url,fields:[],evidence}],
 questions:[],blockers:[{title:'Customer policy',consequence:'launch',owner:'Customer admin',resolution:'Confirm the target customer installation policy.'}],coverage:[{action:'Read tasks',permissions:['tasks:read'],status:'mapped',reason:'Documented read access.'}],researchNeeded:[],activeEffort:{range:'1–2 hours',assumptions:'Existing callback.'},unknowns:['Published review timing was not found.'],sources:[{id:'s1',url,title:'Task OAuth',retrievedAt:at,hash:'abc'}],integration:{message:'Catalog presence does not establish Composio compatibility.'},
};}
function memory(){const rows=new Map<string,string>();const db:Store={prepare(sql){return {bind(...args){return {async run(){rows.set((sql.includes('launch_plans')?'plan:':'')+String(args[0]),String(args[1]));return {};},async first<T>(){const payload=rows.get((sql.includes('launch_plans')?'plan:':'')+String(args[0]));return payload?{payload} as T:null;}};}};}};return {db,rows};}
for(const a of assessments)test(a.provider+' produces an actionable plan in the common contract',()=>{
 const p=reviewedPlan(a,recommend(a),at);assert.equal(p.basis,'Reviewed rules');assert.ok(p.next?.owner);assert.ok(p.next?.doneWhen);assert.ok(p.next?.destination);assert.ok(p.steps.some(s=>s.stage==='test'));assert.ok(p.permissions.length);assert.ok(p.sources.length);
 for(const step of p.steps)for(const id of step.sourceIds)assert.ok(p.sources.some(s=>s.id===id));
 const out=exportPlan(p);for(const heading of ['Next action','Permissions','Before the first test','Before customer launch','Prepared materials','Sources'])assert.ok(out.includes('## '+heading));assert.ok(!out.includes('[x]'));
});
test('reviewed plans give concrete completion criteria and isolate representative testing from rollout',()=>{
 const a=assessments[2],p=reviewedPlan(a,recommend(a),at);assert.match(p.steps.find(s=>s.id==='install-link')!.detail,/representative account/);assert.match(p.steps.find(s=>s.id==='connect')!.doneWhen,/correct identity/);assert.ok(p.steps.find(s=>s.id==='review')!.stage==='launch');assert.ok(p.next!.fields.length);
});
test('managed worksheets avoid unnecessary app registration and human-readable choices omit unanswered inputs',()=>{
 const a={...assessments[0],branding:'no' as const},p=reviewedPlan(a,recommend(a),at);const worksheet=p.preparation.find(p=>p.title==='Auth configuration worksheet');assert.ok(worksheet);assert.match(worksheet.text,/use the managed app/);assert.ok(!worksheet.text.includes('Keep client secrets'));assert.ok(p.context.every(c=>!c.value.includes('unknown')));assert.ok(p.requirements.every(r=>!r.appliesWhen));
});
test('research mapping keeps stages, action coverage, evidence and every unresolved item',()=>{
 const g=researched();g.warnings=['A documentation page could not be read.'];const p=researchedPlan(g);
 assert.deepEqual(p.steps.map(s=>s.stage),['prepare','test','launch']);assert.equal(p.permissions[0].identifier,'tasks:read');assert.equal(p.coverage?.[0].action,'Read tasks');assert.equal(p.next!.destination,url);assert.deepEqual(p.next!.fields,['App name','Callback URI']);assert.equal(p.blockers.length,3);assert.equal(p.blockers[0].consequence,'launch');assert.match(p.verification,/not independently verified/);
 const out=exportPlan(p);assert.match(out,/Callback URI/);assert.match(out,/Destination: https/);assert.match(out,/Read tasks: mapped/);assert.ok(out.indexOf('Test read')<out.indexOf('Launch review'));
});
test('unmapped requested actions remain explicit first-test blockers',()=>{
 const g=researched();g.coverage.push({action:'Write a task',permissions:[],status:'unresolved',reason:'No exact write permission is documented.'});const p=researchedPlan(g);assert.ok(p.blockers.some(b=>b.title==='Write a task'&&b.consequence==='test'));
});
test('legacy researched snapshots receive the same plan contract without inventing grants',()=>{
 const g=researched();delete (g as Partial<LiveGuide>).coverage;delete (g as Partial<LiveGuide>).blockers;const p=researchedPlan(g);assert.equal(p.provider,'Tasks');assert.ok(p.blockers.length);assert.deepEqual(p.coverage,[]);
});
test('reference scenarios are visibly identified and retain their source dates',()=>{
 for(const g of guides as Guide[]){const p=referencePlan(g);assert.equal(p.basis,'Reference notes');assert.equal(p.request,g.scenario);assert.match(p.integration,/not a new assessment/);assert.equal(p.sources[0].checkedAt,g.sources[0].retrievedAt);}
});
test('a changed assessment gets separate local checklist progress',()=>{
 const a=assessments[0],p=reviewedPlan(a,recommend(a),at),changed={...a,capabilities:['send']};assert.notEqual(p.id,reviewedPlan(changed,recommend(changed),at).id);
});
test('reviewed sharing saves immutable computed output and each edit saves a new version',async()=>{
 const {db}=memory(),a={...assessments[0],description:'Read customer email'},saved=await saveReviewedPlan(a,db),before=JSON.stringify(saved);a.description='Send customer email';a.capabilities=['send'];const changed=await saveReviewedPlan(a,db);
 assert.notEqual(saved.id,changed.id);assert.equal(JSON.stringify(await readPlan(saved.id,db)),before);assert.equal((await readPlan(changed.id,db))!.request,'Send customer email');assert.ok(!('checks' in saved));
});
test('incomplete or invalid inputs cannot be saved as firm reviewed plans',async()=>{
 const {db}=memory();await assert.rejects(()=>saveReviewedPlan(emptyAssessment('gmail'),db));await assert.rejects(()=>saveReviewedPlan({...assessments[0],capabilities:['invented']},db));assert.equal(await readPlan('arbitrary-id',db),null);
});
test('only usable live guides become common plans and already frozen links remain immutable',async()=>{
 const {db,rows}=memory(),g=researched();rows.set(g.id,JSON.stringify({guide:g,documents:[]}));assert.equal(await readPlan(g.id,db),null);
 g.requestedActions=[{id:'read',title:'Read tasks',operation:'read',category:'resource'}];g.coverage[0]={...g.coverage[0],actionId:'read',support:'reviewed'};g.steps[1]={...g.steps[1],id:'read-test',testKind:'action',actionIds:['read'],request:{method:'GET',endpoint:'/tasks',example:"curl 'https://api.acme.com/tasks' -H 'Authorization: Bearer <ACCESS_TOKEN>'"}};
 rows.set(g.id,JSON.stringify({guide:g,documents:[]}));const p=await readPlan(g.id,db);assert.equal(p!.provider,'Tasks');assert.equal(p!.basis,'Live research');
 const before=JSON.stringify(p);g.coverage[0].status='unresolved';rows.set(g.id,JSON.stringify({guide:g,documents:[]}));assert.equal(JSON.stringify(await readPlan(g.id,db)),before);
 const incomplete={...g,id:'lg-'+crypto.randomUUID(),engine:{model:'fixture',attempts:1,elapsedMs:1,outcome:'accepted',thinking:'disabled',effort:'low'}};rows.set(incomplete.id,JSON.stringify({guide:incomplete,documents:[]}));assert.equal(await readPlan(incomplete.id,db),null);assert.equal(await readPlan('lg-'+crypto.randomUUID(),db),null);
});
test('provider routing recognises reviewed providers without capturing unfamiliar names or lookalike domains',()=>{
 assert.equal(reviewedProvider('Google Mail'),'gmail');assert.equal(reviewedProvider('https://github.com/apps'),'github');for(const app of ['Notion','Linear','Acme','https://github.com.attacker.net'])assert.equal(reviewedProvider(app),null);
 const route=new URL(researchRoute('An unfamiliar app','Read items & draft replies'), 'https://atlas.example.com');assert.equal(route.searchParams.get('app'),'An unfamiliar app');assert.equal(route.searchParams.get('useCase'),'Read items & draft replies');
});
test('intake and research share one model selection, respecting explicit disable and legacy aliases',()=>{
 const legacy={LIVE_GUIDE_ANTHROPIC_KEY:'legacy-key',LIVE_GUIDE_ANTHROPIC_MODEL:'old-model'};assert.equal(resolveIntentAiConfig(legacy).model,'old-model');assert.equal(resolveIntentAiConfig({...legacy,ANTHROPIC_API_KEY:'shared',ANTHROPIC_MODEL:'shared-model'}).model,'shared-model');assert.equal(resolveIntentAiConfig({...legacy,AI_PROVIDER:'none'}).provider,undefined);assert.equal(resolveIntentAiConfig({...legacy,ANTHROPIC_MODEL:'incomplete-shared'}).provider,undefined);
});
