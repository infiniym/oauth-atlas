import {validateAssessment} from '../advisor/assessment.ts';
import {missingCriticalQuestions} from '../advisor/requirements.ts';
import {recommend} from '../advisor/rules-engine.ts';
import {reviewedPlan,researchedPlan} from './adapters.ts';
import type {LaunchPlan} from './types.ts';
import {load} from '../live-guide/http.ts';
import type {Store} from '../live-guide/http.ts';
export async function saveReviewedPlan(input:unknown,db:Store):Promise<LaunchPlan>{
  const assessment=validateAssessment(input);if(!assessment.capabilities.length||missingCriticalQuestions(assessment).length)throw new Error('Confirm the setup choices before sharing a plan.');
  const plan=reviewedPlan(assessment,recommend(assessment));plan.id='lp-'+crypto.randomUUID();
  await db.prepare('INSERT INTO launch_plans (id,payload,created_at) VALUES (?,?,?)').bind(plan.id,JSON.stringify(plan),plan.createdAt).run();return plan;
}
export async function readPlan(id:string,db:Store):Promise<LaunchPlan|null>{
  if(/^lg-[a-f0-9-]{36}$/.test(id)){const run=await load(db,id);return run?researchedPlan(run.guide):null;}
  if(!/^lp-[a-f0-9-]{36}$/.test(id))return null;
  const row=await db.prepare('SELECT payload FROM launch_plans WHERE id = ?').bind(id).first<{payload:string}>();return row?JSON.parse(row.payload) as LaunchPlan:null;
}
