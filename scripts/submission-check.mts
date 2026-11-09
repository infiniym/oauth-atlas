import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {acceptanceAnswers} from './acceptance-choices.mts';
import {guideReadiness} from '../lib/live-guide/readiness.ts';
import {monitorJob} from '../lib/live-guide/job-client.ts';
import {exportPlan} from '../lib/plan/export.ts';
import type {GuideInput,Progress} from '../lib/live-guide/contracts.ts';
import type {GuideJob} from '../lib/live-guide/jobs.ts';
import type {LaunchPlan} from '../lib/plan/types.ts';

const origin=process.env.SUBMISSION_ORIGIN||'http://127.0.0.1:5187';
const label=process.argv[2],requested=(process.argv[3]||'').split(',').filter(Boolean);
if(!label||!/^[a-z0-9-]+$/.test(label))throw new Error('Supply a unique lowercase evidence label.');
const declaration=JSON.parse(readFileSync('docs/evidence/submission-2026-11-09/cases.json','utf8'));
const cases=declaration.cases.filter((c:GuideInput)=>!requested.length||requested.includes(c.app.toLowerCase())).map(({newToPriorMatrix:_new,...input}:GuideInput&{newToPriorMatrix?:boolean})=>input);
if(!cases.length)throw new Error('Choose a declared case.');
const directory='docs/evidence/submission-2026-11-09/'+label;
mkdirSync(directory,{recursive:true});
const release=await (await fetch(origin+'/api/release')).json();
for(const input of cases){
 const file=directory+'/'+input.app.toLowerCase()+'.json';
 if(existsSync(file))throw new Error('Preserve the existing attempt. Supply a new evidence label.');
 const started=Date.now(),events:Progress[]=[],jobs:{id:string;input:GuideInput}[]=[];
 const record:{release:unknown;input:GuideInput;startedAt:string;anonymous:boolean;jobs:typeof jobs;events:Progress[];job?:GuideJob;plan?:LaunchPlan;share?:string;automatedCorePass?:boolean;manualAudit:string;error?:string;elapsedMs?:number}={
  release,input,startedAt:new Date().toISOString(),anonymous:true,jobs,events,manualAudit:'Pending. Automated readiness is insufficient for the evidence-quality gate.',
 };
 const save=()=>writeFileSync(file,JSON.stringify(record,null,2)+'\n');
 async function stage(next:GuideInput){
  const created=await fetch(origin+'/api/live-guide/jobs',{method:'POST',headers:{origin,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({input:next}),signal:AbortSignal.timeout(15000)});
  const data=await created.json();
  if(!created.ok)throw new Error(data.error||'Job creation failed.');
  jobs.push({id:data.job.id,input:next});save();
  return monitorJob(data.job,{signal:AbortSignal.timeout(215000),fetcher:(path,init)=>fetch(origin+path,{...init,headers:{...init?.headers,origin}}),onProgress:event=>{events.push(event);save();}});
 }
 try{
  let job=await stage(input);
  for(let choices=0;job.state==='waiting'&&choices<3;choices++){
   const guide=job.guide!;
   job=await stage({...guide.input,previousId:guide.id,answers:acceptanceAnswers(guide)});
  }
  record.job=job;
  record.automatedCorePass=!!job.guide&&guideReadiness(job.guide)==='usable-guide'&&!!job.guide.oauthSetup;
  if(job.guide){
   const response=await fetch(origin+'/api/plans/'+job.guide.id,{cache:'no-store'});
   if(response.ok){
    record.plan=(await response.json()).plan;
    record.share=origin+'/plan/'+job.guide.id;
    writeFileSync(directory+'/'+input.app.toLowerCase()+'.md',exportPlan(record.plan!));
   }
   record.automatedCorePass=record.automatedCorePass&&response.ok;
  }
 }catch(error){
  record.error=error instanceof Error?error.message:'Recorder failed.';
  record.automatedCorePass=false;
  const last=jobs.at(-1);
  if(last)try{record.job=(await (await fetch(origin+'/api/live-guide/jobs/'+last.id,{signal:AbortSignal.timeout(6000)})).json()).job;}catch{ /* Retain the job URL when readback is unavailable. */ }
 }
 record.elapsedMs=Date.now()-started;save();
 console.log(JSON.stringify({app:input.app,automatedCorePass:record.automatedCorePass,elapsedMs:record.elapsedMs,share:record.share,error:record.error||record.job?.error}));
}
