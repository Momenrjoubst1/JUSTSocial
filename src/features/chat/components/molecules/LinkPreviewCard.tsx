import React from 'react';
import { ExternalLink, ShieldAlert, Copy } from 'lucide-react';
import { LinkPreviewData } from '../../hooks/useLinkDetection';

interface LinkPreviewCardProps {
    preview?: LinkPreviewData | null;
    loading?: boolean;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ preview, loading }) => {
    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (preview?.url) {
            navigator.clipboard.writeText(preview.url);
        }
    };

    if (loading) {
        return (
            <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10">
                <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden animate-pulse">
                    <div className="w-full h-24 bg-black/[0.04] dark:bg-white/[0.04]" />
                    <div className="p-3 space-y-2">
                        <div className="h-3.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full w-3/4" />
                        <div className="h-3 bg-black/[0.04] dark:bg-white/[0.04] rounded-full w-full" />
                        <div className="h-3 bg-black/[0.04] dark:bg-white/[0.04] rounded-full w-1/2" />
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-3 h-3 rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
                            <div className="h-2 bg-black/[0.05] dark:bg-white/[0.05] rounded-full w-20" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!preview) return null;

    if (!preview.safe) {
        return (
            <div className="mt-3 pt-3 border-t border-red-500/30">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div dir="auto">
                            <p className="text-sm font-semibold">⚠️ رابط غير موثوق</p>
                            <p className="text-xs opacity-80 mt-1 leading-relaxed">
                                {preview.warning || "قد يحتوي هذا الرابط على محتوى ضار أو تصيد. لا تفتحه ما لم تكن متأكداً تماماً."}
                            </p>
                            <p className="text-xs opacity-60 mt-1 truncate max-w-[200px]" dir="ltr">{preview.url}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-md transition-colors"
                    >
                        <Copy className="w-4 h-4" />
                        نسخ الرابط بدلاً من فتحه
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10">
            <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 rounded-lg overflow-hidden transition-colors"
                title={preview.title || preview.domain}
            >
                {preview.image && (
                    <div className="w-full h-32 bg-black/10 dark:bg-white/10 overflow-hidden relative">
                        <img 
                            src={preview.image} 
                            alt={preview.title || "Link preview"} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                )}
                <div className="p-3" dir="auto">
                    <p className="text-sm font-semibold line-clamp-1 opacity-90 leading-snug">
                        {preview.title || preview.domain}
                    </p>
                    {preview.description && (
                        <p className="text-[13px] opacity-70 mt-1 line-clamp-2 leading-relaxed">
                            {preview.description}
                        </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] opacity-60 font-semibold tracking-wider" dir="ltr">
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{preview.domain}</span>
                    </div>
                </div>
            </a>
        </div>
    );
};
