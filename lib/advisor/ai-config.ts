export type IntentAiProvider = 'anthropic' | 'openai';
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
  const pairs: Record<IntentAiProvider, IntentAiConfig> = {
    anthropic: {provider: 'anthropic', key: bindings.ANTHROPIC_API_KEY?.trim(), model: bindings.ANTHROPIC_MODEL?.trim()},
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
