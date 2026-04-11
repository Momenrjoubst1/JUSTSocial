import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { supabase } from '@/lib/supabaseClient';

export interface LinkPreviewData {
    title: string | null;
    description: string | null;
    image: string | null;
    domain: string;
    safe: boolean;
    warning?: string;
    url: string;
    error?: string;
}

const CACHE_PREFIX = 'link-preview:';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function useLinkDetection(text: string) {
    const [preview, setPreview] = useState<LinkPreviewData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Only run if there is text and it isn't exclusively an image/audio tag or an E2EE string
        if (!text || text.startsWith('[IMAGE]') || text.startsWith('[AUDIO]') || text.startsWith('E2EE_MEDIA:v1:')) {
            setPreview(null);
            return;
        }

        // Basic Regex for URL - safe extract
        const match = text.match(/(https?:\/\/[^\s\]\[<>"]+)/i);
        if (!match) {
            setPreview(null);
            return;
        }
        
        const url = match[1];
        let abortController = new AbortController();

        const fetchPreview = async () => {
            setLoading(true);
            try {
                const cacheKey = `${CACHE_PREFIX}${url}`;
                
                // 1. Check IndexedDB Cache
                const cached: { data: LinkPreviewData, expiry: number } | undefined = await get(cacheKey);

                if (cached && cached.expiry > Date.now()) {
                    setPreview({ ...cached.data, url });
                    setLoading(false);
                    return;
                }

                // 2. Fetch from Edge Function if not cached or expired
                const { data, error } = await supabase.functions.invoke('fetch-link-preview', {
                    body: { url },
                });

                if (error) throw error;
                if (abortController.signal.aborted) return;

                if (data && !data.error) {
                    const result = { ...data, url };
                    setPreview(result);
                    // Store in offline cache
                    await set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Failed to fetch link preview:', err);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchPreview();

        return () => {
            // Cancel request if unmounted or text changed
            abortController.abort();
        };
    }, [text]);

    return { preview, loading };
}
