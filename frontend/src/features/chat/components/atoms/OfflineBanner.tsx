import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export function OfflineBanner() {
    const { isOffline, pendingCount } = useOfflineSync();
    const { t } = useTranslation('chat');

    return (
        <AnimatePresence>
            {(isOffline || pendingCount > 0) && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className={`px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-40 relative shadow-sm ${
                        isOffline 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-b border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/20'
                    }`}
                >
                    {isOffline ? (
                        <>
                            <WifiOff size={16} />
                            <span>{t('offline')}</span>
                        </>
                    ) : (
                        <>
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '200ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '400ms' }} />
                            </div>
                            <span>{t('syncingGracefully')}</span>
                        </>
                    )}
                    
                    {pendingCount > 0 && (
                        <span className="font-bold border-l pl-2 border-current/30">
                            {t('queuedMessages', { count: pendingCount })}
                        </span>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
