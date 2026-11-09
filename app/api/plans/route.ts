import { getRuntime } from '@/lib/server/runtime';
import {readSmallJson,noStore} from '@/lib/advisor/http';
import {saveReviewedPlan} from '@/lib/plan/storage';
import {validateAssessment} from '@/lib/advisor/assessment';
import {getMetadata} from '@/lib/advisor/metadata';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  const env=getRuntime();
  let body;try{body=await readSmallJson(request);}catch{return Response.json({error:'Send valid plan inputs from this site.'},{status:400,headers:noStore});}
  if(!env.DB)return Response.json({error:'The plan store is unavailable.'},{status:503,headers:noStore});
  try{const assessment=validateAssessment(body),metadata=await getMetadata(assessment.provider,env.COMPOSIO_API_KEY,assessment.slackIdentity==='bot');const plan=await saveReviewedPlan(assessment,env.DB,metadata);return Response.json({id:plan.id,plan},{headers:noStore});}catch{return Response.json({error:'The plan could not be saved. Confirm the required choices and try again.'},{status:400,headers:noStore});}
}
