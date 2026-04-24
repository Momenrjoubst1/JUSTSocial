import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { DecryptedImage } from './DecryptedImage';
import { useAuthContext } from '@/context/AuthContext';
import { EmojiText } from '@/components/ui/EmojiText';
import { isOnlyEmoji, isEmojiOnly } from '@/utils/emoji.utils';
import { LinkPreviewCard } from './LinkPreviewCard';
import { DecryptedText } from '@/components/ui/core';
import { useLinkDetection } from '../../hooks/useLinkDetection';
import { useTranslation } from 'react-i18next';

/** Convert data: URIs to blob: URLs to bypass CSP media-src restrictions */
function useSafeAudioSrc(dataUri: string | null) {
    const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
    React.useEffect(() => {
        if (!dataUri) return;

        // ─── NEW: Handle E2EE_MEDIA:v1 Storage format ───
        if (dataUri.startsWith('E2EE_MEDIA:v1:')) {
            let cancelled = false;
            const parts = dataUri.replace('E2EE_MEDIA:v1:', '').split('|');
            const metaPart = parts[0];
            const [keyB64, ivB64, ...pathParts] = metaPart.split(':');
            const storagePath = pathParts.join(':');

            import('../../services/cryptoMedia').then(({ downloadAndDecryptMedia }) => {
                downloadAndDecryptMedia(storagePath, keyB64, ivB64, 'audio/webm').then(url => {
                    if (!cancelled) setBlobUrl(url);
                }).catch(() => {});
            });
            return () => { cancelled = true; };
        }

        // ─── LEGACY: data: URI → blob: ───
        if (!dataUri.startsWith('data:')) { setBlobUrl(dataUri); return; }
        try {
            const parts = dataUri.split(';base64,');
            const contentType = parts[0].split(':')[1] || 'audio/webm';
            const raw = window.atob(parts[1]);
            const arr = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([arr], { type: contentType }));
            setBlobUrl(url);
            return () => URL.revokeObjectURL(url);
        } catch { setBlobUrl(dataUri); }
    }, [dataUri]);
    return blobUrl;
}

function SafeAudio({ src }: { src: string }) {
    const { t } = useTranslation('chat');
    const [inView, setInView] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "300px" }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const safeSrc = useSafeAudioSrc(inView ? src : null);

    if (!inView || !safeSrc) {
        return (
            <div ref={containerRef} className="py-1 flex items-center gap-2 opacity-50 min-w-[150px] h-10 animate-pulse">
                <div className="flex items-end gap-[3px] h-5">
                    {[0.4, 0.7, 1, 0.6, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
                        <div key={i} className="w-[3px] rounded-full bg-current" style={{ height: `${h * 100}%`, animationDelay: `${i * 60}ms` }} />
                    ))}
                </div>
                <span className="text-xs">{t("decryptingAudio")}</span>
            </div>
        );
    }
    return (
        <div ref={containerRef} className="py-1">
            <audio controls src={safeSrc || undefined} className="h-8 brightness-90 filter invert dark:invert-0" />
        </div>
    );
}

interface MessageBubbleProps {
    text: string;
    isMe: boolean;
    isDark: boolean;
    isModerated: boolean;
    isDisappearing: boolean;
    isRevealed: boolean;
    replyToId?: string;
    senderId: string;
    currentMessages: any[];
    chatName: string;
    isFirstInSequence?: boolean;
    isLastInSequence?: boolean;
    onImageLoad?: () => void;
    children?: React.ReactNode;
    isEdited?: boolean;
    isUnsent?: boolean;
}

let globalLastSeenMessageId: string | null = null;

