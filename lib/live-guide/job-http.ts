import { requestAddress, type RuntimeBindings } from '../server/runtime-types.ts';
import type {Store} from './http.ts';
import {createJob,getJob,publicJob,runJob} from './jobs.ts';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function handleJob(request:Request,env:RuntimeBindings,id?:string,fetcher:typeof fetch=fetch,retain?:(p:Promise<unknown>)=>void):Promise<Response>{
 if(!env.DB)return json({error:'The process store is unavailable.'},503);const db=env.DB;
 if(request.method==='GET'){if(!id)return json({error:'Process not found.'},404);const job=await getJob(db,id);return job?json({job:publicJob(job)}):json({error:'Process not found.'},404);}
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Continue from this site.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Send request details as JSON.'},415);
 let body;try{const reader=request.body?.getReader();if(!reader)return json({error:'Send request details.'},400);const decoder=new TextDecoder();let text='',bytes=0;try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>18000){await reader.cancel();return json({error:'Keep request details under 18 KB.'},413);}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}body=JSON.parse(text+decoder.decode());}catch{return json({error:'Send valid request details.'},400);}
 if(!id){try{const job=await createJob(db,body.input,request.headers.get('Idempotency-Key')||'');return json({job:publicJob(job)});}catch{return json({error:'Enter an app, a request of at most 1,500 characters and valid answers.'},400);}}
 const job=await getJob(db,id);if(!job)return json({error:'Process not found.'},404);
 if(job.state==='ready'||job.state==='waiting'||job.state==='running'||(job.state==='interrupted'&&body.retry!==true))return json({job:publicJob(job)},202);
 // Apply the anonymous cost limit only when starting a new stage, never while polling.
 const hour=Math.floor(Date.now()/3600000),address=requestAddress(request,env);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(hour+':'+address));const bucket=hour+':'+Array.from(new Uint8Array(hash).slice(0,12),n=>n.toString(16).padStart(2,'0')).join('');
 const count=await db.prepare('INSERT INTO live_guide_limits (bucket,count) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET count=live_guide_limits.count+1 RETURNING count').bind(bucket).first<{count:number}>();if((count?.count||0)>40)return json({error:'The hourly preview limit was reached. Saved progress remains available.'},429);
 const encoder=new TextEncoder(),signal=AbortSignal.timeout(220000);let closed=false;
 const stream=new ReadableStream({start(controller){const send=(data:unknown)=>{if(!closed)try{controller.enqueue(encoder.encode(JSON.stringify(data)+'\n'));}catch{closed=true;}};const work=runJob(db,id,env,event=>send({type:'progress',event}),signal,fetcher,body.retry===true,true).then(job=>send({type:'job',job:publicJob(job)})).catch(()=>send({type:'error',error:'The process could not continue. Reopen its saved URL.'})).finally(()=>{if(!closed){closed=true;controller.close();}});retain?.(work);},cancel(){closed=true;}});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'}});
}
export const jobRequest:typeof handleJob=(...args)=>handleJob(...args).catch(()=>json({error:'Saved processing is temporarily unavailable. Your previous plan is unchanged.'},503));
