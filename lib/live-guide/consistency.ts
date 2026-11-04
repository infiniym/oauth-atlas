import {migrateSemantics,isResource,legacyRequestGap} from './semantics.ts';
import type {Interpretation,Evidence} from './contracts.ts';
import {curlArguments} from './request-examples.ts';

const uncertainMapping=/mapping.{0,40}(?:unverified|unresolved|not (?:established|documented))|(?:effect|relationship|scope.{0,8}endpoint).{0,55}(?:needs? verification|unverified|unresolved|not (?:established|documented))|does not (?:map|establish)|no.{0,30}(?:endpoint|mapping).{0,25}(?:source|document)/i;
export function mappingUnresolved(reason:string):boolean{return uncertainMapping.test(reason);}
export function contradictsGrant(action:string,evidence:Evidence[],selectedScope?:string):boolean{
  const quote=evidence.map(e=>e.quote).join(' ').toLowerCase();
  // Only reject clear read-only contradictions. General write grants require
  // semantic review; a token such as issues:write does not prove delete access.
  const positive=action.split(/\.(?:\s|$)|[;\n]|\b(?:but|however)\b/i).filter(clause=>!/\b(?:scopes?|permissions?|grants?)\b.{0,140}\b(?:are|is) not (?:needed|required|requested|selected|used|granted)\b/i.test(clause)).map(clause=>{
    const attributed=selectedScope?clause.replace(/\b([a-z][\w:.-]*)\s+scope\s+(?:adds|allows|grants|permits|provides|includes)\b.*/gi,(claim,scope)=>scope===selectedScope?claim:''):clause;
    return attributed.replace(/\b(?:create|edit|update)\s+(?:(?:a|an|the|new|OAuth|public|private|scoped)\s+)*(?:app(?:lication)?|integration|connection|client|redirect|settings)\b/gi,'configure setup').replace(/\b(?:never|cannot|can't|won't|not|no|without|don't|do not|disable|deselect|avoid|exclude|omit|uncheck)\b.*/gi,'');
  }).join('. ');
  const mutation=/\b(?:delet\w*|creat\w*|edit\w*|updat\w*|writ\w*|send\w*)\b|\bpost(?:ing)?\s+(?:a\s+)?(?:comment|message|update)/i.test(positive);
  return mutation&&/\bread(?:ing|[- ]only)?\b/.test(quote)&&!/(?:creat|edit|updat|writ|send|post|delet)/.test(quote);
}
export const requestGap=legacyRequestGap;
export function reconcile(value:Interpretation):Interpretation{
  const v=migrateSemantics({...value,coverage:value.coverage||[],blockers:value.blockers||[],requestedActions:value.requestedActions||[],prohibitions:value.prohibitions||[]});
  for(const c of v.coverage){
    if(c.status==='mapped'&&(mappingUnresolved(c.reason)||c.support==='unresolved'))c.status='unresolved';
  }
  for(const a of v.requestedActions.filter(isResource)){
    if(!v.coverage.some(c=>c.actionId===a.id))v.coverage.push({actionId:a.id,action:a.title,permissions:[],status:'unresolved',reason:'The requested action has no documented permission mapping in this plan.',support:'unresolved',evidence:[]});
    let actionSteps=v.steps.filter(s=>s.stage==='test'&&s.actionIds?.includes(a.id)&&s.testKind==='action');
    if(actionSteps.length>1&&actionSteps.every(s=>s.actionIds?.length===1)&&new Set(actionSteps.map(s=>JSON.stringify(s.request?{method:s.request.method,endpoint:s.request.endpoint,args:curlArguments(s.request.example).length?curlArguments(s.request.example):s.request.example}:null))).size===1){
      const keep=actionSteps.find(s=>s.request?.endpoint&&s.request.example)||actionSteps[0];
      const removed=new Set(actionSteps.filter(s=>s!==keep).map(s=>s.id).filter(Boolean));
      v.steps=v.steps.filter(s=>!removed.has(s.id));
      const remap=(ids:string[]|undefined)=>ids?[...new Set(ids.map(id=>removed.has(id)?keep.id!:id))]:undefined;
      for(const s of v.steps)s.dependsOn=remap(s.dependsOn)?.filter(id=>id!==s.id);
      for(const b of v.blockers){b.stepIds=remap(b.stepIds);b.resolutionStepIds=remap(b.resolutionStepIds);}
      actionSteps=[keep];
    }
    const concrete=actionSteps.some(s=>s.request?.endpoint&&s.request.method&&s.request.example);
    const c=v.coverage.find(c=>c.actionId===a.id)!;
    v.blockers=v.blockers.filter(b=>!(b.gap?.actionId===a.id&&((b.gap.fact==='request'&&concrete)||(b.gap.fact==='permission'&&c.status==='mapped'&&c.support==='reviewed'))));
    if(concrete&&c.status==='mapped'&&c.support==='reviewed'){
      const resources=a.title.toLowerCase().split(/\W+/).filter(w=>w.length>3&&!['read','only','understand','with','from','test','selected','connected','user','account','workspace','their'].includes(w)).map(w=>w.replace(/s$/,''));
      v.unknowns=v.unknowns.filter(u=>!(legacyRequestGap({title:u,resolution:'',owner:'Developer',consequence:'follow-up'})&&resources.some(w=>u.toLowerCase().includes(w))));
    }
    if(!concrete){
      const c=v.coverage.find(c=>c.actionId===a.id)!;
      const existing=actionSteps[0];
      const id=existing?(existing.id||('test-'+a.id)):'test-'+a.id;
      if(existing)existing.id=id;
      if(!v.steps.some(s=>s.id===id))v.steps.push({id,title:'Test: '+a.title,detail:'Perform this requested action using the documented API request in a representative test account. The exact request is not established yet; resolve the linked specification blocker before executing it.',testKind:'action',owner:'developer',stage:'test',actionIds:[a.id],dependsOn:v.steps.filter(s=>s.stage==='prepare').map(s=>s.id!).filter(Boolean),doneWhen:'Record the actual API result for '+a.title+' and the rejected boundary check.',destination:'',fields:[],evidence:c.evidence?.length?c.evidence:v.findings.find(f=>f.kind==='oauth')?.evidence||[]});
      if(!v.blockers.some(b=>b.title==='API test specification: '+a.title||(b.kind==='missing-evidence'&&b.stepIds?.includes(id))))v.blockers.push({title:'API test specification: '+a.title,kind:'missing-evidence',gap:{actionId:a.id,fact:'request'},actionId:a.id,consequence:'test',owner:'Developer',resolution:'Find the documented endpoint or GraphQL operation for '+a.title+', its required permission and a representative request. Authorization or a viewer/profile query alone does not test this action.',stepIds:[id]});
      if(!v.researchNeeded.includes('permissions'))v.researchNeeded.push('permissions');
    }
  }
  for(const c of v.coverage.filter(c=>c.status!=='mapped')){
    const targets=v.steps.filter(s=>s.stage==='test'&&s.testKind==='action'&&(!c.actionId||s.actionIds?.includes(c.actionId))).map(s=>s.id!).filter(Boolean);
    const fact=c.missingFact==='request'||c.missingFact==='response'?'request':'permission';
    const existing=v.blockers.find(b=>b.title===c.action);
    if(existing){existing.kind='missing-evidence';existing.gap={actionId:c.actionId!,fact};existing.actionId=c.actionId;existing.stepIds=targets;}
    else v.blockers.push({title:c.action,kind:'missing-evidence',gap:c.actionId?{actionId:c.actionId,fact}:undefined,actionId:c.actionId,consequence:'test',owner:'Developer',resolution:c.reason,stepIds:targets});
  }
  if(v.coverage.some(c=>c.status!=='mapped'))v.recommendation='The requested API test is not ready yet. Resolve the access mapping for '+v.coverage.filter(c=>c.status!=='mapped').map(c=>c.action).join('; ')+'. Use “Find missing request” or add official documentation beside that action.';
  if(v.requestedActions.filter(isResource).length&&v.requestedActions.filter(isResource).every(a=>v.coverage.some(c=>c.actionId===a.id&&c.status==='mapped'&&c.support==='reviewed')&&v.steps.some(s=>s.testKind==='action'&&s.actionIds?.includes(a.id)&&s.request?.endpoint&&s.request.example)))v.researchNeeded=v.researchNeeded.filter(topic=>topic!=='permissions');
  return v;
}
