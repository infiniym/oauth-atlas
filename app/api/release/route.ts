declare const __SOURCE_COMMIT__:string;
declare const __BUILD_TIME__:string;
export function GET(){return Response.json({product:'OAuth Launch Advisor',sourceCommit:__SOURCE_COMMIT__,builtAt:__BUILD_TIME__,repository:'https://github.com/infiniym/oauth-atlas',promptVersion:'live-guide.13'},{headers:{'Cache-Control':'no-store'}});}
