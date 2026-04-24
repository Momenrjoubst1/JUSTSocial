import React from "react";
import { ChatProvider } from "@/features/chat/ChatProvider";
import { ChatLayout } from "@/features/chat/components/organisms/ChatLayout";
import { SEO } from "@/components/ui/core";
import { useLanguage } from "@/context/LanguageContext";

export default function MessagesPage() {
  const { t } = useLanguage();

  return (
    <>
      <SEO
        title={String(t("messages:seoTitle"))}
        description={String(t("messages:seoDescription"))}
      />
      <ChatProvider>
        <ChatLayout />
      </ChatProvider>
    </>
  );
}
