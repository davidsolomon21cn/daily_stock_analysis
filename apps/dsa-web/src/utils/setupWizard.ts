import type { SystemConfigItem } from '../types/systemConfig';

export const MAX_SETUP_STOCKS = 3;

const MANAGED_SETUP_PROVIDERS = new Set(['openai', 'deepseek', 'gemini', 'anthropic', 'vertex_ai', 'ollama']);
const SUPPORTED_LLM_CHANNEL_PROTOCOLS = new Set(['openai', 'deepseek', 'gemini', 'anthropic', 'vertex_ai', 'ollama']);

export function splitCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeProtocol(value: string) {
  const normalized = value.trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'vertex' || normalized === 'vertexai') return 'vertex_ai';
  if (normalized === 'claude') return 'anthropic';
  if (normalized === 'google') return 'gemini';
  return normalized || 'openai';
}

function normalizeModelForRuntime(model: string, protocol: string) {
  const trimmed = model.trim();
  if (!trimmed) return '';
  if (trimmed.includes('/')) return trimmed;
  return `${normalizeProtocol(protocol)}/${trimmed}`;
}

function getLocalHostname(baseUrl: string) {
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function resolveChannelProtocol(
  protocol: string,
  baseUrl: string,
  models: string[],
  channelName: string,
) {
  const explicit = protocol.trim() ? normalizeProtocol(protocol) : '';
  if (SUPPORTED_LLM_CHANNEL_PROTOCOLS.has(explicit)) return explicit;

  for (const model of models) {
    if (!model.includes('/')) continue;
    const prefix = normalizeProtocol(model.split('/', 1)[0] || '');
    if (SUPPORTED_LLM_CHANNEL_PROTOCOLS.has(prefix)) return prefix;
  }

  const nameProtocol = normalizeProtocol(channelName);
  if (SUPPORTED_LLM_CHANNEL_PROTOCOLS.has(nameProtocol)) return nameProtocol;

  if (baseUrl.trim()) return 'openai';
  return '';
}

function channelAllowsEmptyApiKey(protocol: string, baseUrl: string) {
  if (protocol === 'ollama') return true;
  return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(getLocalHostname(baseUrl));
}

function hasUsableApiKey(value: string) {
  return splitCsv(value).length > 0;
}

function getUsableChannelDefinition(itemMap: Map<string, string>, channelName: string) {
  const prefix = `LLM_${channelName.toUpperCase()}`;
  if ((itemMap.get(`${prefix}_ENABLED`) || 'true').trim().toLowerCase() === 'false') return null;

  const protocol = itemMap.get(`${prefix}_PROTOCOL`) || '';
  const baseUrl = itemMap.get(`${prefix}_BASE_URL`) || '';
  const rawModels = splitCsv(itemMap.get(`${prefix}_MODELS`) || '');
  if (rawModels.length === 0) return null;

  if (baseUrl.trim()) {
    try {
      new URL(baseUrl.trim());
    } catch {
      return null;
    }
  }

  const resolvedProtocol = resolveChannelProtocol(protocol, baseUrl, rawModels, channelName);
  if (!resolvedProtocol && rawModels.some((model) => !model.includes('/'))) return null;

  const apiKey = itemMap.get(`${prefix}_API_KEYS`) || itemMap.get(`${prefix}_API_KEY`) || '';
  if (!hasUsableApiKey(apiKey) && !channelAllowsEmptyApiKey(resolvedProtocol, baseUrl)) return null;

  const normalizedModels = rawModels
    .map((model) => normalizeModelForRuntime(model, resolvedProtocol))
    .filter(Boolean);
  if (normalizedModels.length === 0) return null;

  return {
    name: channelName,
    protocol: resolvedProtocol || normalizeProtocol(protocol),
    baseUrl,
    apiKey,
    models: normalizedModels,
  };
}

function getModelProvider(model: string) {
  const trimmed = model.trim();
  if (!trimmed.includes('/')) return '';
  return normalizeProtocol(trimmed.split('/', 1)[0] || '');
}

function getProviderApiKey(itemMap: Map<string, string>, provider: string) {
  const envPrefix = provider.trim().toUpperCase().replace(/-/g, '_');
  if (!envPrefix) return '';
  return itemMap.get(`${envPrefix}_API_KEYS`) || itemMap.get(`${envPrefix}_API_KEY`) || '';
}

function resolvePrimaryModel(items: Map<string, string>) {
  const explicit = (items.get('LITELLM_MODEL') || '').trim();
  if (explicit) return explicit;

  for (const channelName of splitCsv(items.get('LLM_CHANNELS') || '')) {
    const channel = getUsableChannelDefinition(items, channelName);
    if (channel?.models[0]) {
      return channel.models[0];
    }
  }

  if ((items.get('GEMINI_API_KEYS') || items.get('GEMINI_API_KEY') || '').trim()) {
    return `gemini/${(items.get('GEMINI_MODEL') || 'gemini-3-flash-preview').trim()}`;
  }
  if ((items.get('ANTHROPIC_API_KEYS') || items.get('ANTHROPIC_API_KEY') || '').trim()) {
    return `anthropic/${(items.get('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20241022').trim()}`;
  }
  if ((items.get('DEEPSEEK_API_KEYS') || items.get('DEEPSEEK_API_KEY') || '').trim()) {
    return 'deepseek/deepseek-chat';
  }
  if ((items.get('OPENAI_API_KEYS') || items.get('OPENAI_API_KEY') || items.get('AIHUBMIX_KEY') || '').trim()) {
    const model = (items.get('OPENAI_MODEL') || 'gpt-4o-mini').trim();
    return model.includes('/') ? model : `openai/${model}`;
  }

  return '';
}

function findMatchingChannelForModel(itemMap: Map<string, string>, primaryModel: string) {
  const normalizedPrimaryModel = primaryModel.trim().toLowerCase();
  if (!normalizedPrimaryModel) return null;

  for (const name of splitCsv(itemMap.get('LLM_CHANNELS') || '')) {
    const channel = getUsableChannelDefinition(itemMap, name);
    if (!channel) continue;
    const matchedModel = channel.models.find((model) => model.toLowerCase() === normalizedPrimaryModel);
    if (!matchedModel) continue;
    return {
      name: channel.name,
      protocol: channel.protocol,
      baseUrl: channel.baseUrl,
      apiKey: channel.apiKey,
      models: [matchedModel],
    };
  }

  return null;
}

export function looksLikeStockCode(value: string) {
  const text = value.trim();
  return /^[A-Za-z]{1,5}$/.test(text) || /^[A-Za-z]{0,2}\d{3,6}(?:\.[A-Za-z]{2})?$/.test(text) || /^\d{5}\.HK$/i.test(text);
}

export function buildSetupLLMPayload(items: SystemConfigItem[], maskToken: string) {
  const itemMap = new Map(items.map((item) => [item.key, String(item.value ?? '')]));
  const primaryModel = resolvePrimaryModel(itemMap);
  const normalizedPrimaryModel = primaryModel.toLowerCase();
  const matchingChannel = findMatchingChannelForModel(itemMap, primaryModel);
  if (matchingChannel) {
    return {
      ...matchingChannel,
      enabled: true,
      maskToken,
    };
  }

  const directProvider = getModelProvider(primaryModel);
  if (directProvider && !MANAGED_SETUP_PROVIDERS.has(directProvider)) {
    const apiKey = getProviderApiKey(itemMap, directProvider);
    if (apiKey.trim()) {
      return {
        name: directProvider,
        protocol: 'openai',
        baseUrl: '',
        apiKey,
        models: [primaryModel],
        enabled: true,
        maskToken,
      };
    }
  }

  if (normalizedPrimaryModel.startsWith('gemini/') && (itemMap.get('GEMINI_API_KEYS') || itemMap.get('GEMINI_API_KEY') || '').trim()) {
    return {
      name: 'gemini',
      protocol: 'gemini',
      baseUrl: '',
      apiKey: itemMap.get('GEMINI_API_KEYS') || itemMap.get('GEMINI_API_KEY') || '',
      models: [primaryModel],
      enabled: true,
      maskToken,
    };
  }
  if (normalizedPrimaryModel.startsWith('deepseek/') && (itemMap.get('DEEPSEEK_API_KEYS') || itemMap.get('DEEPSEEK_API_KEY') || '').trim()) {
    return {
      name: 'deepseek',
      protocol: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      apiKey: itemMap.get('DEEPSEEK_API_KEYS') || itemMap.get('DEEPSEEK_API_KEY') || '',
      models: [primaryModel],
      enabled: true,
      maskToken,
    };
  }
  if (normalizedPrimaryModel.startsWith('anthropic/') && (itemMap.get('ANTHROPIC_API_KEYS') || itemMap.get('ANTHROPIC_API_KEY') || '').trim()) {
    return {
      name: 'anthropic',
      protocol: 'anthropic',
      baseUrl: '',
      apiKey: itemMap.get('ANTHROPIC_API_KEYS') || itemMap.get('ANTHROPIC_API_KEY') || '',
      models: [primaryModel],
      enabled: true,
      maskToken,
    };
  }
  if (
    normalizedPrimaryModel.startsWith('openai/')
    && (itemMap.get('OPENAI_API_KEYS') || itemMap.get('OPENAI_API_KEY') || itemMap.get('AIHUBMIX_KEY') || '').trim()
  ) {
    return {
      name: 'openai',
      protocol: 'openai',
      baseUrl: itemMap.get('OPENAI_BASE_URL') || '',
      apiKey: itemMap.get('OPENAI_API_KEYS') || itemMap.get('OPENAI_API_KEY') || itemMap.get('AIHUBMIX_KEY') || '',
      models: [primaryModel],
      enabled: true,
      maskToken,
    };
  }
  return null;
}
