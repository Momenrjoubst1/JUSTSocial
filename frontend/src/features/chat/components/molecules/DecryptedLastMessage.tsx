import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useE2EE } from '@/features/chat/hooks/useE2EE';
import { decryptHybridMessage } from '@/features/chat/services/crypto';
import { EmojiText } from '@/components/ui/EmojiText';
import { useTranslation } from 'react-i18next';

interface DecryptedLastMessageProps {
  payload: string;
  isActive: boolean;
  unread: number;
  isDark: boolean;
  lastMessageSenderId?: string;
  otherUserId: string;
}

export function DecryptedLastMessage({ 
  payload, isActive, unread, isDark, lastMessageSenderId, otherUserId 
}: DecryptedLastMessageProps) {
  const { t } = useTranslation('chat');
  const { user } = useAuthContext();
  const { privateKey } = useE2EE();
  const [decryptedText, setDecryptedText] = useState<string>(t('encryptedMessage'));

  useEffect(() => {
    let isMounted = true;
    if (!payload) {
      if (isMounted) setDecryptedText('');
      return;
    }

    if (!payload.startsWith('E2EE:')) {
      if (isMounted) setDecryptedText(payload);
      return;
    }

    if (!privateKey || !user?.id) {
      if (isMounted) setDecryptedText(t('encryptedMessage'));
      return;
    }

    const decrypt = async () => {
      try {
        const targetUserId = (lastMessageSenderId === user.id) ? user.id : otherUserId;
        const result = await decryptHybridMessage(privateKey, user.id, targetUserId, payload);

        if (result.includes("فشل فك التشفير") || result.includes("Corrupted")) {
          if (isMounted) setDecryptedText(t('decryptionFailed'));
          return;
        }

        // If the decrypted payload is an image placeholder, show a friendly label
        if (result.startsWith('[IMAGE]')) {
          if (isMounted) setDecryptedText(t('photo'));
        } else {
          if (isMounted) setDecryptedText(result);
        }
      } catch (e) {
        if (isMounted) setDecryptedText(t('decryptionFailed'));
      }
    };
    
    decrypt();
    return () => { isMounted = false; };
  }, [lastMessageSenderId, otherUserId, payload, privateKey, t, user?.id]);

  if (isActive) return null;

  return (
    <p className={`text-[13px] truncate ${unread > 0 ? (isDark ? 'text-foreground font-medium' : 'text-foreground font-semibold') : 'text-foreground'}`}>
      <EmojiText text={decryptedText} size={14} />
    </p>
  );
}
