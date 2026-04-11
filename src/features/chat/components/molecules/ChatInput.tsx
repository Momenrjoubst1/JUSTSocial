import { Button } from '@/components/ui/core';
import React, { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Smile, Image as ImageIcon, Mic, Send, X, Ban, Loader2, Languages } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useSendMessage } from '../../hooks/useSendMessage';
import { useChatStore } from '../../store/chatStore';
import { useE2EE } from '../../hooks/useE2EE';
import { encryptHybridMessage } from '../../services/crypto';
import { DecryptedImage } from './DecryptedImage';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/context/AuthContext';
import { useChatSound } from '../../hooks/useChatSound';
import { EmojiText } from '@/components/ui/EmojiText';
import { useAuthRefresh } from "@/features/auth/hooks/useAuthRefresh";
import { draftQueueService } from '../../services/draftQueueService';

export function ChatInput({ broadcastTyping }: { broadcastTyping: (typing: boolean) => void }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const activeChat = useChatStore(s => s.activeChat);
    const replyingTo = useChatStore(s => s.replyingTo);
    const setReplyingTo = useChatStore(s => s.setReplyingTo);
    const nicknames = useChatStore(s => s.nicknames);
    const blockedIds = useChatStore(s => s.blockedIds);
    const { sendMessage } = useSendMessage();
    const { refreshIfNeeded, fetchWithAuth } = useAuthRefresh();
    const { user } = useAuthContext();
    const { getRecipientPublicKey, publicKey } = useE2EE();
    const { playClick } = useChatSound();

    const [inputText, setInputText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [targetLang, setTargetLang] = useState<string | null>(null);
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    const isTypingRef = useRef(false);
    const lastTypingTimeRef = useRef(0);
    const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTranslatedTextRef = useRef('');
    const langPickerRef = useRef<HTMLDivElement>(null);
    const typingDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const translationAbortRef = useRef<AbortController | null>(null);
    const activeChatId = activeChat?.id;
    
    // Live Draft logic
    useEffect(() => {
        if (!activeChatId) return;
        let isCancelled = false;
        draftQueueService.getDraft(activeChatId).then(draft => {
            if (!isCancelled && draft && draft.text) {
                setInputText(draft.text);
            } else if (!isCancelled && !draft) {
                setInputText('');
            }
        });
        return () => { isCancelled = true; };
    }, [activeChatId]);

    useEffect(() => {
        if (!activeChatId) return;
        const handler = setTimeout(() => {
            if (inputText.trim()) {
                draftQueueService.saveDraft(activeChatId, { text: inputText, replyToId: replyingTo?.id });
            } else {
                draftQueueService.clearDraft(activeChatId);
            }
        }, 1500);
        return () => clearTimeout(handler);
    }, [inputText, activeChatId, replyingTo]);

    const handleInputTextChange = (val: string, timeStamp: number = Date.now()) => {
        setInputText(val);

        const timeSinceLastChar = timeStamp - lastTypingTimeRef.current;
        lastTypingTimeRef.current = timeStamp;

        if (val.trim()) {
            if (!isTypingRef.current) {
                isTypingRef.current = true;
                broadcastTyping(true);
            }

            if (typingDebounceTimeoutRef.current) {
                clearTimeout(typingDebounceTimeoutRef.current);
            }

            typingDebounceTimeoutRef.current = setTimeout(() => {
                isTypingRef.current = false;
                broadcastTyping(false);
                typingDebounceTimeoutRef.current = null;
            }, 1500);

            // Smart Adaptive Debounce for Translation
            if (targetLang && val.trim() !== lastTranslatedTextRef.current) {
                if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
                
                const debounceMs = timeSinceLastChar < 333 ? 1000 : 400; // Fast typing = wait longer

                translationTimeoutRef.current = setTimeout(async () => {
                   if (translationAbortRef.current) {
                       translationAbortRef.current.abort();
                   }
                   translationAbortRef.current = new AbortController();
                   const signal = translationAbortRef.current.signal;

                   setIsTranslating(true);
                   try {
                       const res = await fetchWithAuth('/api/chat/translate', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           signal,
                           body: JSON.stringify({ text: val, targetLang }),
                       });

                       if (!res.ok) {
                           throw new Error(`Translation API ${res.status}`);
                       }

                       const json = await res.json() as { translated?: string };
                       let translated = json.translated || val;

                       translated = translated.replace(/^["']|["']$/g, '').trim();

                       lastTranslatedTextRef.current = translated;
                       setInputText(translated);
                   } catch (e: any) {
                       if (e.name === 'AbortError') return;
                       console.error("Translation error", e);
                   } finally {
                       setIsTranslating(false);
                   }
                }, debounceMs);
            }

        } else {
            lastTranslatedTextRef.current = '';
            if (isTypingRef.current) {
                isTypingRef.current = false;
                broadcastTyping(false);
            }
            if (typingDebounceTimeoutRef.current) {
                clearTimeout(typingDebounceTimeoutRef.current);
                typingDebounceTimeoutRef.current = null;
            }
            if (translationTimeoutRef.current) {
                clearTimeout(translationTimeoutRef.current);
                translationTimeoutRef.current = null;
            }
        }
    };
    const emojiRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset the input so the same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            const imageCompression = (await import('browser-image-compression')).default;
            const options = {
                maxSizeMB: 0.15,
                maxWidthOrHeight: 1280,
                useWebWorker: true,
                initialQuality: 0.7,
            };

            const compressedFile = await imageCompression(file, options);
            // Send the compressed File via encrypted Storage upload
            await sendMessage('[IMAGE]', replyingTo?.id, undefined, undefined, compressedFile);
        } catch (error) {
            console.error('Error compressing and sending image:', error);
        }
    };

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 128) + 'px';
    }, [inputText]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) {
                setShowLangPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!activeChat) return null;

    if (blockedIds.includes(activeChat.id)) {
        return (
            <div className={`p-6 rounded-3xl border text-center backdrop-blur-md ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                <div className="flex flex-col items-center gap-2">
                    <Ban size={24} className="text-red-500 opacity-50 mb-1" />
                    <p className="font-bold text-red-500">You blocked this user</p>
                    <p className="text-sm opacity-60">You can't message them unless you unblock them in chat details.</p>
                </div>
            </div>
        );
    }

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const textPayload = inputText.trim();

        if (!textPayload) return;

        if (translationTimeoutRef.current) {
            clearTimeout(translationTimeoutRef.current);
            translationTimeoutRef.current = null;
        }
        if (translationAbortRef.current) {
            translationAbortRef.current.abort();
        }

        // Clear input immediately for UI responsiveness
        setInputText('');
        lastTranslatedTextRef.current = '';
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        if (activeChatId) {
            draftQueueService.clearDraft(activeChatId);
        }

        if (textPayload) {
            await sendMessage(textPayload, replyingTo?.id);
        }
    };

    const handleEmojiClick = (emoji: string) => {
        setInputText(prev => prev + emoji);
        textareaRef.current?.focus();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                sendMessage('[AUDIO]', replyingTo?.id, undefined, undefined, audioFile);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Mic access denied', err);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = () => {
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const chatName = nicknames[activeChat.id] || activeChat.name;

    return (
        <div className="w-full px-4 md:px-6 pb-6 pt-2 relative z-20">
            <AnimatePresence>
                {replyingTo && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`px-4 py-3 mb-2 rounded-[32px] flex items-center border shadow-md ${isDark ? 'bg-[#1e1e24] border-white/5 shadow-black/20' : 'bg-white border-gray-200 shadow-gray-200/50'}`}
                    >
                        {/* Vertical Indicator Bar */}
                        <div className={`w-0.5 h-10 rounded-full mr-3 ${isDark ? 'bg-primary' : 'bg-primary'}`} />

                        {/* Text Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="text-[13px] font-bold text-primary truncate leading-tight mb-0.5">
                                {replyingTo.senderId === 'me' || replyingTo.senderId === user?.id ? 'You' : chatName}
                            </p>
                            <p className="text-[13px] opacity-60 truncate leading-tight">
                                {replyingTo.encryptedContent.startsWith('[IMAGE]') ? 'Photo' : replyingTo.encryptedContent.startsWith('[AUDIO]') ? 'Voice message' : <EmojiText text={replyingTo.encryptedContent} size={14} />}
                            </p>
                        </div>

                        {/* Image Thumbnail on the Right */}
                        {replyingTo.encryptedContent.startsWith('[IMAGE]') && (
                            <div className="w-12 h-12 rounded-xl ml-3 overflow-hidden border border-white/10 flex-shrink-0 bg-black/10">
                                <DecryptedImage 
                                    url={replyingTo.encryptedContent.replace('[IMAGE]', '')} 
                                    senderId={replyingTo.senderId} 
                                />
                            </div>
                        )}

                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReplyingTo(null)}
                            className={`h-9 w-9 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                        >
                            <X size={18} className="opacity-60" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            <form
                onSubmit={handleSendMessage}
                className={`relative flex items-end gap-2 py-0.5 px-1 rounded-[32px] transition-all duration-300 shadow-md border ${isDark
                    ? 'bg-[#1e1e24] border-white/5 focus-within:border-white/10 shadow-black/20'
                    : 'bg-white border-gray-200 focus-within:border-gray-300 shadow-gray-200/50'
                    }`}
            >
                <div className="flex items-center pl-1 pb-1 gap-1">
                    <div className="relative" ref={langPickerRef}>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowLangPicker(!showLangPicker);
                            }}
                            className={`rounded-full transition-all relative ${isDark ? 'hover:bg-white/10 text-foreground' : 'hover:bg-black/5 text-foreground'} ${(targetLang || isTranslating) ? 'text-blue-500' : ''}`}
                            title="Auto-Translate"
                        >
                            <Languages size={22} strokeWidth={1.5} />
                            {targetLang && !isTranslating && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-background"></span>
                            )}
                            {isTranslating && (
                                <motion.span 
                                   animate={{ opacity: [0.3, 1, 0.3] }} 
                                   transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                                   className="absolute top-1 right-1 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                                />
                            )}
                        </Button>

                        <AnimatePresence>
                            {showLangPicker && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                                    className={`absolute bottom-full left-0 mb-3 w-56 rounded-2xl shadow-xl overflow-hidden backdrop-blur-3xl z-50 border ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-gray-100'}`}
                                >
                                    <div className="p-2 flex flex-col gap-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                                        <div className="sticky top-0 z-10 pb-1 mb-1 border-b border-border/50 bg-inherit backdrop-blur-md">
                                            <p className="text-[11px] font-bold px-2 py-1 opacity-50 uppercase tracking-wider">Translate to:</p>
                                        </div>
                                        {[
                                            { code: null, label: '🚫 Off (إيقاف)' },
                                            { code: 'auto-correct', label: '✨ تصحيح الأخطاء الإملائية والنحوية' },
                                            { code: 'en-casual', label: '🇬🇧 English (Casual/Slang)' },
                                            { code: 'en-formal', label: '🇬🇧 English (Formal)' },
                                            { code: 'ar-formal', label: '🇦🇪 العربية الفصحى (Formal)' },
                                            { code: 'ar-sa', label: '🇸🇦 اللهجة السعودية' },
                                            { code: 'ar-eg', label: '🇪🇬 اللهجة المصرية' },
                                            { code: 'ar-lev', label: '🇱🇧 اللهجة الشامية' },
                                            { code: 'ar-gulf', label: '🇦🇪 اللهجة الخليجية' },
                                            { code: 'ar-ma', label: '🇲🇦 اللهجة المغربية' },
                                            { code: 'fr-casual', label: '🇫🇷 French (Casual)' },
                                            { code: 'es-casual', label: '🇪🇸 Spanish (Casual)' },
                                        ].map(lang => (
                                            <button
                                                key={lang.label}
                                                type="button"
                                                onClick={() => {
                                                    if (translationAbortRef.current) {
                                                        translationAbortRef.current.abort();
                                                    }
                                                    lastTranslatedTextRef.current = '';
                                                    setTargetLang(lang.code);
                                                    setShowLangPicker(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-all ${targetLang === lang.code ? (isDark ? 'bg-white/20 font-bold' : 'bg-black/10 font-bold') : (isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}`}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className={`rounded-full transition-all ${isDark ? 'hover:bg-white/10 text-foreground' : 'hover:bg-black/5 text-foreground'}`}
                        title="Send Photo"
                    >
                        <ImageIcon size={22} strokeWidth={1.5} />
                    </Button>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleImageSelect}
                    />

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowEmojiPicker(!showEmojiPicker);
                        }}
                        className={`rounded-full transition-all ${isDark ? 'hover:bg-white/10 text-foreground' : 'hover:bg-black/5 text-foreground'}`}
                    >
                        <Smile size={24} strokeWidth={1.5} />
                    </Button>
                </div>

                <div className="flex-1 relative min-h-[44px] flex items-center">
                    <div className="w-full relative">
                        {/* Visual Overlay for Emoji Rendering */}
                        <div 
                            ref={overlayRef}
                            className="absolute inset-0 w-full h-full py-2.5 px-0 text-[15px] whitespace-pre-wrap break-words pointer-events-none custom-scrollbar overflow-y-auto"
                            aria-hidden="true"
                            style={{ color: 'inherit' }}
                        >
                            {inputText ? (
                                <EmojiText text={inputText} size={18} disableMagnify={true} />
                            ) : (
                                <span className="opacity-50">Message...</span>
                            )}
                        </div>
                        
                        {/* Native Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={inputText}
                            onChange={e => handleInputTextChange(e.target.value, e.timeStamp)}
                            onScroll={e => {
                                if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop;
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                    if (typingDebounceTimeoutRef.current) {
                                        clearTimeout(typingDebounceTimeoutRef.current);
                                    }
                                    if (translationTimeoutRef.current) {
                                        clearTimeout(translationTimeoutRef.current);
                                        translationTimeoutRef.current = null;
                                    }
                                    isTypingRef.current = false;
                                    broadcastTyping(false);
                                } else if (e.key !== 'Shift' && e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'CapsLock') {
                                    playClick();
                                }
                            }}
                            placeholder=""
                            spellCheck={false}
                            className={`w-full bg-transparent border-none outline-none py-2.5 px-0 resize-none text-[15px] max-h-32 custom-scrollbar text-transparent relative z-10 ${isDark ? 'caret-white' : 'caret-black'}`}
                            rows={1}
                            style={{ WebkitTextFillColor: 'transparent', color: 'transparent' }}
                        />
                    </div>
                </div>

                <div className="flex items-center pr-1 pb-1">
                    <AnimatePresence mode="popLayout">
                        {inputText.trim() ? (
                            <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="text-primary hover:bg-primary/10 rounded-full"
                            >
                                <Send size={24} strokeWidth={1.5} />
                            </Button>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center"
                            >
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onMouseDown={startRecording}
                                    onMouseUp={sendRecording}
                                    onMouseLeave={cancelRecording}
                                    className={`rounded-full transition-all ${isRecording
                                        ? 'bg-red-500 text-white animate-pulse'
                                        : (isDark ? 'hover:bg-white/10 text-foreground' : 'hover:bg-black/5 text-foreground')
                                        }`}
                                >
                                    <Mic size={24} strokeWidth={1.5} />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div ref={emojiRef} className="absolute bottom-full left-0 mb-4 z-50">
                    <EmojiPicker
                        isOpen={showEmojiPicker}
                        onClose={() => setShowEmojiPicker(false)}
                        onEmojiSelect={handleEmojiClick}
                    />
                </div>
            </form>
        </div>
    );
}
