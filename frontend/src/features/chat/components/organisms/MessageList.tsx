import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuthContext } from '@/context/AuthContext';
import { useChatStore } from '../../store/chatStore';
import { MessageItem } from './MessageItem';
import { MessageSquare, Reply, Share2, RotateCcw, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { Avatar } from '@/components/ui/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Message } from '../../types/chat.types';
import TypingIndicator from '../atoms/TypingIndicator';

interface MessageListProps {
    currentMessages: Message[];
    loadMore?: () => void;
    isLoadingOlder?: boolean;
    hasMoreMessages?: boolean;
    isTyping?: boolean;
    isLoadingMessages?: boolean;
}

const DateHeader = React.memo(({ createdAt, isDark, label }: { createdAt: string; isDark: boolean; label: string }) => {
    const seen = new Date(createdAt);
    if (isNaN(seen.getTime())) return null;

    return (
        <div className="flex justify-center w-full my-4 relative z-10">
            <span
                className={`text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full ${
                    isDark ? 'bg-white/10 text-white/50 backdrop-blur-md' : 'bg-black/5 text-black/40'
                }`}
            >
                {label}
            </span>
        </div>
    );
});

function MessagesSkeleton({ isDark }: { isDark: boolean }) {
    const bar = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]';
    const bubbleMe = isDark ? 'bg-primary/10' : 'bg-blue-100/60';
    const bubbleOther = isDark ? 'bg-white/[0.05]' : 'bg-gray-100';

    const rows = [
        { isMe: false, w: 180, h: 36 },
        { isMe: false, w: 130, h: 28 },
        { isMe: true, w: 160, h: 36 },
        { isMe: true, w: 200, h: 44 },
        { isMe: false, w: 220, h: 36 },
        { isMe: true, w: 140, h: 28 },
    ];

    return (
        <div className="flex flex-col gap-2 py-6 px-4 animate-pulse">
            {rows.map((row, i) => (
                <div
                    key={i}
                    className={`flex ${row.isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                    style={{ animationDelay: `${i * 60}ms` }}
                >
                    {!row.isMe && <div className={`w-7 h-7 rounded-full shrink-0 ${bar}`} />}
                    <div
                        className={`rounded-2xl ${row.isMe ? bubbleMe : bubbleOther}`}
                        style={{ width: row.w, height: row.h }}
                    />
                </div>
            ))}
        </div>
    );
}

export function MessageList({
    currentMessages,
    loadMore,
    isLoadingOlder,
    hasMoreMessages,
    isTyping = false,
    isLoadingMessages = false,
}: MessageListProps) {
    const { t } = useTranslation('chat');
    const { t: tCommon } = useTranslation('common');
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const activeChat = useChatStore((s) => s.activeChat);
    const nicknames = useChatStore((s) => s.nicknames);
    const setReplyingTo = useChatStore((s) => s.setReplyingTo);
    const setForwardingMessage = useChatStore((s) => s.setForwardingMessage);
    const { user } = useAuthContext();
    const navigate = useNavigate();

    const chatAreaRef = useRef<VirtuosoHandle | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msgId: string; top: number; left: number } | null>(null);
    const [deletingIds, setDeletingIds] = useState<string[]>([]);
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const openContextMenu = useCallback((x: number, y: number, msgId: string) => {
        const menuW = 200;
        const menuH = 90;
        let top = y + 10;
        let left = x + 10;

        if (top + menuH + 15 > window.innerHeight) top = Math.max(8, y - menuH - 10);
        if (left + menuW + 15 > window.innerWidth) left = Math.max(8, x - menuW - 10);

        setContextMenu({ x, y, msgId, top, left });
    }, []);

    const selectedMsg = useMemo(() => {
        if (!contextMenu) return null;
        return currentMessages.find((m) => m.id === contextMenu.msgId) || null;
    }, [contextMenu, currentMessages]);

    const scrollToBottom = useCallback(
        (smooth = false) => {
            if (!currentMessages.length) return;
            if (chatAreaRef.current) {
                chatAreaRef.current.scrollToIndex({
                    index: currentMessages.length - 1,
                    align: 'end',
                    behavior: smooth ? 'smooth' : 'auto',
                });
                return;
            }
            messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
        },
        [currentMessages.length],
    );

    const handleDeleteMessage = useCallback((msgId: string) => {
        setDeletingIds((prev) => prev.filter((id) => id !== msgId));
    }, []);

    const triggerDeleteAnimation = useCallback((msgId: string) => {
        setDeletingIds((prev) => (prev.includes(msgId) ? prev : [...prev, msgId]));
        window.dispatchEvent(new CustomEvent('unsend-message-confirm', { detail: { msgId } }));
        setContextMenu(null);
    }, []);

    const submitEdit = useCallback(() => {
        if (!editingMsgId || !editText.trim()) return;

        window.dispatchEvent(
            new CustomEvent('edit-message-confirm', {
                detail: { msgId: editingMsgId, newText: editText.trim() },
            }),
        );

        setEditingMsgId(null);
        setEditText('');
    }, [editingMsgId, editText]);

    useEffect(() => {
        if (!contextMenu) return;

        const handlePointerDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setContextMenu(null);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [contextMenu]);

    useEffect(() => {
        if (!editingMsgId) return;
        const id = window.setTimeout(() => editInputRef.current?.focus(), 0);
        return () => window.clearTimeout(id);
    }, [editingMsgId]);

    if (!activeChat) return null;

    const chatName = activeChat.name || nicknames[activeChat.id] || activeChat.email?.split('@')[0] || t('messagesTitle');

    const formatLastSeen = useCallback((value: string) => {
        const seen = new Date(value);
        const now = new Date();
        const diff = Math.floor((now.getTime() - seen.getTime()) / 1000);
        if (diff < 60) return t('justNow');
        if (diff < 3600) return t('minutesAgo', { count: Math.floor(diff / 60) });
        if (diff < 86400) return t('hoursAgo', { count: Math.floor(diff / 3600) });
        if (diff < 172800) return t('yesterday');
        return seen.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [t]);

    const isDifferentTime = (m1: Message, m2: Message) => {
        if (!m1 || !m2) return true;
        const t1 = new Date(m1.createdAt || m1.timestamp).getTime();
        const t2 = new Date(m2.createdAt || m2.timestamp).getTime();
        if (isNaN(t1) || isNaN(t2)) return true;
        return Math.abs(t1 - t2) > 300000;
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col relative z-20">
            <Virtuoso
                ref={chatAreaRef}
                className="flex-1 custom-scrollbar"
                style={{ height: '100%', width: '100%' }}
                data={currentMessages}
                initialTopMostItemIndex={Math.max(0, currentMessages.length - 1)}
                startReached={() => {
                    if (loadMore && hasMoreMessages && !isLoadingOlder) {
                        loadMore();
                    }
                }}
                components={{
                    List: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ style, children }, ref) => (
                        <div ref={ref} style={style} className="px-4 md:px-8">
                            {children}
                        </div>
                    )),
                    Header: () => (
                        <div className="flex flex-col items-center justify-center py-12 border-b border-white/5 mb-8">
                            <motion.div whileHover={{ scale: 1.1 }} className="relative mb-4">
                                <div onClick={() => activeChat.id && navigate('/profile/' + activeChat.id)} className="cursor-pointer">
                                    <Avatar
                                        src={activeChat.avatar}
                                        name={chatName}
                                        size={42}
                                        isOnline={activeChat.online}
                                        className="transition-transform duration-300"
                                    />
                                </div>
                            </motion.div>

                            <h3 className="text-xl font-bold">{chatName}</h3>
                            <p className="text-sm opacity-50">{activeChat.email}</p>
                            <div className="mt-1 mb-4 flex items-center gap-2">
                                {activeChat.online ? (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {t('onlineNow')}
                                    </span>
                                ) : activeChat.lastSeen ? (
                                    <span className="text-xs opacity-40 font-medium">
                                        {t('lastSeen', { time: formatLastSeen(activeChat.lastSeen) })}
                                    </span>
                                ) : (
                                    <span className="text-xs opacity-40 font-medium">{t('lastSeenRecently')}</span>
                                )}
                            </div>

                            <button
                                onClick={() => navigate('/profile/' + activeChat.id)}
                                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                                    isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
                                }`}
                            >
                                {t('viewProfile')}
                            </button>

                            {isLoadingOlder && (
                                <div className="w-full flex flex-col items-center gap-2 py-4 animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-7 w-7 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                                        <div
                                            className={`h-4 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
                                            style={{ width: 120 }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 self-end">
                                        <div
                                            className={`h-4 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
                                            style={{ width: 100 }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`h-7 w-7 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                                        <div
                                            className={`h-4 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
                                            style={{ width: 160 }}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentMessages.length === 0 && (
                                isLoadingMessages ? (
                                    <div className="w-full">
                                        <MessagesSkeleton isDark={isDark} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                        <MessageSquare size={48} className="mb-4" />
                                        <p className="text-sm">{t('noMessagesYetSayHi')}</p>
                                    </div>
                                )
                            )}
                        </div>
                    ),
                    Footer: () => <div ref={messagesEndRef} className="h-4" />,
                }}
                itemContent={(index, msg) => {
                    const isMe = msg.senderId === user?.id || msg.senderId === 'me';
                    const showTime = index === 0 || isDifferentTime(msg, currentMessages[index - 1]);

                    const isSameSender = (m1: Message, m2: Message) => {
                        const isM1Me = m1.senderId === user?.id || m1.senderId === 'me';
                        const isM2Me = m2.senderId === user?.id || m2.senderId === 'me';

                        if (isM1Me && isM2Me) return true;
                        if (!isM1Me && !isM2Me) return m1.senderId === m2.senderId;
                        return false;
                    };

                    const isFirstInSequence = index === 0 || !isSameSender(currentMessages[index - 1], msg) || showTime;
                    const isLastInSequence =
                        index === currentMessages.length - 1 ||
                        !isSameSender(currentMessages[index + 1], msg) ||
                        isDifferentTime(msg, currentMessages[index + 1]);

                    const isDeleting = deletingIds.includes(msg.id);

                    return (
                        <motion.div
                            layout
                            key={msg.id}
                            className="overflow-hidden pb-4 w-full"
                            initial={false}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                height: isDeleting ? 0 : 'auto',
                                marginTop: isDeleting ? 0 : undefined,
                                marginBottom: isDeleting ? 0 : undefined,
                                paddingTop: isDeleting ? 0 : undefined,
                                paddingBottom: isDeleting ? 0 : undefined,
                            }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={
                                isDeleting
                                    ? { duration: 0.3, delay: 0.4, type: 'tween' }
                                    : { duration: 0.2, type: 'spring', stiffness: 260, damping: 25 }
                            }
                        >
                            {showTime && (
                                <DateHeader
                                    createdAt={msg.createdAt || msg.timestamp}
                                    isDark={isDark}
                                    label={(() => {
                                        const seen = new Date(msg.createdAt || msg.timestamp);
                                        const now = new Date();
                                        const diff = Math.floor((now.getTime() - seen.getTime()) / 1000);
                                        if (diff < 60) return t('today');
                                        if (diff < 86400 && seen.getDate() === now.getDate()) return t('today');
                                        return seen.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                    })()}
                                />
                            )}
                            <MessageItem
                                msg={msg}
                                isMe={isMe}
                                showTime={showTime}
                                isFirstInSequence={isFirstInSequence}
                                isLastInSequence={isLastInSequence}
                                avatar={activeChat.avatar}
                                isDark={isDark}
                                setContextMenu={(menu: { x: number; y: number; msgId: string }) =>
                                    openContextMenu(menu.x, menu.y, menu.msgId)
                                }
                                currentMessages={currentMessages}
                                chatName={chatName}
                                isDeleting={isDeleting}
                                onDeleteComplete={() => handleDeleteMessage(msg.id)}
                                onImageLoad={() => {
                                    scrollToBottom(true);
                                }}
                            />
                        </motion.div>
                    );
                }}
            />

            <div className="absolute left-6 bottom-6 pointer-events-none">
                <TypingIndicator isTyping={isTyping} isDark={isDark} />
            </div>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {contextMenu && (
                            <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.92 }}
                                transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                                className={`fixed z-[9999] rounded-2xl overflow-hidden will-change-transform ${
                                    isDark
                                        ? 'bg-[#2a2a2e] shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
                                        : 'bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]'
                                }`}
                                style={{ top: contextMenu.top, left: contextMenu.left }}
                            >
                                <div className="flex items-center gap-0.5 p-1.5">
                                    <motion.button
                                        whileTap={{ scale: 0.85 }}
                                        onClick={() => {
                                            if (selectedMsg) setReplyingTo(selectedMsg);
                                            setContextMenu(null);
                                        }}
                                        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                                            isDark ? 'hover:bg-white/8 active:bg-white/12' : 'hover:bg-black/5 active:bg-black/8'
                                        }`}
                                    >
                                        <Reply size={18} className={`scale-x-[-1] ${isDark ? 'text-white/80' : 'text-gray-700'}`} />
                                        <span className={`text-[10px] font-semibold ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{t('replyAction')}</span>
                                    </motion.button>

                                    <motion.button
                                        whileTap={{ scale: 0.85 }}
                                        onClick={() => {
                                            if (selectedMsg) setForwardingMessage(selectedMsg);
                                            setContextMenu(null);
                                        }}
                                        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                                            isDark ? 'hover:bg-white/8 active:bg-white/12' : 'hover:bg-black/5 active:bg-black/8'
                                        }`}
                                    >
                                        <Share2 size={18} className={isDark ? 'text-white/80' : 'text-gray-700'} strokeWidth={1.8} />
                                        <span className={`text-[10px] font-semibold ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{t('forwardAction')}</span>
                                    </motion.button>

                                    {(selectedMsg?.senderId === user?.id || selectedMsg?.senderId === 'me') &&
                                        !selectedMsg?.metadata?.is_deleted &&
                                        !selectedMsg?.encryptedContent?.startsWith('[IMAGE]') &&
                                        !selectedMsg?.encryptedContent?.startsWith('[AUDIO]') &&
                                        selectedMsg?.createdAt &&
                                        Date.now() - new Date(selectedMsg.createdAt).getTime() < 15 * 60 * 1000 && (
                                            <motion.button
                                                whileTap={{ scale: 0.85 }}
                                                onClick={() => {
                                                    if (selectedMsg) {
                                                        setEditingMsgId(selectedMsg.id);
                                                        setEditText(selectedMsg.encryptedContent || '');
                                                    }
                                                    setContextMenu(null);
                                                }}
                                                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                                                    isDark
                                                        ? 'hover:bg-blue-500/10 active:bg-blue-500/15'
                                                        : 'hover:bg-blue-50 active:bg-blue-100'
                                                }`}
                                            >
                                                <Pencil size={18} className="text-blue-500" strokeWidth={2} />
                                                <span className="text-[10px] font-semibold text-blue-500">{t('editAction')}</span>
                                            </motion.button>
                                        )}

                                    {(selectedMsg?.senderId === user?.id || selectedMsg?.senderId === 'me') &&
                                        !selectedMsg?.metadata?.is_deleted && (
                                            <motion.button
                                                whileTap={{ scale: 0.85 }}
                                                onClick={() => triggerDeleteAnimation(contextMenu.msgId)}
                                                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                                                    isDark
                                                        ? 'hover:bg-red-500/10 active:bg-red-500/15'
                                                        : 'hover:bg-red-50 active:bg-red-100'
                                                }`}
                                            >
                                                <RotateCcw size={18} className="text-red-500" strokeWidth={2} />
                                                <span className="text-[10px] font-semibold text-red-500">{t('unsendAction')}</span>
                                            </motion.button>
                                        )}
                                </div>

                                <div className="px-3 pb-1.5 pt-0 text-center">
                                    <span
                                        className={`text-[9px] font-medium tracking-wide ${
                                            isDark ? 'text-white/25' : 'text-black/25'
                                        }`}
                                    >
                                        {selectedMsg?.timestamp || t('justNowShort')}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}

            {editingMsgId &&
                typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 backdrop-blur-sm"
                            onClick={() => {
                                setEditingMsgId(null);
                                setEditText('');
                            }}
                        >
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-full max-w-lg mx-4 mb-8 rounded-3xl overflow-hidden shadow-2xl border ${
                                    isDark
                                        ? 'bg-[#1e1e24] border-white/10 shadow-black/50'
                                        : 'bg-white border-gray-200 shadow-gray-300/50'
                                }`}
                            >
                                <div
                                    className={`px-5 py-3 border-b flex items-center gap-3 ${
                                        isDark ? 'border-white/5' : 'border-gray-100'
                                    }`}
                                >
                                    <Pencil size={16} className="text-blue-500" />
                                    <span className={`text-sm font-bold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{t('editMessage')}</span>
                                    <span className={`ml-auto text-[10px] font-medium ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                        {t('fifteenMinuteWindow')}
                                    </span>
                                </div>

                                <div className="p-4">
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && editText.trim()) {
                                                submitEdit();
                                            }
                                            if (e.key === 'Escape') {
                                                setEditingMsgId(null);
                                                setEditText('');
                                            }
                                        }}
                                        className={`w-full px-4 py-3 rounded-2xl text-[15px] outline-none transition-colors ${
                                            isDark
                                                ? 'bg-white/5 text-white placeholder:text-white/30 focus:bg-white/8 border border-white/5 focus:border-blue-500/30'
                                                : 'bg-gray-50 text-black placeholder:text-gray-400 focus:bg-gray-100 border border-gray-200 focus:border-blue-400'
                                        }`}
                                        placeholder={t('typeEditedMessage')}
                                    />
                                </div>

                                <div className="px-4 pb-4 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingMsgId(null);
                                            setEditText('');
                                        }}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                            isDark
                                                ? 'bg-white/5 hover:bg-white/10 text-white/60'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        {tCommon('cancel')}
                                    </button>
                                    <button
                                        onClick={submitEdit}
                                        disabled={!editText.trim()}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            editText.trim()
                                                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                : isDark
                                                  ? 'bg-white/5 text-white/20'
                                                  : 'bg-gray-100 text-gray-400'
                                        }`}
                                    >
                                        {t('saveEdit')}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body,
                )}
        </div>
    );
}
