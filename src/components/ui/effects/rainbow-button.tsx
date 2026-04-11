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
        "inline-flex h-14 cursor-pointer items-center justify-center rounded-xl px-14 py-3 font-semibold text-foreground text-xl transition-all duration-300 bg-background border border-gray-200 hover:bg-background hover:scale-105 active:scale-95 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:shadow-[0_0_30px_6px_rgba(59,130,246,0.7),0_0_60px_12px_rgba(37,99,235,0.5),0_0_80px_20px_rgba(99,102,241,0.3)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
