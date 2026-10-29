import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const log=JSON.parse(readFileSync(new URL('data/decisions.json',root),'utf8'));
test('requirement and objective traceability has no broken references or unexplained decisions',()=>{
 const objectives=new Set(log.objectives.map((o:{id:string})=>o.id));
 const requirements=new Set(log.requirements.map((r:{id:string})=>r.id));
 const decisions=new Set(log.decisions.map((d:{id:string})=>d.id));
 assert.equal(requirements.size,10);assert.equal(decisions.size,15);
 for(const d of log.decisions){
  assert.ok(d.objectives.length&&d.requirements.length);
  for(const id of d.objectives)assert.ok(objectives.has(id),`${d.id}: missing ${id}`);
  for(const id of d.requirements)assert.ok(requirements.has(id),`${d.id}: missing ${id}`);
  for(const key of ['reason','implementation','alternative','tradeoff','evidence','check','phase'])assert.ok(d[key]?.length>10,`${d.id}: missing rationale ${key}`);
 }
 for(const r of log.requirements)for(const id of r.decisions)assert.ok(decisions.has(id),`${r.id}: missing ${id}`);
});
test('published decision log preserves honest gaps and matches the downloadable document',()=>{
 assert.equal(log.requirements.find((r:{id:string})=>r.id==='R2').status,'Partial');
 assert.equal(log.requirements.find((r:{id:string})=>r.id==='R6').status,'Partial');
 const doc=readFileSync(new URL('docs/DECISIONS.md',root),'utf8');
 assert.equal(doc,readFileSync(new URL('public/decision-log.md',root),'utf8'));
 for(const d of log.decisions){assert.ok(doc.includes(`## ${d.id} — ${d.title}`));assert.ok(doc.includes(d.tradeoff));}
 assert.match(doc,/not.*LLM|not.*best long-term agent|does not.*interpret/i);
});
