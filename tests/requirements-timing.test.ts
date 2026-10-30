import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyAssessment} from '../lib/advisor/providers.ts';
import {criticalQuestions,missingCriticalQuestions} from '../lib/advisor/requirements.ts';
import {recommend} from '../lib/advisor/rules-engine.ts';
import {parseIntentLocally,revisedAssessment} from '../lib/advisor/assessment.ts';
import {planMarkdown} from '../lib/advisor/export.ts';
import type {Assessment} from '../lib/advisor/types.ts';
const gmail:Assessment={...emptyAssessment('gmail'),capabilities:['read','draft'],audience:'public',stage:'production',branding:'yes',dataHandling:'servers'};
const slack:Assessment={...emptyAssessment('slack'),capabilities:['read','post'],audience:'pilot',stage:'test',branding:'yes',slackIdentity:'bot'};
const github:Assessment={...emptyAssessment('github'),capabilities:['contents','pulls','review'],repoAccess:'selected'};

for(const field of ['audience','stage','branding','dataHandling'] as const){
 test('unanswered Gmail '+field+' prevents a firm setup recommendation',()=>{
  const a={...gmail,[field]:'unknown'} as Assessment;
  assert.ok(missingCriticalQuestions(a).some(q=>q.field===field));
  const r=recommend(a);assert.equal(r.route,'architecture-check');assert.equal(r.appModel,'Not selected yet');assert.equal(r.permissions.length,0);assert.equal(r.dependencies.length,0);assert.equal(r.composioCode,null);
 });
}
test('unknown Slack identity is required and is explained as an actor choice',()=>{
 const a={...slack,slackIdentity:'unknown'} as Assessment;
 assert.equal(recommend(a).route,'architecture-check');
 assert.match(criticalQuestions(a).find(q=>q.field==='slackIdentity')!.options[0][1],/My app/);
});
test('repository installation requirements skip unrelated branding, audience and background questions',()=>{
 assert.deepEqual(criticalQuestions(github).map(q=>q.field),['repoAccess']);
 assert.deepEqual(missingCriticalQuestions(github),[]);
 const r=recommend(github);assert.equal(r.appModel,'GitHub App');assert.ok(!r.unknowns.some(x=>/Confirm whether|Choose who|Choose testing/.test(x)));
});
test('public repository reads require a background answer because it changes the app model',()=>{
 const a:Assessment={...github,capabilities:['contents'],repoAccess:'public',background:'unknown',branding:'no'};
 assert.ok(missingCriticalQuestions(a).some(q=>q.field==='background'));
 assert.equal(recommend(a).route,'architecture-check');
 assert.match(recommend({...a,background:'no'}).appModel,/OAuth App/);
 assert.equal(recommend({...a,background:'yes'}).appModel,'GitHub App');
});
test('unknown organization policy is a concrete follow-up, not a required intake answer',()=>{
 assert.ok(!missingCriticalQuestions(gmail).length);
 assert.ok(recommend(gmail).checklist.some(s=>s.id==='check-admin'&&s.owner==='Developer + admin'));
});
test('a testing Gmail plan does not force a production data-flow choice',()=>{
 const a:Assessment={...gmail,stage:'test',dataHandling:'unknown'};
 assert.ok(!criticalQuestions(a).some(q=>q.field==='dataHandling'));
 assert.equal(recommend(a).route,'custom');
 assert.ok(recommend(a).unknowns.some(x=>x.includes('data handling')));
});
test('own Workspace exception needs confirmation before an internal production plan',()=>{
 const a:Assessment={...gmail,audience:'organization',workspaceOnly:'unknown'};
 assert.equal(recommend(a).route,'architecture-check');
 assert.ok(recommend({...a,workspaceOnly:'yes'}).dependencies.some(d=>d.id==='GOOGLE-EXCEPTION'));
});
test('reinterpreting a request updates actions and preserves manually entered context for the same provider',()=>{
 const description='Gmail send email';const next=revisedAssessment(gmail,description,parseIntentLocally(description));
 assert.deepEqual(next.capabilities,['send']);assert.equal(next.branding,'yes');assert.equal(next.stage,'production');assert.equal(next.description,description);
 assert.ok(!recommend(next).dependencies.some(d=>d.id==='GOOGLE-ASSESSMENT'));
});
test('changing request provider resets context instead of carrying incompatible Gmail answers',()=>{
 const next=revisedAssessment(gmail,'A Slack bot posts updates',parseIntentLocally('A Slack bot posts updates'));
 assert.equal(next.provider,'slack');assert.deepEqual(next.capabilities,['post']);assert.equal(next.slackIdentity,'bot');assert.equal(next.stage,'unknown');assert.equal(next.branding,'unknown');
});
test('Gmail timing follows sensitive versus restricted verification, with resolvable source references',()=>{
 const restricted=recommend(gmail),send=recommend({...gmail,capabilities:['send']});
 assert.match(restricted.wait,/6 weeks/);assert.match(send.wait,/10 business days/);
 assert.match(restricted.wait,/additional, unverified/);assert.match(restricted.effortBasis,/not a timed/);
 for(const r of [restricted,send])for(const id of r.waitSourceIds)assert.ok(r.sources.some(s=>s.id===id));
});
test('Slack pilot does not inherit commercial Marketplace timing',()=>{
 assert.ok(!/10 weeks|10 business days/.test(recommend(slack).wait));
 const commercial=recommend({...slack,audience:'public',stage:'production'});assert.match(commercial.wait,/10 weeks/);assert.ok(commercial.sources.some(s=>s.id==='slack-review-timing'));
 const managed=recommend({...slack,audience:'public',stage:'production',branding:'no'});assert.match(managed.wait,/No new developer-owned Slack registration/);assert.ok(!/10 weeks/.test(managed.wait));assert.ok(managed.waitSourceIds.includes('slack-distribution'));
});
test('managed and GitHub timing are scoped estimates rather than copied approval waits',()=>{
 const managed=recommend({...gmail,branding:'no'}),gh=recommend(github);
 assert.match(managed.effort,/30–90/);assert.ok(!/6 weeks/.test(managed.wait));assert.match(gh.effort,/1–3/);assert.match(gh.wait,/does not remove customer organization approval/);
 assert.match(planMarkdown(gmail,recommend(gmail)),/Planning estimate, not a timed setup result/);
});
