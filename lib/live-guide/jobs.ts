import {ResearchFailure} from './failures.ts';
import type {Failure} from './failures.ts';
import {normalizeInput} from './contracts.ts';
import type {Bindings,GuideInput,LiveGuide,Progress,WorkflowCheckpoint} from './contracts.ts';
import {generate} from './workflow.ts';
import {load} from './http.ts';
import type {Store} from './http.ts';
import {freezeResearchPlan} from '../plan/storage.ts';
export type GuideJob={id:string;input:GuideInput;failure?:Failure;savedSources?:LiveGuide['sources'];state:'queued'|'running'|'waiting'|'ready'|'interrupted';events:Progress[];checkpoint?:WorkflowCheckpoint;guide?:LiveGuide;error?:string;createdAt:string;updatedAt:string;leaseUntil:number;timing?:{startedAt:string;finishedAt?:string;elapsedMs?:number;firstQuestionMs?:number;firstActionMs?:number};attempts?:{modelCalls:number;inputTokens:number;outputTokens:number;modelMs:number}[]};
type Row={payload:string;state:GuideJob['state'];lease_until:number};
export function publicJob(job:GuideJob){const {checkpoint:_checkpoint,...result}=job;return {...result,savedSources:job.checkpoint?.research.documents.map(({text:_text,...source})=>source)||job.guide?.sources||[]};}
export async function getJob(db:Store,id:string):Promise<GuideJob|null>{
 if(!/^job-[a-f0-9-]{36}$/.test(id))return null;
 const row=await db.prepare('SELECT payload,state,lease_until FROM guide_jobs WHERE id=?').bind(id).first<Row>();if(!row)return null;
 const job={...JSON.parse(row.payload),state:row.state,leaseUntil:row.lease_until} as GuideJob;
 if(job.state==='running'&&job.leaseUntil<Date.now()){job.state='interrupted';job.error='Processing was interrupted. Your saved evidence is retained. Retry the unfinished stage explicitly; a provider request may already have incurred tokens.';}
 return job;
}
export async function createJob(db:Store,raw:unknown,key:string):Promise<GuideJob>{
 if(!/^[a-f0-9-]{36}$/i.test(key))throw new Error('Use a request identifier.');
 const input=normalizeInput(raw);input.answers=Object.fromEntries(Object.entries(input.answers).sort(([a],[b])=>a.localeCompare(b)));
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input))),digest=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
 const requestKey=(input.previousId||key)+':'+digest,now=new Date().toISOString();
 const job:GuideJob={id:'job-'+crypto.randomUUID(),input,state:'queued',events:[],createdAt:now,updatedAt:now,leaseUntil:0};
 await db.prepare('INSERT OR IGNORE INTO guide_jobs (id,request_key,payload,state,lease_until,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(job.id,requestKey,JSON.stringify(job),'queued',0,now,now).run();
 const row=await db.prepare('SELECT payload,state,lease_until FROM guide_jobs WHERE request_key=?').bind(requestKey).first<Row>();if(!row)throw new Error('The process could not be saved.');return {...JSON.parse(row.payload),state:row.state,leaseUntil:row.lease_until};
}
export async function runJob(db:Store,id:string,bindings:Bindings,emit:(event:Progress)=>void,signal:AbortSignal,fetcher:typeof fetch=fetch,retry=false):Promise<GuideJob>{
 signal=AbortSignal.any([signal,AbortSignal.timeout(180000)]);
 const job=await getJob(db,id);if(!job)throw new Error('Process not found.');
 if(job.state==='ready'||job.state==='waiting'||job.state==='running'||(job.state==='interrupted'&&!retry))return job;
 const lease=crypto.randomUUID(),until=Date.now()+240000;
 const claimed=await db.prepare("UPDATE guide_jobs SET state='running',lease=?,lease_until=? WHERE id=? AND (state='queued' OR (lease_until<? AND state IN ('running','interrupted'))) RETURNING id").bind(lease,until,id,Date.now()).first<{id:string}>();
 if(!claimed)return (await getJob(db,id))!;
 job.state='running';job.leaseUntil=until;job.timing={startedAt:new Date().toISOString()};delete job.error;delete job.failure;let pending=Promise.resolve();
 const save=()=>{job.updatedAt=new Date().toISOString();const payload=JSON.stringify(job),state=job.state,leaseUntil=job.leaseUntil,updatedAt=job.updatedAt;pending=pending.then(async()=>{await db.prepare('UPDATE guide_jobs SET payload=?,state=?,lease_until=?,updated_at=? WHERE id=? AND lease=?').bind(payload,state,leaseUntil,updatedAt,id,lease).run();});return pending;};
 try{
  await save();const previous=job.input.previousId?await load(db,job.input.previousId):undefined;
  const result=await generate(job.input,bindings,event=>{const timed={...event,at:new Date().toISOString()};job.events=[...job.events,timed].slice(-60);emit(timed);void save();},signal,fetcher,previous||undefined,{checkpoint:job.checkpoint,save:async checkpoint=>{job.checkpoint=checkpoint;await save();}});
  const elapsedMs=Date.now()-Date.parse(job.timing.startedAt);job.timing={...job.timing,finishedAt:new Date().toISOString(),elapsedMs,...(result.guide.questions.length?{firstQuestionMs:elapsedMs}:result.guide.steps.length?{firstActionMs:elapsedMs}:{})};
  const telemetry=result.guide.engine,earlier=(job.attempts||[]).reduce((a,b)=>({modelCalls:a.modelCalls+b.modelCalls,inputTokens:a.inputTokens+b.inputTokens,outputTokens:a.outputTokens+b.outputTokens,modelMs:a.modelMs+b.modelMs}),{modelCalls:0,inputTokens:0,outputTokens:0,modelMs:0});
  if(result.guide.journey)for(const k of ['modelCalls','inputTokens','outputTokens','modelMs'] as const)result.guide.journey[k]+=earlier[k];
  job.attempts=[...job.attempts||[],{modelCalls:telemetry?.attempts||0,inputTokens:telemetry?.inputTokens||0,outputTokens:telemetry?.outputTokens||0,modelMs:telemetry?.elapsedMs||0}];
  signal.throwIfAborted();await pending;
  if(!result.guide.questions.length&&result.guide.mode==='interpreted'&&(!result.guide.engine||result.guide.engine.outcome==='accepted'))await freezeResearchPlan(result.guide,db);
  await db.prepare('INSERT OR IGNORE INTO live_guides (id,payload,created_at) VALUES (?,?,?)').bind(result.guide.id,JSON.stringify(result),result.guide.generatedAt).run();
  job.guide=result.guide;const failed=!result.guide.questions.length&&(result.guide.mode==='evidence-only'||!!result.guide.engine&&result.guide.engine.outcome!=='accepted');job.state=failed?'interrupted':result.guide.questions.length?'waiting':'ready';if(failed){job.error=telemetry?.validationIssues?.some(reason=>reason.startsWith('Unestablished OAuth'))?'The saved sources do not establish the OAuth setup needed for this request. Add the official OAuth application-registration or authorization reference; your request and sources are retained.':telemetry?.validationIssues?.some(reason=>reason.startsWith('A step destination for an API request'))?'The sources do not establish the requested API endpoint. Add its official endpoint reference; for a self-hosted app, retain your instance URL as a setup input. Earlier sources are saved.':'Planning could not finish. Collected sources are retained; retry this planning stage or add more specific documentation.';job.failure={category:telemetry?.outcome==='validation-rejected'?'validation':'planning',message:job.error};}job.leaseUntil=0;await save();return job;
 }catch(error){await pending.catch(()=>{});job.state='interrupted';job.leaseUntil=0;job.failure=error instanceof ResearchFailure?error.failure:{category:'planning',message:signal.aborted?'Research and bounded automatic recovery reached the 180-second budget. Your request and completed evidence are saved; retry only the unfinished stage or add a more specific documentation URL.':'This stage could not finish. Your request and collected evidence are saved.'};job.error=job.failure.message;await save();return job;}
}
