/**
 * SkillSwap Icon Utilities
 *
 * Centralizes Lucide-React icon configuration with a thin stroke (1.5)
 * and keeps icon imports tree-shakeable.
 */
import React, { ComponentType } from 'react';
import {
    AlertTriangle,
    Bell,
    BellOff,
    Check,
    Globe,
    Hourglass,
    Lock,
    LogOut,
    Moon,
    Network,
    Settings,
    ShieldCheck,
    Sun,
    Trash2,
    UploadCloud,
    User,
    type LucideProps,
} from 'lucide-react';

export const DEFAULT_ICON_PROPS: Partial<LucideProps> = {
    strokeWidth: 1.5,
    size: 20,
};

/**
 * Wraps a Lucide icon component with project-wide default props (strokeWidth: 1.5).
 * Use this when rendering icons across the app for a consistent look.
 */
export function Icon({
    icon: IconComponent,
    ...props
}: { icon: ComponentType<LucideProps> } & LucideProps) {
    return <IconComponent {...DEFAULT_ICON_PROPS} {...props} />;
}

/**
 * Keeps the existing `LazyIcon` API without forcing Vite to lazy-load the full
 * `lucide-react` module for a handful of icons.
 */
const iconMap: Record<string, ComponentType<LucideProps>> = {
    globe: Globe,
    check: Check,
    shieldCheck: ShieldCheck,
    lock: Lock,
    uploadCloud: UploadCloud,
    alertTriangle: AlertTriangle,
    settings: Settings,
    bell: Bell,
    bellOff: BellOff,
    trash2: Trash2,
    logOut: LogOut,
    user: User,
    hourglass: Hourglass,
    network: Network,
    sun: Sun,
    moon: Moon,
};

export function LazyIcon({
    name,
    fallback: _fallback,
    ...props
}: { name: keyof typeof iconMap; fallback?: React.ReactNode } & LucideProps) {
    const IconComponent = iconMap[name];
    if (!IconComponent) return null;
    return <IconComponent {...DEFAULT_ICON_PROPS} {...props} />;
}
