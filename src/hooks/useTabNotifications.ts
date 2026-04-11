import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTitle } from '@/context/TitleContext';
import { useChatContext } from '@/features/chat/ChatProvider';

const NORMAL_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='40 20 140 260'%3E%3Cpath d='M 120 40 L 60 160 L 95 160 L 70 260 L 140 130 L 105 130 Z' fill='%2300d2ff' stroke='%2300d2ff' stroke-width='8' stroke-linejoin='round'/%3E%3C/svg%3E";

const GLOWING_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Cdefs%3E%3Cfilter id='neonGlow' x='-50%25' y='-50%25' width='200%25' height='200%25'%3E%3CfeGaussianBlur stdDeviation='12' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Cpath d='M 120 40 L 60 160 L 95 160 L 70 260 L 140 130 L 105 130 Z' fill='%2300ffff' stroke='%23ffffff' stroke-width='10' stroke-linejoin='round' filter='url(%23neonGlow)'/%3E%3Ccircle cx='170' cy='50' r='25' fill='%23ff0055' /%3E%3C/svg%3E";

export function useTabNotifications(userId: string | null) {
  const { baseTitle } = useTitle();
  const { totalUnreadCount, latestMessage } = useChatContext();
  const [notificationCount, setNotificationCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<{ actorName: string, type: string } | null>(null);

  // Fetch unread notifications count
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
        try {

              const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

              if (!error && count !== null) {
                setNotificationCount(count);
              }
            
        } catch (error) {
          console.error('[useTabNotifications.ts] [fetchNotifications]:', error);
        }
    };

    fetchNotifications();
  }, [userId]);

  // Combined badge count (messages + notifications)
  const totalBadge = totalUnreadCount + notificationCount;

  // Favicon glow effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.type = 'image/svg+xml';
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    let themeMeta: HTMLMetaElement | null = document.querySelector("meta[name='theme-color']");
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    const originalTheme = '#ffffff';
    let isPulse = false;

    if (totalBadge > 0) {
      link.href = GLOWING_FAVICON;
      themeMeta.content = '#00d2ff';

      interval = setInterval(() => {
        isPulse = !isPulse;
        if (themeMeta) themeMeta.content = isPulse ? '#00d2ff' : '#1a73e8';
      }, 1500);
    } else {
      link.href = NORMAL_FAVICON;
      themeMeta.content = originalTheme;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [totalBadge]);

  // Tab title badge
  useEffect(() => {
    if (totalBadge > 0) {
      document.title = `(${totalBadge}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [totalBadge, baseTitle]);

  return { unreadCount: totalUnreadCount, latestMessage, notificationCount, setNotificationCount, latestNotification };
}
