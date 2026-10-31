import type {ProviderId} from '../advisor/types.ts';
export function reviewedProvider(value:string):ProviderId|null{
  const normalized=value.trim().toLowerCase().replace(/[\s_-]/g,'');
  if(['gmail','googlemail','slack','github'].includes(normalized))return normalized==='googlemail'?'gmail':normalized as ProviderId;
  try{const host=new URL(value.includes('://')?value:'https://'+value).hostname.replace(/^www\./,'');return host==='github.com'?'github':host==='slack.com'?'slack':host==='gmail.com'||host==='mail.google.com'?'gmail':null;}catch{return null;}
}
export function researchRoute(app='',useCase=''):string{return '/live-guide?'+new URLSearchParams({app,useCase}).toString();}
