import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useChat } from '@/features/chat';
import { useChatStore } from '../../store/chatStore';
import { SidebarSearch } from '../molecules/SidebarSearch';
import { ConversationItem } from '../molecules/ConversationItem';

interface ChatSidebarProps {
  isDark: boolean;
}

export function ChatSidebar({ isDark }: ChatSidebarProps) {
  const navigate = useNavigate();
  const activeChat = useChatStore(s => s.activeChat);
  const setActiveChat = useChatStore(s => s.setActiveChat);
  const nicknames = useChatStore(s => s.nicknames);
  const mutedChatIds = useChatStore(s => s.mutedChatIds);
  const searchQuery = useChatStore(s => s.searchQuery);
  const setSearchQuery = useChatStore(s => s.setSearchQuery);
  const { filteredContacts, requestContacts, isSearchingGlobal } = useChat();

  const [activeTab, setActiveTab] = useState<'primary' | 'requests'>('primary');
  const currentList = activeTab === 'primary' ? filteredContacts : requestContacts;

  return (
    <div className={`w-full md:w-[380px] lg:w-[420px] flex flex-col h-full shrink-0 border-r transition-colors duration-300 relative z-10 ${isDark ? 'border-white/[0.08] bg-background backdrop-blur-3xl' : 'border-gray-200/60 bg-background/80 backdrop-blur-xl'
      } ${activeChat ? 'hidden md:flex' : 'flex'}`}>
      {/* Header + Search (sticky) */}
      <div className="sticky top-0 z-20 bg-transparent">
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className={`p-2.5 rounded-full transition-all cursor-pointer ${isDark ? 'hover:bg-white/10 text-foreground' : 'hover:bg-black/5 text-foreground'}`}
              title="Go Back"
            >
              <ArrowRight size={22} className="rotate-180" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => navigate('/chat')}
              className={`p-2.5 rounded-full transition-all cursor-pointer text-primary hover:bg-primary/10`}
              title="Video Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/>
                <rect x="2" y="6" width="14" height="12" rx="2.5"/>
              </svg>
            </button>

            <button 
              className={`p-2.5 rounded-full transition-all cursor-pointer ${isDark ? 'hover:bg-white/10 text-foreground' : 'hover:bg-black/5 text-foreground'}`}
              title="New Message"
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 pb-3">
            <div className={`flex items-center gap-1 p-1 rounded-2xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100/50'}`}>
                <button
                    onClick={() => setActiveTab('primary')}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                        activeTab === 'primary' 
                        ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm') 
                        : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-500 hover:text-gray-700')
                    }`}
                >
                    Primary
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'requests' 
                        ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm') 
                        : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-500 hover:text-gray-700')
                    }`}
                >
                    Requests
                    {requestContacts?.length > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'requests' ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-500'}`}>
                            {requestContacts.length}
                        </span>
                    )}
                </button>
            </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <SidebarSearch 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            isDark={isDark} 
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-0.5 pb-4">
        {/* Instagram-style skeleton on initial load (primary tab only) */}
        {activeTab === 'primary' && currentList.length === 0 && !searchQuery.trim() && !isSearchingGlobal && (
          <div className="px-1 pt-1">
            <InboxSkeleton isDark={isDark} />
          </div>
        )}

        {/* Empty state for Requests tab */}
        {activeTab === 'requests' && requestContacts.length === 0 && !searchQuery.trim() && !isSearchingGlobal && (
          <RequestsEmptyState isDark={isDark} />
        )}

        {currentList.length === 0 && searchQuery.trim() && !isSearchingGlobal && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={40} className="text-foreground/40 mb-4" />
            <p className="text-foreground text-sm">No results for "{searchQuery}"</p>
          </div>
        )}

        {isSearchingGlobal && (
          <div className="px-1 pt-1">
            <InboxSkeleton isDark={isDark} count={3} />
          </div>
        )}

        <AnimatePresence>
          {currentList.map((contact, index) => (
            <motion.div key={contact.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <ConversationItem
                contact={contact}
                index={index}
                isActive={activeChat?.id === contact.id}
                isDark={isDark}
                nicknames={nicknames}
                mutedChatIds={mutedChatIds}
                onSelect={setActiveChat}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RequestsEmptyState({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center px-8 py-16 text-center select-none"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        {/* Outer glow ring */}
        <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ transform: 'scale(1.5)' }} />
        
        {/* Main circle with stacked message bubbles */}
        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${isDark ? 'bg-white/[0.06] border border-white/10' : 'bg-gray-100 border border-gray-200'}`}>
          {/* Message bubbles illustration */}
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Back bubble */}
            <rect x="10" y="16" width="28" height="20" rx="10" fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
            {/* Front bubble */}
            <rect x="6" y="10" width="32" height="22" rx="11" fill={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} />
            {/* Lines */}
            <rect x="13" y="17" width="16" height="2.5" rx="1.25" fill={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
            <rect x="13" y="22" width="10" height="2.5" rx="1.25" fill={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'} />
            {/* Lock icon */}
            <circle cx="38" cy="36" r="9" fill={isDark ? '#3b82f6' : '#2563eb'} />
            <rect x="34.5" y="36" width="7" height="5" rx="1.5" fill="white" />
            <path d="M35.5 36V34.5C35.5 33.1 36.5 32 38 32C39.5 32 40.5 33.1 40.5 34.5V36" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Message Requests
      </h3>

      {/* Description */}
      <p className={`text-sm leading-relaxed max-w-[230px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        When someone who isn't in your contacts sends you a message, it will appear here.
      </p>

      {/* Tip */}
      <div className={`mt-6 px-4 py-3 rounded-2xl text-xs font-medium flex items-start gap-2.5 text-left max-w-[250px] ${isDark ? 'bg-white/[0.05] border border-white/[0.07] text-white/40' : 'bg-gray-100/80 border border-gray-200/60 text-gray-500'}`}>
        <span className="text-base leading-none mt-0.5">💡</span>
        <span>You can accept or decline requests. Accepted requests move to your primary inbox.</span>
      </div>
    </motion.div>
  );
}

function InboxSkeleton({ isDark, count = 8 }: { isDark: boolean; count?: number }) {
  const bar = isDark ? 'bg-white/[0.06]' : 'bg-gray-200/80';
  const barSub = isDark ? 'bg-white/[0.04]' : 'bg-gray-200/50';
  const widths = [55, 40, 65, 48, 58, 42, 52, 60];
  const subWidths = [70, 50, 45, 62, 55, 68, 40, 58];

  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
          <div className={`w-[52px] h-[52px] rounded-full shrink-0 ${bar}`} />
          <div className="flex-1 min-w-0">
            <div className={`h-[11px] rounded-full mb-2.5 ${bar}`} style={{ width: `${widths[i % widths.length]}%` }} />
            <div className={`h-[9px] rounded-full ${barSub}`} style={{ width: `${subWidths[i % subWidths.length]}%` }} />
          </div>
          <div className={`h-[8px] w-8 rounded-full shrink-0 self-start mt-1 ${barSub}`} />
        </div>
      ))}
    </div>
  );
}
