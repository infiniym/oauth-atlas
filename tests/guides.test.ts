import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Guide } from '../lib/guide';
const guides=JSON.parse(readFileSync(new URL('../data/guides.json',import.meta.url),'utf8')) as Guide[];
test('every reviewed launch step and blocker retains resolvable evidence',()=>{
 assert.equal(guides.length,4);
 assert.equal(new Set(guides.map(g=>g.id)).size,4);
 for(const g of guides){
  const sources=new Set(g.sources.map(s=>s.id));
  for(const step of g.steps){assert.ok(step.sourceIds.length,`${g.name}: ${step.title} has no evidence`);for(const id of step.sourceIds)assert.ok(sources.has(id),`${g.name}: missing ${id}`);}
  for(const b of g.blockers)for(const id of b.sourceIds)assert.ok(sources.has(id));
  assert.ok(g.effortBasis.toLowerCase().includes('estimate'));
  assert.ok(g.attempts.length&&g.uncertainties.length&&g.humanMust.length);
  for(const s of g.sources){assert.equal(new URL(s.url).protocol,'https:');assert.match(s.retrievedAt,/^2026-10-29/);}
 }
});
test('launch risks preserve the case-specific boundary rather than promising approval',()=>{
 const byId=Object.fromEntries(guides.map(g=>[g.id,g]));
 assert.match(byId.gmail.production,/assessment/i);
 assert.match(byId.slack.production,/commercial|Marketplace/i);
 assert.match(byId.notion.production,/optional|without a Marketplace/i);
 assert.match(byId.github.production,/customer|organization/i);
 assert.ok(guides.every(g=>g.status==='reviewed'&&g.attempts.every(a=>!a.result.includes('Approval completed'))));
});
