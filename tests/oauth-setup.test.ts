import test from 'node:test';
import assert from 'node:assert/strict';
import type {Document,Interpretation,StoredRun,WorkflowCheckpoint} from '../lib/live-guide/contracts.ts';
import {normalizeInput} from '../lib/live-guide/contracts.ts';
import {sourcePassages,attachResourceExamples} from '../lib/live-guide/interpretation.ts';
import {generate} from '../lib/live-guide/workflow.ts';
import {guideReadiness} from '../lib/live-guide/readiness.ts';
import {researchedPlan} from '../lib/plan/adapters.ts';
import {exportPlan} from '../lib/plan/export.ts';
import {nextFromProgress} from '../lib/plan/presentation.ts';
import {requestExampleParts} from '../lib/live-guide/request-examples.ts';

const url='https://developer.acme.com/oauth';
const document:Document={id:'s1',url,title:'OAuth applications',hash:'fixture',retrievedAt:'2026-11-09T00:00:00Z',text:[
 'Create an OAuth application in the developer console and save its client ID, secret and redirect URI.',
 'The issues:read scope allows reading issue names for the authorized user in their selected project.',
 'Use GET https://api.acme.com/oauth/authorize with response_type=code, client_id, redirect_uri and state. Verify the returned state before using the callback code.',
 'Use POST https://api.acme.com/oauth/token with HTTP Basic client credentials, grant_type=authorization_code, code and redirect_uri. Store tokens and secrets on your backend.',
 'Direct customer authorization is available without provider review. Only the developer who owns the app can change its registered redirect URI.',
 'Use GET https://api.acme.com/issues with a Bearer access token. The response contains issue names.',
].join('\n')};
const passages=sourcePassages([document]);
const passage=(text:string)=>passages.find(p=>p.text.includes(text))!;
const evidence=(text:string)=>[{sourceId:'s1',quote:passage(text).text}];
const ref=(text:string)=>({primary:passage(text).id,secondary:'',tertiary:''});
const intent={requestedActions:[{id:'read',title:'Read issue names',category:'resource' as const,operation:'read' as const}],prohibitions:['Never change issues.']};
function facts():Interpretation{return {
 ...intent,accessModel:'oauth',oauthSupport:'documented',summary:'Set up a customer OAuth app for issue names.',recommendation:'Configure a read-only grant.',nextAction:'Register the app.',
 findings:[
  {kind:'oauth',title:'Register an OAuth app',detail:'Register in the developer console.',scope:'',appliesWhen:'Before testing',evidence:evidence('Create an OAuth')},
  {kind:'permission',title:'Read issue names',detail:'Request issues:read for the selected project.',scope:'issues:read',appliesWhen:'Reading issue names',evidence:evidence('issues:read')},
 ],coverage:[{actionId:'read',action:'Read issue names',status:'mapped',permissions:['issues:read'],reason:'This scope grants the requested reads.',evidence:evidence('issues:read')}],
 steps:[],questions:[],blockers:[],unknowns:[],researchNeeded:[],activeEffort:{range:'',assumptions:''},
};}
function previous():StoredRun{return {documents:[document],guide:{
 ...facts(),id:'lg-'+crypto.randomUUID(),schemaVersion:1,generatedAt:document.retrievedAt,
 input:normalizeInput({app:'Acme',website:url,useCase:'Read issue names. Never change issues.',audience:'customers'}),
 provider:{website:url,identity:'provided'},mode:'interpreted',status:'provisional',notice:'Fixture only',warnings:[],setupTested:false,clarificationUsed:true,
 sources:[document],integration:{message:'Unverified toolkit'},
}};}
function rawStep(id:string,testKind:string,text:string,request={method:'',endpoint:'',example:'',responsePath:''}){
 return {id,testKind,title:id,detail:'Follow the documented '+id+' instructions.',owner:'developer',stage:testKind==='prepare'?'prepare':'test',doneWhen:'Record the configured '+id+' result.',dependsOn:id==='registration'?[]:['registration'],actionIds:[],destination:url,fields:[],request,evidence:ref(text)};
}
function network(launchGap='',reviewDetail='Direct customer authorization is available without provider review.'){
 let calls=0;
 const fetcher:typeof fetch=async(_input,init)=>{
  calls++;
  const payload=JSON.parse(String(init?.body));
  let result:unknown;
  if(payload.system.startsWith('FACTS STAGE')){
   const v=facts();
   result={accessModel:v.accessModel,oauthSupport:v.oauthSupport,summary:v.summary,findings:v.findings.map(f=>({...f,stage:'prepare',evidence:ref(f.kind==='oauth'?'Create an OAuth':'issues:read')})),coverage:v.coverage.map(({action:_action,...c})=>({...c,evidence:ref('issues:read')})),unknowns:[],researchNeeded:[]};
  }else if(payload.system.startsWith('Create a developer handoff')){
   result={steps:[
    rawStep('registration','prepare','Create an OAuth'),
    rawStep('consent','authorization','Use GET https://api.acme.com/oauth/authorize',{method:'GET',endpoint:'https://api.acme.com/oauth/authorize',example:"curl 'https://api.acme.com/oauth/authorize?response_type=code&client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&state=<STATE>'",responsePath:''}),
    rawStep('token-exchange','authorization','Use POST https://api.acme.com/oauth/token',{method:'POST',endpoint:'https://api.acme.com/oauth/token',example:"curl --request POST 'https://api.acme.com/oauth/token' --user '<CLIENT_ID>:<CLIENT_SECRET>' --data 'grant_type=authorization_code&code=<CODE>&redirect_uri=<REDIRECT_URI>'",responsePath:''}),
    {...rawStep('resource','action','Use GET https://api.acme.com/issues',{method:'GET',endpoint:'https://api.acme.com/invented',example:"curl 'https://api.acme.com/invented' -H 'Authorization: Bearer <TOKEN>'",responsePath:'$.names[]'}),actionIds:['read']},
    {...rawStep('launch','launch','Direct customer'),stage:'launch',dependsOn:['resource'],detail:'Confirm representative authorization before direct customer rollout.'},
   ],continuations:[],blockers:[]};
  }else if(payload.system.startsWith('Check this OAuth setup')){
   result={gaps:{registration:'',authorization:'',permissions:'',launch:launchGap},exampleIssue:'',approvals:[
    {kind:'provider-review',applicability:'not-required',detail:reviewDetail,passageIds:[passage('Direct customer').id]},
    {kind:'marketplace-listing',applicability:'unknown',detail:'Check the provider directory policy before listing.',passageIds:[]},
    {kind:'customer-admin',applicability:'unknown',detail:'Check the representative customer’s account policy.',passageIds:[]},
   ]};
  }else assert.fail('Unexpected model stage');
  return Response.json({type:'message',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(result)}],usage:{input_tokens:10,output_tokens:10}});
 };
 return {fetcher,calls:()=>calls};
}

