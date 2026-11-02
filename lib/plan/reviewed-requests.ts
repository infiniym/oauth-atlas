import type {Assessment} from '../advisor/types.ts';
import {capabilities} from '../advisor/providers.ts';
import type {PlanStep,PlanSource} from './types.ts';

const checkedAt='2026-11-02';
export function reviewedRequests(a:Assessment):{steps:PlanStep[];sources:PlanSource[]}{
 const steps:PlanStep[]=[],sources:PlanSource[]=[];
 const toolkit=a.provider==='slack'&&a.slackIdentity==='bot'?'slackbot':a.provider;
 const add=(action:string,method:string,endpoint:string,body:unknown,inputs:string[],expected:string,boundary:string,doc:string,setup='')=>{
  if(!a.capabilities.includes(action))return;
  const id='request-'+action,sourceId=a.provider+'-request-'+action;
  const args={toolkit,method,endpoint,...(body?{body}: {})};
  const example=[setup,'const response = await session.proxyExecute('+JSON.stringify(args,null,2)+');','if (response.resultType !== "completed") throw new Error(response.message);','console.log(response.status, response.data);'].filter(Boolean).join('\n');
  steps.push({id,title:'Test: '+capabilities[a.provider].find(c=>c.id===action)!.name,stage:'test',testKind:'action',actionIds:[action],owner:'Developer',detail:'Run this backend JavaScript with the authorized session created below. Replace the test inputs first. '+boundary,doneWhen:expected+' Record the actual response; this example has not been executed.',fields:inputs,sourceIds:[sourceId,'proxy-execute'],destination:doc,request:{method,endpoint,example,language:'javascript'}});
  sources.push({id:sourceId,title:steps.at(-1)!.title+' API reference',url:doc,checkedAt});
 };
 if(a.provider==='gmail'){
  const base='https://gmail.googleapis.com/gmail/v1/users/me';
  const messageInput='TEST_MESSAGE_ID: list test messages with GET '+base+'/messages?maxResults=1 and copy messages[0].id';
  for(const action of ['read','metadata'])add(action,'GET',base+'/messages/TEST_MESSAGE_ID?format='+(action==='metadata'?'metadata':'full'),null,[messageInput],action==='metadata'?'HTTP 200 with message id and headers, without body content.':'HTTP 200 with the selected test message id and payload.','Use only a seeded test mailbox. For read-only access, inspect that no write scope was granted; do not test a write.', 'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get');
  const mime='const raw = Buffer.from("From: your-connected-test-account@example.com\\r\\nTo: your-test-inbox@example.com\\r\\nSubject: Integration test\\r\\n\\r\\nTest message only.").toString("base64url");';
  add('draft','POST',base+'/drafts',{message:{raw:'REPLACE_WITH_RAW'}},['Use the connected test account as From and a mailbox you control as To; generate raw with the supplied MIME line'], 'HTTP 200 with draft id and message id; the message remains a draft.', 'Do not send the draft. gmail.compose also grants sending: enforce draft-only behavior in your tool layer.', 'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create',mime);
  add('send','POST',base+'/messages/send',{raw:'REPLACE_WITH_RAW'},['Use the connected test account as From and a recipient you control as To; generate raw with the supplied MIME line'], 'HTTP 200 with the sent message id; confirm receipt in your test inbox.', 'This sends a real test email when you run it. Use only your own test recipient. With a send-only grant, a mailbox read should be denied; inspect the grant first.', 'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send',mime);
  add('modify','POST',base+'/messages/TEST_MESSAGE_ID/modify',{removeLabelIds:['UNREAD']},[messageInput,'Seed an unread message in the test mailbox'],'HTTP 200 with message id and labelIds without UNREAD.','This marks test mail as read. Inspect that full-mail permanent-delete access was not requested; never send a destructive test.','https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify');
 }else if(a.provider==='slack'){
  for(const action of ['read','private'])add(action,'GET','https://slack.com/api/conversations.history?channel=TEST_CHANNEL_ID&limit=1',null,['TEST_CHANNEL_ID: copy the ID from a test channel; add the selected bot/person to that channel'],'HTTP 200 with ok=true and the test channel messages.','Repeat a read using a private test channel this identity cannot access; it must return ok=false without message data.','https://docs.slack.dev/reference/methods/conversations.history/');
  add('post','POST','https://slack.com/api/chat.postMessage',{channel:'TEST_CHANNEL_ID',text:'Integration test - test channel only.'},['TEST_CHANNEL_ID: copy the ID from a disposable test channel and invite the selected identity'],'HTTP 200 with ok=true, channel and ts; the test message appears in that channel.','This posts a real message when run. Use your test channel; inspect the scope and identity before testing an inaccessible channel.','https://docs.slack.dev/reference/methods/chat.postMessage/');
 }else{
  add('contents','GET','https://api.github.com/repos/TEST_OWNER/TEST_REPO/contents',null,['TEST_OWNER and TEST_REPO: an allowed test repository from the GitHub App installation'],'HTTP 200 with repository entries.','Read an excluded private test repository: expect 403/404 without content. Never use a public repository to prove installation isolation.','https://docs.github.com/en/rest/repos/contents');
  add('pulls','GET','https://api.github.com/repos/TEST_OWNER/TEST_REPO/pulls?state=open&per_page=1',null,['TEST_OWNER and TEST_REPO: an installed test repository with an open pull request'],'HTTP 200 with a pull-request array.','Repeat against an excluded private test repository; expect 403/404.','https://docs.github.com/en/rest/pulls/pulls');
  add('review','POST','https://api.github.com/repos/TEST_OWNER/TEST_REPO/pulls/TEST_PULL_NUMBER/reviews',{body:'Integration test review.',event:'COMMENT'},['TEST_OWNER, TEST_REPO and TEST_PULL_NUMBER: a disposable PR authored by another test identity'],'HTTP 200 with a review id and state COMMENTED.','This publishes a test review when run. Use a disposable PR; check excluded-repository access with a read instead of attempting another write.','https://docs.github.com/en/rest/pulls/reviews');
  add('write','POST','https://api.github.com/repos/TEST_OWNER/TEST_REPO/pulls',{title:'Integration test PR',head:'test-change',base:'main',body:'Disposable integration test.'},['TEST_OWNER and TEST_REPO: a disposable installed repo','Create test-change with a harmless commit ahead of main before running this request'],'HTTP 201 with a pull-request number and URL.','This creates a PR when run. Branch commits require separate Contents write access; this selected action does not grant it. Use an excluded private read as the boundary check.','https://docs.github.com/en/rest/pulls/pulls');
  add('identity','GET','https://api.github.com/users/TEST_USERNAME',null,['TEST_USERNAME: a public GitHub login'],'HTTP 200 with the requested public login and profile.','This public endpoint does not demonstrate private-repository access or a successful OAuth connection.','https://docs.github.com/en/rest/users/users#get-a-user');
 }
 for(const step of steps)if(step.request?.example.includes('REPLACE_WITH_RAW'))step.request.example=step.request.example.replace(/"REPLACE_WITH_RAW"/g,'raw');
 if(steps.length)sources.push({id:'proxy-execute',title:'Run provider requests through an authorized Composio session',url:'https://docs.composio.dev/docs/extending-sessions/proxy-execute',checkedAt});
 return {steps,sources};
}
