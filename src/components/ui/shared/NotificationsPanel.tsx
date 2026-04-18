import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, UserPlus, X, Check, ShieldAlert, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { VerifiedBadge, isUserVerified } from '@/components/ui/core';
import { BrandLogo } from '@/components/ui/effects';

interface Notification {
    id: number;
    actor_id: string | null;
    type: string;
    message: string;
    is_read: boolean;
    created_at: string;
    actor?: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
}

interface NotificationsPanelProps {
    userId: string | null;
    notificationCount: number;
    setNotificationCount: (count: number | ((prev: number) => number)) => void;
    onClose?: () => void;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function getNotifIcon(type: string) {
    switch (type) {
        case 'follow': return <UserPlus size={14} className="text-blue-400" />;
        case 'security': return <ShieldAlert size={14} className="text-red-500" />;
        case 'system': return <Zap size={14} className="text-cyan-400" />;
        default: return <Bell size={14} className="text-primary" />;
    }
}

/** The SkillSwap logo rendered as a small circular avatar for system notifications */
function SiteLogo() {
    return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center border border-indigo-400/30">
            <BrandLogo simple className="w-6 h-7 text-white" />
        </div>
    );
}

function getNotifText(type: string, message: string) {
    if (message) return message;
    switch (type) {
        case 'follow': return 'started following you';
        default: return message;
    }
}