export const MessageBubble = React.memo(({
    text,
    isMe,
    isDark,
    isModerated,
    isDisappearing,
    isRevealed,
    replyToId,
    currentMessages,
    chatName,
    isFirstInSequence = true,
    isLastInSequence = true,
    onImageLoad,
    children,
    senderId,
    isEdited = false,
    isUnsent = false
}: MessageBubbleProps) => {
    const { t } = useTranslation('chat');
    const { t: tCommon } = useTranslation('common');
    const { user } = useAuthContext();
    const { preview, loading } = useLinkDetection(text || '');

    // ─── Unsent message: render faded placeholder ───
    if (isUnsent) {
        const radiusAll = isMe 
            ? `${isFirstInSequence ? 'rounded-tr-2xl rounded-tl-2xl' : 'rounded-tr-sm rounded-tl-2xl'} ${isLastInSequence ? 'rounded-br-2xl rounded-bl-2xl' : 'rounded-br-sm rounded-bl-2xl'}`
            : `${isFirstInSequence ? 'rounded-tl-2xl rounded-tr-2xl' : 'rounded-tl-sm rounded-tr-2xl'} ${isLastInSequence ? 'rounded-bl-2xl rounded-br-2xl' : 'rounded-bl-sm rounded-br-2xl'}`;
        return (
            <div className={`relative text-[13px] italic opacity-40 select-none px-4 py-2 border border-dashed ${radiusAll} ${
                isDark ? 'border-white/10 text-white/50' : 'border-black/10 text-black/40'
            }`}>
                <span>🗑️ {isMe ? t("deletedByYou") : t("deletedMessage")}</span>
                {children}
            </div>
        );
    }

    // ─── Content type detection (supports legacy [IMAGE]/[AUDIO] and new E2EE_MEDIA:v1 format) ───
    let isImage = text?.startsWith('[IMAGE]') || false;
    let isAudio = text?.startsWith('[AUDIO]') || false;
    let content = text || '';
    let caption = '';

    if (text?.startsWith('E2EE_MEDIA:v1:')) {
        // Format: E2EE_MEDIA:v1:{keyB64}:{ivB64}:{storagePath}|{caption}
        const pipeIdx = text.indexOf('|');
        const mediaHeader = pipeIdx > -1 ? text.substring(0, pipeIdx) : text;
        caption = pipeIdx > -1 ? text.substring(pipeIdx + 1) : '';
        
        // Determine type from caption tag
        if (caption.startsWith('[IMAGE]')) {
            isImage = true;
            caption = caption.replace('[IMAGE]', '').trim();
        } else if (caption.startsWith('[AUDIO]')) {
            isAudio = true;
            caption = caption.replace('[AUDIO]', '').trim();
        } else {
            // Default to image if no tag
            isImage = true;
        }
        content = mediaHeader; // Pass the full E2EE_MEDIA string to DecryptedImage/SafeAudio
    } else if (isImage) {
        content = text!.replace('[IMAGE]', '');
    } else if (isAudio) {
        content = text!.replace('[AUDIO]', '');
    }

    const onlyEmoji = !isImage && !isAudio && isEmojiOnly(text || '');

    // Highlight newly arrived emojis with send or receive animations
    const [animationType, setAnimationType] = React.useState<'send' | 'receive' | 'none'>(() => {
        const matchingMsgs = currentMessages ? currentMessages.filter(m => m.encryptedContent === text && m.senderId === senderId) : [];
        const myMsgId = matchingMsgs.length > 0 ? matchingMsgs[matchingMsgs.length - 1].id : null;
        const lastMsgInChat = currentMessages && currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : null;
        
        let initialAnimationType: 'send' | 'receive' | 'none' = 'none';
        
        if (myMsgId && lastMsgInChat && myMsgId === lastMsgInChat.id) {
            if (globalLastSeenMessageId !== null && globalLastSeenMessageId !== myMsgId) {
                initialAnimationType = isMe ? 'send' : 'receive';
            }
        }
        
        if (lastMsgInChat) {
            globalLastSeenMessageId = lastMsgInChat.id;
        }
        
        return initialAnimationType;
    });

    const [shouldAnimateDecrypt] = React.useState(animationType !== 'none');

    React.useEffect(() => {
        if (animationType !== 'none') {
            const t = setTimeout(() => setAnimationType('none'), 700);
            return () => clearTimeout(t);
        }
    }, [animationType]);

    const rawRadiusClasses = isMe 
        ? `${isFirstInSequence ? 'rounded-tr-2xl rounded-tl-2xl' : 'rounded-tr-sm rounded-tl-2xl'} ${isLastInSequence ? 'rounded-br-2xl rounded-bl-2xl' : 'rounded-br-sm rounded-bl-2xl'}`
        : `${isFirstInSequence ? 'rounded-tl-2xl rounded-tr-2xl' : 'rounded-tl-sm rounded-tr-2xl'} ${isLastInSequence ? 'rounded-bl-2xl rounded-br-2xl' : 'rounded-bl-sm rounded-br-2xl'}`;

    const radiusClasses = ((isImage || onlyEmoji) && !replyToId) ? '!rounded-none' : rawRadiusClasses;

    return (
        <div className={`relative group text-[15px] leading-relaxed transition-all duration-300 select-none ${radiusClasses} ${isModerated ? 'border-2 border-red-500/50 shadow-md shadow-red-500/20' : ''} ${onlyEmoji
            ? 'bg-transparent border-none shadow-none p-0'
            : isImage && !replyToId
                ? 'bg-transparent border-0 shadow-none px-0 py-0'
                : 'bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-sm shadow-black/20 px-4 py-2.5'
            }`}>
            
            {/* Privacy Shield Overlay */}
            {isDisappearing && !isRevealed && (
                <div className={`absolute inset-0 z-[5] bg-black/5 dark:bg-white/5 backdrop-blur-[12px] transition-all duration-300 pointer-events-none flex items-center justify-center overflow-hidden ${radiusClasses}`}>
                    <ShieldAlert size={20} className="opacity-40 animate-pulse text-foreground" />
                </div>
            )}

            <div className={`transition-all duration-300 relative z-10 ${isDisappearing && !isRevealed ? 'blur-[6px] opacity-60' : ''}`}>
                {replyToId && (
                    <div
                        className={`mb-3 p-2.5 rounded-xl text-xs flex flex-col cursor-pointer border-l-2 ${isMe ? 'bg-black/10 border-white/40' : 'bg-black/5 border-primary/50'}`}
                        onClick={() => {
                            const element = document.getElementById(`msg-${replyToId}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p dir="auto" className="font-bold opacity-90 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis text-[11px]">
                                    {(() => {
                                        const original = currentMessages.find((m) => m.id === replyToId);
                                        return original?.senderId === 'me' || original?.senderId === user?.id ? tCommon('you') : chatName;
                                    })()}
                                </p>
                                <p dir="auto" className="whitespace-nowrap overflow-hidden text-ellipsis opacity-70 text-[12px]">
                                    {(() => {
                                        const original = currentMessages.find((m) => m.id === replyToId);
                                        if (!original || !original.encryptedContent) return t('reply.deleted');
                                        if (original.encryptedContent.startsWith('[IMAGE]') || original.encryptedContent.includes('E2EE_MEDIA:v1:')) return t('reply.photo');
                                        if (original.encryptedContent.startsWith('[AUDIO]')) return t('reply.voiceMessage');
                                        return <EmojiText text={original.encryptedContent} size={14} disableMagnify={true} />;
                                    })()}
                                </p>
                            </div>
                            {(() => {
                                const original = currentMessages.find((m) => m.id === replyToId);
                                if (original?.encryptedContent?.startsWith('[IMAGE]')) {
                                    const src = original.encryptedContent.replace('[IMAGE]', '');
                                    return (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 bg-black/10">
                                            <DecryptedImage url={src} senderId={original.senderId} />
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                )}

                {isImage ? (
                    <>
                        <DecryptedImage url={content} senderId={senderId} onLoad={onImageLoad} />
                        {caption && (
                            <p dir="auto" className="mt-1.5 text-[14px] opacity-90 whitespace-pre-wrap">
                                <EmojiText text={caption} size={16} />
                            </p>
                        )}
                    </>
                ) : isAudio ? (
                    <SafeAudio src={content} />
                ) : (
                    <div dir="auto" className="whitespace-pre-wrap flex items-end">
                        {shouldAnimateDecrypt ? (
                            <DecryptedText
                                text={text}
                                animateOn="view"
                                speed={40}
                                maxIterations={12}
                                revealDirection={isMe ? 'end' : 'start'}
                                className={`inline-block ${onlyEmoji ? 'text-[40px]' : ''}`}
                            />
                        ) : (
                            <EmojiText 
                                text={text} 
                                size={onlyEmoji ? 40 : 20} 
                                emojiOnly={onlyEmoji} 
                                animationType={animationType} 
                            />
                        )}
                        {isEdited && (
                            <span className={`inline-block ml-1.5 text-[10px] italic opacity-40 align-bottom select-none`}>{t("edited")}</span>
                        )}
                    </div>
                )}

                {/* Show Link Preview if applicable */}
                {!isImage && !isAudio && !onlyEmoji && !isUnsent && (loading || preview) && (
                    <LinkPreviewCard preview={preview} loading={loading} />
                )}
            </div>
            {children}
        </div>
    );
});

MessageBubble.displayName = 'MessageBubble';
