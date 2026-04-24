import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check } from 'lucide-react';
import { useChatContext } from '../../ChatProvider';
import { useSendMessage } from '../../hooks/useSendMessage';
import { useChatSound } from '../../hooks/useChatSound';
import { UserAvatar } from '../atoms/UserAvatar';
import { Button } from '@/components/ui/core';
import { useTheme } from '@/context/ThemeContext';
import { EmojiText } from '@/components/ui/EmojiText';
import { useTranslation } from 'react-i18next';

export function ForwardModal() {
    const { t } = useTranslation('chat');
    const { t: tCommon } = useTranslation('common');
    const { forwardingMessage, setForwardingMessage, contacts, nicknames } = useChatContext();
    const { theme } = useTheme();
    const { sendMessage } = useSendMessage();
    const { playPopSound } = useChatSound();
    const isDark = theme === 'dark';

    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setForwardingMessage(null);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [setForwardingMessage]);

    if (!forwardingMessage) return null;

    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        (nicknames[c.id] || '').toLowerCase().includes(search.toLowerCase())
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSend = async () => {
        if (selectedIds.length === 0) return;
        setIsSending(true);
        
        const sendPromises = selectedIds.map(id => 
            sendMessage(forwardingMessage.encryptedContent, undefined, id)
        );

        await Promise.all(sendPromises);
        playPopSound('send');
        setIsSending(false);
        setForwardingMessage(null);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setForwardingMessage(null)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className={`w-full max-w-md rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] ${isDark ? 'bg-[#262626] text-white border border-white/10' : 'bg-white text-black'}`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`px-4 py-4 flex items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <div className="w-8" /> 
                        <h3 className="text-[17px] font-bold">{t('forwardTitle')}</h3>
                        <button 
                            onClick={() => setForwardingMessage(null)}
                            className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-[15px] font-medium">{t('toLabel')}</span>
                            <div className="flex-1 relative">
                                <input 
                                    type="text"
                                    placeholder={t('searchPlaceholder')}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-transparent border-none outline-none text-[15px] py-1 placeholder:text-foreground/30"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Message Preview */}
                    <div className="px-4 pt-3 pb-2">
                        <div className="text-sm italic opacity-60 truncate px-3 py-2 rounded-md bg-transparent">
                            <EmojiText text={forwardingMessage?.encryptedContent || ''} size={16} />
                        </div>
                    </div>

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <p className="px-4 pt-4 pb-2 text-[14px] font-bold">{t('suggested')}</p>
                        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }} className="px-2 pb-4">
                            {filteredContacts.map(contact => (
                                <div 
                                    key={contact.id}
                                    onClick={() => toggleSelect(contact.id)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                                >
                                    <UserAvatar 
                                        src={contact.avatar} 
                                        name={contact.name} 
                                        size={44}
                                        className="pointer-events-none"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] font-bold truncate leading-tight">
                                            {contact.name}
                                        </p>
                                        <p className="text-[13px] opacity-50 truncate leading-tight">
                                            {nicknames[contact.id] || contact.name.toLowerCase().replace(/\s+/g, '_')}
                                        </p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                        selectedIds.includes(contact.id) 
                                            ? 'bg-primary border-primary' 
                                            : (isDark ? 'border-white/20' : 'border-gray-300')
                                    }`}>
                                        {selectedIds.includes(contact.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                                    </div>
                                </div>
                            ))}
                            {filteredContacts.length === 0 && (
                                <div className="py-12 text-center opacity-40">
                                    <p className="text-sm">{t('noContactsFound')}</p>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Footer / Send Button */}
                    <div className="p-4 bg-transparent">
                        <Button
                            disabled={selectedIds.length === 0 || isSending}
                            onClick={handleSend}
                            className={`w-full py-4 rounded-[12px] h-auto text-[14px] font-bold transition-all ${
                                selectedIds.length > 0 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                    : (isDark ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400')
                            }`}
                        >
                            {isSending ? t('sending') : tCommon('send')}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
