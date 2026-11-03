// A compact, grammar-constrained transport for the complete guide. Column rows
// avoid repeating the large nested local schema in the model's grammar. Every
// decoded claim still passes the full local contract and source/access checks.
const string={type:'string'};
const list=(items:unknown)=>({type:'array',items});
export const wireColumns={
 actions:['id','title','operation'],
 findings:['kind','title','detail','scope','appliesWhen','stage','passageIds'],
 steps:['id','title','detail','owner','doneWhen','stage','testKind','dependsOn','actionIds','method','endpoint','example','destination','fields','passageIds'],
 coverage:['actionId','permissions','status','reason','passageIds'],
 blockers:['title','kind','consequence','owner','resolution','actionId','missingFact','stepIds','resolutionStepIds'],
};
export const wireSchema={type:'object',additionalProperties:false,properties:{tableVersion:{type:'string',enum:['launch-guide-table.v1']},summary:string,accessModel:string,oauthSupport:string,actions:list(list(string)),prohibitions:list(string),findings:list(list(string)),steps:list(list(string)),coverage:list(list(string)),blockers:list(list(string)),unknowns:list(string),researchNeeded:list(string)},required:['tableVersion','summary','accessModel','oauthSupport','actions','prohibitions','findings','steps','coverage','blockers','unknowns','researchNeeded']};
export const wireInstructions='Return the grammar-constrained launch-guide-table.v1 object. Each actions/findings/steps/coverage/blockers row is an array of strings in the EXACT column order below, with one string per column (use empty strings for inapplicable columns). Separate passageIds, dependsOn, actionIds and stepIds with commas. Separate permissions and fields with newline characters; preserve the full exact permission name, including spaces. Cite 1-3 supplied citable passage IDs per finding/step/coverage. This transport changes no facts or completeness requirements. Values: accessModel=oauth|public|unknown; oauthSupport=documented|unsupported|unknown; action operation=read|create|update|delete|authorize|other; finding kind=oauth|permission|provider-review|customer-approval|prerequisite|provider-wait; stage=prepare|test|launch; owner=developer|agent|customer admin|provider; testKind=prepare|authorization|action|boundary|lifecycle|launch; coverage status=mapped|unresolved|unsupported; blocker kind=prerequisite|instruction|verification|missing-evidence and consequence=test|launch|follow-up. For a missing-evidence blocker use actionId and missingFact=request|permission; otherwise leave them empty. Empty method/endpoint/example for a non-action step. Column order: '+JSON.stringify(wireColumns);
const ids=(value:string)=>value.split(/\s*,\s*/).map(x=>x.trim()).filter(Boolean);
const lines=(value:string)=>value.split(/\n/).map(x=>x.trim()).filter(Boolean);
export function decodeWirePlan(raw:Record<string,unknown>):Record<string,unknown>{
 if(raw.tableVersion!=='launch-guide-table.v1')return raw;
 const rows=(key:keyof typeof wireColumns)=>{
  if(!Array.isArray(raw[key]))throw new Error('Guide transport '+key+' must be a row array.');
  return (raw[key] as unknown[]).map((row,index)=>{if(!Array.isArray(row)||row.length!==wireColumns[key].length||row.some(v=>typeof v!=='string'))throw new Error('Guide transport '+key+' row '+index+' must have exactly '+wireColumns[key].length+' string columns.');return Object.fromEntries(wireColumns[key].map((column,i)=>[column,row[i] as string]));});
 };
 const evidence=(value:string)=>ids(value).map(passageId=>({passageId}));
 const actions=rows('actions').map(a=>({id:a.id,title:a.title,operation:a.operation,category:a.operation==='authorize'?'authorization':'resource'}));
 return {
  summary:raw.summary,accessModel:raw.accessModel,oauthSupport:raw.oauthSupport,requestedActions:actions,prohibitions:raw.prohibitions,unknowns:raw.unknowns,researchNeeded:raw.researchNeeded,
  findings:rows('findings').map(f=>({kind:f.kind,title:f.title,detail:f.detail,scope:f.scope,appliesWhen:f.appliesWhen,stage:f.stage||'prepare',evidence:evidence(f.passageIds)})),
  steps:rows('steps').map(s=>({id:s.id,title:s.title,detail:s.detail,owner:s.owner,doneWhen:s.doneWhen,stage:s.stage,testKind:s.testKind,dependsOn:ids(s.dependsOn),actionIds:ids(s.actionIds),...(s.method||s.endpoint||s.example?{request:{method:s.method,endpoint:s.endpoint,example:s.example}}:{}),destination:s.destination,fields:lines(s.fields),evidence:evidence(s.passageIds)})),
  coverage:rows('coverage').map(c=>({actionId:c.actionId,action:actions.find(a=>a.id===c.actionId)?.title||c.actionId,permissions:lines(c.permissions),status:c.status,reason:c.reason,evidence:evidence(c.passageIds)})),
  blockers:rows('blockers').map(b=>({title:b.title,kind:b.kind,consequence:b.consequence,owner:b.owner,resolution:b.resolution,...(b.actionId?{actionId:b.actionId}:{}),...(b.kind==='missing-evidence'&&b.actionId&&b.missingFact?{gap:{actionId:b.actionId,fact:b.missingFact}}:{}),stepIds:ids(b.stepIds),resolutionStepIds:ids(b.resolutionStepIds)})),
 };
}
