import React from 'react';
import { ChatProvider } from '@/features/chat/ChatProvider';
import { ChatLayout } from '@/features/chat/components/organisms/ChatLayout';
import { SEO } from '@/components/ui/core';

export default function MessagesPage() {
  return (
    <>
      <SEO title="Inbox | SkillSwap" description="Chat and exchange skills securely with end-to-end encryption." />
      <ChatProvider>
        <ChatLayout />
      </ChatProvider>
    </>
  );
}