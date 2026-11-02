import type {LaunchPlan,PlanStep} from './types.ts';

// Personal progress changes the highlighted task, never the saved verification.
export function nextFromProgress(plan:LaunchPlan,checks:string[]):PlanStep|null{
 const remaining=plan.steps.filter(s=>!checks.includes(s.id));
 const active=remaining.some(s=>s.stage!=='launch')?remaining.filter(s=>s.stage!=='launch'):remaining;
 return active.find(s=>!s.blockedBy?.length&&(s.dependsOn||[]).every(id=>checks.includes(id)))||(!checks.length?plan.next:null);
}
export function featureSummary(plan:LaunchPlan):string[]{
 const a=plan.assessment;
 if(a)return [plan.context.find(c=>c.label==='Actions')?.value||'',a.audience==='personal'?'Personal account':a.audience==='organization'?'Your organization':'Customer accounts',a.stage==='test'?'Testing':'Production',a.managedScopes==='unsupported'||plan.route.includes('GitHub App')?'Custom app':plan.steps.some(s=>s.id==='managed-fit')?'Managed app candidate':'Custom app'].filter(Boolean);
 return [plan.context.find(c=>c.label==='Actions')?.value||(plan.coverage||[]).map(c=>c.action).join('; '),plan.context.find(c=>c.label==='Audience')?.value==='customers'?'Customer accounts':plan.context.find(c=>c.label==='Audience')?.value==='internal'?'Your organization':'', 'Setup and first test'].filter(Boolean);
}
