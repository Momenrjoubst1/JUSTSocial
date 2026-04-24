import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { getUserAvatarUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VerifiedBadge, isUserVerified, fetchAndCacheVerification } from '@/components/ui/core';

interface User {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email: string | null;
}

interface FollowsListModalProps {
    userId: string;
    type: 'followers' | 'following';
    onClose: () => void;
}

const FollowsListModal: React.FC<FollowsListModalProps> = ({ userId, type, onClose }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // 1. Get the IDs from follows table
                const { data: followRows, error: followError } = await supabase
                    .from('follows')
                    .select(type === 'followers' ? 'follower_id' : 'following_id')
                    .eq(type === 'followers' ? 'following_id' : 'follower_id', userId);

                if (followError) throw followError;

                if (followRows && followRows.length > 0) {
                    const userIds = followRows.map((row: any) =>
                        type === 'followers' ? row.follower_id : row.following_id
                    );

                    // 2. Fetch user profiles for these IDs
                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('id, full_name, username, avatar_url, email, is_verified')
                        .in('id', userIds);

                    if (userError) throw userError;

                    // Pre-populate verified badge cache
                    (userData || []).forEach((u: any) => { if (u.is_verified) fetchAndCacheVerification(u.id); });

                    const blockedIdsStr = localStorage.getItem('blocked_user_ids');
                    const blockedIds: string[] = blockedIdsStr ? JSON.parse(blockedIdsStr) : [];
                    setUsers((userData || []).filter((u: any) => !blockedIds.includes(u.id)));
                } else {
                    setUsers([]);
                }
            } catch (err) {
                console.error(`Error fetching ${type}:`, err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [userId, type]);

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-sm h-[80vh] flex flex-col overflow-hidden rounded-3xl bg-card border border-border shadow-2xl z-10"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="text-lg font-bold capitalize">{type}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                    </div>

                    {/* User List */}
                    <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
                        {loading ? (
                            <div className="space-y-1 px-2 pt-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                                        <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="h-3.5 bg-muted rounded-full" style={{ width: `${50 + (i * 7) % 30}%` }} />
                                            <div className="h-2.5 bg-muted/60 rounded-full" style={{ width: `${35 + (i * 11) % 25}%` }} />
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-muted/40 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <p className="text-muted-foreground">No users found.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => {
                                            navigate(`/profile/${user.id}`);
                                            onClose();
                                        }}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-all cursor-pointer group"
                                    >
                                        <img
                                            src={getUserAvatarUrl(user.avatar_url, user.full_name || user.username || 'User')}
                                            alt={user.full_name || 'User'}
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                                e.currentTarget.src = getUserAvatarUrl(null, user.full_name || user.username || 'User');
                                                e.currentTarget.onerror = null;
                                            }}
                                            className="w-12 h-12 rounded-full border border-border object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-foreground truncate flex items-center gap-1">
                                                {user.full_name || user.username || 'Anonymous'}
                                                {isUserVerified(user.email) && <VerifiedBadge size={14} />}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.username ? `@${user.username}` : user.email}
                                            </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default FollowsListModal;
