import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mic, Eye, Sparkles, Lock, Shield, FileLock2, Search, WifiOff, Moon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Carousel } from '@/components/ui/core';

interface SmartTourProps {
    onComplete: () => void;
    isDark: boolean;
}

export function SmartTour({ onComplete, isDark }: SmartTourProps) {
    const TOUR_STEPS = [
        {
            id: 1,
            title: 'Welcome to JUST Social ⚡',
            description: 'Discover the next generation of secure and encrypted communication.',
            icon: <Sparkles className="h-[16px] w-[16px] text-white" />
        },
        {
            id: 2,
            title: 'End-to-End Encryption 🔐',
            description: 'All your messages are encrypted. Only you and your contact can read them.',
            icon: <Lock className="h-[16px] w-[16px] text-white" />
        },
        {
            id: 3,
            title: 'Smartly Verified Voice 🎙️',
            description: 'Your device automatically recognizes your unique human voice fingerprint.',
            icon: <Mic className="h-[16px] w-[16px] text-white" />
        },
        {
            id: 4,
            title: 'Full Geo-Lock Protection 🌍',
            description: 'Calls are protected by a geographic wall to connect the right people securely.',
            icon: <ShieldCheck className="h-[16px] w-[16px] text-white" />
        },
        {
            id: 5,
            title: 'Intelligent Gaze-Lock Shield 👁️',
            description: 'Conversations elegantly fade when you look away, protecting your privacy.',
            icon: <Eye className="h-[16px] w-[16px] text-white" />
        },
        {
            id: 6,
            title: 'Smart AI Moderation 🛡️',
            description: 'Advanced AI filters protect you from spam and harmful content proactively.',
            icon: <Shield className="h-[16px] w-[16px] text-white" />
        },
        {
            id: 7,
            title: 'Secure File Sharing 📎',
            description: 'Share files safely with encrypted attachments. Your documents stay private.',
            icon: <FileLock2 className="h-[16px] w-[16px] text-white" />
        },
        {
            id: 8,
            title: 'Message Search & History 🔍',
            description: 'Find any conversation instantly. Your chat history is always private.',
            icon: <Search className="h-[16px] w-[16px] text-white" />
        },
        {
            id: 9,
            title: 'Offline Protection 📵',
            description: 'Conversations are protected even offline and sync when you reconnect.',
            icon: <WifiOff className="h-[16px] w-[16px] text-white" />
        }
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
                Get Started
            </button>
        </motion.div>,
        document.body
    );
}

