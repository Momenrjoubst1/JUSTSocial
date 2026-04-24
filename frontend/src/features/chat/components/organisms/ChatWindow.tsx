import { Button, VerifiedBadge, isUserVerified, registerVerifiedUserId, Avatar } from '@/components/ui/core';
import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useChatContext } from '../../ChatProvider';
import { useChatStore } from '../../store/chatStore';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from '../molecules/ChatInput';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ArrowRight, Phone, Info, Plus, Send, BellOff, Bell, ChevronDown, X, Eye, Grid3X3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OfflineBanner } from '../atoms/OfflineBanner';
import { MediaGallery } from './MediaGallery';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/context/AuthContext';
import { useSecurityContext } from '@/context/SecurityContext';
import { useE2EE } from '../../hooks/useE2EE';
import { getPublicKeyFingerprint, decryptHybridMessage } from '../../services/crypto';
import { useSendMessage } from '../../hooks/useSendMessage';
import { useWebRTC, CallOverlay } from '@/features/calls';
import { useChatEvents } from '../../hooks/useChatEvents';
import { useChatSound } from '../../hooks/useChatSound';
import { ChatHanger } from '../atoms/ChatHanger';
import { useTranslation } from 'react-i18next';

type ReportReason = {
    titleKey: string;
    value: string;
    guidelinesKey: string;
};

const REPORT_REASONS: ReportReason[] = [
    { titleKey: 'reportReasons.nudity.title', value: 'nudity', guidelinesKey: 'reportReasons.nudity.guidelines' },
    { titleKey: 'reportReasons.hateSpeech.title', value: 'hate_speech', guidelinesKey: 'reportReasons.hateSpeech.guidelines' },
    { titleKey: 'reportReasons.scam.title', value: 'scam', guidelinesKey: 'reportReasons.scam.guidelines' },
    { titleKey: 'reportReasons.violence.title', value: 'violence', guidelinesKey: 'reportReasons.violence.guidelines' },
    { titleKey: 'reportReasons.saleOfGoods.title', value: 'sale_of_goods', guidelinesKey: 'reportReasons.saleOfGoods.guidelines' },
    { titleKey: 'reportReasons.harassment.title', value: 'harassment', guidelinesKey: 'reportReasons.harassment.guidelines' },
    { titleKey: 'reportReasons.impersonation.title', value: 'impersonation', guidelinesKey: 'reportReasons.impersonation.guidelines' },
    { titleKey: 'reportReasons.ipViolation.title', value: 'ip_violation', guidelinesKey: 'reportReasons.ipViolation.guidelines' },
    { titleKey: 'reportReasons.selfHarm.title', value: 'self_harm', guidelinesKey: 'reportReasons.selfHarm.guidelines' },
    { titleKey: 'reportReasons.spam.title', value: 'spam', guidelinesKey: 'reportReasons.spam.guidelines' },
    { titleKey: 'reportReasons.other.title', value: 'other', guidelinesKey: 'reportReasons.other.guidelines' },
];

