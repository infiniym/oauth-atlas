// @ts-nocheck -- Public HTTP acceptance recorder; persisted envelopes are inspected verbatim.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {acceptanceAnswers} from './acceptance-choices.mts';
import {inspectHandoff,paginationHandoff} from './inspect-handoff.mts';
import {guideReadiness} from '../lib/live-guide/readiness.ts';
import {monitorJob} from '../lib/live-guide/job-client.ts';
const origin=process.env.MATRIX_ORIGIN||'https://oauth-launch-advisor.gharkagpt1.chatgpt.site';
const label=process.argv[2]||'candidate',names=(process.argv[3]||'').split(',').filter(Boolean),round=Number(process.argv[4]||1);
const cases=JSON.parse(readFileSync('docs/evidence/completion-2026-11-02/cases.json','utf8'));
const declared=[...cases.live,...(names.length?cases.blindValidation||[]:[])].filter(c=>!names.length||names.includes(c.name));
const dir='docs/evidence/completion-2026-11-02/'+label;mkdirSync(dir,{recursive:true});
const release=await (await fetch(origin+'/api/release')).json();
async function stage(input,record){
 const key=crypto.randomUUID(),headers={origin,'Content-Type':'application/json','Idempotency-Key':key};
 const created=await fetch(origin+'/api/live-guide/jobs',{method:'POST',headers,signal:AbortSignal.timeout(15000),body:JSON.stringify({input})});
 const body=await created.json();if(!created.ok)throw new Error(JSON.stringify(body));
 record.jobs.push({id:body.job.id,key,input});
 const job=await monitorJob(body.job,{signal:AbortSignal.timeout(200000),fetcher:(path,init)=>fetch(origin+path,{...init,headers:{...init?.headers,origin}}),onProgress:event=>record.events.push(event)});
 return job;
}
async function run(c){const started=Date.now(),record={name:c.name,round,release,input:c.input,startedAt:new Date().toISOString(),anonymous:true,cache:'Public documentation may be cached upstream; model results and saved guides are never substituted. New UUID per job.',jobs:[],events:[]};
 try{let job=await stage(c.input,record);for(let n=0;job.state==='waiting'&&n<3;n++){
 const g=job.guide,answers=acceptanceAnswers(g);
 job=await stage({...g.input,previousId:g.id,answers},record);
 }
 record.job=job;record.readiness=job.guide?guideReadiness(job.guide):'research-failure';record.requests=job.guide?inspectHandoff(job.guide):[];
 if(job.guide){const read=await fetch(origin+'/api/plans/'+job.guide.id);record.planStatus=read.status;if(read.ok)record.plan=(await read.json()).plan;record.share=origin+'/plan/'+job.guide.id;}
 record.errors=[];if(record.readiness!=='usable-guide')record.errors.push('No usable guide for the declared task');if(record.planStatus!==200)record.errors.push('No shareable plan');if(record.requests.some(r=>r.errors.length)||!record.requests.length)record.errors.push('Request contract check failed');
 if(/paginat|continuation/.test(c.input.useCase)&&(!job.guide||!paginationHandoff(job.guide,record.requests)))record.errors.push('Required concrete pagination handoff absent');
 const recovered=record.events.some(e=>/missing requirement|Repairing|Updating action|Action instructions/i.test(e.stage))||job.guide?.engine?.validationIssues?.length;record.speed={kind:recovered?'automatic-recovery':'normal',budgetMs:recovered?180000:90000};if(Date.now()-started>record.speed.budgetMs)record.errors.push('Generation exceeded '+record.speed.kind+' budget');
 record.pass=!record.errors.length;
 }catch(e){record.pass=false;record.error=e.message;}
 record.elapsedMs=Date.now()-started;writeFileSync(dir+'/'+c.name+'-r'+round+'.json',JSON.stringify(record,null,2));console.log(JSON.stringify({case:c.name,round,pass:record.pass,elapsedMs:record.elapsedMs,share:record.share,error:record.error,errors:record.errors,requests:record.requests?.map(r=>({stepId:r.stepId,errors:r.errors}))}));return record;
}
// Two concurrent public journeys keep the acceptance load bounded.
const results=[];for(let i=0;i<declared.length;i+=2)results.push(...await Promise.all(declared.slice(i,i+2).map(run)));
writeFileSync(dir+'/round-'+round+'.json',JSON.stringify({release,round,results:results.map(r=>({name:r.name,pass:r.pass,elapsedMs:r.elapsedMs,error:r.error,errors:r.errors,share:r.share}))},null,2));
