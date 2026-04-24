import React from "react";
import { cn } from "@/lib/utils";

interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-14 cursor-pointer items-center justify-center rounded-xl px-14 py-3 font-semibold text-xl transition-all duration-300 bg-[#FFFFFF] text-[#0A0A0A] hover:bg-[#E2E2E2] hover:scale-105 active:scale-95 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
