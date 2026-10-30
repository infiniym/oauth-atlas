import type {Assessment} from './types.ts';

export type CriticalField = 'audience'|'stage'|'branding'|'background'|'dataHandling'|'workspaceOnly'|'slackIdentity'|'repoAccess';
export type CriticalQuestion = {field:CriticalField;label:string;hint:string;options:[string,string][]};
const yesNo:[string,string][]=[['yes','Yes'],['no','No']];
const hasRepositoryActions=(a:Assessment)=>a.capabilities.some(c=>c!=='identity');
export function installationModelChosen(a:Assessment){
 return a.provider==='github'&&hasRepositoryActions(a)&&(a.repoAccess==='selected'||a.repoAccess==='all'||a.capabilities.some(c=>c==='review'||c==='write')||(a.capabilities.includes('contents')&&a.repoAccess!=='public'&&a.repoAccess!=='unknown'));
}
export function usesGitHubApp(a:Assessment){return installationModelChosen(a)||(a.provider==='github'&&hasRepositoryActions(a)&&a.background==='yes');}
export function ownAppAlreadyRequired(a:Assessment){return usesGitHubApp(a)||a.managedScopes==='unsupported'||a.customScopes==='yes'||a.dedicatedQuota==='yes'||a.customInstance==='yes';}
export function criticalQuestions(a:Assessment):CriticalQuestion[]{
 const questions:CriticalQuestion[]=[];
 if(a.provider!=='github'){
  questions.push({field:'audience',label:'Who will use the integration?',hint:'This determines which testing, distribution and review rules apply.',options:[['personal','Just me'],['organization','My team or organization'],['pilot','A limited customer pilot'],['public','Customers / public release']]});
  questions.push({field:'stage',label:'What are you preparing for?',hint:'A working test connection and a production launch have different requirements.',options:[['test','Development and testing'],['production','Production launch']]});
 }
 if(a.provider==='github'&&hasRepositoryActions(a)){
  questions.push({field:'repoAccess',label:'Which repositories should it access?',hint:'Choose the access boundary your customers need.',options:[['public','Public repositories only'],['selected','Repositories each customer selects'],['all','All repositories granted by an installation']]});
  if(!installationModelChosen(a)&&a.repoAccess!=='unknown')questions.push({field:'background',label:'Should it work without the user being present?',hint:'Independent repository automation changes the recommended app model.',options:[['yes','Yes · scheduled or background work'],['no','No · only while the user uses my app']]});
 }
 if(!ownAppAlreadyRequired(a))questions.push({field:'branding',label:'Must the provider show your own app name during consent?',hint:'If not, we can check Composio’s managed app first. Your own consent identity requires your own registration.',options:yesNo});
 if(a.provider==='slack')questions.push({field:'slackIdentity',label:'Who should appear to act in Slack?',hint:'This determines which connection and permissions to configure.',options:[['bot','My app / bot · for example, Acme Assistant'],['user','The person who connected their Slack account']]});
 if(a.provider==='gmail'&&a.stage==='production'&&a.capabilities.some(c=>['read','metadata','draft','modify'].includes(c))){
  questions.push({field:'dataHandling',label:'Where will email data be processed?',hint:'Count your servers, Composio and remote AI services even if messages are not saved. This affects security-assessment guidance.',options:[['servers','Through servers or a remote AI service'],['device','Entirely on the user’s device']]});
 }
 if(a.provider==='gmail'&&a.audience==='organization'&&a.stage==='production'&&(a.branding==='yes'||ownAppAlreadyRequired(a)))questions.push({field:'workspaceOnly',label:'Is this limited to your own Google Workspace organization?',hint:'A team app is not automatically eligible for Google’s internal-use exception.',options:yesNo});
 return questions;
}
export function missingCriticalQuestions(a:Assessment){return criticalQuestions(a).filter(q=>a[q.field]==='unknown');}
