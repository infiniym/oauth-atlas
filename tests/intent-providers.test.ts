import test from 'node:test';
import assert from 'node:assert/strict';
import {interpret} from '../lib/advisor/intent-parser.ts';
import {isIntentAiConfigured,resolveIntentAiConfig} from '../lib/advisor/ai-config.ts';
import type {IntentAiBindings} from '../lib/advisor/ai-config.ts';

const validIntent={provider:'gmail',capabilities:['read'],background:'unknown',audience:'unknown',repoAccess:'unknown',slackIdentity:'unknown',unresolved:['Who will use it?']};
const anthropic={provider:'anthropic' as const,key:'fixture-secret',model:'configured-claude-model'};
const message=(overrides:Record<string,unknown>={})=>({type:'message',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(validIntent)}],...overrides});

test('Anthropic-only setup selects its own key/model without an OpenAI key',()=>{
 const config=resolveIntentAiConfig({ANTHROPIC_API_KEY:' fixture-secret ',ANTHROPIC_MODEL:' configured-model '});
 assert.equal(config.provider,'anthropic');assert.equal(config.key,'fixture-secret');assert.equal(config.model,'configured-model');assert.ok(isIntentAiConfigured(config));
});
test('explicit Anthropic selection wins when both pairs exist',()=>{
 const config=resolveIntentAiConfig({AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'claude-key',ANTHROPIC_MODEL:'claude-model',OPENAI_API_KEY:'openai-key',OPENAI_MODEL:'openai-model'});
 assert.equal(config.provider,'anthropic');assert.equal(config.key,'claude-key');assert.equal(config.model,'claude-model');
});
test('OpenAI-only existing setup stays compatible',()=>{
 const config=resolveIntentAiConfig({OPENAI_API_KEY:'openai-key',OPENAI_MODEL:'openai-model'});assert.equal(config.provider,'openai');assert.ok(isIntentAiConfigured(config));
});
test('ambiguous provider configuration sends no request',async()=>{
 const config=resolveIntentAiConfig({ANTHROPIC_API_KEY:'claude-key',ANTHROPIC_MODEL:'claude-model',OPENAI_API_KEY:'openai-key',OPENAI_MODEL:'openai-model'});
 assert.ok(!isIntentAiConfigured(config));let calls=0;const result=await interpret('Read Gmail',config,async()=>{calls++;throw new Error('Must not call');});
 assert.equal(calls,0);assert.equal(result.mode,'Local suggestions');assert.match(result.notice,/AI_PROVIDER/);
});
for(const [label,bindings] of [
 ['explicit provider with missing model',{AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'fixture-secret',OPENAI_API_KEY:'other-key',OPENAI_MODEL:'other-model'}],
 ['explicit provider with missing key',{AI_PROVIDER:'anthropic',ANTHROPIC_MODEL:'configured-model',OPENAI_API_KEY:'other-key',OPENAI_MODEL:'other-model'}],
 ['disabled AI',{AI_PROVIDER:'none',ANTHROPIC_API_KEY:'fixture-secret',ANTHROPIC_MODEL:'configured-model'}],
 ['invalid provider',{AI_PROVIDER:'unrecognized',ANTHROPIC_API_KEY:'fixture-secret',ANTHROPIC_MODEL:'configured-model'}],
] as [string,IntentAiBindings][])test(label+' preserves keyless flow without vendor substitution',async()=>{
 let calls=0;const config=resolveIntentAiConfig(bindings);assert.ok(!isIntentAiConfigured(config));const result=await interpret('Read Gmail',config,async()=>{calls++;throw new Error('Must not call');});
 assert.equal(calls,0);assert.equal(result.mode,'Local suggestions');assert.deepEqual(result.intent.capabilities,['read']);assert.ok(!JSON.stringify(result).includes('fixture-secret'));
});
test('Anthropic request uses Messages structured output and only known interpretation fields',async()=>{
 let endpoint='',init:RequestInit|undefined;
 const result=await interpret('Read Gmail',anthropic,async(url,options)=>{endpoint=String(url);init=options;return Response.json(message());});
 assert.equal(endpoint,'https://api.anthropic.com/v1/messages');assert.equal(init?.method,'POST');
 const headers=new Headers(init?.headers);assert.equal(headers.get('Authorization'),'Bearer fixture-secret');assert.equal(headers.get('anthropic-version'),'2026-10-21');assert.equal(headers.get('anthropic-beta'),null);
 const body=JSON.parse(String(init?.body));assert.equal(body.model,'configured-claude-model');assert.equal(body.max_tokens,2048);assert.equal(body.messages[0].content,'Read Gmail');assert.equal(body.messages[0].role,'user');assert.match(body.system,/Never generate scopes/);
 assert.equal(body.output_config.format.type,'json_schema');assert.equal(body.output_config.format.schema.additionalProperties,false);assert.ok(!('tools' in body));assert.ok(!('temperature' in body));assert.ok(!('store' in body));
 assert.equal(result.mode,'AI suggestions');assert.equal(result.aiProvider,'anthropic');assert.deepEqual(result.intent,validIntent);assert.ok(!JSON.stringify(result).includes('fixture-secret'));
});
for(const reason of ['refusal','max_tokens','tool_use','pause_turn'])test('Anthropic '+reason+' falls back even if returned text looks valid',async()=>{
 const result=await interpret('Read Gmail',anthropic,async()=>Response.json(message({stop_reason:reason})));
 assert.equal(result.mode,'Local suggestions');assert.deepEqual(result.intent.capabilities,['read']);assert.equal(result.aiProvider,undefined);
});
test('Anthropic invalid or cross-provider capabilities cannot change provider rules',async()=>{
 const result=await interpret('Read Gmail',anthropic,async()=>Response.json(message({content:[{type:'text',text:JSON.stringify({...validIntent,capabilities:['contents']})}]})));
 assert.equal(result.mode,'Local suggestions');assert.deepEqual(result.intent.capabilities,['read']);
});
test('Anthropic missing text and malformed JSON preserve local guidance',async()=>{
 for(const content of [[],[{type:'text',text:'```json\n{}\n```'}],[{type:'thinking',text:JSON.stringify(validIntent)}]]){
  const result=await interpret('Read Gmail',anthropic,async()=>Response.json(message({content})));assert.equal(result.mode,'Local suggestions');
 }
});
test('Anthropic service failure never retries another vendor or exposes upstream data',async()=>{
 const endpoints:string[]=[];const result=await interpret('Read Gmail',anthropic,async(url)=>{endpoints.push(String(url));return Response.json({error:'fixture-secret private upstream body'},{status:429});});
 assert.deepEqual(endpoints,['https://api.anthropic.com/v1/messages']);assert.equal(result.mode,'Local suggestions');assert.ok(!JSON.stringify(result).includes('fixture-secret'));assert.ok(!JSON.stringify(result).includes('upstream body'));
});
test('Anthropic network abort preserves a useful editable interpretation',async()=>{
 const result=await interpret('Read Gmail',anthropic,async()=>{throw new DOMException('Timed out','AbortError');});assert.equal(result.mode,'Local suggestions');assert.equal(result.intent.provider,'gmail');
});
