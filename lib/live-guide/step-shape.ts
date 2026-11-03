import {curlArguments} from './request-examples.ts';

// Shape corrections retain every instruction, input and quotation. Long merged
// prose is shortened by the existing bounded display repair before validation.
export function coalesceRequestSteps<T extends Record<string,any>>(raw:T):T{
 const out:Record<string,any>=structuredClone(raw);if(!Array.isArray(out.steps))return out as T;
 const groups=new Map<string,any[]>(),remap=new Map<string,string>();
 for(const step of out.steps){if(step.testKind!=='action'||step.actionIds?.length!==1||!step.request?.example||!step.id)continue;const args=curlArguments(step.request.example);const key=JSON.stringify([step.actionIds[0],step.owner,step.stage,step.request.method,step.request.endpoint,args.length?args:step.request.example]);groups.set(key,[...groups.get(key)||[],step]);}
 const unique=(items:any[])=>[...new Map(items.map(item=>[JSON.stringify(item),item])).values()];
 for(const steps of groups.values())if(steps.length>1){const fields=unique(steps.flatMap(s=>s.fields||[])),evidence=unique(steps.flatMap(s=>s.evidence||[]));if(fields.length>8||evidence.length>6)continue;const keep=steps[0];keep.detail=unique(steps.map(s=>s.detail)).join(' ');keep.doneWhen=unique(steps.map(s=>s.doneWhen)).join(' ');keep.fields=fields;keep.evidence=evidence;keep.dependsOn=unique(steps.flatMap(s=>s.dependsOn||[]));for(const step of steps.slice(1))remap.set(step.id,keep.id);}
 const ids=(values:string[]|undefined)=>values?[...new Set(values.map(id=>remap.get(id)||id))]:undefined;
 out.steps=out.steps.filter((s:any)=>!remap.has(s.id));for(const step of out.steps)step.dependsOn=ids(step.dependsOn)?.filter(id=>id!==step.id);
 for(const item of [...out.blockers||[],...out.findings||[]]){if(item.stepIds)item.stepIds=ids(item.stepIds);if(item.resolutionStepIds)item.resolutionStepIds=ids(item.resolutionStepIds);}
 return out as T;
}
