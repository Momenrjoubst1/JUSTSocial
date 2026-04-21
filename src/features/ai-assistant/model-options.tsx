import { MODELS } from "./constants";
import { OpenAIIcon } from "./icons/OpenAIIcon";
import { AnthropicIcon } from "./icons/AnthropicIcon";
import { GoogleGeminiIcon } from "./icons/GoogleGeminiIcon";
import { XAIIcon } from "./icons/XAIIcon";
import { MetaIcon } from "./icons/MetaIcon";
import { AlibabaQwenIcon } from "./icons/AlibabaQwenIcon";
import { MinimaxIcon } from "./icons/MinimaxIcon";
import { LiquidIcon } from "./icons/LiquidIcon";
import { ArceeIcon } from "./icons/ArceeIcon";
import { ModelIcon } from "./icons/ModelIcon";
import type { ReactNode } from "react";

const iconClass = "size-3.5 object-contain";

const wrapIcon = (icon: ReactNode) => <ModelIcon>{icon}</ModelIcon>;

const getModelIcon = (modelValue: string): ReactNode => {
  const value = modelValue.toLowerCase();

  if (value.startsWith("openai/")) {
    return wrapIcon(<OpenAIIcon className={iconClass} />);
  }

  if (value.startsWith("anthropic/")) {
    return wrapIcon(<AnthropicIcon className={iconClass} />);
  }

  if (value.startsWith("google/") || value.includes("gemini")) {
    return wrapIcon(<GoogleGeminiIcon className={iconClass} />);
  }

  if (
    value.startsWith("xai/") ||
    value.startsWith("x-ai/") ||
    value.includes("grok")
  ) {
    return wrapIcon(<XAIIcon className={iconClass} />);
  }

  if (
    value.startsWith("meta/") ||
    value.startsWith("meta-llama/") ||
    value.includes("llama")
  ) {
    return wrapIcon(<MetaIcon className={iconClass} />);
  }

  if (
    value.startsWith("alibaba/") ||
    value.startsWith("qwen/") ||
    value.includes("qwen")
  ) {
    return wrapIcon(<AlibabaQwenIcon className={iconClass} />);
  }

  if (value.startsWith("minimax/")) {
    return wrapIcon(<MinimaxIcon className={iconClass} />);
  }

  if (value.startsWith("liquid/")) {
    return wrapIcon(<LiquidIcon className={iconClass} />);
  }

  if (value.startsWith("arcee-ai/")) {
    return wrapIcon(<ArceeIcon className={iconClass} />);
  }

  return wrapIcon(
    <span className="inline-flex size-3.5 items-center justify-center text-[9px] font-bold leading-none">
      AI
    </span>
  );
};

export function docsModelOptions() {
  return MODELS.map((model) => ({
    id: model.value,
    name: model.name,
    icon: getModelIcon(model.value),
    ...(model.disabled ? { disabled: true as const } : undefined),
  }));
}
``