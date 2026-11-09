import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {emptyAssessment} from '../lib/advisor/providers.ts';
import type {Assessment} from '../lib/advisor/types.ts';
import type {LaunchPlan} from '../lib/plan/types.ts';
import {exportPlan} from '../lib/plan/export.ts';

const origin=process.env.SUBMISSION_ORIGIN||'http://127.0.0.1:5187';
const label=process.argv[2]||'reviewed-http';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Supply a lowercase evidence label.');
const directory='docs/evidence/submission-2026-11-09/'+label;
if(existsSync(directory))throw new Error('Preserve the existing attempt and use a new label.');
mkdirSync(directory,{recursive:true});
const release=await(await fetch(origin+'/api/release')).json();
const common={audience:'pilot',stage:'test',branding:'no',background:'no',dataHandling:'servers',workspaceOnly:'no',orgPolicy:'standard',customScopes:'no',dedicatedQuota:'no',customInstance:'no'} as const;
const cases=[
 {name:'gmail-read-draft',provider:'gmail',capabilities:['read','draft']},
 {name:'gmail-send-only',provider:'gmail',capabilities:['send']},
 {name:'slack-person-pilot',provider:'slack',capabilities:['read','post'],slackIdentity:'user'},
 {name:'slack-app-public',provider:'slack',capabilities:['read','post'],slackIdentity:'bot',audience:'public',stage:'production'},
 {name:'github-selected',provider:'github',capabilities:['contents'],repoAccess:'selected'},
];
const records:{name:string;input:Assessment;plan:LaunchPlan;share:string;roundTrip:boolean;pageShellAvailable:boolean;markdown:string}[]=[];
for(const {name,...fields} of cases){
 const input={...emptyAssessment(fields.provider as Assessment['provider']),...common,...fields} as Assessment;
 const response=await fetch(origin+'/api/plans',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal(response.status,200);
 const saved=await response.json() as {id:string;plan:LaunchPlan};
 const read=await fetch(origin+'/api/plans/'+saved.id);
 assert.equal(read.status,200);
 const {plan}=await read.json() as {plan:LaunchPlan};
 assert.deepEqual(plan,saved.plan);
 const page=await fetch(origin+'/plan/'+saved.id);
 const html=await page.text();
 assert.equal(page.status,200);
 assert.ok(html.includes('Opening saved plan'));
 const markdown=exportPlan(plan);
 for(const step of plan.steps)assert.ok(markdown.includes(step.title));
 for(const source of plan.sources)assert.ok(markdown.includes(source.url));
 writeFileSync(directory+'/'+name+'.md',markdown);
 records.push({name,input,plan,share:origin+'/plan/'+saved.id,roundTrip:true,pageShellAvailable:true,markdown:name+'.md'});
}
const [gmailDraft,gmailSend,slackPerson,slackApp,github]=records;
assert.deepEqual(gmailDraft.plan.permissions.map(p=>p.identifier.replace('https://www.googleapis.com/auth/','')).sort(),['gmail.compose','gmail.readonly']);
assert.deepEqual(gmailSend.plan.permissions.map(p=>p.identifier.replace('https://www.googleapis.com/auth/','')),['gmail.send']);
assert.notDeepEqual(gmailDraft.plan.requirements,gmailSend.plan.requirements);
assert.notEqual(slackPerson.plan.route,slackApp.plan.route);
assert.notEqual(slackPerson.plan.timing.wait,slackApp.plan.timing.wait);
assert.ok(JSON.stringify(slackApp.plan.preparation).includes('slackbot'));
assert.ok(JSON.stringify(github.plan).includes('selected'));
assert.ok(github.plan.permissions.some(p=>/Contents/.test(p.identifier)));
const old=await(await fetch(origin+'/api/plans/'+gmailDraft.plan.id)).json() as {plan:LaunchPlan};
assert.deepEqual(old.plan,gmailDraft.plan);
const evidence={checkedAt:new Date().toISOString(),release,scope:'API creation, anonymous API readback and page-shell availability. Desktop interaction, actual editing controls and observed downloads remain pending.',checks:{gmailPermissionsChange:true,gmailLaunchGuidanceChange:true,slackIdentityAndDistributionChange:true,githubSelectedRepositories:true,oldSnapshotPreserved:true},records};
writeFileSync(directory+'/results.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({checks:evidence.checks,records:records.map(r=>({name:r.name,share:r.share,permissions:r.plan.permissions.map(p=>p.identifier)}))}));
