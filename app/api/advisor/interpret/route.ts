import {env} from 'cloudflare:workers';
import {interpret} from '@/lib/advisor/intent-parser';
import {isIntentAiConfigured,resolveIntentAiConfig,type IntentAiBindings} from '@/lib/advisor/ai-config';
import {readSmallJson,noStore} from '@/lib/advisor/http';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const body=await readSmallJson(request);
  if(typeof body.description!=='string'||body.description.length>1500||!body.description.trim())return Response.json({error:'Describe your integration in 1–1,500 characters.'},{status:400,headers:noStore});
  const config=env as unknown as IntentAiBindings & {DB?:D1Database};
  const ai=resolveIntentAiConfig(config);
  // Only configured AI incurs costs. D1 atomically enforces an anonymous hourly preview limit.
  if(isIntentAiConfigured(ai)){
   if(!config.DB)return Response.json({error:'AI is temporarily unavailable. Continue with the structured form.'},{status:503,headers:noStore});
   const hour=Math.floor(Date.now()/3600000),ip=request.headers.get('cf-connecting-ip')||'local';
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('intent:'+hour+':'+ip));
   const bucket='intent:'+hour+':'+Array.from(new Uint8Array(digest)).slice(0,12).map(v=>v.toString(16).padStart(2,'0')).join('');
   const row=await config.DB.prepare('INSERT INTO research_limits (bucket,count) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket).first<{count:number}>();
   if((row?.count||0)>20)return Response.json({error:'AI interpretation has reached its hourly preview limit. Your structured assessment still works.'},{status:429,headers:noStore});
  }
  return Response.json(await interpret(body.description,ai),{headers:noStore});
 }catch{return Response.json({error:'The interpretation could not run. Continue with the editable structured form.'},{status:400,headers:noStore});}
}
