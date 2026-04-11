import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { Message } from '../../types/chat.types';
import { useChatStore } from '../../store/chatStore';
import { useMessageLogic } from '../../hooks/useMessageLogic';

// Atomic Components
import { UserAvatar } from '../atoms/UserAvatar';
import { ReactionBadge } from '../atoms/ReactionBadge';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { ReactionOverlay } from '../atoms/ReactionOverlay';
import { MessageBubble } from '../molecules/MessageBubble';
import { MessageActions } from '../molecules/MessageActions';
import { shatterElement } from '../../utils/shatterAnimation';

interface MessageItemProps {
    msg: Message;
    isMe: boolean;
    showTime: boolean;
    avatar: string;
    isDark: boolean;
    setContextMenu: (menu: { x: number; y: number; msgId: string }) => void;
    currentMessages: Message[];
    chatName: string;
    isFirstInSequence?: boolean;
    isLastInSequence?: boolean;
    onImageLoad?: () => void;
    isDeleting?: boolean;
    onDeleteComplete?: () => void;
    onEditMessage?: (msgId: string, handler: (newText: string) => Promise<boolean>, canEdit: boolean) => void;
    onUnsendMessage?: (msgId: string, handler: () => Promise<boolean>) => void;
}

export const MessageItem = React.memo(({ 
    msg, 
    isMe, 
    showTime, 
    avatar, 
    isDark, 
    setContextMenu, 
    currentMessages, 
    chatName, 
    isFirstInSequence,
    isLastInSequence,
    onImageLoad,
    isDeleting,
    onDeleteComplete
}: MessageItemProps) => {
    const setReplyingTo = useChatStore(s => s.setReplyingTo);
    const activeChat = useChatStore(s => s.activeChat);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isDeleting && containerRef.current) {
            shatterElement(containerRef.current, {
                duration: 500,
                particleSize: 4,
                spreadX: 3,
                spreadY: -2,
                onComplete: () => {
                    if (onDeleteComplete) onDeleteComplete();
                }
            });
        }
    }, [isDeleting]);

    const isLatestInChat = currentMessages[currentMessages.length - 1]?.id === msg.id;

    const {
        isExpired,
        timeLeftStr,
        isRevealed,
        setIsRevealed,
        showHeartPop,
        setShowHeartPop,
        bubbleControls,
        handleDoubleTap,
        handleReaction,
        isDisappearing,
        canEdit,
        canUnsend,
        handleEditMessage,
        handleUnsendMessage
    } = useMessageLogic(msg, isLatestInChat);

    const isModerated = msg?.encryptedContent?.includes('***') || false;
    const isUnsent = msg.metadata?.is_deleted === true || msg.encryptedContent === '[UNSENT]';
    const isEdited = msg.metadata?.is_edited === true && !isUnsent;

    // Listen for edit confirmations from the MessageList edit dialog
    React.useEffect(() => {
        const editHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.msgId === msg.id && detail?.newText) {
                handleEditMessage(detail.newText);
            }
        };
        const unsendHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.msgId === msg.id) {
                handleUnsendMessage();
            }
        };
        window.addEventListener('edit-message-confirm', editHandler);
        window.addEventListener('unsend-message-confirm', unsendHandler);
        return () => {
            window.removeEventListener('edit-message-confirm', editHandler);
            window.removeEventListener('unsend-message-confirm', unsendHandler);
        };
    }, [msg.id, handleEditMessage, handleUnsendMessage]);

    return (
        <div ref={containerRef} className="space-y-2 origin-top">
            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-2`}>
                {!isMe && (
                    <div className={`${isLastInSequence ? 'opacity-100' : 'opacity-0'} relative transition-opacity duration-300 w-[28px] shrink-0 flex justify-center items-end pb-1`}>
                        <UserAvatar 
                            src={avatar}
                            name={chatName}
                            isOnline={activeChat?.online}
                            size={28}
                        />
                    </div>
                )}
                
                <div className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] md:max-w-[65%] ${msg.status === 'pending' ? 'opacity-60 transition-opacity duration-300' : ''}`}>
                    <motion.div
                        id={`msg-${msg.id}`}
                        animate={bubbleControls}
                        onClick={handleDoubleTap}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, msgId: msg.id });
                        }}
                        onMouseEnter={() => { if (isDisappearing) setIsRevealed(true); }}
                        onMouseLeave={() => { if (isDisappearing) setIsRevealed(false); }}
                        className="relative"
                    >
                        <MessageBubble
                            text={msg.encryptedContent}
                            isMe={isMe}
                            isDark={isDark}
                            isModerated={isModerated}
                            isDisappearing={isDisappearing}
                            isRevealed={isRevealed}
                            replyToId={msg.replyToId ?? undefined}
                            currentMessages={currentMessages}
                            chatName={chatName}
                            onImageLoad={onImageLoad}
                            senderId={msg.senderId}
                            isFirstInSequence={isFirstInSequence}
                            isLastInSequence={isLastInSequence}
                            isEdited={isEdited}
                            isUnsent={isUnsent}
                        >
                            <ReactionOverlay show={showHeartPop} onComplete={() => setShowHeartPop(false)} />
                            
                            {(msg.metadata?.reactions || msg.metadata?.reaction) && (
                                <ReactionBadge 
                                    reactions={msg.metadata.reactions}
                                    reactionType={msg.metadata.reaction}
                                    reactionBy={msg.metadata.reaction_by}
                                    isMe={isMe}
                                />
                            )}
                        </MessageBubble>

                        <MessageActions
                            isMe={isMe}
                            isDark={isDark}
                            onReply={() => setReplyingTo(msg)}
                            onReaction={handleReaction}
                            onMore={(e) => {
                                e.stopPropagation();
                                setContextMenu({ x: (e as any).clientX, y: (e as any).clientY, msgId: msg.id });
                            }}
                        />
                    </motion.div>

                    <div className={`mt-0.5 flex items-center gap-1 opacity-50 text-[10px] font-medium tracking-tighter ${isMe ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                        {isLastInSequence && msg.timestamp}
                        {isEdited && isLastInSequence && (
                            <span className="italic opacity-60">✏️</span>
                        )}

                        {isMe && isLastInSequence && (
                            <StatusIndicator 
                                status={msg.status as any} 
                                isOptimistic={msg.isOptimistic} 
                                isDark={isDark} 
                            />
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
});

MessageItem.displayName = 'MessageItem';
