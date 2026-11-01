import {validateAssessment} from '../advisor/assessment.ts';
import {missingCriticalQuestions} from '../advisor/requirements.ts';
import {recommend} from '../advisor/rules-engine.ts';
import {reviewedPlan,researchedPlan} from './adapters.ts';
import type {LaunchPlan} from './types.ts';
import {load} from '../live-guide/http.ts';
import type {Store} from '../live-guide/http.ts';
import type {LiveGuide} from '../live-guide/contracts.ts';
import type {ManagedMetadata} from '../advisor/types.ts';
export async function saveReviewedPlan(input:unknown,db:Store,metadata?:ManagedMetadata):Promise<LaunchPlan>{
  const assessment=validateAssessment(input);if(!assessment.capabilities.length||missingCriticalQuestions(assessment).length)throw new Error('Confirm the setup choices before sharing a plan.');
  const plan=reviewedPlan(assessment,recommend(assessment,metadata));plan.id='lp-'+crypto.randomUUID();plan.metadata=metadata;
  await db.prepare('INSERT INTO launch_plans (id,payload,created_at) VALUES (?,?,?)').bind(plan.id,JSON.stringify(plan),plan.createdAt).run();return plan;
}
export async function freezeResearchPlan(guide:LiveGuide,db:Store):Promise<LaunchPlan>{const plan=researchedPlan(guide);await db.prepare('INSERT OR IGNORE INTO launch_plans (id,payload,created_at) VALUES (?,?,?)').bind(plan.id,JSON.stringify(plan),plan.createdAt).run();const row=await db.prepare('SELECT payload FROM launch_plans WHERE id = ?').bind(plan.id).first<{payload:string}>();return row?JSON.parse(row.payload):plan;}
export async function readPlan(id:string,db:Store):Promise<LaunchPlan|null>{
  if(!/^(?:lp|lg)-[a-f0-9-]{36}$/.test(id))return null;
  const row=await db.prepare('SELECT payload FROM launch_plans WHERE id = ?').bind(id).first<{payload:string}>();if(row)return JSON.parse(row.payload);
  if(id.startsWith('lg-')){const run=await load(db,id);return run?freezeResearchPlan(run.guide,db):null;}return null;
}