export function ChatWindow() {
    const { t, i18n } = useTranslation('chat');
    const { t: tCommon } = useTranslation('common');
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const activeChat = useChatStore(s => s.activeChat);
    const setActiveChat = useChatStore(s => s.setActiveChat);
    const nicknames = useChatStore(s => s.nicknames);
    const showDetails = useChatStore(s => s.showDetails);
    const setShowDetails = useChatStore(s => s.setShowDetails);
    const mutedChatIds = useChatStore(s => s.mutedChatIds);
    const setMutedChatIds = useChatStore(s => s.setMutedChatIds);
    const blockedIds = useChatStore(s => s.blockedIds);

    const setAllMessages = useChatStore(s => s.setAllMessages);
    const setContacts = useChatStore(s => s.setContacts);

    const {
        currentMessages, toggleMute, handleUpdateNickname, handleBlockUser, handleDeleteChat,
        handleAcceptRequest, handleDeclineRequest,
        isEditingNickname, tempNickname, showReportModal, setShowReportModal,
        selectedReportReason, setSelectedReportReason, isReporting, handleReportUser,
        setTempNickname, setIsEditingNickname,
        loadMoreMessages, isLoadingOlder, isLoadingMessages, hasMoreMessages
    } = useChatWindowActions();
    const navigate = useNavigate();
    const { getRecipientPublicKey, privateKey, keysReady, unlockKeys } = useE2EE();
    const [unlockPassword, setUnlockPassword] = React.useState('');
    const [isUnlocking, setIsUnlocking] = React.useState(false);
    const [unlockError, setUnlockError] = React.useState('');

    const [recipientFingerprint, setRecipientFingerprint] = React.useState<string | null>(null);
    const [showKeyModal, setShowKeyModal] = React.useState(false);

    const [isObscured, setIsObscured] = React.useState(false);
    const { sendMessage } = useSendMessage();

    const { callData, startCall, acceptCall, declineCall, endCall, toggleMuteLocal } = useWebRTC();

    const [showMediaGallery, setShowMediaGallery] = useState(false);
    const [localChatHanger, setLocalChatHanger] = useState<string | null>(null);

    useEffect(() => {
        if (activeChat?.id) {
            const fetchHanger = async () => {
                try {
                    const { data, error } = await supabase
                        .from('user_public_profiles')
                        .select('chat_hanger')
                        .eq('id', activeChat.id)
                        .maybeSingle();
                    if (!error && data && data.chat_hanger) {
                        setLocalChatHanger(data.chat_hanger);
                    } else {
                        setLocalChatHanger(localStorage.getItem(`hanger_${activeChat.id}`) || 'none');
                    }
                } catch {
                    setLocalChatHanger(localStorage.getItem(`hanger_${activeChat.id}`) || 'none');
                }
            };
            fetchHanger();
        } else {
            setLocalChatHanger(null);
        }
    }, [activeChat?.id]);

    const { user } = useAuthContext();
    const { privateChatSecurity } = useSecurityContext();
    const { playPopSound } = useChatSound();

    const { isTyping, broadcastTyping, participantsOnline } = useChatEvents({
        conversationId: activeChat?.conversationId || null,
        currentUserId: user?.id || null,
        recipientId: activeChat?.id || null,
        onNewMessage: async (msg) => {
            if (activeChat && privateKey && user) {
                let decryptedText = msg.encryptedContent;
                try {
                    decryptedText = await decryptHybridMessage(privateKey, user.id, msg.senderId, msg.encryptedContent);
                } catch (err) {
                    console.error("Failed to decrypt real-time message", err);
                }
                const decryptedMsg = { ...msg, encryptedContent: decryptedText };

                setAllMessages(prev => {
                    const chatArray = prev[activeChat.id] || [];
                    // Deduplicate existing + incoming by ID
                    const existingMap = new Map();
                    chatArray.forEach(m => existingMap.set(m.id, m));

                    // If we already have the optimistic version, replace it, otherwise append.
                    let isNew = false;
                    if (msg.metadata?.tempId && existingMap.has(msg.metadata.tempId)) {
                        existingMap.delete(msg.metadata.tempId);
                    } else if (!existingMap.has(decryptedMsg.id)) {
                        isNew = true;
                    }
                    existingMap.set(decryptedMsg.id, decryptedMsg);

                    if (isNew) {
                        const isMe = msg.senderId === user.id;
                        playPopSound(isMe ? 'send' : 'receive');

                        // Update contact snippet properly with decrypted text
                        const isImage = decryptedText.startsWith('[IMAGE]');
                        const isAudio = decryptedText.startsWith('[AUDIO]');
                        const isSystem = decryptedText.startsWith('????');
                        const snippet = isSystem
                            ? t('systemActionAlerts')
                            : isImage
                              ? t('photoAttached')
                              : isAudio
                                ? t('voiceMessageSnippet')
                                : decryptedText;

                        setContacts(prev => prev.map(c =>
                            c.id === activeChat.id
                                ? { ...c, lastMessage: snippet, time: new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }) }
                                : c
                        ));
                    }

                    const finalSorted = Array.from(existingMap.values());

                    import('idb-keyval').then(({ set }) => {
                        set(`chat_cache_${activeChat.id}`, finalSorted).catch(console.warn);
                    });

                    return { ...prev, [activeChat.id]: finalSorted };
                });
            }
        }
    });

    const [isPanicMode, setIsPanicMode] = useState(false);
    const sendMessageRef = React.useRef(sendMessage);
    React.useEffect(() => {
        sendMessageRef.current = sendMessage;
    }, [sendMessage]);

    React.useEffect(() => {
        const checkPanic = () => {
            if (sessionStorage.getItem('panic_mode') === 'true') {
                setIsPanicMode(true);
            }
        };
        checkPanic();
        window.addEventListener('panic-mode-activated', checkPanic);
        return () => window.removeEventListener('panic-mode-activated', checkPanic);
    }, []);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!unlockPassword || isUnlocking) return;
        setIsUnlocking(true);
        setUnlockError('');
        const success = await unlockKeys(unlockPassword);
        setIsUnlocking(false);
        if (!success) setUnlockError(t('unlockError'));
        else setUnlockPassword('');
    };

    React.useEffect(() => {
        // Screenshot protection temporarily disabled
        return;
    }, [activeChat, sendMessage]);

    React.useEffect(() => {
        if (!activeChat) {
            setRecipientFingerprint(null);
            return;
        }
        let isMounted = true;
        getRecipientPublicKey(activeChat.id).then(pubKey => {
            if (pubKey && isMounted) {
                getPublicKeyFingerprint(pubKey).then(fingerprint => {
                    if (isMounted) setRecipientFingerprint(fingerprint);
                });
            } else if (isMounted) {
                setRecipientFingerprint(null);
            }
        });
        return () => { isMounted = false; };
    }, [activeChat, getRecipientPublicKey]);

    if (isPanicMode) {
        return (
            <div className="flex-1 w-full h-full bg-white flex flex-col items-center justify-center relative p-8 text-center text-gray-800 rounded-lg">
                <div className="w-24 h-24 mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-4xl">📚</span>
                </div>
                <h1 className="text-3xl font-bold text-blue-900 mb-4">{t('panicMode.title')}</h1>
                <p className="max-w-md text-gray-600 mb-8">
                    {t('panicMode.description')}
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-lg w-full">
                    <div className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer">
                        <h3 className="font-bold">{t('panicMode.cardOneTitle')}</h3>
                        <p className="text-sm text-gray-500">{t('panicMode.cardOneDescription')}</p>
                    </div>
                    <div className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer">
                        <h3 className="font-bold">{t('panicMode.cardTwoTitle')}</h3>
                        <p className="text-sm text-gray-500">{t('panicMode.cardTwoDescription')}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!activeChat) {
        return (
            <div className={`flex-1 flex flex-col h-full relative z-10 hidden md:flex`}>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className={`w-36 h-36 mb-8 rounded-full flex items-center justify-center ${isDark ? 'bg-secondary/10' : 'bg-primary/10'}`}
                    >
                        <div className={`w-28 h-28 rounded-full flex items-center justify-center ${isDark ? 'bg-secondary/20' : 'bg-primary/15'}`}>
                            <Send size={44} className={isDark ? 'text-secondary-foreground' : 'text-primary-foreground'} />
                        </div>
                    </motion.div>
                    <h2 className="text-3xl font-bold mb-3 tracking-tight">{t('emptyState.directMessages')}</h2>
                    <p className={`max-w-sm text-[16px] leading-relaxed mb-8 ${isDark ? 'text-foreground' : 'text-foreground'}`}>
                        {t('emptyState.selectConversation')}
                    </p>
                    <Button
                        variant={isDark ? "outline" : "default"}
                        size="lg"
                        className="rounded-2xl font-bold shadow-lg flex items-center gap-2"
                        rightIcon={<Plus size={20} strokeWidth={3} />}
                    >
                        {t('emptyState.startConversation')}
                    </Button>
                </div>
            </div>
        );
    }

    const isMuted = mutedChatIds.includes(activeChat.id);
    const chatName = nicknames[activeChat.id] || activeChat.name;
    const formatLastSeen = React.useCallback((value: string) => {
        const seen = new Date(value);
        const now = new Date();
        const diff = Math.floor((now.getTime() - seen.getTime()) / 1000);

        if (diff < 60) return t('justNow');
        if (diff < 3600) return t('minutesAgo', { count: Math.floor(diff / 60) });
        if (diff < 86400) return t('hoursAgo', { count: Math.floor(diff / 3600) });
        if (diff < 172800) return t('yesterday');
        return seen.toLocaleDateString(i18n.language, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [i18n.language, t]);

    const isRequest = activeChat?.lastMessageMetadata?.message_status === 'pending' && activeChat?.lastMessageSenderId !== user?.id;

    return (
        <div className={`flex-1 flex flex-col h-full relative z-10 overflow-hidden`}>

            <AnimatePresence>
                {isObscured && (
                    <motion.div
                        id="privacy-shield"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="absolute inset-0 z-[5000] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="flex flex-col items-center"
                        >
                            <div className="relative mb-6">
                                <Eye size={64} className="text-primary/40" />
                                <ShieldAlert size={32} className="text-red-500 absolute -bottom-2 -right-2" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">{t('privacyProtectionActive')}</h3>
                            <p className="opacity-70 font-medium">{t('privacyProtectionDescription')}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!privateKey && keysReady && (
                <div className={`p-5 border-b flex flex-col items-center gap-3 relative z-[100] animate-in fade-in slide-in-from-top duration-500 ${isDark ? 'bg-amber-500/15 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-[15px]">
                        <div className="p-2 rounded-full bg-amber-500/10">
                            <ShieldAlert size={20} />
                        </div>
                        <span>{t('securityKeyRequired')}</span>
                    </div>
                    <p className={`text-xs text-center max-w-sm mb-1 opacity-80 ${isDark ? 'text-amber-100/60' : 'text-amber-800/60'}`}>
                        {t('securityKeyDescription')}
                    </p>
                    <form onSubmit={handleUnlock} className="flex gap-2 w-full max-w-sm">
                        <input
                            type="password"
                            value={unlockPassword}
                            onChange={(e) => setUnlockPassword(e.target.value)}
                            placeholder={t('enterPassword')}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-sm border focus:ring-2 outline-none transition-all ${isDark ? 'bg-background/50 border-white/10 focus:ring-amber-500/30 text-foreground' : 'bg-white border-gray-200 focus:ring-amber-500/30'}`}
                        />
                        <Button
                            type="submit"
                            isLoading={isUnlocking}
                            variant="destructive"
                            className="px-6 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/10"
                        >
                            {isUnlocking ? t('unlocking') : t('unlock')}
                        </Button>
                    </form>
                    {unlockError && (
                        <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-full">
                            {unlockError}
                        </motion.p>
                    )}
                </div>
            )}

            <CallOverlay
                callData={callData}
                onAccept={acceptCall}
                onDecline={declineCall}
                onEnd={endCall}
                onToggleMute={toggleMuteLocal}
                isDark={isDark}
            />

            {/* Doodle Background */}
            <div className={`absolute inset-0 opacity-[0.025] pointer-events-none ${isDark ? 'invert' : ''}`}
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23808080\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")', zIndex: 0 }}
            />

            <OfflineBanner />

            {/* ── Chat Header ── */}
            <div className={`h-[76px] rounded-b-[2.5rem] mb-2 flex items-center justify-between px-6 shrink-0 relative z-20 transition-all shadow-md ${isDark ? 'bg-[#1e1e24] shadow-black/20' : 'bg-white shadow-gray-200/50'}`}>
                <div className="flex items-center gap-3 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setActiveChat(null)}
                    >
                        <ArrowRight size={24} className="rotate-180" />
                    </Button>
                    <div
                        className="relative cursor-pointer z-10"
                        onClick={() => navigate(`/profile/${activeChat.id}`)}
                    >
                        <Avatar
                            src={activeChat.avatar}
                            name={chatName}
                            size={44}
                            isOnline={activeChat.online}
                            className={isDark ? 'bg-background' : 'bg-background'}
                            frameId={activeChat.avatarFrame}
                        />
                        <ChatHanger hangerId={localChatHanger || activeChat.chatHanger} />
                    </div>
                    <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/profile/${activeChat.id}`)}
                    >
                        <h2 className="font-bold text-[17px] flex items-center gap-1.5">{chatName}{isUserVerified(activeChat.email) && <VerifiedBadge size={16} />}</h2>
                        <p className={`text-xs ${isDark ? 'text-foreground/60' : 'text-foreground/50'}`}>
                            {isTyping
                                ? <span className={isDark ? 'text-secondary-foreground font-medium' : 'text-primary-foreground font-medium'}>{t('typingStatus')}</span>
                                : participantsOnline.includes(activeChat.id) || activeChat.online
                                    ? <span className="text-emerald-500 font-medium">{t('onlineNow')}</span>
                                    : activeChat.lastSeen
                                        ? t('lastSeen', { time: formatLastSeen(activeChat.lastSeen) })
                                        : t('lastSeenRecently')
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative">


                    {recipientFingerprint && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowKeyModal(true)}
                            className={`transition-all cursor-pointer rounded-full ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                            title={t('e2eeTitle')}
                        >
                            <ShieldCheck size={19} />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startCall(activeChat.id, nicknames[activeChat.id] || activeChat.name, activeChat.avatar)}
                        title={t('voiceCall')}
                        className="cursor-pointer rounded-full"
                    >
                        <Phone size={19} />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowMediaGallery(true)}
                        className="cursor-pointer rounded-full"
                        title={t('mediaGallery')}
                    >
                        <Grid3X3 size={19} />
                    </Button>
                    <Button
                        variant={showDetails ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setShowDetails(!showDetails)}
                        className={`cursor-pointer rounded-full ${showDetails ? (isDark ? 'bg-secondary/20 text-secondary-foreground' : 'bg-primary/10 text-primary-foreground') : ''}`}
                        title={t('conversationDetails')}
                    >
                        <Info size={19} />
                    </Button>
                </div>
            </div>

            {/* Fingerprint Modal */}
            <AnimatePresence>
                {showKeyModal && recipientFingerprint && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowKeyModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className={`relative w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl ${isDark ? 'bg-[#1a1c23] border border-white/10' : 'bg-white'}`}
                        >
                            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('e2eeTitle')}</h3>
                            <p className="opacity-70 text-sm mb-6">
                                {t('e2eeModalDescription', { name: chatName })}
                            </p>
                            <div className={`p-4 rounded-xl mb-6 font-mono text-sm tracking-widest break-all ${isDark ? 'bg-black/30 text-emerald-400' : 'bg-gray-50 text-emerald-600 border border-gray-100'}`}>
                                {recipientFingerprint}
                            </div>
                            <Button
                                onClick={() => setShowKeyModal(false)}
                                variant="default"
                                className="w-full h-12 rounded-xl font-bold"
                            >
                                {tCommon('close')}
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 overflow-hidden flex flex-col relative z-20">
                    <MessageList
                        currentMessages={currentMessages}
                        loadMore={loadMoreMessages}
                        isLoadingOlder={isLoadingOlder}
                        hasMoreMessages={hasMoreMessages}
                        isTyping={isTyping}
                        isLoadingMessages={isLoadingMessages}
                    />
                    {isRequest ? (
                        <div className={`px-4 py-6 border-t flex flex-col items-center gap-3 shrink-0 ${isDark ? 'bg-background border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                            <p className="text-sm font-medium mb-1">{t('requestPrompt', { name: chatName })}</p>
                            <div className="flex gap-3 w-full max-w-xs">
                                <Button variant="destructive" className="flex-1 rounded-xl shadow-sm h-11" onClick={handleDeclineRequest}>{tCommon('decline')}</Button>
                                <Button variant="default" className="flex-1 rounded-xl shadow-sm h-11" onClick={handleAcceptRequest}>{tCommon('accept')}</Button>
                            </div>
                        </div>
                    ) : (
                        <ChatInput broadcastTyping={broadcastTyping} />
                    )}
                </div>

                {/* ── Chat Details ── */}
                <AnimatePresence>
                    {showDetails && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`w-[320px] md:w-[360px] h-full border-l flex flex-col z-30 bg-background ${isDark ? 'border-[#2a2d3a]' : 'border-gray-200'}`}
                        >
                            <div className={`h-[76px] flex items-center px-6 border-b shrink-0 ${isDark ? 'border-[#2a2d3a]' : 'border-gray-200'}`}>
                                <h3 className="font-bold text-lg">{t('details')}</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                {/* Mute Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                                            {isMuted ? <BellOff size={20} className="text-foreground opacity-70" /> : <Bell size={20} />}
                                        </div>
                                        <span className="font-medium">{t('muteMessages')}</span>
                                    </div>
                                    <button
                                        onClick={toggleMute}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${isMuted ? 'bg-primary' : (isDark ? 'bg-white/10' : 'bg-black/10')}`}
                                    >
                                        <motion.div
                                            animate={{ x: isMuted ? 22 : 4 }}
                                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                        />
                                    </button>
                                </div>

                                {/* Members Section */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-foreground opacity-50 uppercase tracking-wider">{t('members')}</h4>
                                    <div
                                        onClick={() => navigate(`/profile/${activeChat.id}`)}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <div className="relative">
                                            <Avatar
                                                src={activeChat.avatar}
                                                name={chatName}
                                                size={48}
                                                isOnline={activeChat.online}
                                                className="transition-all"
                                                frameId={activeChat.avatarFrame}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate group-hover:text-primary transition-colors">{chatName}</p>
                                            <p className="text-xs text-foreground opacity-50 truncate">@{activeChat.email?.split('@')[0] || tCommon('user').toLowerCase()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Options List */}
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-foreground opacity-50 uppercase tracking-wider mb-4">{t('chatSettings')}</h4>

                                    {isEditingNickname ? (
                                        <div className="py-2 space-y-2">
                                            <input
                                                type="text"
                                                value={tempNickname}
                                                onChange={(e) => setTempNickname(e.target.value)}
                                                placeholder={t('enterNickname')}
                                                autoFocus
                                                className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 ${isDark ? 'bg-background border-white/10 focus:ring-secondary/50' : 'bg-gray-50 border-gray-200 focus:ring-primary/50'}`}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={handleUpdateNickname}
                                                    variant="default"
                                                    size="sm"
                                                    className="flex-1 font-bold h-9"
                                                >
                                                    {tCommon('save')}
                                                </Button>
                                                <Button
                                                    onClick={() => setIsEditingNickname(false)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 font-bold h-9"
                                                >
                                                    {tCommon('cancel')}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setTempNickname(chatName);
                                                setIsEditingNickname(true);
                                            }}
                                            className={`w-full flex items-center gap-3 py-3 px-1 transition-opacity hover:opacity-70`}
                                        >
                                            <span className="flex-1 text-left font-medium">{t('changeNicknames')}</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={handleBlockUser}
                                        className={`w-full flex items-center gap-3 py-3 px-1 text-red-500 transition-opacity hover:opacity-70`}
                                    >
                                        <span className="flex-1 text-left font-medium">{blockedIds.includes(activeChat.id) ? t('unblock') : t('block')}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowReportModal(true)}
                                        className={`w-full flex items-center gap-3 py-3 px-1 text-red-500 transition-opacity hover:opacity-70`}
                                    >
                                        <span className="flex-1 text-left font-medium">{t('report')}</span>
                                    </button>
                                    <button
                                        onClick={handleDeleteChat}
                                        className={`w-full flex items-center gap-3 py-3 px-1 text-red-500 transition-opacity hover:opacity-70`}
                                    >
                                        <span className="flex-1 text-left font-medium">{t('deleteChat')}</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ═══════════ REPORT MODAL ═══════════ */}
            <AnimatePresence>
                {showReportModal && activeChat && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReportModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] ${isDark ? 'bg-[#1a1c23] border border-white/10' : 'bg-white'
                                }`}
                        >
                            {/* Header */}
                            <div className={`p-4 border-b flex items-center justify-between sticky top-0 bg-inherit z-10 ${isDark ? 'border-white/10' : 'border-gray-100'
                                }`}>
                                {selectedReportReason ? (
                                    <button onClick={() => setSelectedReportReason(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                        <ArrowRight size={20} className="rotate-180" />
                                    </button>
                                ) : (
                                    <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                )}
                                <h3 className="font-bold text-center flex-1">{t('reportTitle')}</h3>
                                <button onClick={() => {
                                    setShowReportModal(false);
                                    setSelectedReportReason(null);
                                }} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                    <X size={20} className={selectedReportReason ? 'opacity-100' : 'opacity-0'} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                                <AnimatePresence mode="wait">
                                    {!selectedReportReason ? (
                                        <motion.div
                                            key="list"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="p-5"
                                        >
                                            <h4 className="font-bold text-lg mb-1">{t('selectProblemToReport')}</h4>
                                            <p className="text-sm opacity-60 mb-6">{t('reportAnonymousNotice')}</p>

                                            <div className="space-y-1">
                                                {REPORT_REASONS.map((reason) => (
                                                    <button
                                                        key={reason.value}
                                                        onClick={() => setSelectedReportReason(reason)}
                                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all group ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="font-medium text-[15px]">{t(reason.titleKey)}</span>
                                                        <ChevronDown size={18} className="-rotate-90 opacity-30 group-hover:opacity-100 transition-all" />
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="guidelines"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="p-6"
                                        >
                                            <h4 className="font-bold text-xl mb-4">{t('reportGuidelinesTitle', { title: t(selectedReportReason.titleKey) })}</h4>
                                            <div className="space-y-4 mb-8">
                                                {t(selectedReportReason.guidelinesKey).split('\n').map((line: string, i: number) => (
                                                    <p key={i} className={line.trim().startsWith('?') || line.trim().startsWith('???') ? "text-[15px] pl-2 opacity-80" : "font-bold text-[16px] opacity-100"}>
                                                        {line}
                                                    </p>
                                                ))}
                                            </div>

                                            <Button
                                                onClick={() => handleReportUser(selectedReportReason.value)}
                                                isLoading={isReporting}
                                                variant="destructive"
                                                size="lg"
                                                className="w-full h-14 rounded-2xl font-bold"
                                            >
                                                {isReporting ? t('submitting') : t('submitReport')}
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Media Gallery Overlay */}
            {activeChat?.conversationId && (
                <MediaGallery
                    conversationId={activeChat.conversationId}
                    isOpen={showMediaGallery}
                    onClose={() => setShowMediaGallery(false)}
                />
            )}
        </div>
    );
}

// Helper hook for actions
function useChatWindowActions() {
    const activeChat = useChatStore(s => s.activeChat);
    const setActiveChat = useChatStore(s => s.setActiveChat);
    const setAllMessages = useChatStore(s => s.setAllMessages);
    const setContacts = useChatStore(s => s.setContacts);
    const blockedIds = useChatStore(s => s.blockedIds);
    const setBlockedIds = useChatStore(s => s.setBlockedIds);
    const nicknames = useChatStore(s => s.nicknames);
    const setNicknames = useChatStore(s => s.setNicknames);
    const setShowDetails = useChatStore(s => s.setShowDetails);
    const mutedChatIds = useChatStore(s => s.mutedChatIds);
    const setMutedChatIds = useChatStore(s => s.setMutedChatIds);

    const { currentMessages, loadMoreMessages, isLoadingOlder, isLoadingMessages, hasMoreMessages } = useChat();
    const { user } = useAuthContext();
    const { t } = useTranslation('chat');
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [tempNickname, setTempNickname] = useState('');
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedReportReason, setSelectedReportReason] = useState<ReportReason | null>(null);
    const [isReporting, setIsReportingLoading] = useState(false);

    const handleReportUser = async (reason: string) => {
        if (!activeChat || !user) return;

        setIsReportingLoading(true);
        try {
            const { error } = await supabase
                .from('reports')
                .insert({
                    reporter_id: user.id,
                    reported_id: activeChat.id,
                    reason: reason
                });

            if (error) throw error;

            alert(t('reportThankYou'));
            setShowReportModal(false);
            setShowDetails(false);
        } catch (err) {
            console.error("Error submitting report:", err);
            alert(t('reportFailed'));
        } finally {
            setIsReportingLoading(false);
        }
    };

    const toggleMute = useCallback(() => {
        if (!activeChat) return;
        setMutedChatIds(prev =>
            prev.includes(activeChat.id)
                ? prev.filter(id => id !== activeChat.id)
                : [...prev, activeChat.id]
        );
    }, [activeChat, setMutedChatIds]);

    const handleUpdateNickname = () => {
        if (!activeChat) return;
        setNicknames(prev => ({
            ...prev,
            [activeChat.id]: tempNickname.trim() || prev[activeChat.id] || ''
        }));
        setIsEditingNickname(false);
    };

    const handleBlockUser = useCallback(async () => {
        if (!activeChat || !user) return;
        const isCurrentlyBlocked = blockedIds.includes(activeChat.id);
        if (isCurrentlyBlocked) {
            setBlockedIds(prev => prev.filter(id => id !== activeChat.id));
            setShowDetails(false);
            return;
        }
        if (confirm(t('blockConfirm', { name: nicknames[activeChat.id] || activeChat.name }))) {
            setBlockedIds(prev => [...new Set([...prev, activeChat.id])]);
            setShowDetails(false);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                await fetch(`/api/follow/${activeChat.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (err) {
                console.error("Error removing follows during block", err);
            }
        }
    }, [activeChat, nicknames, blockedIds, setBlockedIds, setShowDetails, user]);

    const handleDeleteChat = useCallback(async () => {
        if (!activeChat || !user) return;
        const confirmDelete = confirm(t('deleteConversationConfirm', { name: nicknames[activeChat.id] || activeChat.name }));
        if (!confirmDelete) return;
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('conversation_id', activeChat.conversationId);
            if (error) throw error;
            setAllMessages(prev => {
                const updated = { ...prev };
                delete updated[activeChat.id];
                return updated;
            });
            setContacts(prev => prev.map(c =>
                c.id === activeChat.id ? { ...c, lastMessage: '', time: '' } : c
            ));
            setActiveChat(null);
            setShowDetails(false);
        } catch (err) {
            console.error("Error deleting chat:", err);
            alert(t('deleteChatFailed'));
        }
    }, [activeChat, user, nicknames, setAllMessages, setContacts, setActiveChat, setShowDetails]);

    const handleAcceptRequest = useCallback(async () => {
        if (!activeChat || !user) return;
        try {
            // Immediately mark it active in UI
            const updatedMetadata = { ...(activeChat.lastMessageMetadata || {}), message_status: 'active' };
            setContacts(prev => prev.map(c => c.id === activeChat.id ? { ...c, lastMessageMetadata: updatedMetadata } : c));

            // Follow the user to make future messages active automatically
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            await fetch(`/api/follow/${activeChat.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (err) {
            console.error(err);
        }
    }, [activeChat, user, setContacts]);

    const handleDeclineRequest = useCallback(async () => {
        if (!activeChat || !user) return;
        // Decline = Delete + Block
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Delete messages
            await fetch(`/api/messages/conversation/${activeChat.conversationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            // Block
            setBlockedIds(prev => [...new Set([...prev, activeChat.id])]);

            // Clean up UI
            setAllMessages(prev => {
                const updated = { ...prev };
                delete updated[activeChat.id];
                return updated;
            });
            setContacts(prev => prev.map(c =>
                c.id === activeChat.id ? { ...c, lastMessage: '', time: '' } : c
            ));
            setActiveChat(null);
            setShowDetails(false);
        } catch (err) {
            console.error("Error declining request:", err);
        }
    }, [activeChat, user, setBlockedIds, setAllMessages, setContacts, setActiveChat, setShowDetails]);

    return {
        currentMessages,
        toggleMute,
        handleUpdateNickname,
        handleBlockUser,
        handleDeleteChat,
        handleAcceptRequest,
        handleDeclineRequest,
        isEditingNickname,
        setIsEditingNickname,
        tempNickname,
        setTempNickname,
        showReportModal,
        setShowReportModal,
        selectedReportReason,
        setSelectedReportReason,
        isReporting,
        handleReportUser,
        loadMoreMessages,
        isLoadingOlder,
        isLoadingMessages,
        hasMoreMessages
    };
}


