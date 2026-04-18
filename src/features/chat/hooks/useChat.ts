import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/context/AuthContext';
import { useChatStore } from '@/features/chat/store/chatStore';
import { Message, Contact, DbUser, DbMessage } from '@/features/chat/types/chat.types';
import { useE2EE } from '@/features/chat/hooks/useE2EE';
import { decryptHybridMessage } from '@/features/chat/services/crypto';
import { get, set } from 'idb-keyval';

export function useChat() {
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
    const [globalSearchResults, setGlobalSearchResults] = useState<Contact[]>([]);
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

    const { user } = useAuthContext();
    const contacts = useChatStore(s => s.contacts);
    const setContacts = useChatStore(s => s.setContacts);
    const activeChat = useChatStore(s => s.activeChat);
    const allMessages = useChatStore(s => s.allMessages);
    const setAllMessages = useChatStore(s => s.setAllMessages);
    const searchQuery = useChatStore(s => s.searchQuery);
    const nicknames = useChatStore(s => s.nicknames);

    const { privateKey, keysReady } = useE2EE();

    // 1. Fetching is now handled by ChatProvider's GlobalChatLogic
    // to avoid duplicate mounting and infinite loops.
    
    // 2. Local vs Global Search Logic

    // 2. Local vs Global Search Logic
    const localFilteredContacts = contacts.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (nicknames[c.id] && nicknames[c.id].toLowerCase().includes(searchQuery.toLowerCase()));
        if (searchQuery.trim().length > 0) return nameMatch;
        return true; 
    });

    useEffect(() => {
        let isMounted = true;
        
        if (searchQuery.trim().length === 0) {
            if (globalSearchResults.length > 0) setGlobalSearchResults([]);
            return;
        }

        // If local found results, display those first (User instruction: local filter first, if no results -> fetch users)
        if (localFilteredContacts.length > 0) {
            if (globalSearchResults.length > 0) setGlobalSearchResults([]);
            return;
        }

        // If no local results, search global
        const fetchGlobal = async () => {
            try {

                        setIsSearchingGlobal(true);
                        const { data, error } = await supabase.from('users')
                            .select('*')
                            .ilike('full_name', `%${searchQuery}%`)
                            .limit(10);
                        
                        if (data && !error && isMounted) {
                            const mapped: Contact[] = data.map(u => ({
                                id: u.id,
                                name: u.full_name || u.username || 'User',
                                avatar: u.avatar_url && u.avatar_url.startsWith('http') ? u.avatar_url : `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`,
                                avatarFrame: u.avatar_frame,
                                lastMessage: 'Start a new conversation',
                                time: '',
                                unread: 0,
                                online: false,
                                typing: false,
                                email: u.email || undefined
                            }));

                            const newContacts = mapped.filter(c => c.id !== user?.id && !contacts.some(exist => exist.id === c.id));
                            setGlobalSearchResults(newContacts);
                        }
                        setIsSearchingGlobal(false);
                    
            } catch (error) {
              console.error('[useChat.ts] [fetchGlobal]:', error);
            }
        };

        const timer = setTimeout(fetchGlobal, 400); // 400ms debounce
        return () => { isMounted = false; clearTimeout(timer); };
    }, [searchQuery, localFilteredContacts.length, user?.id, contacts]);


    // 3. Fetch Active Chat Messages
    useEffect(() => {
        let isMounted = true;
        // Don't fetch if we are still waiting for keys to initialize 
        // OR if keys exist but the private key isn't decrypted yet (waiting for password)
        if (!user || !keysReady || !activeChat?.conversationId || !privateKey) return;

        const convId = activeChat.conversationId;
        const chatId = activeChat.id;

        const fetchActiveMessages = async () => {
            setIsLoadingMessages(true);
            const cacheKey = `chat_cache_${chatId}`;
            try {
                const cachedMsgs = await get<Message[]>(cacheKey);
                if (cachedMsgs && cachedMsgs.length > 0 && isMounted) {
                    setAllMessages(prev => ({ ...prev, [chatId]: cachedMsgs }));
                }
            } catch (err) { console.warn("IDB cache read failed", err); }

            const { data, error } = await supabase.from('messages')
                .select('*')
                .eq('conversation_id', convId)
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (data && !error && isMounted) {
                const decryptedData = [];
                for (let i = 0; i < data.length; i++) {
                    if (!isMounted) break;
                    const m = data[i] as DbMessage;
                    let text = await decryptHybridMessage(privateKey!, user.id!, m.sender_id, m.encrypted_content);
                    if (text === "🔒 [فشل فك التشفير - Decryption Failed]" || text === "🔒 [بيانات تالفة - Data Corrupted]") {
                        // لا تحاول فك التشفير مراراً وتكراراً للرسائل التالفة القديمة
                        text = text;
                    } else if (text.includes("فشل فك التشفير") || text.includes("Corrupted")) {
                        const { data: senderPubData } = await supabase.from('user_public_keys').select('public_key').eq('user_id', m.sender_id).maybeSingle();
                        if (senderPubData) {
                            text = await decryptHybridMessage(privateKey!, user.id!, m.sender_id, m.encrypted_content);
                        }
                    }
                    // Yield to main thread every 10 messages (LRU cache makes cached hits instant)
                    if (i % 10 === 9) await new Promise(r => requestAnimationFrame(r));
                }

                decryptedData.reverse(); // For UI ascending

                const formattedMsgs: Message[] = decryptedData.map((m) => {
                    const timeStr = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    return {
                        id: m.id,
                        conversationId: m.conversation_id,
                        senderId: m.sender_id === user.id ? 'me' : m.sender_id,
                        encryptedContent: m.text || m.encrypted_content,
                        timestamp: timeStr,
                        createdAt: m.created_at,
                        status: m.status,
                        replyToId: m.reply_to_id,
                        expiresAt: m.expires_at || null,
                        metadata: m.metadata || undefined
                    };
                });

                setAllMessages(prev => {
                    const existing = prev[chatId] || [];
                    const messageMap = new Map(existing.map(m => [m.id, m]));
                    formattedMsgs.forEach(m => messageMap.set(m.id, m));
                    
                    const finalSorted = Array.from(messageMap.values()).sort((a, b) => {
                        const timeA = new Date(a.createdAt || a.timestamp).getTime() || 0;
                        const timeB = new Date(b.createdAt || b.timestamp).getTime() || 0;
                        return timeA - timeB;
                    });

                    // Save to IDB cache asynchronously
                    set(cacheKey, finalSorted).catch(err => console.warn("IDB write failed", err));

                    return { 
                        ...prev, 
                        [chatId]: finalSorted
                    };
                });
                setHasMoreMessages(data.length === 50);
                setIsLoadingMessages(false);
            } else {
                setIsLoadingMessages(false);
            }
        };

        fetchActiveMessages();

        return () => { isMounted = false; };
    }, [user?.id, keysReady, privateKey, activeChat?.conversationId, activeChat?.id, setAllMessages]);

    // 4. Load More Messages Pagination
    const loadMoreMessages = async () => {
        try {

                if (!activeChat?.conversationId || !user || !keysReady || isLoadingOlder || !hasMoreMessages) return;

                setIsLoadingOlder(true);
                const currentMsgs = allMessages[activeChat.id] || [];
                const oldestMsg = currentMsgs[0]; // Messages are sorted chronologically, so index 0 is the oldest.

                let query = supabase.from('messages')
                    .select('*')
                    .eq('conversation_id', activeChat.conversationId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (oldestMsg && oldestMsg.createdAt) {
                    query = query.lte('created_at', oldestMsg.createdAt).neq('id', oldestMsg.id);
                } else {
                    const offset = currentMsgs.length;
                    query = query.range(offset, offset + 49);
                }

                const { data, error } = await query;

                if (data && !error && data.length > 0) {
                    const decryptedData = [];
                    for (let i = 0; i < data.length; i++) {
                        const m = data[i] as DbMessage;
                        let text = await decryptHybridMessage(privateKey!, user.id!, m.sender_id, m.encrypted_content);
                        decryptedData.push({ ...m, text, metadata: m.metadata });
                        if (i % 10 === 9) await new Promise(r => requestAnimationFrame(r));
                    }

                    decryptedData.reverse();

                    const formattedMsgs: Message[] = decryptedData.map((m) => {
                        const timeStr = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        return {
                            id: m.id,
                            conversationId: m.conversation_id,
                            senderId: m.sender_id === user.id ? 'me' : m.sender_id,
                            encryptedContent: m.text || m.encrypted_content,
                            timestamp: timeStr,
                            createdAt: m.created_at,
                            status: m.status,
                            replyToId: m.reply_to_id,
                            expiresAt: m.expires_at || null,
                            metadata: m.metadata || undefined
                        };
                    });

                    setAllMessages(prev => {
                        const existing = prev[activeChat.id] || [];
                        const messageMap = new Map(existing.map(m => [m.id, m]));
                        formattedMsgs.forEach(m => messageMap.set(m.id, m));

                        const finalSorted = Array.from(messageMap.values()).sort((a, b) => {
                            const timeA = new Date(a.createdAt || a.timestamp).getTime() || 0;
                            const timeB = new Date(b.createdAt || b.timestamp).getTime() || 0;
                            return timeA - timeB;
                        });

                        const cacheKey = `chat_cache_${activeChat.id}`;
                        set(cacheKey, finalSorted).catch(err => console.warn("IDB write failed", err));

                        return {
                            ...prev,
                            [activeChat.id]: finalSorted
                        };
                    });
                    setHasMoreMessages(data.length === 50);
                } else {
                    setHasMoreMessages(false);
                }
                setIsLoadingOlder(false);
            
        } catch (error) {
          console.error('[useChat.ts] [loadMoreMessages]:', error);
        }
    };

    // 5. Read Receipt Updater
    useEffect(() => {
        if (!activeChat || !user) return;
        const unreadMsgs = (allMessages[activeChat.id] || []).filter(m => m.senderId !== 'me' && m.senderId !== user?.id && m.status !== 'read');
        if (unreadMsgs.length > 0) {
            const ids = unreadMsgs.map(m => m.id);
            setAllMessages(prev => ({ ...prev, [activeChat.id]: (prev[activeChat.id] || []).map(m => ids.includes(m.id) ? { ...m, status: 'read' as const } : m) }));
            setContacts(prev => prev.map(c => c.id === activeChat.id ? { ...c, unread: 0 } : c));
            
            // Fire async query uncoupled from react hooks loop to prevent blocking and DB spam
            const resolveReadReceipts = async () => {
                try {
                    const session = await supabase.auth.getSession();
                    const token = session.data.session?.access_token;
                    if (!token) return;

                    const res = await fetch('/api/messages/read', {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ messageIds: ids })
                    });
                    
                    if (!res.ok) {
                        const err = await res.json();
                        console.error("Batch Read update failed via API:", err);
                    }
                } catch (e) { console.warn("Cleaned up error:", e); }
            };
            resolveReadReceipts();
        }
    }, [allMessages, activeChat, user, setAllMessages, setContacts]);

    const currentMessages = activeChat ? (allMessages[activeChat.id] || []) : [];
    
    // Final UI List
    const baseContacts = searchQuery.trim().length > 0 && localFilteredContacts.length === 0 
        ? globalSearchResults 
        : localFilteredContacts;

    const primaryContacts = baseContacts.filter(c => 
        c.lastMessageMetadata?.message_status !== 'pending' || c.lastMessageSenderId === user?.id
    );

    const requestContacts = baseContacts.filter(c => 
        c.lastMessageMetadata?.message_status === 'pending' && c.lastMessageSenderId !== user?.id
    );

    return {
        currentMessages,
        filteredContacts: primaryContacts,
        requestContacts,
        loadMoreMessages,
        isLoadingOlder,
        isLoadingMessages,
        hasMoreMessages,
        isSearchingGlobal
    };
}



