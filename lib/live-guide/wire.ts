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
const obj=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const quotedRow=obj({values:list(string),citations:obj({primary:{type:'string',pattern:'^s[0-9]+-p[0-9]+$'},secondary:string,tertiary:string})});
export const wireSchema=obj({meta:obj({tableVersion:{type:'string',enum:['launch-guide-table.v4']},summary:string,accessModel:string,oauthSupport:string}),intent:obj({actions:list(list(string)),prohibitions:list(string)}),facts:obj({findings:list(quotedRow),coverage:list(quotedRow),blockers:list(list(string)),unknowns:list(string),researchNeeded:list(string)}),steps:list(quotedRow),continuations:list(quotedRow)});
export function wireSchemaForRequest(request:string){if(!/paginat|continuation/i.test(request.replace(/\b(?:never|no|without|don't|do not)\b[^.;\n]*/gi,'')))return wireSchema;return {...wireSchema,properties:{...wireSchema.properties,continuations:{...(wireSchema.properties.continuations as Record<string,unknown>),minItems:1}}};}
export const wireInstructions='Return the grammar-constrained launch-guide-table.v4 object. Keep groups meta, intent, facts, steps, continuations exactly as defined. actions and blockers are arrays of string rows. Every finding, step, continuation and coverage entry is {values:[strings],citations:{primary,secondary,tertiary}}. The values array uses the exact column order below, with one string per column, empty strings for inapplicable fields; it DOES NOT contain citation IDs. Select 1-3 supplied citable passage IDs into citations; primary is mandatory, secondary/tertiary are empty when unused. Separate dependsOn, actionIds and stepIds with commas. Separate permissions and fields with newline characters; preserve exact permission names including spaces. This changes no facts or completeness requirements. Values: accessModel=oauth|public|unknown; oauthSupport=documented|unsupported|unknown; operation=read|create|update|delete|authorize|other; finding kind=oauth|permission|provider-review|customer-approval|prerequisite|provider-wait; stage=prepare|test|launch; owner=developer|agent|customer admin|provider; testKind=prepare|authorization|action|boundary|lifecycle|launch; coverage status=mapped|unresolved|unsupported; blocker kind=prerequisite|instruction|verification|missing-evidence and consequence=test|launch|follow-up. For missing-evidence use actionId and missingFact=request|permission; otherwise leave empty. Empty method/endpoint/example for non-action steps. Use steps for setup and initial requests. When pagination is requested, continuations must contain at least one action step with actual cursor/page/offset/after or documented next URL in curl, the same action ID and its initial step dependency. Do not duplicate continuations in steps. Other requests may have continuations=[]. Column order: '+JSON.stringify(Object.fromEntries(Object.entries(wireColumns).map(([k,v])=>[k,v.filter(c=>c!=='passageIds')])));
const ids=(value:string)=>value.split(/\s*,\s*/).map(x=>x.trim()).filter(Boolean);
const lines=(value:string)=>value.split(/\n/).map(x=>x.trim()).filter(Boolean);
function mergeStepRows(rows:Record<string,string>[]){
 const out:Record<string,string>[]=[];
 for(const row of rows){const found=out.find(s=>s.id===row.id);if(!found){out.push({...row});continue;}
  for(const key of wireColumns.steps){if(key==='passageIds'){found[key]=[...new Set([...ids(found[key]),...ids(row[key])])].join(',');continue;}const a=found[key],b=row[key];if(!b||a===b)continue;if(!a||['detail','doneWhen'].includes(key)&&b.startsWith(a)){found[key]=b;continue;}if(['detail','doneWhen'].includes(key)&&a.startsWith(b))continue;throw new Error('Guide transport has conflicting duplicate step '+row.id+' field '+key+'.');}
 }
 return out;
}
export function decodeWirePlan(raw:Record<string,unknown>):Record<string,unknown>{
 if((raw.meta as Record<string,unknown>)?.tableVersion==='launch-guide-table.v4'){const unpack=(items:unknown)=>Array.isArray(items)?items.map((item:any)=>{if(!Array.isArray(item.values)||!item.citations||typeof item.citations.primary!=='string')throw new Error('Guide transport quoted row is incomplete.');return [...item.values,[item.citations.primary,item.citations.secondary,item.citations.tertiary].filter(Boolean).join(',')];}):items;const facts=raw.facts as any;raw={...(raw.meta as object),...(raw.intent as object),...facts,tableVersion:'launch-guide-table.v1',findings:unpack(facts.findings),coverage:unpack(facts.coverage),steps:[...(unpack(raw.steps) as any[]),...(unpack(raw.continuations) as any[])]};}
 if((raw.meta as Record<string,unknown>)?.tableVersion==='launch-guide-table.v3'){const flatten=(items:unknown)=>Array.isArray(items)?items.map((s:any)=>({...s.identity,...s.instructions,...s.request,...s.relations,passageIds:s.passageIds})):items;raw={...(raw.meta as object),...(raw.intent as object),...(raw.facts as object),tableVersion:'launch-guide-table.v2',steps:flatten(raw.steps),continuations:flatten(raw.continuations)};}
 if(!['launch-guide-table.v1','launch-guide-table.v2'].includes(String(raw.tableVersion)))return raw;
 if(raw.tableVersion==='launch-guide-table.v2'&&Array.isArray(raw.continuations)){raw={...raw,steps:[...(Array.isArray(raw.steps)?raw.steps:[]),...raw.continuations]};}
 const rows=(key:keyof typeof wireColumns)=>{
  if(!Array.isArray(raw[key]))throw new Error('Guide transport '+key+' must be a row array.');
  return (raw[key] as unknown[]).map((row,index)=>{if(raw.tableVersion==='launch-guide-table.v2'){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==wireColumns[key].length||wireColumns[key].some(k=>typeof (row as Record<string,unknown>)[k]!=='string'))throw new Error('Guide transport '+key+' entry '+index+' has invalid string fields.');return row as Record<string,string>;}if(!Array.isArray(row)||row.length!==wireColumns[key].length||row.some(v=>typeof v!=='string'))throw new Error('Guide transport '+key+' row '+index+' must have exactly '+wireColumns[key].length+' string columns.');return Object.fromEntries(wireColumns[key].map((column,i)=>[column,row[i] as string]));});
 };
 const evidence=(value:string)=>ids(value).map(passageId=>({passageId}));
 const actions=rows('actions').map(a=>({id:a.id,title:a.title,operation:a.operation,category:a.operation==='authorize'?'authorization':'resource'}));
 return {
  summary:raw.summary,accessModel:raw.accessModel,oauthSupport:raw.oauthSupport,requestedActions:actions,prohibitions:raw.prohibitions,unknowns:raw.unknowns,researchNeeded:raw.researchNeeded,
  findings:rows('findings').map(f=>({kind:f.kind,title:f.title,detail:f.detail,scope:f.scope,appliesWhen:f.appliesWhen,stage:f.stage||'prepare',evidence:evidence(f.passageIds)})),
  steps:mergeStepRows(rows('steps')).map(s=>({id:s.id,title:s.title,detail:s.detail,owner:s.owner,doneWhen:s.doneWhen,stage:s.stage,testKind:s.testKind,dependsOn:ids(s.dependsOn),actionIds:ids(s.actionIds),...(s.method||s.endpoint||s.example?{request:{method:s.method,endpoint:s.endpoint,example:s.example}}:{}),destination:s.destination,fields:lines(s.fields),evidence:evidence(s.passageIds)})),
  coverage:rows('coverage').map(c=>({actionId:c.actionId,action:actions.find(a=>a.id===c.actionId)?.title||c.actionId,permissions:lines(c.permissions),status:c.status,reason:c.reason,evidence:evidence(c.passageIds)})),
  blockers:rows('blockers').map(b=>({title:b.title,kind:b.kind,consequence:b.consequence,owner:b.owner,resolution:b.resolution,...(b.actionId?{actionId:b.actionId}:{}),...(b.kind==='missing-evidence'&&b.actionId&&b.missingFact?{gap:{actionId:b.actionId,fact:b.missingFact}}:{}),stepIds:ids(b.stepIds),resolutionStepIds:ids(b.resolutionStepIds)})),
 };
}

export type WireRowRepair={section:string;index:number;columns:string[];values:string[]};
// Correct transport shape only. Provider facts and citations cannot be changed
// by this operation: every nonempty value must survive byte-for-byte.
export async function repairWireShape(raw:Record<string,any>,repair:(rows:WireRowRepair[])=>Promise<{section:string;index:number;values:string[]}[]>,report:()=>void){
 if(raw.meta?.tableVersion!=='launch-guide-table.v4')return raw;
 const value=structuredClone(raw),missing:WireRowRepair[]=[],targets=new Map<string,{values:string[]}>();
 const collect=(section:string,items:any[],columns:string[],quoted=false)=>{for(const [index,item] of (items||[]).entries()){const row=quoted?item:item&&{values:item};if(!Array.isArray(row?.values))throw new Error('Guide transport has a missing row.');targets.set(section+':'+index,row);const values=row.values;if(values.length>columns.length&&values.slice(columns.length).every((s:string)=>s==='')){row.values=values.slice(0,columns.length);if(!quoted)items[index]=row.values;report();}else if(values.length!==columns.length)missing.push({section,index,columns,values});}};
 collect('actions',value.intent.actions,wireColumns.actions);collect('blockers',value.facts.blockers,wireColumns.blockers);
 for(const section of ['findings','coverage'])collect(section,value.facts[section],wireColumns[section as 'findings'|'coverage'].slice(0,-1),true);
 collect('steps',value.steps,wireColumns.steps.slice(0,-1),true);collect('continuations',value.continuations,wireColumns.steps.slice(0,-1),true);
 if(!missing.length)return value;
 const corrections=await repair(missing);if(corrections.length!==missing.length||new Set(corrections.map(r=>r.section+':'+r.index)).size!==missing.length)throw new Error('Guide transport format repair missed a row.');
 const facts=(values:string[])=>JSON.stringify(values.filter(Boolean).sort());
 for(const source of missing){const row=corrections.find(r=>r.section===source.section&&r.index===source.index);if(!row||row.values.length!==source.columns.length||row.values.some(v=>typeof v!=='string')||facts(row.values)!==facts(source.values))throw new Error('Guide transport format repair changed a nonempty value.');const target=targets.get(source.section+':'+source.index)!;target.values=row.values;if(source.section==='actions')value.intent.actions[source.index]=row.values;if(source.section==='blockers')value.facts.blockers[source.index]=row.values;}
 report();return value;
}
