// Keep each model grammar small while using named fields. Local validation
// still enforces the complete guide, evidence, permission and request contract.
const str={type:'string'};
const enumeration=(...values:string[])=>({type:'string',enum:values});
const arr=(items:unknown)=>({type:'array',items});
const obj=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const citation=obj({primary:{type:'string',pattern:'^s[0-9]+-p[0-9]+$'},secondary:str,tertiary:str});
export const factsSchema=obj({accessModel:enumeration('oauth','public','unknown'),oauthSupport:enumeration('documented','unsupported','unknown'),summary:str,findings:arr(obj({kind:enumeration('oauth','permission','provider-review','customer-approval','prerequisite','provider-wait'),title:str,detail:str,scope:str,appliesWhen:str,stage:enumeration('prepare','test','launch'),evidence:citation})),coverage:arr(obj({actionId:str,permissions:arr(str),status:enumeration('mapped','unresolved','unsupported'),reason:str,evidence:citation})),unknowns:arr(str),researchNeeded:arr(str)});
export const stepsSchema=obj({steps:arr(obj({id:str,title:str,detail:str,owner:enumeration('developer','agent','customer admin','provider'),doneWhen:str,stage:enumeration('prepare','test','launch'),testKind:enumeration('prepare','authorization','action','boundary','lifecycle','launch'),dependsOn:arr(str),actionIds:arr(str),request:obj({method:str,endpoint:str,example:str}),destination:str,fields:arr(str),evidence:citation})),blockers:arr(obj({title:str,kind:str,consequence:str,owner:str,resolution:str,stepIds:arr(str),resolutionStepIds:arr(str)}))});
export function expandPartEvidence(raw:Record<string,any>){
 const out=structuredClone(raw);
 for(const key of ['findings','coverage','steps'])for(const item of out[key]||[])if(item.evidence&&!Array.isArray(item.evidence))item.evidence=Object.values(item.evidence).filter(Boolean).map(passageId=>({passageId}));
 return out;
}
