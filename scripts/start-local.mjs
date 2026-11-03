import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
// Wrangler resolves relative environment files beside its generated config.
// Resolve the developer's root-level file explicitly; never print its values.
const vars=path.join(root,'.dev.vars');
const input=process.argv.slice(2),defaults=[...(!input.includes('--persist-to')?['--persist-to',path.join(root,'.wrangler/state')]:[]),...(!input.includes('--ip')?['--ip','127.0.0.1']:[]),...(!input.includes('--inspector-port')?['--inspector-port','0']:[])];
const child=spawn(process.execPath,['--import',path.join(root,'scripts/sites-env.mjs'),path.join(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--config',path.join(root,'dist/server/wrangler.json'),'--local',...defaults,...(existsSync(vars)&&!input.includes('--env-file')?['--env-file',vars]:[]),...input],{cwd:root,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
child.on('error',()=>{process.stderr.write('Local preview could not start. Run npm ci and npm run build first.\n');process.exitCode=1;});
