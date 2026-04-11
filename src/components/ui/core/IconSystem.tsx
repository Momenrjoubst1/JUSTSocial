/**
 * SkillSwap Icon Utilities
 * 
 * Centralizes Lucide-React icon configuration with a thin stroke (1.5)
 * and provides lazy-loading wrappers for icons used in dropdowns/settings.
 */
import React, { Suspense, lazy, ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

// ─── Default icon props (thin, premium stroke) ────────────────
export const DEFAULT_ICON_PROPS: Partial<LucideProps> = {
    strokeWidth: 1.5,
    size: 20,
};

/**
 * Wraps a Lucide icon component with project-wide default props (strokeWidth: 1.5).
 * Use this when rendering icons across the app for a consistent, premium look.
 * 
 * @example
 * import { Shield } from 'lucide-react';
 * <Icon icon={Shield} size={24} />
 */
export function Icon({
    icon: IconComponent,
    ...props
}: { icon: ComponentType<LucideProps> } & LucideProps) {
    return <IconComponent {...DEFAULT_ICON_PROPS} {...props} />;
}

// ─── Lazy-loaded icon sets for Settings / Dropdowns ───────────
// These are only imported when the component mounts, reducing initial bundle size.

const LazyGlobe = lazy(() => import('lucide-react').then(m => ({ default: m.Globe })));
const LazyCheck = lazy(() => import('lucide-react').then(m => ({ default: m.Check })));
const LazyShieldCheck = lazy(() => import('lucide-react').then(m => ({ default: m.ShieldCheck })));
const LazyLock = lazy(() => import('lucide-react').then(m => ({ default: m.Lock })));
const LazyUploadCloud = lazy(() => import('lucide-react').then(m => ({ default: m.UploadCloud })));
const LazyAlertTriangle = lazy(() => import('lucide-react').then(m => ({ default: m.AlertTriangle })));
const LazySettings = lazy(() => import('lucide-react').then(m => ({ default: m.Settings })));
const LazyBell = lazy(() => import('lucide-react').then(m => ({ default: m.Bell })));
const LazyBellOff = lazy(() => import('lucide-react').then(m => ({ default: m.BellOff })));
const LazyTrash2 = lazy(() => import('lucide-react').then(m => ({ default: m.Trash2 })));
const LazyLogOut = lazy(() => import('lucide-react').then(m => ({ default: m.LogOut })));
const LazyUser = lazy(() => import('lucide-react').then(m => ({ default: m.User })));
const LazyHourglass = lazy(() => import('lucide-react').then(m => ({ default: m.Hourglass })));
const LazyNetwork = lazy(() => import('lucide-react').then(m => ({ default: m.Network })));
const LazySun = lazy(() => import('lucide-react').then(m => ({ default: m.Sun })));
const LazyMoon = lazy(() => import('lucide-react').then(m => ({ default: m.Moon })));

/**
 * LazyIcon: Wraps a lazy-loaded Lucide icon with Suspense.
 * @example <LazyIcon name="globe" size={18} />
 */
const iconMap: Record<string, React.LazyExoticComponent<ComponentType<LucideProps>>> = {
    globe: LazyGlobe,
    check: LazyCheck,
    shieldCheck: LazyShieldCheck,
    lock: LazyLock,
    uploadCloud: LazyUploadCloud,
    alertTriangle: LazyAlertTriangle,
    settings: LazySettings,
    bell: LazyBell,
    bellOff: LazyBellOff,
    trash2: LazyTrash2,
    logOut: LazyLogOut,
    user: LazyUser,
    hourglass: LazyHourglass,
    network: LazyNetwork,
    sun: LazySun,
    moon: LazyMoon,
};

export function LazyIcon({
    name,
    fallback,
    ...props
}: { name: keyof typeof iconMap; fallback?: React.ReactNode } & LucideProps) {
    const LazyComponent = iconMap[name];
    if (!LazyComponent) return null;
    return (
        <Suspense fallback={fallback || <span style={{ width: props.size || 20, height: props.size || 20, display: 'inline-block' }} />}>
            <LazyComponent {...DEFAULT_ICON_PROPS} {...props} />
        </Suspense>
    );
}
