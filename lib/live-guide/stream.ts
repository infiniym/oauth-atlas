import type { LiveGuide, Progress } from './contracts.ts';
export async function readGuideStream(response: Response, progress: (event:Progress)=>void, signal:AbortSignal): Promise<LiveGuide> {
  if (!response.ok) {const data=await response.json() as {error?:string};throw new Error(data.error || 'Research could not start.');}
  if (!response.body) throw new Error('This browser could not open the research stream.');
  const reader=response.body.getReader(), decoder=new TextDecoder();let buffer='',guide:LiveGuide|undefined;
  const line=(raw:string)=>{if(!raw.trim())return;const item=JSON.parse(raw);if(item.type==='error')throw new Error(item.error);if(item.type==='progress')progress(item.event);if(item.type==='complete')guide=item.guide;};
  try {
    while(true){signal.throwIfAborted();const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const item of lines)line(item);if(done)break;}
    line(buffer);signal.throwIfAborted();
    if(!guide)throw new Error('Research ended before a guide was saved. Try again; no completed guide was reported.');
    return guide;
  } catch(error){await reader.cancel().catch(()=>{});throw error;}
  finally{reader.releaseLock();}
}
