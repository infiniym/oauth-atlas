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
export function reconcile(value:Interpretation):Interpretation{
  const v=structuredClone({...value,coverage:value.coverage||[],blockers:value.blockers||[],requestedActions:value.requestedActions||[],prohibitions:value.prohibitions||[]});
  for(const c of v.coverage){
    if(c.status==='mapped'&&(mappingUnresolved(c.reason)||c.support==='unresolved'))c.status='unresolved';
  }
  for(const a of v.requestedActions||[]){
    if(!v.coverage.some(c=>c.actionId===a.id))v.coverage.push({actionId:a.id,action:a.title,permissions:[],status:'unresolved',reason:'The requested action has no documented permission mapping in this plan.',support:'unresolved',evidence:[]});
    if(!v.steps.some(s=>s.stage==='test'&&s.actionIds?.includes(a.id)&&s.testKind==='action'&&s.request?.endpoint)){
      const c=v.coverage.find(c=>c.actionId===a.id)!;
      const id='test-'+a.id;
      if(!v.steps.some(s=>s.id===id))v.steps.push({id,title:'Test: '+a.title,detail:'Perform this requested action using the documented API request in a representative test account. The exact request is not established yet; resolve the linked specification blocker before executing it.',testKind:'action',owner:'developer',stage:'test',actionIds:[a.id],dependsOn:v.steps.filter(s=>s.stage==='prepare').map(s=>s.id!).filter(Boolean),doneWhen:'Record the actual API result for '+a.title+' and the rejected boundary check.',destination:'',fields:[],evidence:c.evidence?.length?c.evidence:v.findings.find(f=>f.kind==='oauth')?.evidence||[]});
      if(!v.blockers.some(b=>b.stepIds?.includes(id)))v.blockers.push({title:'API test specification: '+a.title,consequence:'test',owner:'Developer',resolution:'Find the documented endpoint or GraphQL operation for '+a.title+', its required permission and a representative request. Authorization or a viewer/profile query alone does not test this action.',stepIds:[id]});
      if(!v.researchNeeded.includes('permissions'))v.researchNeeded.push('permissions');
    }
  }
  for(const c of v.coverage.filter(c=>c.status!=='mapped')){
    if(!v.blockers.some(b=>b.title===c.action))v.blockers.push({title:c.action,consequence:'test',owner:'Developer',resolution:c.reason,stepIds:v.steps.filter(s=>s.stage==='test'&&(!c.actionId||s.actionIds?.includes(c.actionId))).map(s=>s.id!).filter(Boolean)});
  }
  if(v.coverage.some(c=>c.status!=='mapped'))v.recommendation='Preparation can continue. Resolve the access mapping for '+v.coverage.filter(c=>c.status!=='mapped').map(c=>c.action).join('; ')+'. Use the available steps below; affected API tests remain blocked.';
  return v;
}
