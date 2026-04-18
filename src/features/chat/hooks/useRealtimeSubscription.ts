import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
    RealtimePostgresChangesFilter,
    RealtimePostgresChangesPayload,
} from '@supabase/realtime-js';

type RealtimeRow = Record<string, unknown>;
type PostgresEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';

export type RealtimeSubscriptionFilter = RealtimePostgresChangesFilter<PostgresEvent>;

export interface SubscriptionStatus {
    status: 'connected' | 'disconnected' | 'reconnecting';
    retryCount: number;
    maxRetries: number;
    reconnect: () => void;
}

export function useRealtimeSubscription(
    channelName: string,
    filter: RealtimeSubscriptionFilter,
    onMessage: (payload: RealtimePostgresChangesPayload<RealtimeRow>) => void,
    enabled: boolean = true,
): SubscriptionStatus {
    const [status, setStatus] = useState<SubscriptionStatus['status']>('disconnected');
    const [retryCount, setRetryCount] = useState(0);
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const MAX_RETRIES = 10;

    const connect = useCallback(() => {
        if (!enabled) return;

        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', filter, (payload) => {
                retryCountRef.current = 0;
                setRetryCount(0);
                onMessage(payload);
            })
            .subscribe((subscriptionStatus, error) => {
                console.log(`[useRealtimeSubscription] Channel: ${channelName}, Status: ${subscriptionStatus}`);
                if (subscriptionStatus === 'SUBSCRIBED') {
                    setStatus('connected');
                    retryCountRef.current = 0;
                    setRetryCount(0);
                } else if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') {
                    // Start reconnecting
                    scheduleRetry();
                } else if (subscriptionStatus === 'CLOSED') {
                    setStatus('disconnected');
                }
                if (error) {
                    console.error('[useRealtimeSubscription] Realtime subscription error:', error);
                }
            });

        channelRef.current = channel;
    }, [channelName, filter, onMessage, enabled]);

    const scheduleRetry = useCallback(() => {
        if (retryCountRef.current >= MAX_RETRIES) {
            setStatus('disconnected');
            return;
        }

        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }

        setStatus('reconnecting');
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);

        retryTimerRef.current = setTimeout(() => {
            connect();
        }, delay);
    }, [connect]);

    const reconnect = useCallback(() => {
        retryCountRef.current = 0;
        setRetryCount(0);
        setStatus('reconnecting');
        connect();
    }, [connect]);

    useEffect(() => {
        if (!enabled) {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            setStatus('disconnected');
            retryCountRef.current = 0;
            setRetryCount(0);
            return;
        }

        connect();
        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [connect, enabled]);

    return { status, retryCount, maxRetries: MAX_RETRIES, reconnect };
}
