declare const __SOURCE_COMMIT__:string;
declare const __BUILD_TIME__:string;
declare const __GUIDE_CODE_SHA256__:string;
export function GET(){const config=resolveIntentAiConfig(env as IntentAiBindings);return Response.json({product:'OAuth Launch Advisor',sourceCommit:__SOURCE_COMMIT__,guideCodeFingerprint:__GUIDE_CODE_SHA256__,builtAt:__BUILD_TIME__,repository:'https://github.com/infiniym/oauth-atlas',promptVersion:PROMPT_VERSION,runtime:{provider:config.provider||null,model:config.model||null,configured:isIntentAiConfigured(config)}},{headers:{'Cache-Control':'no-store'}});}
import {PROMPT_VERSION} from '../../../lib/live-guide/interpretation.ts';
import {env} from 'cloudflare:workers';
import {resolveIntentAiConfig,isIntentAiConfigured,type IntentAiBindings} from '../../../lib/ai/config.ts';
