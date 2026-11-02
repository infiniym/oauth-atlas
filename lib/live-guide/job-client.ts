import type {GuideJob} from './jobs.ts';
import type {Progress} from './contracts.ts';
export async function readJobResponse(response:Response,onProgress:(event:Progress)=>void,signal:AbortSignal):Promise<GuideJob>{
 if(!response.ok){const body=await response.json() as {error?:string};throw new Error(body.error||'The process could not continue.');}
 if(response.headers.get('content-type')?.includes('application/json'))return ((await response.json()) as {job:GuideJob}).job;
 const reader=response.body!.getReader(),decoder=new TextDecoder();let buffer='',job:GuideJob|undefined;
 const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 const line=(s:string)=>{if(!s.trim())return;const data=JSON.parse(s);if(data.type==='progress')onProgress(data.event);if(data.type==='job')job=data.job;if(data.type==='error')throw new Error(data.error);};
 try{while(true){signal.throwIfAborted();const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const lines=buffer.split('\n');buffer=lines.pop()||'';lines.forEach(line);if(done)break;}line(buffer);signal.throwIfAborted();if(!job)throw new Error('Connection interrupted. Reopen this process to recover its saved state.');return job;}catch(error){await reader.cancel().catch(()=>{});throw error;}finally{signal.removeEventListener('abort',cancel);reader.releaseLock();}
}

// The event stream supplies progress; the persistent job is authoritative.
// Polling in parallel also finishes when a proxy leaves an idle stream open.
export async function monitorJob(current:GuideJob,options:{signal:AbortSignal;retry?:boolean;fetcher?:typeof fetch;pollMs?:number;onProgress?:(p:Progress)=>void;onJob?:(j:GuideJob)=>void}):Promise<GuideJob>{
 const fetcher=options.fetcher||fetch,streamAbort=new AbortController(),signal=AbortSignal.any([options.signal,AbortSignal.timeout(195000)]);
 let stream:Promise<{job?:GuideJob;error?:Error}>|undefined;
 if(current.state==='queued'||current.state==='interrupted'&&options.retry){stream=(async()=>readJobResponse(await fetcher('/api/live-guide/jobs/'+current.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({retry:!!options.retry}),signal:AbortSignal.any([signal,streamAbort.signal])}),options.onProgress||(()=>{}),AbortSignal.any([signal,streamAbort.signal])))().then(job=>({job}),error=>({error}));}
 else if(current.state!=='running')return current;
 let failures=0,streamError:Error|undefined;
 const delay=()=>new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},options.pollMs??1500);const abort=()=>{clearTimeout(timer);reject(signal.reason);};signal.addEventListener('abort',abort,{once:true});});
 try{for(;;){
  signal.throwIfAborted();
  const next=await Promise.race([...(stream?[stream]:[]),delay().then(()=>null)]);
  if(next?.job&&next.job.state!=='running'&&next.job.state!=='queued')return next.job;
  if(next){streamError=next.error;stream=undefined;}
  try{const r=await fetcher('/api/live-guide/jobs/'+current.id,{signal:AbortSignal.any([signal,AbortSignal.timeout(10000)]),cache:'no-store'});if(!r.ok)throw new Error('Saved progress could not be reopened.');current=((await r.json()) as {job:GuideJob}).job;failures=0;options.onJob?.(current);}
  catch{signal.throwIfAborted();if(++failures>=3)throw new Error('The connection to saved progress is unavailable. Reopen this process URL when the connection returns.');continue;}
  if(current.state==='ready'||current.state==='waiting'||current.state==='interrupted')return current;
  if(streamError&&current.state==='queued')throw streamError;
 }}finally{streamAbort.abort();}
}
