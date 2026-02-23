export type Provider = "openai" | "anthropic" | "google";

export interface ModelOption {
  id: string;
  name: string;
  provider: Provider;
  modelId: string;
}

export const PROVIDERS: Record<
  Provider,
  { name: string; keyPrefix: string; keyPlaceholder: string; docsUrl: string }
> = {
  openai: {
    name: "OpenAI",
    keyPrefix: "sk-",
    keyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    keyPrefix: "sk-ant-",
    keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    name: "Google",
    keyPrefix: "AI",
    keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
};

export const MODELS: ModelOption[] = [
  // OpenAI
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    modelId: "gpt-4o",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    modelId: "gpt-4o-mini",
  },
  {
    id: "openai/o3-mini",
    name: "o3-mini",
    provider: "openai",
    modelId: "o3-mini",
  },
  // Anthropic
  {
    id: "anthropic/claude-3-7-sonnet-latest",
    name: "Claude 3.7 Sonnet",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-latest",
  },
  {
    id: "anthropic/claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    modelId: "claude-3-5-haiku-latest",
  },
  // Google
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    modelId: "gemini-2.5-pro",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    modelId: "gemini-2.5-flash",
  },
];

export function getModelsByProvider(provider: Provider): ModelOption[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getDefaultTestModel(provider: Provider): string {
  const models = getModelsByProvider(provider);
  // Use the cheapest model for testing
  const preferred: Record<Provider, string> = {
    openai: "openai/gpt-4o-mini",
    anthropic: "anthropic/claude-3-5-haiku-latest",
    google: "google/gemini-2.5-flash",
  };
  return preferred[provider] || models[0]?.id || "";
}
