// @ts-nocheck -- Real local HTTP integration recorder. No DB seeding or provider calls.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {monitorJob} from '../lib/live-guide/job-client.ts';
import {guideReadiness} from '../lib/live-guide/readiness.ts';
import {acceptanceAnswers} from './acceptance-choices.mts';
const origin=process.env.MATRIX_ORIGIN||'http://127.0.0.1:5187',label=process.argv[2]||'local-recovery';
const dir='docs/evidence/completion-2026-11-02/'+label;mkdirSync(dir,{recursive:true});
const release=await (await fetch(origin+'/api/release')).json();
const headers={origin,'Content-Type':'application/json'};
const fetcher=(p,init)=>fetch(origin+p,{...init,headers:{...init?.headers,origin}});
async function create(input,key=crypto.randomUUID()){
 const r=await fetcher('/api/live-guide/jobs',{method:'POST',headers:{...headers,'Idempotency-Key':key},body:JSON.stringify({input}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Create failed '+r.status);return (await r.json()).job;
}
async function finish(job,record){return monitorJob(job,{signal:AbortSignal.timeout(195000),fetcher,onProgress:e=>record.events.push(e)});}
function save(name,record){record.release=release;record.origin=origin;record.checkedAt=new Date().toISOString();writeFileSync(dir+'/'+name+'.json',JSON.stringify(record,null,2));console.log(JSON.stringify({name,pass:record.pass,error:record.error,elapsedMs:record.elapsedMs}));}
async function negative(name,input,check){const at=Date.now(),r={input,events:[]};try{r.job=await finish(await create(input),r);r.pass=check(r.job);}catch(e){r.error=e.message;r.pass=false;}r.elapsedMs=Date.now()-at;save(name,r);}
if(!process.argv.includes('--integration-only')){
await negative('inaccessible',{app:'Unavailable documentation',website:'https://unavailable-20261102.example.com/docs/',useCase:'Read items with OAuth. Never write.',audience:'customers'},job=>job.state==='interrupted'&&!!job.failure&&!job.guide?.steps?.length);
await negative('public-no-oauth',{app:'PokeAPI',website:'https://pokeapi.co/docs/v2',useCase:'Read the name of one Pokemon from the public REST API. No account access and no writes.',audience:'internal'},job=>job.guide?.accessModel==='public'&&guideReadiness(job.guide)==='usable-guide'&&!job.guide.steps.some(s=>s.testKind==='authorization')&&!job.guide.findings.some(f=>f.kind==='permission'&&f.scope));
const moved=JSON.parse(readFileSync('docs/evidence/hosted-2026-11-02/moved-source.json')).input;
const at=Date.now(),r={input:moved,events:[]};try{r.old=await finish(await create(moved),r);if(r.old.failure?.category!=='source-moved')throw Error('Expected an explicit moved-source destination');const old=JSON.stringify(r.old);const input={...moved,website:r.old.failure.destination};r.new=await finish(await create(input),r);for(let n=0;r.new.guide?.questions.length&&n<3;n++)r.new=await finish(await create({...r.new.guide.input,previousId:r.new.guide.id,answers:acceptanceAnswers(r.new.guide)}),r);const readback=(await (await fetcher('/api/live-guide/jobs/'+r.old.id)).json()).job;r.oldUnchanged=JSON.stringify(readback)===old;r.pass=r.oldUnchanged&&guideReadiness(r.new.guide)==='usable-guide';}catch(e){r.error=e.message;r.pass=false;}r.elapsedMs=Date.now()-at;save('moved-docs',r);
}

// A real transport interruption: disconnect the stream, then reopen the durable
// job. Replayed create/start requests must not perform a second generation.
const interruptionAt=Date.now(),ir={events:[]};try{
 const c=JSON.parse(readFileSync('docs/evidence/completion-2026-11-02/cases.json')).live.find(c=>c.name==='notion');
 const initial=await finish(await create({...c.input,website:''}),ir);if(!initial.guide?.questions.length)throw Error('Expected provider confirmation before the disconnected stage');
 ir.initial=initial;const input={...initial.guide.input,previousId:initial.guide.id,answers:acceptanceAnswers(initial.guide)},key=crypto.randomUUID();ir.input=input;ir.jobBefore=await create(input,key);ir.duplicateCreate=await create(input,key);if(ir.jobBefore.id!==ir.duplicateCreate.id)throw Error('Duplicate job was created');
 const controller=new AbortController(),response=await fetcher('/api/live-guide/jobs/'+ir.jobBefore.id,{method:'POST',headers,body:'{}',signal:controller.signal});const reader=response.body.getReader();ir.firstProgress=new TextDecoder().decode((await reader.read()).value);controller.abort();await reader.cancel().catch(()=>{});
 ir.reopened=(await (await fetcher('/api/live-guide/jobs/'+ir.jobBefore.id)).json()).job;ir.finished=await finish(ir.reopened,ir);
 const replay=await fetcher('/api/live-guide/jobs/'+ir.finished.id,{method:'POST',headers,body:'{}'});ir.replayed=(await replay.json()).job;
 ir.pass=!!ir.finished.guide&&ir.finished.id===ir.jobBefore.id&&ir.replayed.guide?.id===ir.finished.guide?.id&&JSON.stringify(ir.finished.input.answers)===JSON.stringify(input.answers)&&guideReadiness(ir.finished.guide)==='usable-guide';
}catch(e){ir.pass=false;ir.error=e.message;}ir.elapsedMs=Date.now()-interruptionAt;save('interrupted-reload',ir);
// New public documentation is actually reread on an action update. The old
// guide/plan remain byte-for-byte unchanged; no success is database-seeded.
const updateAt=Date.now(),ur={events:[]};try{
 const old=JSON.parse(readFileSync('docs/evidence/completion-2026-11-02/local-v13-configured/notion-r1.json')).job.guide;
 const oldResponse=await fetcher('/api/live-guide/'+old.id),oldBody=await oldResponse.text();const oldPlan=await (await fetcher('/api/plans/'+old.id)).text();
 const action=old.requestedActions.find(a=>/content/i.test(a.title));if(!action)throw Error('Content action absent');
 ur.input={...old.input,previousId:old.id,resolution:{kind:'documentation',actionId:action.id,url:'https://developers.notion.com/reference/retrieve-page-markdown',requestId:crypto.randomUUID()}};
 ur.job=await finish(await create(ur.input),ur);ur.oldGuideUnchanged=await (await fetcher('/api/live-guide/'+old.id)).text()===oldBody;ur.oldPlanUnchanged=await (await fetcher('/api/plans/'+old.id)).text()===oldPlan;
 ur.newSourceRead=ur.events.some(e=>e.stage==='Reading documentation'&&e.detail==='developers.notion.com/reference/retrieve-page-markdown');
 ur.pass=ur.oldGuideUnchanged&&ur.oldPlanUnchanged&&ur.newSourceRead&&ur.job.guide.id!==old.id&&ur.job.guide.previousId===old.id&&guideReadiness(ur.job.guide)==='usable-guide';
}catch(e){ur.pass=false;ur.error=e.message;}ur.elapsedMs=Date.now()-updateAt;save('documentation-update',ur);
