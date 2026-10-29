import {writeFile} from 'node:fs/promises';
// Public docs snapshot: names/links only. It deliberately does not infer auth availability.
const source='https://docs.composio.dev/toolkits';
const response=await fetch(source,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error('The official catalog could not be read; keeping the existing snapshot.');
const html=await response.text(),providers=new Map();
for(const match of html.matchAll(/<a[^>]+href="\/toolkits\/([^/"?#]+)"[^>]*>(.*?)<\/a>/gs)){
 const name=match[2].match(/<span class="truncate text-sm font-medium[^>]*>([^<]+)/)?.[1];
 if(name)providers.set(match[1],{id:match[1],name:name.replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"'),docsUrl:source+'/'+match[1]});
}
if(providers.size<100)throw new Error('Catalog structure changed or response is incomplete; keeping the existing snapshot.');
await writeFile(new URL('../data/catalog.json',import.meta.url),JSON.stringify({source,syncedAt:new Date().toISOString().slice(0,10),providers:[...providers.values()]})+'\n');
console.log(`Saved ${providers.size} toolkit names. Auth methods remain unverified for catalog-only entries.`);
