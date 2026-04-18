import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useChat } from '../../hooks/useChat';
// ✅ تم تعديل هذا الجزء ليستورد الملفات الموجودة بجانبه في نفس المجلد
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { ForwardModal } from './ForwardModal';
import { SmartTour } from './SmartTour';
import { AnimatePresence } from 'framer-motion';

export const ChatLayout: React.FC = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [showTour, setShowTour] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('skillswap_tour_seen');
        // ALWAYS show tour for testing purposes as user requested
        setShowTour(true);
    }, []);

    const completeTour = () => {
        localStorage.setItem('skillswap_tour_seen', 'true');
        setShowTour(false);
    };

    /* منع التمرير في الخلفية عند فتح الشات */
    useEffect(() => {
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    return (
        <div
            dir="ltr"
            className={`fixed inset-0 m-0 p-0 flex font-sans z-[9999] transition-colors duration-500 overflow-hidden ${isDark ? 'bg-background text-foreground' : 'bg-background text-foreground'
                }`}
        >
            {/* Background Gradient Orbs */}
            {isDark && (
                <>
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/15 blur-[120px] pointer-events-none" />
                </>
            )}

            <ChatSidebar isDark={isDark} />
            <ChatWindow />
            <ForwardModal />

            <AnimatePresence>
                {showTour && (
                    <SmartTour
                        isDark={isDark}
                        onComplete={completeTour}
                    />
                )}
            </AnimatePresence>

            {/* Scrollbar CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'};
        }
      `}} />
        </div>
    );
};