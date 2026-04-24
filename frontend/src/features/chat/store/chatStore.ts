import { create } from 'zustand';
import { Contact, Message } from '@/features/chat/types/chat.types';

export interface ChatStore {
    contacts: Contact[];
    setContacts: (updater: Contact[] | ((prev: Contact[]) => Contact[])) => void;
    
    activeChat: Contact | null;
    setActiveChat: (contact: Contact | null) => void;
    activeChatSync: (contact: Contact | null) => void; // Internal sync

    allMessages: Record<string, Message[]>;
    setAllMessages: (updater: Record<string, Message[]> | ((prev: Record<string, Message[]>) => Record<string, Message[]>)) => void;
    
    replyingTo: Message | null;
    setReplyingTo: (msg: Message | null) => void;
    
    blockedIds: string[];
    setBlockedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
    
    mutedChatIds: string[];
    setMutedChatIds: (updater: string[] | ((prev: string[]) => string[])) => void;
    
    nicknames: Record<string, string>;
    setNicknames: (updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
    
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    
    showDetails: boolean;
    setShowDetails: (show: boolean) => void;
    

    forwardingMessage: Message | null;
    setForwardingMessage: (msg: Message | null) => void;
    
    latestMessage: { senderName: string, text: string } | null;
    setLatestMessage: (msg: { senderName: string, text: string } | null) => void;
    
    totalUnreadCount: number;

    resetChatState: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
    contacts: [],
    setContacts: (updater) => {
        set((state) => {
            const next = typeof updater === 'function' ? updater(state.contacts) : updater;
            return {
                contacts: next,
                totalUnreadCount: next.reduce((sum, c) => sum + (c.unread || 0), 0)
            };
        });
    },

    activeChat: null,
    setActiveChat: (contact) => {
        set({ activeChat: contact });
        if (contact) {
            get().setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));
        }
    },
    // Used to quietly sync without resetting unread badge blindly if not needed
    activeChatSync: (contact) => {
        set({ activeChat: contact });
    },

    allMessages: {},
    setAllMessages: (updater) => set((state) => ({ allMessages: typeof updater === 'function' ? updater(state.allMessages) : updater })),
    
    replyingTo: null,
    setReplyingTo: (msg) => set({ replyingTo: msg }),
    
    blockedIds: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('blocked_user_ids') || '[]') : [],
    setBlockedIds: (updater) => {
        set((state) => {
            const next = typeof updater === 'function' ? updater(state.blockedIds) : updater;
            localStorage.setItem('blocked_user_ids', JSON.stringify(next));
            return { blockedIds: next };
        });
    },
    
    mutedChatIds: [],
    setMutedChatIds: (updater) => set((state) => ({ mutedChatIds: typeof updater === 'function' ? updater(state.mutedChatIds) : updater })),
    
    nicknames: {},
    setNicknames: (updater) => set((state) => ({ nicknames: typeof updater === 'function' ? updater(state.nicknames) : updater })),
    
    searchQuery: '',
    setSearchQuery: (q) => set({ searchQuery: q }),
    
    showDetails: false,
    setShowDetails: (show) => set({ showDetails: show }),
    

    forwardingMessage: null,
    setForwardingMessage: (msg) => set({ forwardingMessage: msg }),
    
    latestMessage: null,
    setLatestMessage: (msg) => set({ latestMessage: msg }),
    
    totalUnreadCount: 0,

    resetChatState: () => set({
        activeChat: null,
        allMessages: {},
        replyingTo: null,
        forwardingMessage: null,
        searchQuery: '',
        showDetails: false,
    })
}));
