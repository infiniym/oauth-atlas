import type {Interpretation,Evidence} from './contracts.ts';

const uncertainMapping=/mapping.{0,40}(?:unverified|unresolved|not (?:established|documented))|(?:effect|relationship|scope.{0,8}endpoint).{0,55}(?:needs? verification|unverified|unresolved|not (?:established|documented))|does not (?:map|establish)|no.{0,30}(?:endpoint|mapping).{0,25}(?:source|document)/i;
export function mappingUnresolved(reason:string):boolean{return uncertainMapping.test(reason);}
export function contradictsGrant(action:string,evidence:Evidence[]):boolean{
  const quote=evidence.map(e=>e.quote).join(' ').toLowerCase();
  // Only reject clear read-only contradictions. General write grants require
  // semantic review; a token such as issues:write does not prove delete access.
  const mutation=/\b(?:delet\w*|creat\w*|edit\w*|updat\w*|writ\w*|send\w*)\b|\bpost(?:ing)?\s+(?:a\s+)?(?:comment|message|update)/i.test(action);
  return mutation&&/\bread(?:ing|[- ]only)?\b/.test(quote)&&!/(?:creat|edit|updat|writ|send|post|delet)/.test(quote);
}
export function requestGap(b:Interpretation['blockers'][number]):boolean{return b.kind==='missing-evidence'||(!b.kind&&/(?:endpoint|API request|request shape|GraphQL (?:query|operation))/i.test(b.title+' '+b.resolution)&&/(?:not (?:verified|established|supplied)|unverified|missing|unresolved|documentation|not in (?:the )?supplied (?:passages|documents))/i.test(b.title+' '+b.resolution));}
export function reconcile(value:Interpretation):Interpretation{
  const v=structuredClone({...value,coverage:value.coverage||[],blockers:value.blockers||[],requestedActions:value.requestedActions||[],prohibitions:value.prohibitions||[]});
  for(const b of v.blockers)if(requestGap(b))b.kind='missing-evidence';
  for(const c of v.coverage){
    if(c.status==='mapped'&&(mappingUnresolved(c.reason)||c.support==='unresolved'))c.status='unresolved';
  }
  for(const a of v.requestedActions||[]){
    if(!v.coverage.some(c=>c.actionId===a.id))v.coverage.push({actionId:a.id,action:a.title,permissions:[],status:'unresolved',reason:'The requested action has no documented permission mapping in this plan.',support:'unresolved',evidence:[]});
    let actionSteps=v.steps.filter(s=>s.stage==='test'&&s.actionIds?.includes(a.id)&&s.testKind==='action');
    if(actionSteps.length>1&&actionSteps.every(s=>s.actionIds?.length===1)){
      const keep=actionSteps.find(s=>s.request?.endpoint&&s.request.example)||actionSteps[0];
      const removed=new Set(actionSteps.filter(s=>s!==keep).map(s=>s.id).filter(Boolean));
      v.steps=v.steps.filter(s=>!removed.has(s.id));
      const remap=(ids:string[]|undefined)=>ids?[...new Set(ids.map(id=>removed.has(id)?keep.id!:id))]:undefined;
      for(const s of v.steps)s.dependsOn=remap(s.dependsOn)?.filter(id=>id!==s.id);
      for(const b of v.blockers){b.stepIds=remap(b.stepIds);b.resolutionStepIds=remap(b.resolutionStepIds);}
      actionSteps=[keep];
    }
    const concrete=actionSteps.some(s=>s.request?.endpoint&&s.request.method&&s.request.example);
    if(concrete&&v.coverage.some(c=>c.actionId===a.id&&c.status==='mapped'&&c.support==='reviewed')){const ids=new Set(actionSteps.map(s=>s.id));const resources=a.title.toLowerCase().split(/\W+/).filter(w=>w.length>3&&!['read','only','understand','with','from','test','selected','connected','user','account','workspace','their'].includes(w)).map(w=>w.replace(/s$/,''));v.unknowns=v.unknowns.filter(u=>!(requestGap({title:u,resolution:'',owner:'Developer',consequence:'follow-up'})&&resources.some(w=>u.toLowerCase().includes(w))));v.blockers=v.blockers.filter(b=>!(requestGap(b)&&(b.actionId===a.id||b.stepIds?.length&&b.stepIds.every(id=>ids.has(id))))&&!(b.title===a.title&&(b.kind==='missing-evidence'||!b.kind)));}
    if(!concrete){
      const c=v.coverage.find(c=>c.actionId===a.id)!;
      const existing=actionSteps[0];
      const id=existing?(existing.id||('test-'+a.id)):'test-'+a.id;
      if(existing)existing.id=id;
      if(!v.steps.some(s=>s.id===id))v.steps.push({id,title:'Test: '+a.title,detail:'Perform this requested action using the documented API request in a representative test account. The exact request is not established yet; resolve the linked specification blocker before executing it.',testKind:'action',owner:'developer',stage:'test',actionIds:[a.id],dependsOn:v.steps.filter(s=>s.stage==='prepare').map(s=>s.id!).filter(Boolean),doneWhen:'Record the actual API result for '+a.title+' and the rejected boundary check.',destination:'',fields:[],evidence:c.evidence?.length?c.evidence:v.findings.find(f=>f.kind==='oauth')?.evidence||[]});
      if(!v.blockers.some(b=>b.title==='API test specification: '+a.title||(b.kind==='missing-evidence'&&b.stepIds?.includes(id))))v.blockers.push({title:'API test specification: '+a.title,kind:'missing-evidence',actionId:a.id,consequence:'test',owner:'Developer',resolution:'Find the documented endpoint or GraphQL operation for '+a.title+', its required permission and a representative request. Authorization or a viewer/profile query alone does not test this action.',stepIds:[id]});
      if(!v.researchNeeded.includes('permissions'))v.researchNeeded.push('permissions');
    }
  }
  for(const c of v.coverage.filter(c=>c.status!=='mapped')){
    const targets=v.steps.filter(s=>s.stage==='test'&&s.testKind==='action'&&(!c.actionId||s.actionIds?.includes(c.actionId))).map(s=>s.id!).filter(Boolean);
    const existing=v.blockers.find(b=>b.title===c.action);
    if(existing){existing.kind='missing-evidence';existing.actionId=c.actionId;existing.stepIds=targets;}
    else v.blockers.push({title:c.action,kind:'missing-evidence',actionId:c.actionId,consequence:'test',owner:'Developer',resolution:c.reason,stepIds:targets});
  }
  if(v.coverage.some(c=>c.status!=='mapped'))v.recommendation='The requested API test is not ready yet. Resolve the access mapping for '+v.coverage.filter(c=>c.status!=='mapped').map(c=>c.action).join('; ')+'. Use “Find missing request” or add official documentation beside that action.';
  return v;
}
