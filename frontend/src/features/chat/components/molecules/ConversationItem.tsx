import React from 'react';
import { motion } from 'framer-motion';
import { BellOff } from 'lucide-react';
import { VerifiedBadge, isUserVerified, Avatar } from '@/components/ui/core';
import { TypingDots } from '../atoms/TypingDots';
import { DecryptedLastMessage } from './DecryptedLastMessage';
import { EmojiText } from '@/components/ui/EmojiText';
import { useTranslation } from 'react-i18next';
import { Contact } from '@/features/chat/types/chat.types';

interface ConversationItemProps {
  contact: Contact;
  index: number;
  isActive: boolean;
  isDark: boolean;
  nicknames: Record<string, string>;
  mutedChatIds: string[];
  onSelect: (contact: Contact) => void;
}

export const ConversationItem = React.memo(({ 
  contact, index, isActive, isDark, nicknames, mutedChatIds, onSelect 
}: ConversationItemProps) => {
  const { t } = useTranslation('chat');
  const baseContainerClass = 'flex items-center p-3.5 cursor-pointer transition-all duration-200 rounded-2xl relative group';
  const activeContainerClass = isDark ? 'bg-gradient-to-l from-cyan-500/10 via-cyan-500/5 to-transparent' : 'bg-gradient-to-l from-indigo-500/10 via-indigo-500/5 to-transparent';
  const inactiveContainerClass = isDark ? 'hover:bg-background/[0.03]' : 'hover:bg-background';
  const containerClass = `${baseContainerClass} ${isActive ? activeContainerClass : inactiveContainerClass}`;

  const activeIndicatorClass = `absolute left-0 w-1 h-10 rounded-full ${isDark ? 'bg-secondary' : 'bg-primary'}`;
  const avatarWrapperClass = 'relative mr-4 shrink-0';
  const avatarClass = isDark ? 'bg-background' : 'bg-background border-2 border-white';

  const nameClass = `font-semibold truncate text-[15px] flex items-center gap-1 ${isActive ? (isDark ? 'text-secondary-foreground' : 'text-primary-foreground') : ''}`;
  const timeClass = `text-xs whitespace-nowrap ml-2 ${contact.unread > 0 ? (isDark ? 'text-secondary-foreground font-bold' : 'text-primary-foreground font-bold') : 'text-foreground'}`;
  const messageTextClass = `text-[13px] ${isDark ? 'text-secondary-foreground/80' : 'text-primary-foreground/80'}`;
  const unreadBadgeClass = `min-w-[22px] h-[22px] flex items-center justify-center text-[11px] font-bold rounded-full ml-2 ${isDark ? 'bg-secondary text-foreground' : 'bg-primary text-foreground'}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onSelect(contact)}
      className={containerClass}
    >
      {/* Active Indicator */}
      {isActive && (
        <motion.div
          className={activeIndicatorClass}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Avatar */}
      <motion.div whileHover={{ scale: 1.1 }} className={avatarWrapperClass}>
          <Avatar 
            src={contact.avatar}
            name={contact.name}
            size={52}
            isOnline={contact.online}
            className={avatarClass}
            frameId={contact.avatarFrame}
          />
      </motion.div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className={nameClass}>{nicknames[contact.id] || contact.name}{isUserVerified(contact.email || '') && <VerifiedBadge size={14} />}{mutedChatIds.includes(contact.id) && <BellOff size={12} className="opacity-50 ml-1" />}</h3>
          <span className={timeClass}>{contact.time}</span>
        </div>
        <div className="flex justify-between items-center">
          {contact.typing ? (
            <span className={`${messageTextClass} flex items-center gap-2`}>
              {t('typingStatus')} <TypingDots />
            </span>
          ) : (() => {
            const reactionsMap = { ...(contact.lastMessageMetadata?.reactions || {}) };
            if (contact.lastMessageMetadata?.reaction && contact.lastMessageMetadata?.reaction_by) {
                if (!reactionsMap[contact.lastMessageMetadata.reaction_by]) {
                    reactionsMap[contact.lastMessageMetadata.reaction_by] = contact.lastMessageMetadata.reaction;
                }
            }
            const uniqueEmojis = Array.from(new Set(Object.values(reactionsMap)));
            
            if (uniqueEmojis.length > 0) {
              return (
                <span className={`${messageTextClass} truncate flex items-center gap-1`}>
                   {t('reacted')} {uniqueEmojis.slice(0, 2).map((emoji, i) => (
                       <EmojiText key={i} text={emoji as string} size={14} disableMagnify={true} />
                   ))}
                   {uniqueEmojis.length > 2 && <span className="text-[10px] ml-0.5">...</span>}
                </span>
              );
            }
            return <DecryptedLastMessage payload={contact.lastMessage} isActive={isActive} unread={contact.unread} isDark={isDark} otherUserId={contact.id} lastMessageSenderId={contact.lastMessageSenderId} />;
          })()}
          {contact.unread > 0 && (
            <span className={unreadBadgeClass}>{contact.unread}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ConversationItem.displayName = 'ConversationItem';
