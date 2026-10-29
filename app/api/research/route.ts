import { env } from 'cloudflare:workers';
import { researchProvider, validateInput } from '@/lib/research';
export const dynamic = 'force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function POST(request:Request) {
 const origin=request.headers.get('origin');
 if(!origin || origin!==new URL(request.url).origin) return json({error:'Start research from this site.'},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/json')) return json({error:'Send app details as JSON.'},415);
 if(Number(request.headers.get('content-length')||0)>6000) return json({error:'Keep app details under 6 KB.'},413);
 let input;
 try{
  const reader=request.body?.getReader();if(!reader)throw new Error('Enter an app name or website.');
  let body='',size=0;const decoder=new TextDecoder();
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>6000){await reader.cancel();return json({error:'Keep app details under 6 KB.'},413);}body+=decoder.decode(value,{stream:true});}
  body+=decoder.decode();input=validateInput(JSON.parse(body));
 }catch(e){return json({error:e instanceof SyntaxError?'App details could not be read. Please try again.':(e as Error).message},400);}
 const db=env.DB;if(!db)return json({error:'The guide store is unavailable. Please try again shortly.'},503);
 try{
  const hour=Math.floor(Date.now()/3_600_000);
  const ip=request.headers.get('cf-connecting-ip')||'shared';
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+':'+hour));
  const bucket=hour+':'+Array.from(new Uint8Array(hash)).slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');
  const limit=await db.prepare('INSERT INTO research_limits (bucket,count) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket).first<{count:number}>();
  if((limit?.count||0)>10)return new Response(JSON.stringify({error:'This connection has reached the preview limit of 10 research runs per hour. Try again after the hour changes.'}),{status:429,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':String(3600-Math.floor(Date.now()/1000)%3600)}});
 }catch{return json({error:'The guide store is not ready. Please try again shortly.'},503);}
 let cancelled=false;
 const stream=new ReadableStream({
  async start(controller){
   const encoder=new TextEncoder();
   const send=(value:unknown)=>{if(!cancelled){try{controller.enqueue(encoder.encode(JSON.stringify(value)+'\n'));}catch{cancelled=true;}}};
   try{
    const guide=await researchProvider(input,event=>send({type:'progress',data:event}));
    if(cancelled||request.signal.aborted)return;
    await db.prepare('INSERT INTO guides (id,payload,created_at) VALUES (?,?,?)').bind(guide.id,JSON.stringify(guide),new Date().toISOString()).run();
    send({type:'progress',data:{title:'Guide saved',detail:'Your public research draft has a permanent share link. Review the open questions before setup.',status:'complete'}});
    send({type:'complete',guide});
   }catch(e){send({type:'error',error:(e as Error).message||'Research could not finish. Try a direct developer-documentation URL.'});}
   finally{if(!cancelled){try{controller.close();}catch{}}}
  },
  cancel(){cancelled=true;},
 });
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
