import {env} from 'cloudflare:workers';
import {readSmallJson,noStore} from '@/lib/advisor/http';
import {saveReviewedPlan} from '@/lib/plan/storage';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  let body;try{body=await readSmallJson(request);}catch{return Response.json({error:'Send valid plan inputs from this site.'},{status:400,headers:noStore});}
  if(!env.DB)return Response.json({error:'The plan store is unavailable.'},{status:503,headers:noStore});
  try{const plan=await saveReviewedPlan(body,env.DB);return Response.json({id:plan.id},{headers:noStore});}catch{return Response.json({error:'The plan could not be saved. Confirm the required choices and try again.'},{status:400,headers:noStore});}
}
