import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mic, Eye, Sparkles, Lock, Shield, FileLock2, Search, WifiOff } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Carousel } from '@/components/ui/core';
import { useTranslation } from 'react-i18next';

interface SmartTourProps {
    onComplete: () => void;
    isDark: boolean;
}

export function SmartTour({ onComplete, isDark }: SmartTourProps) {
    const { t } = useTranslation('chat');

    const TOUR_STEPS = [
        {
            id: 1,
            title: `${t('smartTour.steps.welcome.title')} ?`,
            description: t('smartTour.steps.welcome.description'),
            icon: <Sparkles className="h-[16px] w-[16px] text-white" />,
        },
        {
            id: 2,
            title: `${t('smartTour.steps.encryption.title')} ??`,
            description: t('smartTour.steps.encryption.description'),
            icon: <Lock className="h-[16px] w-[16px] text-white" />,
        },
        {
            id: 3,
            title: `${t('smartTour.steps.voice.title')} ???`,
            description: t('smartTour.steps.voice.description'),
            icon: <Mic className="h-[16px] w-[16px] text-white" />,
        },
        {
            id: 4,
            title: `${t('smartTour.steps.geo.title')} ??`,
            description: t('smartTour.steps.geo.description'),
            icon: <ShieldCheck className="h-[16px] w-[16px] text-white" />,
        },
        {
            id: 5,
            title: `${t('smartTour.steps.gaze.title')} ???`,
            description: t('smartTour.steps.gaze.description'),
            icon: <Eye className="h-[16px] w-[16px] text-white" />,
        },
        {
            id: 6,
            title: `${t('smartTour.steps.moderation.title')} ???`,
            description: t('smartTour.steps.moderation.description'),
            icon: <Shield className="h-[16px] w-[16px] text-white" />,
        },
        {
            id: 7,
            title: `${t('smartTour.steps.files.title')} ??`,
            description: t('smartTour.steps.files.description'),
            icon: <FileLock2 className="h-[16px] w-[16px] text-white" />,
        },
        {
            id: 8,
            title: `${t('smartTour.steps.search.title')} ??`,
            description: t('smartTour.steps.search.description'),
            icon: <Search className="h-[16px] w-[16px] text-white" />,
        },
        {
            id: 9,
            title: `${t('smartTour.steps.offline.title')} ??`,
            description: t('smartTour.steps.offline.description'),
            icon: <WifiOff className="h-[16px] w-[16px] text-white" />,
        },
    ];

    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    if (typeof window === 'undefined') return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20000] flex flex-col items-center justify-center p-6 backdrop-blur-md bg-black/60"
        >
            <div className="relative mb-8" style={{ width: '320px', height: '320px' }}>
                <Carousel
                    items={TOUR_STEPS}
                    baseWidth={320}
                    autoplay={true}
                    autoplayDelay={4000}
                    pauseOnHover={true}
                    loop={true}
                    round={false}
                />
            </div>

            <button
                onClick={onComplete}
                className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors shadow-lg"
            >
                {t('smartTour.getStarted')}
            </button>
        </motion.div>,
        document.body,
    );
}
