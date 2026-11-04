import type {ProviderId} from '../advisor/types.ts';
import type {LiveGuide} from '../live-guide/contracts.ts';
import {guideReadiness} from '../live-guide/readiness.ts';
export function researchSharePath(guide:LiveGuide,hasFrozenPlan=false):string{return hasFrozenPlan||guideReadiness(guide)==='usable-guide'?'/plan/'+guide.id:'/live-guide?id='+guide.id;}
export function reviewedProvider(value:string):ProviderId|null{
  const normalized=value.trim().toLowerCase().replace(/[\s_-]/g,'');
  if(['gmail','googlemail','slack','github'].includes(normalized))return normalized==='googlemail'?'gmail':normalized as ProviderId;
  try{const host=new URL(value.includes('://')?value:'https://'+value).hostname.replace(/^www\./,'');return host==='github.com'?'github':host==='slack.com'?'slack':host==='gmail.com'||host==='mail.google.com'?'gmail':null;}catch{return null;}
}
export function researchRoute(app='',useCase=''):string{if(app.length>100||useCase.length>1500)throw new Error('Keep the provider under 100 and request under 1,500 characters.');return '/live-guide?'+new URLSearchParams({app,useCase}).toString();}
