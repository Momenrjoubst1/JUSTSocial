import { useMemo } from "react";
import * as RealAssistantUI from "C:/Users/User/OneDrive/Desktop/skill-swap-website-inte/node_modules/@assistant-ui/react/dist/index.js";

// Re-export everything
export * from "C:/Users/User/OneDrive/Desktop/skill-swap-website-inte/node_modules/@assistant-ui/react/dist/index.js";

// Shim missing/refactored exports for Shadcn.tsx
export const unstable_useMentionAdapter = (options: any) => {
  return useMemo(() => ({
    directive: {
      formatter: options?.formatter,
    },
  }), [options?.formatter]);
};

// Slash command adapter is already exported, but we ensure it matches what Shadcn.tsx expects
// Actually, Shadcn.tsx expects it to return something that has an 'action' property for ComposerTriggerPopover
// but the real one returns { categories, search, ... }.
// We might need to wrap it if Shadcn.tsx expects 'action'.
// Looking at Shadcn.tsx: const slash = unstable_useSlashCommandAdapter({ ... });
// and <ComposerTriggerPopover {...slash} />
// ComposerTriggerPopover expects 'action'.

const RealSlashAdapter = RealAssistantUI.unstable_useSlashCommandAdapter;
export const unstable_useSlashCommandAdapter = (options: any) => {
  const adapter = RealSlashAdapter(options);
  return useMemo(() => ({
    adapter,
    action: {
      onExecute: (item: any) => item.execute?.(item),
    }
  }), [adapter]);
};

export type Unstable_SlashCommand = {
  id: string;
  description?: string;
  icon?: string;
  execute: (item: any) => void;
};
