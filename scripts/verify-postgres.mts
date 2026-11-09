import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {guideCodeFingerprint} from './guide-fingerprint.mjs';
const verificationModule=new URL('../outputs/pg-repro/node_modules/@electric-sql/pglite/dist/index.js',import.meta.url).href;
const {PGlite}=await import(verificationModule);
import {postgresStore} from '../lib/server/postgres-store.ts';
import {createJob,getJob} from '../lib/live-guide/jobs.ts';
import {freezeResearchPlan,readPlan} from '../lib/plan/storage.ts';

let pg=new PGlite('outputs/pg-repro/persistent');
let db=postgresStore(async(statement,values)=>(await pg.query(statement,values)).rows as Record<string,unknown>[]);
const schema=readFileSync('db/postgres.sql','utf8');
await pg.exec(schema);await pg.exec(schema);
const request={app:'Storage regression',website:'https://developers.notion.com',useCase:'Read page titles.',audience:'customers'};
const key=crypto.randomUUID();
const [first,duplicate]=await Promise.all([createJob(db,request,key),createJob(db,request,key)]);
assert.equal(first.id,duplicate.id);
const until=Date.now()+240000;
const claim="UPDATE guide_jobs SET state='running',lease=?,lease_until=? WHERE id=? AND (state='queued' OR (lease_until<? AND state IN ('running','interrupted'))) RETURNING id";
const claims=await Promise.all(['first','second'].map(owner=>db.prepare(claim).bind(owner,until,first.id,Date.now()).first()));
assert.equal(claims.filter(Boolean).length,1);
assert.equal((await getJob(db,first.id))!.leaseUntil,until);
const bucket=crypto.randomUUID();
const increment='INSERT INTO live_guide_limits (bucket,count) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET count=live_guide_limits.count+1 RETURNING count';
const counts=await Promise.all(Array.from({length:6},()=>db.prepare(increment).bind(bucket).first<{count:number}>()));
assert.deepEqual(counts.map(c=>c!.count).sort((a,b)=>a-b),[1,2,3,4,5,6]);
const saved=JSON.parse(readFileSync('docs/evidence/completion-2026-11-02/local-v64-sonnet/notion-r1.json','utf8'));
const guide=saved.job.guide;
const original=await freezeResearchPlan(guide,db);
await freezeResearchPlan({...guide,recommendation:'Changed content must not overwrite the snapshot.'},db);
assert.deepEqual(await readPlan(original.id,db),original);
await pg.close();
pg=new PGlite('outputs/pg-repro/persistent');
db=postgresStore(async(statement,values)=>(await pg.query(statement,values)).rows as Record<string,unknown>[]);
assert.equal((await getJob(db,first.id))!.id,first.id);
assert.deepEqual(await readPlan(original.id,db),original);
await pg.close();
const record={
 guideCodeFingerprint:guideCodeFingerprint(),
 checkedAt:new Date().toISOString(),
 sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 engine:'PGlite 0.5.15 (Postgres WASM), isolated disk store',
 boundary:'Validates SQL semantics and persistence through the production Store adapter. Neon HTTP connectivity and deployed Vercel retention are unverified. An existing guide was used only as storage test data.',
 checks:{idempotentSchema:true,concurrentDuplicateJob:true,oneLeaseOwner:true,millisecondLease:true,atomicCounter:true,immutablePlan:true,reopenJob:true,reopenPlan:true},
 reference:'https://pglite.dev/docs/api',
};
const label=process.argv[2]||'final';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Supply a lowercase evidence label.');
const file='docs/evidence/submission-2026-11-09/postgres-adapter-'+label+'.json';
if(existsSync(file))throw new Error('Preserve the existing attempt and supply a new label.');
writeFileSync(file,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record));
