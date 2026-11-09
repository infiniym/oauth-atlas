import type {Interpretation} from './contracts.ts';
export const isResource=(a:Interpretation['requestedActions'][number])=>a.category!=='authorization'&&a.operation!=='authorize';
export const concreteRequest=(s:Interpretation['steps'][number])=>!!(s.request?.method&&s.request.endpoint&&s.request.example);
export const isResourceExample=(s:Interpretation['steps'][number])=>s.testKind==='action'||s.testKind==='boundary';
// Only migration reads legacy prose. Current resolution uses action + missing
// fact, so changing a title cannot change a structured blocker's behavior.
export function legacyRequestGap(b:Interpretation['blockers'][number]):boolean{return b.kind==='missing-evidence'||(!b.kind&&/(?:endpoint|API request|request shape|GraphQL (?:query|operation))/i.test(b.title+' '+b.resolution)&&/(?:not (?:verified|established|supplied|in)|unverified|missing|unresolved|documentation)/i.test(b.title+' '+b.resolution));}
export function migrateSemantics(input:Interpretation):Interpretation{
 const v=structuredClone(input),auth=new Set(v.requestedActions.filter(a=>!isResource(a)).map(a=>a.id));
 v.requestedActions=v.requestedActions.map(a=>({...a,category:isResource(a)?'resource':'authorization'}));
 const authStep=v.steps.find(s=>s.testKind==='authorization');
 const removed=new Set<string>();
 v.steps=v.steps.filter(s=>{if(s.testKind==='action'&&s.actionIds?.length&&s.actionIds.every(id=>auth.has(id))){if(authStep){if(s.id)removed.add(s.id);return false;}s.testKind='authorization';}return true;});
 v.coverage=v.coverage.filter(c=>!c.actionId||!auth.has(c.actionId));
 v.blockers=v.blockers.filter(b=>{
  const authorizationOnly=!!(b.actionId&&auth.has(b.actionId))||!!(b.stepIds?.length&&b.stepIds.every(id=>removed.has(id)));
  return !(authorizationOnly&&(b.kind==='missing-evidence'||(!b.kind&&legacyRequestGap(b))));
 });
 for(const b of v.blockers){
  const remap=(ids:string[]|undefined)=>ids?[...new Set(ids.map(id=>removed.has(id)?authStep!.id!:id))]:undefined;
  b.stepIds=remap(b.stepIds);b.resolutionStepIds=remap(b.resolutionStepIds);
 }
 for(const s of v.steps)if(s.dependsOn)s.dependsOn=[...new Set(s.dependsOn.map(id=>removed.has(id)?authStep!.id!:id))];
 for(const b of v.blockers){
  if(b.kind==='prerequisite'||b.kind==='instruction'||b.kind==='verification')continue;
  const legacy=v.semanticsVersion!==2&&legacyRequestGap(b);
  if(b.gap){b.kind='missing-evidence';b.actionId=b.gap.actionId;continue;}
  if(b.kind!=='missing-evidence'&&!legacy)continue;
  const targets=v.steps.filter(s=>b.stepIds?.includes(s.id!));
  const ids=[...new Set(targets.filter(s=>s.testKind==='action').flatMap(s=>s.actionIds||[]))];
  const id=b.actionId||((targets.length&&targets.every(s=>s.testKind==='action')&&ids.length===1)?ids[0]:undefined);
  if(id&&v.requestedActions.some(a=>a.id===id&&isResource(a))){b.kind='missing-evidence';b.actionId=id;b.gap={actionId:id,fact:/permission|scope|mapping/i.test(b.title)||v.coverage.some(c=>c.actionId===id&&c.action===b.title)?'permission':'request'};}
 }
 v.semanticsVersion=2;return v;
}
