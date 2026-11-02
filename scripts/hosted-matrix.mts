// @ts-nocheck -- Public HTTP acceptance recorder; persisted envelopes are inspected verbatim.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {guideReadiness} from '../lib/live-guide/readiness.ts';
const origin=process.env.MATRIX_ORIGIN||'https://oauth-launch-advisor.gharkagpt1.chatgpt.site';
const label=process.argv[2]||'candidate',names=(process.argv[3]||'').split(',').filter(Boolean),round=Number(process.argv[4]||1);
const declared=JSON.parse(readFileSync('docs/evidence/completion-2026-11-02/cases.json','utf8')).live.filter(c=>!names.length||names.includes(c.name));
const dir='docs/evidence/completion-2026-11-02/'+label;mkdirSync(dir,{recursive:true});
const release=await (await fetch(origin+'/api/release')).json();
async function stage(input,record){
 const key=crypto.randomUUID(),headers={origin,'Content-Type':'application/json','Idempotency-Key':key};
 const created=await fetch(origin+'/api/live-guide/jobs',{method:'POST',headers,body:JSON.stringify({input})});
 const body=await created.json();if(!created.ok)throw new Error(JSON.stringify(body));
 record.jobs.push({id:body.job.id,key,input});
 const response=await fetch(origin+'/api/live-guide/jobs/'+body.job.id,{method:'POST',headers,body:'{}'});
 if(!response.ok)throw new Error('Start HTTP '+response.status+': '+await response.text());
 let job=body.job;
 for(const line of (await response.text()).trim().split('\n')){if(!line)continue;const m=JSON.parse(line);if(m.type==='job')job=m.job;else if(m.type==='progress')record.events.push(m.event);else if(m.error)throw new Error(m.error);}
 const until=Date.now()+190000;
 while(job.state==='running'&&Date.now()<until){await new Promise(r=>setTimeout(r,1500));job=(await(await fetch(origin+'/api/live-guide/jobs/'+job.id)).json()).job;}
 return job;
}
function inspectRequests(guide){
 const results=[];
 for(const step of guide.steps.filter(s=>s.testKind==='action')){
 const example=step.request?.example||'',syntax=spawnSync('/bin/bash',['-n'],{input:example,encoding:'utf8'});
 const split=spawnSync('python3',['-c','import shlex,json,sys;print(json.dumps(shlex.split(sys.stdin.read())))'],{input:example,encoding:'utf8'});
 let args=[];try{args=JSON.parse(split.stdout);}catch{}
 const values=(short,long)=>args.flatMap((a,i)=>(a===short||a===long)&&args[i+1]?[args[i+1]]:[]);
 const body=values('-d','--data').concat(values('--data-raw','--data-binary')),headers=values('-H','--header');
 const method=values('-X','--request')[0]||(body.length?'POST':'GET');
 const url=values('--url','--url')[0]||args.find(a=>/^https:\/\//.test(a));
 const errors=[];if(syntax.status!==0||args[0]!=='curl'||!url)errors.push('Example is not a parseable curl request');
 if(method.toUpperCase()!==step.request?.method.toUpperCase())errors.push('Method differs from request metadata');
 if(guide.accessModel==='oauth'&&!headers.some(h=>/^Authorization:\s*Bearer\s+\S+/i.test(h)))errors.push('Missing OAuth bearer header');
 if(body.length&&!headers.some(h=>/^Content-Type:/i.test(h)))errors.push('Missing request content type');
 for(const b of body)if(/^\s*[\[{]/.test(b))try{JSON.parse(b);}catch{errors.push('Malformed JSON body');}
 if(!/boundary|outside|unshared|unselected|reject|excluded|denied|403|404|no (?:write|mutation)|read.only/i.test(step.detail+' '+step.doneWhen+' '+guide.steps.filter(s=>s.testKind==='boundary').map(s=>s.detail).join(' ')))errors.push('No safe boundary instruction');
 results.push({stepId:step.id,method,url,headers,body,syntaxChecked:true,executed:false,errors});
 }return results;
}
async function run(c){const started=Date.now(),record={name:c.name,round,release,input:c.input,startedAt:new Date().toISOString(),anonymous:true,cache:'Public documentation may be cached upstream; model results and saved guides are never substituted. New UUID per job.',jobs:[],events:[]};
 try{let job=await stage(c.input,record);for(let n=0;job.state==='waiting'&&n<3;n++){
 const g=job.guide,answers={...g.input.answers};
 for(const q of g.questions){const answer=q.id==='provider-identity'?q.options.find(o=>o==='Yes, this is the provider'):q.options.find(o=>/connected (?:person|user)|individual (?:account|user)|act as (?:the )?(?:person|user)/i.test(o));if(!answer)throw new Error('Intent clarification needs review: '+JSON.stringify(q));answers[q.id]=answer;}
 job=await stage({...g.input,previousId:g.id,answers},record);
 }
 record.job=job;record.readiness=job.guide?guideReadiness(job.guide):'research-failure';record.requests=job.guide?inspectRequests(job.guide):[];
 if(job.guide){const read=await fetch(origin+'/api/plans/'+job.guide.id);record.planStatus=read.status;if(read.ok)record.plan=(await read.json()).plan;record.share=origin+'/plan/'+job.guide.id;}
 record.errors=[];if(record.readiness!=='usable-guide')record.errors.push('No usable guide for the declared task');if(record.planStatus!==200)record.errors.push('No shareable plan');if(record.requests.some(r=>r.errors.length)||!record.requests.length)record.errors.push('Request contract check failed');
 if(/paginat|continuation/.test(c.input.useCase)&&!/paginat|cursor|has_more|next|offset|pageSize|per_page/i.test(JSON.stringify(job.guide?.steps)))record.errors.push('Required pagination absent');
 record.pass=!record.errors.length;
 }catch(e){record.pass=false;record.error=e.message;}
 record.elapsedMs=Date.now()-started;writeFileSync(dir+'/'+c.name+'-r'+round+'.json',JSON.stringify(record,null,2));console.log(JSON.stringify({case:c.name,round,pass:record.pass,elapsedMs:record.elapsedMs,share:record.share,error:record.error,errors:record.errors,requests:record.requests?.map(r=>({stepId:r.stepId,errors:r.errors}))}));return record;
}
// Two concurrent public journeys keep the acceptance load bounded.
const results=[];for(let i=0;i<declared.length;i+=2)results.push(...await Promise.all(declared.slice(i,i+2).map(run)));
writeFileSync(dir+'/round-'+round+'.json',JSON.stringify({release,round,results:results.map(r=>({name:r.name,pass:r.pass,elapsedMs:r.elapsedMs,error:r.error,errors:r.errors,share:r.share}))},null,2));
