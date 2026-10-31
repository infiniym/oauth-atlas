'use client';
import {useEffect,useState} from 'react';
import AppFrame from './app-frame';
import LaunchPlanView from './launch-plan';
import type {LaunchPlan} from '@/lib/plan/types';
import {encodeAssessment} from '@/lib/advisor/assessment';
export default function SavedPlan({id}:{id:string}){
  const [plan,setPlan]=useState<LaunchPlan|null>(null),[error,setError]=useState('');
  useEffect(()=>{const abort=new AbortController();fetch('/api/plans/'+encodeURIComponent(id),{signal:abort.signal}).then(async r=>{const data=await r.json() as {plan:LaunchPlan;error?:string};if(!r.ok)throw new Error(data.error||'Plan could not be opened.');if(data.plan.researchId&&data.plan.status==='Needs a setup decision'){location.replace('/live-guide?id='+encodeURIComponent(data.plan.researchId));return;}setPlan(data.plan);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>abort.abort();},[id]);
  return <AppFrame breadcrumb={plan?plan.provider+' / Your launch plan':'Your launch plan'}>{error?<div className="advisor-notice error" role="alert">{error}</div>:!plan?<div className="advisor-loading">Opening saved plan…</div>:<LaunchPlanView plan={plan} onShare={()=>location.origin+'/plan/'+id} onEdit={()=>location.assign(plan.assessment?'/?plan='+encodeAssessment(plan.assessment)+'&edit=1':'/live-guide?id='+encodeURIComponent(plan.researchId||plan.id)+'&edit=1')}/>}</AppFrame>;
}
