declare const __SOURCE_COMMIT__:string;
declare const __BUILD_TIME__:string;
declare const __GUIDE_CODE_SHA256__:string;
export function GET(){return Response.json({product:'OAuth Launch Advisor',sourceCommit:__SOURCE_COMMIT__,guideCodeFingerprint:__GUIDE_CODE_SHA256__,builtAt:__BUILD_TIME__,repository:'https://github.com/infiniym/oauth-atlas',promptVersion:'live-guide.21'},{headers:{'Cache-Control':'no-store'}});}
