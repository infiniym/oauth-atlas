export type IntentAiProvider = 'anthropic' | 'openai';
// Sonnet 5.5 names its no-up-front-thinking mode differently. This changes
// transport syntax only; it never selects a model or falls back to a vendor.
// https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide
export function noInitialThinking(model:string|undefined):{type:'disabled'|'between_tools'}{return {type:/^claude-sonnet-5-5(?:-|$)/.test(model||'')?'between_tools':'disabled'};}
export type IntentAiConfig = {
  provider?: IntentAiProvider;
  key?: string;
  model?: string;
  unavailableNotice?: string;
};
export type IntentAiBindings = {
  AI_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  /** Deprecated local-preview aliases; ignored when the shared pair is present. */
  LIVE_GUIDE_ANTHROPIC_KEY?:string;
  LIVE_GUIDE_ANTHROPIC_MODEL?:string;
};
export type ReadyIntentAiConfig = IntentAiConfig & {
  provider: IntentAiProvider;
  key: string;
  model: string;
};
export function isIntentAiConfigured(config: IntentAiConfig): config is ReadyIntentAiConfig {
  return (config.provider === 'anthropic' || config.provider === 'openai') &&
    !!config.key?.trim() && !!config.model?.trim();
}

// Selection is server-owned. Never fall through to another vendor after an error.
export function resolveIntentAiConfig(bindings: IntentAiBindings): IntentAiConfig {
  const selected = bindings.AI_PROVIDER?.trim().toLowerCase();
  if (selected === 'none') return {
    unavailableNotice: 'AI interpretation is disabled. These are keyword-based suggestions; inspect and correct them before continuing.',
  };
  if (selected && selected !== 'anthropic' && selected !== 'openai') return {
    unavailableNotice: 'AI provider configuration is invalid. Continue with editable keyword suggestions and the structured form.',
  };
  const legacy=!bindings.ANTHROPIC_API_KEY?.trim()&&!bindings.ANTHROPIC_MODEL?.trim();
  const pairs: Record<IntentAiProvider, IntentAiConfig> = {
    anthropic: {provider: 'anthropic', key: (legacy?bindings.LIVE_GUIDE_ANTHROPIC_KEY:bindings.ANTHROPIC_API_KEY)?.trim(), model: (legacy?bindings.LIVE_GUIDE_ANTHROPIC_MODEL:bindings.ANTHROPIC_MODEL)?.trim()},
    openai: {provider: 'openai', key: bindings.OPENAI_API_KEY?.trim(), model: bindings.OPENAI_MODEL?.trim()},
  };
  if (selected === 'anthropic' || selected === 'openai') {
    const config = pairs[selected];
    return isIntentAiConfigured(config) ? config : {
      unavailableNotice: `${selected === 'anthropic' ? 'Anthropic' : 'OpenAI'} is selected but its server-side key and model are not both configured. Continue with editable keyword suggestions.`,
    };
  }
  const configured = Object.values(pairs).filter(isIntentAiConfigured);
  if (configured.length === 1) return configured[0];
  if (configured.length > 1) return {
    unavailableNotice: 'Multiple AI providers are configured. Set AI_PROVIDER on the server to select one. Continue with editable keyword suggestions.',
  };
  return {unavailableNotice: 'AI is not configured. These are keyword-based suggestions; inspect and correct them before continuing.'};
}
