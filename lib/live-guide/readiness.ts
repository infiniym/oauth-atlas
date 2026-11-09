import type {LiveGuide} from './contracts.ts';
import {isResource,concreteRequest} from './semantics.ts';
export function guideReadiness(g:LiveGuide):'researching'|'needs-user-decision'|'usable-guide'|'provider-limitation'|'research-failure'{
 if(g.questions.length)return 'needs-user-decision';
 if(g.oauthSupport==='unsupported')return 'provider-limitation';
 if(g.oauthSetup){
  const review=g.oauthSetup.review;
  if(g.mode!=='interpreted'||g.engine?.outcome!=='accepted'||g.engine.reviewOutcome!=='accepted'||!review||Object.values(review.gaps).some(Boolean))return 'research-failure';
  if(g.oauthSupport!=='documented'||g.accessModel!=='oauth')return 'research-failure';
  if(review.approvals.length!==3||new Set(review.approvals.map(a=>a.kind)).size!==3||review.approvals.some(a=>a.applicability!=='unknown'&&!a.evidence.length))return 'research-failure';
  if(g.requestedActions.filter(isResource).some(a=>!g.coverage.some(c=>c.actionId===a.id&&c.status==='mapped'&&c.support==='reviewed'&&c.evidence?.length)))return 'research-failure';
  if(!g.steps.some(s=>s.stage==='prepare'&&s.destination)||!g.steps.some(s=>s.testKind==='authorization'&&concreteRequest(s)))return 'research-failure';
  if(g.researchNeeded.length||g.blockers.some(b=>b.kind==='missing-evidence'&&b.consequence!=='follow-up'))return 'research-failure';
  return 'usable-guide';
 }
 const actions=g.requestedActions.filter(isResource);
 if(g.mode!=='interpreted'||g.engine?.outcome&&g.engine.outcome!=='accepted'||!actions.length)return 'research-failure';
 if(g.accessModel==='oauth'&&g.oauthSupport!=='documented')return 'research-failure';
 // A first resource request is not usable when registration, actor or access
 // evidence is still missing. Launch-only distribution policy is separate.
 if(g.researchNeeded.some(topic=>topic!=='distribution'))return 'research-failure';
 if(actions.some(a=>!g.coverage.some(c=>c.actionId===a.id&&c.status==='mapped'&&c.support==='reviewed')||!g.steps.some(s=>s.testKind==='action'&&s.actionIds?.includes(a.id)&&concreteRequest(s))))return 'research-failure';
 if(g.blockers.some(b=>b.consequence==='test'&&b.kind==='missing-evidence'))return 'research-failure';
 return 'usable-guide';
}