test('curl GET data parameters retain their actual method and remain available to endpoint grounding',()=>{
 const parts=requestExampleParts("curl --get 'https://api.acme.com/oauth/authorize?response_type=code' --data-urlencode 'client_id=<CLIENT_ID>' --data-urlencode 'redirect_uri=https://app.example.com/callback?a=1&b=2' --data 'state=<STATE>'");
 assert.equal(parts.method,'GET');
 assert.deepEqual(parts.bodies,[]);
 const url=new URL(parts.url);
 assert.equal(url.searchParams.get('client_id'),'<CLIENT_ID>');
 assert.equal(url.searchParams.get('redirect_uri'),'https://app.example.com/callback?a=1&b=2');
 assert.equal(url.searchParams.get('state'),'<STATE>');
 assert.equal(requestExampleParts("curl 'https://api.acme.com/oauth/token' --data 'code=<CODE>'").method,'POST');
});

test('OAuth setup generation retains a sound handoff when an optional request is unsupported',async()=>{
 const old=previous(),net=network(),checkpoints:WorkflowCheckpoint[]=[];
 const result=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,net.fetcher,old,{oauthSetup:true,save:async c=>{checkpoints.push(structuredClone(c));}});
 assert.equal(net.calls(),3);
 assert.equal(guideReadiness(result.guide),'usable-guide');
 assert.equal(result.guide.steps.filter(s=>s.testKind==='action').length,0);
 assert.match(result.guide.oauthSetup!.exampleNotes[0],/omitted.*not documented/i);
 assert.ok(checkpoints.at(-1)?.exampleNotes?.length);
 const plan=researchedPlan(result.guide),markdown=exportPlan(plan);
 assert.equal(plan.blockers.filter(b=>b.consequence==='test').length,0);
 assert.equal(plan.examples!.length,0);
 assert.deepEqual(plan.steps.find(s=>s.id==='launch')!.dependsOn,[]);
 assert.match(plan.steps.find(s=>s.id==='launch')!.detail,/representative authorization/);
 assert.match(markdown,/Optional resource examples/);
 assert.match(markdown,/Direct customer authorization is available/);
 assert.match(markdown,/omitted/);
 assert.ok(!markdown.includes('/invented'));
 assert.equal(nextFromProgress(plan,[])!.id,'registration');
 for(const check of ['registration','authorization','permissions','launch'] as const){
  const incomplete=structuredClone(result.guide);
  incomplete.oauthSetup!.review!.gaps[check]='Missing essential '+check;
  assert.equal(guideReadiness(incomplete),'research-failure');
 }
 const missingReview=structuredClone(result.guide);
 delete missingReview.oauthSetup!.review;
 assert.equal(guideReadiness(missingReview),'research-failure');
});

