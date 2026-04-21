export const MODELS = [
  // Free OpenRouter Models
  {
    name: "Minimax M2.5 (Free)",
    value: "minimax/minimax-m2.5:free",
    icon: "/icons/minimax-color.svg",
    disabled: false,
    contextWindow: 128_000,
  },
  {
    name: "Liquid LFM (Free)",
    value: "liquid/lfm-2.5-1.2b-thinking:free",
    icon: "/icons/liquid.svg",
    disabled: false,
    contextWindow: 32_000,
  },
  {
    name: "Arcee Trinity (Free)",
    value: "arcee-ai/trinity-large-preview:free",
    icon: "/icons/arcee-color.svg",
    disabled: false,
    contextWindow: 32_000,
  },
  {
    name: "Claude 3.5 Haiku",
    value: "anthropic/claude-3.5-haiku",
    icon: "/icons/anthropic.svg",
    disabled: false,
    contextWindow: 200_000,
  },
] as const;

export type Model = (typeof MODELS)[number];
export type KnownModelId = Model["value"];

const DEFAULT_MODEL = MODELS[0];
export const DEFAULT_MODEL_ID: KnownModelId = DEFAULT_MODEL.value;
export const DEFAULT_CONTEXT_WINDOW = DEFAULT_MODEL.contextWindow;

export function getContextWindow(modelId: string): number {
  const model = MODELS.find((m) => m.value === modelId);
  return model?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
}

const ACTIVE_MODELS = MODELS.filter((m) => !m.disabled);
const AVAILABLE_MODEL_IDS = new Set<KnownModelId>(
  ACTIVE_MODELS.map((m) => m.value),
);

export function isAvailableModelId(id: string): id is KnownModelId {
  return AVAILABLE_MODEL_IDS.has(id as KnownModelId);
}

export function resolveModelId(input: string | undefined): KnownModelId {
  const raw = typeof input === "string" ? input.trim() : "";
  return raw && isAvailableModelId(raw) ? raw : DEFAULT_MODEL_ID;
}
