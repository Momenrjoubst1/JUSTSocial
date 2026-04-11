/**
 * VerifiedBadge — Verification badge system
 *
 * Design: Octagonal badge with white checkmark (matching provided reference image)
 * Source of truth: `is_verified` column in Supabase `users` table.
 *
 * The `isUserVerified()` function checks:
 *  1. The in-memory cache (populated from Supabase at app load / on auth)
 *  2. Falls back to email/ID hardcoded set for SSR/offline safety
 */

import React from 'react';
import { supabase } from '@/lib/supabaseClient';

/* ── Fallback hardcoded verified emails (backup if DB is unreachable) ── */
const FALLBACK_EMAILS = new Set(['momenrjoub77@gmail.com']);

/** In-memory verified user ID → true cache  */
const VERIFIED_CACHE = new Map<string, boolean>();

/** localStorage key for persisting the ID cache between sessions */
const LS_KEY = 'sk_verified_ids_v2';

/** Initialize cache from localStorage on module load */
function initFromStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const entries = JSON.parse(raw) as string[];
            if (Array.isArray(entries)) {
                entries.forEach(id => VERIFIED_CACHE.set(id, true));
            }
        }
    } catch { }
}

/* Run once on import */
initFromStorage();

/** Persist current cache to localStorage */
function persistCache() {
    try {
        const ids = [...VERIFIED_CACHE.entries()]
            .filter(([, v]) => v)
            .map(([id]) => id);
        localStorage.setItem(LS_KEY, JSON.stringify(ids));
    } catch { }
}

/**
 * Fetch and cache a single user's verification status from Supabase.
 * Returns true if verified.
 */
export async function fetchAndCacheVerification(userId: string): Promise<boolean> {
    if (VERIFIED_CACHE.has(userId)) return VERIFIED_CACHE.get(userId)!;

    try {
        const { data } = await supabase
            .from('users')
            .select('is_verified')
            .eq('id', userId)
            .maybeSingle();

        const verified = data?.is_verified === true;
        VERIFIED_CACHE.set(userId, verified);
        if (verified) persistCache();
        return verified;
    } catch {
        return false;
    }
}

/**
 * Synchronously check if a user is verified (from in-memory cache).
 * For async DB lookup, use `fetchAndCacheVerification`.
 */
export function isUserVerified(identifier: string | null | undefined): boolean {
    if (!identifier) return false;
    // Check in-memory cache (keyed by userId or email)
    if (VERIFIED_CACHE.get(identifier) === true) return true;
    // Fallback: check hardcoded emails
    return FALLBACK_EMAILS.has(identifier);
}

/**
 * Register a verified user from auth context.
 * Call this after login when you have both email and userId.
 */
export async function registerVerifiedUserId(
    email: string | null | undefined,
    userId: string | null | undefined,
) {
    if (!email || !userId) return;

    // Always fetch from DB — this is the source of truth
    const verified = await fetchAndCacheVerification(userId);

    // Also register email→true if it's in the fallback list (before DB propagates)
    if (FALLBACK_EMAILS.has(email) && verified) {
        VERIFIED_CACHE.set(email, true);
        persistCache();
    }
}

/* ── Badge Component ────────────────────────────────────────────────── */

interface VerifiedBadgeProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Renders the 16-point starburst verification badge (Instagram/TikTok style).
 * Blue gradient fill with white checkmark.
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 16, className = '', style = {} }) => {
    // Build a 16-point star programmatically
    // Outer radius = 48, inner radius = 38, 16 points → 32 vertices
    const cx = 50, cy = 50;
    const outerR = 48;
    const innerR = 38;
    const numPoints = 16;
    const points: string[] = [];
    for (let i = 0; i < numPoints * 2; i++) {
        const angle = (Math.PI / numPoints) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
    }
    const starPath = `M ${points.join(' L ')} Z`;

    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className={className}
            style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
            aria-label="Verified"
            role="img"
        >
            <defs>
                <linearGradient id="vbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
            </defs>

            {/* 16-point starburst */}
            <path d={starPath} fill="url(#vbGrad)" />

            {/* White bold checkmark */}
            <polyline
                points="32,51 44,63 68,37"
                fill="none"
                stroke="white"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};


export default VerifiedBadge;
