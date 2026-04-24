"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";

import { type ButtonHTMLAttributes, type FC, forwardRef } from "react";
import { AssistantModalPrimitive } from "@assistant-ui/react";

import { Thread } from "../shadcn/Shadcn";

export const AssistantModal: FC = () => {
    return (
        <AssistantModalPrimitive.Root>
            <AssistantModalPrimitive.Anchor className="aui-root aui-modal-anchor fixed right-4 bottom-4 size-11 z-[9999]">
                <AssistantModalPrimitive.Trigger asChild>
                    <AssistantModalButton />
                </AssistantModalPrimitive.Trigger>
            </AssistantModalPrimitive.Anchor>
            <AssistantModalPrimitive.Content
                sideOffset={0}
                className="aui-root aui-modal-content data-[state=closed]:fade-out data-[state=closed]:slide-out-to-bottom data-[state=open]:fade-in data-[state=open]:slide-in-from-top z-50 h-screen w-screen overflow-clip overscroll-contain border-none bg-popover p-0 text-popover-foreground shadow-none outline-none data-[state=closed]:animate-out data-[state=open]:animate-in [&>.aui-thread-root]:bg-inherit [&>.aui-thread-root_.aui-thread-viewport-footer]:bg-inherit"
            >
                <Thread />
            </AssistantModalPrimitive.Content>
        </AssistantModalPrimitive.Root>
    );
};

type AssistantModalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    "data-state"?: "open" | "closed";
};

const AssistantModalButton = forwardRef<
    HTMLButtonElement,
    AssistantModalButtonProps
>(({ "data-state": state, ...rest }, ref) => {
    const tooltip = state === "open" ? "Close Assistant" : "Open Assistant";
    
    return (
        <button
            type="button"
            {...rest}
            className="aui-modal-button size-11 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-90 z-[9999] bg-primary text-primary-foreground"
            ref={ref}
            onClick={(e) => {
                console.log("Assistant button clicked", state);
                rest.onClick?.(e);
            }}
        >
            <BotIcon
                className={`absolute size-6 transition-all ${
                    state === "open" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                }`}
            />
            <ChevronDownIcon
                className={`absolute size-6 transition-all ${
                    state === "open" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                }`}
            />
            <span className="sr-only">{tooltip}</span>
        </button>
    );
});

AssistantModalButton.displayName = "AssistantModalButton";
