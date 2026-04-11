import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";


/**
 * Utility to merge tailwind classes safely
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden active:scale-[0.98]",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90",
                destructive:
                    "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600",
                outline:
                    "border border-border/60 bg-background hover:bg-foreground/5 hover:border-border",
                ghost: "hover:bg-foreground/5",
                glass: "bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20",
            },
            size: {
                default: "h-11 px-6 py-2",
                sm: "h-9 px-4 py-1.5 text-[11px] rounded-lg",
                lg: "h-14 px-10 py-3 text-base rounded-2xl",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

/**
 * Omit non-standard props that cause conflicts with Framer Motion's motion.button
 */
type MotionButtonProps = HTMLMotionProps<"button">;

export interface ButtonProps
    extends Omit<MotionButtonProps, "children" | "className">,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
        return (
            <motion.button
                ref={ref}
                className={cn(buttonVariants({ variant, size, className }))}
                whileTap={{ scale: 0.98 }}
                disabled={disabled || isLoading}
                {...props}
            >
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center justify-center"
                        >
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '200ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '400ms' }} />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2"
                        >
                            {leftIcon && <span className="opacity-70">{leftIcon}</span>}
                            <span>{children}</span>
                            {rightIcon && <span className="opacity-70">{rightIcon}</span>}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Shine Animation for Premium Variants */}
                {(variant === "default" || variant === "destructive") && !disabled && !isLoading && (
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                        initial={{ left: "-100%" }}
                        animate={{ left: "200%" }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                            repeatDelay: 3
                        }}
                    />
                )}
            </motion.button>
        );
    }
);

Button.displayName = "Button";

export { Button, buttonVariants };
