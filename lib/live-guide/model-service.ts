import {boundedText} from './retrieval.ts';
import {ModelServiceFailure} from './failures.ts';

// Scope an account failure to this job. An explicit retry creates a fresh
// wrapper, so restored credits/credentials do not require a server restart.
export function modelServiceFetcher(fetcher:typeof fetch):typeof fetch{
 let unavailable:ModelServiceFailure|undefined,requests=0;
 return async(input,init)=>{
  const address=input instanceof Request?input.url:String(input),url=new URL(address);
  if(url.origin!=='https://api.anthropic.com'||url.pathname!=='/v1/messages')return fetcher(input,init);
  if(unavailable)throw unavailable;
  requests++;const response=await fetcher(input,init);
  if(![400,401,403].includes(response.status))return response;
  let credits=false;
  if(response.status===400)try{
   const body=JSON.parse(await boundedText(response.clone(),AbortSignal.any([init?.signal||new AbortController().signal,AbortSignal.timeout(2000)]),8192));
   credits=/credit balance.{0,50}(?:too low|insufficient)|insufficient credits/i.test(String(body.error?.message||''));
  }catch{ /* Unrecognised errors retain the normal HTTP/schema diagnostics. */ }
  if(!credits&&response.status===400)return response;
  void response.body?.cancel().catch(()=>{});
  unavailable=new ModelServiceFailure({category:'model-service',serviceCode:credits?'credits':'credentials',upstreamStatus:response.status,modelRequests:requests,message:credits?'Guide generation is unavailable because the configured Anthropic account has insufficient API credits. Your request, answers and sources are saved. The service owner must restore credits before retrying.':'Guide generation is unavailable because its server credentials were rejected. Your request, answers and sources are saved. The service owner must restore API access before retrying.'});
  throw unavailable;
 };
}