test('a launch gap survives the bounded correction and cannot become a usable saved guide',async()=>{
 const old=previous(),net=network('Production access needs a documented application step.');
 let checkpoint:WorkflowCheckpoint|undefined;
 const result=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,net.fetcher,old,{oauthSetup:true,save:async c=>{checkpoint=structuredClone(c);}});
 assert.equal(net.calls(),6);
 assert.equal(guideReadiness(result.guide),'research-failure');
 assert.match(result.guide.oauthSetup!.review!.gaps.launch!,/Production access/);
 assert.match(exportPlan(researchedPlan(result.guide)),/Complete launch guidance/);
 const resumed=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,async()=>assert.fail('Completed negative checks must be reused until instructions or sources change.'),old,{oauthSetup:true,checkpoint});
 assert.equal(guideReadiness(resumed.guide),'research-failure');
 assert.equal(resumed.guide.oauthSetup!.review!.gaps.launch,result.guide.oauthSetup!.review!.gaps.launch);
});

test('a resource example with mismatched evidence is omitted without changing the core instructions',()=>{
 const core=facts(),step={...rawStep('resource','action','Use GET https://api.acme.com/issues'),actionIds:['read'],stage:'test' as const,owner:'developer' as const,testKind:'action' as const,evidence:[{sourceId:'s1',quote:'This quotation does not occur in any source.'}],request:{method:'GET',endpoint:'https://api.acme.com/issues',example:"curl 'https://api.acme.com/issues' -H 'Authorization: Bearer <TOKEN>'",responsePath:'$.names[]'}};
 const result=attachResourceExamples(core,[step],[document],'Read issue names. Never change issues.');
 assert.deepEqual(result.value,core);
 assert.match(result.exampleNotes[0],/citation/i);
});

test('review explanation length cannot discard a grounded verdict or clear a negative decision',async()=>{
 const old=previous(),longDetail='Direct customer authorization is available without provider review. '.repeat(12),net=network('',longDetail);
 const complete=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,net.fetcher,old,{oauthSetup:true});
 assert.equal(guideReadiness(complete.guide),'usable-guide');
 assert.equal(complete.guide.oauthSetup!.review!.approvals[0].detail,longDetail.trim());
 const gap='Production access requires the documented application step. '.repeat(10),negative=network(gap);
 const incomplete=await generate({...old.guide.input,previousId:old.guide.id},{ANTHROPIC_API_KEY:'fixture',ANTHROPIC_MODEL:'fixture'},()=>{},new AbortController().signal,negative.fetcher,old,{oauthSetup:true});
 assert.equal(guideReadiness(incomplete.guide),'research-failure');
 assert.equal(incomplete.guide.oauthSetup!.review!.gaps.launch,gap.trim());
});
