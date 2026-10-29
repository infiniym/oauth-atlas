import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node's native TypeScript test runner requires the explicit extension.
import { researchProvider, validateInput, validatePublicUrl } from '../lib/research.ts';

test('normalizes name, website, and website-only input', () => {
  assert.deepEqual(validateInput({app:' Linear ',website:'linear.app'}),{app:'Linear',website:'https://linear.app/'});
  assert.deepEqual(validateInput({app:'https://linear.app/docs'}),{app:'Linear',website:'https://linear.app/docs'});
  assert.throws(()=>validateInput({app:'<script>no</script>'}));
  assert.throws(()=>validateInput({app:'A',useCase:'x'.repeat(601)}));
});

test('rejects unsafe URL protocols, addresses, credentials, ports and common secret parameters', () => {
  for (const url of ['http://example.com','https://127.0.0.1','https://2130706433','https://[::1]','https://localhost','https://foo.local','https://a.internal','https://user:password@example.com','https://example.com:8443','https://example.com?client_secret=abc','file:///etc/passwd']) {
    assert.throws(()=>validatePublicUrl(url),url);
  }
});

function network(pages:Record<string,string|Response>, address='104.18.40.45') {
  const original=globalThis.fetch;
  const calls:string[]=[];
  globalThis.fetch=async (value:RequestInfo|URL) => {
    const url=typeof value==='string'?value:value instanceof URL?value.href:value.url;
    calls.push(url);
    if(url.startsWith('https://cloudflare-dns.com/')) {
      const q=new URL(url);
      return Response.json({Status:0,Answer:q.searchParams.get('type')==='A'?[{type:1,data:address}]:[]});
    }
    const valueAt=pages[url];
    return valueAt instanceof Response?valueAt:new Response(valueAt||'Not found',{status:valueAt?200:404,headers:{'content-type':'text/html'}});
  };
  return {calls,restore:()=>{globalThis.fetch=original;}};
}

test('does not turn absent OAuth/review evidence into support, zero wait, or low effort',async()=>{
  const mock=network({'https://product.example.com/':'<html><title>Product</title><main><p>Welcome to Product, a friendly task planner for distributed teams. Manage your work and collaborate with colleagues every day.</p></main></html>'});
  try{
    const guide=await researchProvider({app:'Product',website:'https://product.example.com/'},()=>{});
    assert.equal(guide.difficulty,'unknown');
    assert.equal(guide.effort,'Not estimated');
    assert.equal(guide.wait,'Not verified');
    assert.equal(guide.status,'draft');
    assert.match(guide.headline,/support needs confirmation/);
    assert.ok(guide.steps.some(s=>s.title==='Confirm provider OAuth support first'));
    assert.ok(guide.sources.length===1);
    assert.match(guide.id,/^draft-/);
  }finally{mock.restore();}
});

test('follows provider index, returns grounded source links, limits excerpts to 25 words',async()=>{
  const mock=network({
    'https://product.example.com/':'<title>Product</title><p>Welcome to Product. Build useful things with our API and SDK for teams and projects. Browse documentation for integration details.</p>',
    'https://product.example.com/llms.txt':'# Product\n\nA documentation index for developers building external integrations.\n[OAuth registration](https://product.example.com/docs/oauth)\n[App review](https://product.example.com/docs/review)',
    'https://product.example.com/docs/oauth':'<title>OAuth registration</title><main><p>Create an OAuth application in settings. Your client ID and client secret identify the app. Configure the redirect URL and request the smallest scopes.</p></main>',
    'https://product.example.com/docs/review':'<title>App review</title><p>Submit the app for review before distributing it to external customers. The review process checks your privacy policy and requested permissions in detail.</p>'
  });
  try{
    const events:{title:string;detail:string;status:string}[]=[];
    const guide=await researchProvider({app:'Product',website:'https://product.example.com/'},e=>events.push(e));
    assert.equal(guide.sources.length,4);
    assert.match(guide.headline,/OAuth-related documentation found/);
    assert.ok(guide.steps.some(s=>s.title==='Register the provider OAuth app'));
    assert.ok(guide.steps.some(s=>s.title==='Resolve the review and distribution requirements'));
    assert.equal(guide.wait,'Not verified');
    for(const f of guide.findings||[])assert.ok(f.text.replace(/[“”]/g,'').split(/\s+/).length<=25);
    assert.ok(events.some(e=>e.title==='Source read'));
    assert.equal(events.at(-1)?.title,'Draft ready');
  }finally{mock.restore();}
});

test('blocks private DNS answers before contacting the submitted host',async()=>{
  const mock=network({},'10.1.2.3');
  try{
    await assert.rejects(()=>researchProvider({app:'Private',website:'https://private.example.com/'},()=>{}),/private or reserved/);
    assert.ok(mock.calls.every(u=>u.startsWith('https://cloudflare-dns.com/')));
  }finally{mock.restore();}
});

test('revalidates redirects and never follows a redirect to a private literal address',async()=>{
  const mock=network({'https://product.example.com/':new Response('',{status:302,headers:{location:'https://127.0.0.1/secrets'}})});
  try{
    await assert.rejects(()=>researchProvider({app:'Product',website:'https://product.example.com/'},()=>{}),/private|reserved|IP-address/);
    assert.ok(!mock.calls.some(u=>u.includes('127.0.0.1')));
  }finally{mock.restore();}
});

test('name-only search failure asks for a website instead of guessing an official domain',async()=>{
  const mock=network({
    'https://html.duckduckgo.com/html/?q=Unfindable%20OAuth%20official%20developer%20documentation':'<title>Challenge</title>',
    'https://search.brave.com/search?q=Unfindable%20OAuth%20official%20developer%20documentation&source=web':'<title>No results</title>'
  });
  try{
    await assert.rejects(()=>researchProvider({app:'Unfindable'},()=>{}),/official website/);
    assert.ok(!mock.calls.some(u=>u.includes('unfindable.')));
  }finally{mock.restore();}
});

test('keeps customer workspace approval separate from provider application review',async()=>{
  const mock=network({'https://product.example.com/':'<title>Third-party application approvals</title><p>Organization admins can approve third-party applications before members install them. Your workspace administrator controls this policy in the settings.</p>'});
  try{
    const guide=await researchProvider({app:'Product',website:'https://product.example.com/'},()=>{});
    assert.ok(guide.steps.some(s=>s.title==='Check customer-admin installation policies'));
    assert.ok(!guide.steps.some(s=>s.title==='Resolve the review and distribution requirements'));
    assert.ok(guide.steps.some(s=>s.title==='Confirm the production approval path'));
    assert.equal(guide.wait,'Not verified');
  }finally{mock.restore();}
});


test('a provider denying OAuth support does not produce a registration plan',async()=>{
 const mock=network({'https://product.example.com/':'<title>API authentication</title><p>We do not support OAuth applications. An OAuth client ID, client secret and redirect URI cannot be registered. Use personal API tokens for the supported integration model.</p>'});
 try { const guide=await researchProvider({app:'Product',website:'https://product.example.com/'},()=>{}); assert.ok(!guide.steps.some(s=>s.title==='Register the provider OAuth app'));assert.match(guide.headline,/needs confirmation/);assert.equal(guide.difficulty,'unknown'); } finally {mock.restore();}
});
