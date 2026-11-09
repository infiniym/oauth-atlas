import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
import {monitorJob} from '../lib/live-guide/job-client.ts';
import type {GuideJob} from '../lib/live-guide/jobs.ts';

const origin=process.env.SUBMISSION_ORIGIN||'http://127.0.0.1:5187';
const label=process.argv[2]||'unavailable-source';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Supply a lowercase evidence label.');
const file='docs/evidence/submission-2026-11-09/'+label+'.json';
if(existsSync(file))throw new Error('Preserve the existing attempt and supply a new label.');
const input={app:'Unavailable OAuth source',website:'https://example.com/this-page-does-not-exist-oauth-launch-advisor-2026-11-09',useCase:'Read the connected person’s item names. Never change data.',audience:'customers',answers:{}};
const release=await(await fetch(origin+'/api/release')).json();
const started=Date.now();
const response=await fetch(origin+'/api/live-guide/jobs',{method:'POST',headers:{origin,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({input})});
assert.equal(response.status,200);
const created=await response.json() as {job:GuideJob};
const job=await monitorJob(created.job,{signal:AbortSignal.timeout(215000),fetcher:(path,init)=>fetch(origin+path,{...init,headers:{...init?.headers,origin}})});
const reopened=await(await fetch(origin+'/api/live-guide/jobs/'+job.id)).json() as {job:GuideJob};
const checks={
 interrupted:job.state==='interrupted',
 inputRetained:JSON.stringify(reopened.job.input)===JSON.stringify(job.input)&&job.input.website===input.website&&job.input.useCase===input.useCase,
 clearError:!!job.failure?.message&&/source|documentation|read|unavailable/i.test(job.failure.message),
 noFabricatedOAuth:!job.guide||job.guide.oauthSupport==='unknown',
};
writeFileSync(file,JSON.stringify({checkedAt:new Date().toISOString(),release,input,job,reopened:reopened.job,elapsedMs:Date.now()-started,checks,pass:Object.values(checks).every(Boolean)},null,2)+'\n');
assert.ok(Object.values(checks).every(Boolean));
console.log(JSON.stringify({checks,elapsedMs:Date.now()-started,message:job.failure?.message}));
