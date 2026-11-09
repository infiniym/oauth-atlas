import { getRuntime } from '@/lib/server/runtime';
import {readPlan} from '@/lib/plan/storage';
import {noStore} from '@/lib/advisor/http';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getRuntime();
  if(!env.DB)return Response.json({error:'The plan store is unavailable.'},{status:503,headers:noStore});
  try{const plan=await readPlan((await params).id,env.DB);return plan?Response.json({plan},{headers:noStore}):Response.json({error:'Plan not found.'},{status:404,headers:noStore});}catch{return Response.json({error:'The plan could not be opened. Try again shortly.'},{status:503,headers:noStore});}
}
