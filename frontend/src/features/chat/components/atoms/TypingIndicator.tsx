import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface TypingIndicatorProps {
    isTyping: boolean;
    name?: string;
    isDark?: boolean;
    className?: string;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const dotVariants: Variants = {
    hidden: { scale: 0.7, opacity: 0.35 },
    visible: { scale: [1, 1.25, 1], opacity: 1, transition: { duration: 0.9, ease: 'easeInOut' } }
};

export const TypingIndicator: React.FC<TypingIndicatorProps> = React.memo(({ isTyping, name, isDark = true, className = '' }) => {
    if (!isTyping) return null;
    const { t } = useTranslation('chat');

    const textColor = isDark ? 'text-white/70' : 'text-slate-700';

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={containerVariants}
            className={`inline-flex items-center gap-3 ${className}`}
            style={{ willChange: 'transform, opacity' }}
        >
            <div className="flex items-center gap-2">
                <motion.span className="inline-flex items-center gap-1">
                    <motion.span variants={dotVariants} className="w-2.5 h-2.5 bg-white/80 rounded-full shadow-sm" style={{ background: isDark ? undefined : undefined }} />
                    <motion.span variants={dotVariants} className="w-2.5 h-2.5 bg-white/60 rounded-full shadow-sm" />
                    <motion.span variants={dotVariants} className="w-2.5 h-2.5 bg-white/40 rounded-full shadow-sm" />
                </motion.span>
            </div>

            {name ? (
                <span className={`text-xs font-medium ${textColor}`}>{t('typingWithName', { name })}</span>
            ) : (
                <span className={`text-xs font-medium ${textColor}`}>{t('typingWithoutName')}</span>
            )}
        </motion.div>
    );
});

TypingIndicator.displayName = 'TypingIndicator';

export default TypingIndicator;