export default function NotificationsPanel({ userId, notificationCount, setNotificationCount, onClose }: NotificationsPanelProps) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const panelRef = useRef<HTMLDivElement>(null);

    // Fetch notifications with actor info
    useEffect(() => {
        if (!userId) return;

        const fetch = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('id, actor_id, type, message, is_read, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(30);

            if (data && !error) {
                // Fetch actor info for each notification
                const actorIds = [...new Set(data.map(n => n.actor_id).filter(Boolean))] as string[];
                let actorMap: Record<string, { full_name: string | null; username: string | null; avatar_url: string | null }> = {};

                if (actorIds.length > 0) {
                    const { data: actors } = await supabase
                        .from('users')
                        .select('id, full_name, username, avatar_url, is_verified')
                        .in('id', actorIds);

                    if (actors) {
                        // Pre-populate verified badge cache
                        const { fetchAndCacheVerification } = await import('@/components/ui/core/VerifiedBadge');
                        actors.forEach((a: any) => { if (a.is_verified) fetchAndCacheVerification(a.id); });
                        actorMap = Object.fromEntries(actors.map(a => [a.id, a]));
                    }
                }

                setNotifications(data.map(n => ({
                    ...n,
                    actor: n.actor_id ? actorMap[n.actor_id] : undefined
                })));
            }
            setLoading(false);
        };

        fetch();
    }, [userId]);

    // Mark all as read when panel opens
    useEffect(() => {
        if (!userId || notificationCount === 0) return;

        const markAllRead = async () => {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setNotificationCount(0);
        };

        // Delay slightly so user sees the unread state first
        const timer = setTimeout(markAllRead, 1500);
        return () => clearTimeout(timer);
    }, [userId]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose?.();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const getActorName = (n: Notification) => {
        if (n.type === 'security') return 'Technical Support';
        if (n.type === 'system') return 'SkillSwap';
        return n.actor?.full_name || n.actor?.username || 'Someone';
    };

    const isSystemNotif = (n: Notification) => n.type === 'security' || n.type === 'system';

    const deleteNotification = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Don't navigate when clicking delete
        // Optimistic removal with exit animation
        setNotifications(prev => prev.filter(n => n.id !== id));
        
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session?.access_token) return;
            fetch(`/api/notifications/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                }
            }).catch(e => console.error("Failed to delete notification", e));
        });
    };

    const getActorAvatar = (n: Notification) => {
        if (isSystemNotif(n)) return null; // Will use SiteLogo component instead
        const name = getActorName(n);
        return n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_id || name}`;
    };

    return (
        <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-[calc(100%+12px)] right-0 w-[360px] max-h-[480px] bg-card/95 border border-border/60 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden z-[9999]"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)' }}
        >
            {/* Arrow */}
            <div className="absolute -top-[7px] right-4 w-3 h-3 bg-card border-l border-t border-border/60 rotate-45 z-10" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-foreground/70" />
                    <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                    {notificationCount > 0 && (
                        <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                            {notificationCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition-colors"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto max-h-[400px] custom-notif-scrollbar">
                {loading ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-foreground/10 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-foreground/10 rounded w-3/4" />
                                    <div className="h-2.5 bg-foreground/10 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-foreground/5 flex items-center justify-center mb-3">
                            <Bell size={24} className="text-foreground/30" />
                        </div>
                        <p className="text-foreground/50 text-sm font-medium">No notifications yet</p>
                        <p className="text-foreground/30 text-xs mt-1">When someone follows you or interacts with you, you'll see it here.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {notifications.map((notif, i) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -40, height: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => {
                                    if (notif.actor_id) {
                                        navigate(`/profile/${notif.actor_id}`);
                                        onClose?.();
                                    }
                                }}
                                className={`flex items-start gap-3 px-4 py-3 hover:bg-foreground/[0.04] transition-colors cursor-pointer border-b border-border/20 last:border-0 ${!notif.is_read ? 'bg-primary/[0.04]' : ''}`}
                            >
                                {/* Unread dot */}
                                <div className="relative shrink-0">
                                    {isSystemNotif(notif) ? (
                                        <SiteLogo />
                                    ) : (
                                        <img
                                            src={getActorAvatar(notif) || ''}
                                            alt={getActorName(notif)}
                                            className="w-10 h-10 rounded-full object-cover border border-border/40"
                                        />
                                    )}
                                    {/* Type icon badge */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border border-border/40 flex items-center justify-center">
                                        {getNotifIcon(notif.type)}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-foreground leading-snug">
                                        <span className="font-semibold">{getActorName(notif)}</span>
                                        {notif.actor_id && isUserVerified(notif.actor_id) && <VerifiedBadge size={13} style={{ marginLeft: 3, marginRight: 2 }} />}
                                        {' '}
                                        <span className="text-foreground/70">{getNotifText(notif.type, notif.message)}</span>
                                    </p>
                                    <p className="text-[11px] text-foreground/40 mt-0.5">{timeAgo(notif.created_at)}</p>
                                </div>

                                {/* Delete button + Unread indicator */}
                                <div className="flex items-center gap-1.5 shrink-0 mt-1">
                                    {!notif.is_read && (
                                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                    )}
                                    <button
                                        onClick={(e) => deleteNotification(notif.id, e)}
                                        className="notif-delete-btn"
                                        title="Delete notification"
                                    >
                                        <svg viewBox="0 0 448 512" className="notif-delete-icon">
                                            <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
                                        </svg>
                                        <span className="notif-delete-label">Delete</span>
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Scrollbar + Delete button styles */}
            <style>{`
        .custom-notif-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-notif-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-notif-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(128,128,128,0.2);
          border-radius: 20px;
        }
        .notif-delete-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: rgba(30, 30, 30, 0.8);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
        }
        .notif-delete-icon {
          width: 10px;
          height: 10px;
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
        }
        .notif-delete-icon path {
          fill: rgba(255,255,255,0.5);
        }
        .notif-delete-label {
          position: absolute;
          top: -16px;
          color: white;
          font-size: 0px;
          font-weight: 600;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        .notif-delete-btn:hover {
          width: 68px;
          border-radius: 14px;
          background-color: rgb(239, 68, 68);
        }
        .notif-delete-btn:hover .notif-delete-icon {
          transform: translateY(55%);
          width: 22px;
          height: 22px;
        }
        .notif-delete-btn:hover .notif-delete-icon path {
          fill: white;
        }
        .notif-delete-btn:hover .notif-delete-label {
          font-size: 11px;
          transform: translateY(16px);
        }
        .notif-delete-btn:active {
          transform: scale(0.92);
        }
      `}</style>
        </motion.div>
    );
}
