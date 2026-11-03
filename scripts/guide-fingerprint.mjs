import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {join,relative} from 'node:path';
// Release metadata and the generated narrative do not affect guide behavior.
// Keep the hashed inputs explicit so evidence collected before packaging can
// be matched to a later build that only adds documentation and test records.
export function guideCodeFingerprint(root=process.cwd()){
 const excluded=new Set(['app/api/release/route.ts','data/decisions.json','public/decision-log.md']);
 const files=[];const walk=path=>{if(!existsSync(path))return;if(statSync(path).isDirectory()){for(const name of readdirSync(path))walk(join(path,name));}else if(!excluded.has(relative(root,path)))files.push(path);};
 for(const directory of ['app','components','lib','data','public','worker'])walk(join(root,directory));
 for(const file of ['package.json','package-lock.json','vite.config.ts','tsconfig.json','scripts/start-local.mjs','scripts/guide-fingerprint.mjs'])walk(join(root,file));
 const hash=createHash('sha256');for(const path of files.sort((a,b)=>relative(root,a).localeCompare(relative(root,b),'en'))){hash.update(relative(root,path));hash.update('\0');hash.update(readFileSync(path));hash.update('\0');}
 return hash.digest('hex');
}
