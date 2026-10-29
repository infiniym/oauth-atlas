export async function readSmallJson(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Start this action from the advisor.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('Send JSON input.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing input.');let size=0,text='';const decoder=new TextDecoder();
 while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>8000){await reader.cancel();throw new Error('Keep the description under 8 KB.');}text+=decoder.decode(chunk.value,{stream:true});}return JSON.parse(text+decoder.decode());
}
export const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
