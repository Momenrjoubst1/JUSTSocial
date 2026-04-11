import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mic, Fingerprint, Eye, ArrowRight, X, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { createPortal } from 'react-dom';

interface SmartTourProps {
    onComplete: () => void;
    isDark: boolean;
}

const BACKDROP_OVERLAYS: Record<string, string> = {
    welcome: 'rgba(59,130,246,0.06)',
    security_pulse: 'rgba(56,189,248,0.06)',
    geo_lock: 'rgba(16,185,129,0.06)',
    gaze_lock: 'rgba(139,92,246,0.06)'
};

export function SmartTour({ onComplete, isDark }: SmartTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPulseActive, setIsPulseActive] = useState(false);
    const [isShieldActive, setIsShieldActive] = useState(false);
    const { t } = useLanguage();

    const TOUR_STEPS = [
        {
            id: 'welcome',
            title: 'Welcome to SkillSwap ⚡',
            description: 'Discover the next generation of secure and encrypted communication. We have prepared a completely protected environment for you to swap your skills.',
            icon: Sparkles,
            color: 'from-blue-500 to-indigo-600'
        },
        {
            id: 'security_pulse',
            title: 'Smartly Verified Voice 🎙️',
            description: 'Your device recognizes your human voice fingerprint. Try clicking the microphone to see how security pulses when your real voice is detected.',
            icon: Mic,
            interactive: 'pulse',
            color: 'from-cyan-500 to-blue-500'
        },
        {
            id: 'geo_lock',
            title: 'Full Geo-Lock Protection 🌍',
            description: 'Your calls are protected by a geographic wall that ensures you are talking to the right person in the right place. Click the shield to activate protection.',
            icon: ShieldCheck,
            interactive: 'shield',
            color: 'from-emerald-500 to-teal-600'
        },
        {
            id: 'gaze_lock',
            title: 'Intelligent Gaze-Lock Shield 👁️',
            description: 'The Gaze-Lock system protects your messages from prying eyes. When you are not in center, the conversation automatically fades for protection.',
            icon: Eye,
            color: 'from-purple-500 to-pink-600'
        }
    ];

    const step = TOUR_STEPS[currentStep];
    const backdropOverlay = BACKDROP_OVERLAYS[step.id] || 'transparent';

    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
            setIsPulseActive(false);
            setIsShieldActive(false);
        } else {
            onComplete();
        }
    };

    if (typeof window === 'undefined') return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20000] flex items-center justify-center p-6 backdrop-blur-md"
            style={{ background: `linear-gradient(90deg, ${backdropOverlay}, ${backdropOverlay}), rgba(0,0,0,0.6)` }}
        >
            <motion.div
                layout
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`w-full max-w-lg rounded-[32px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.4)] border ${isDark ? 'bg-[#1a1c23] border-white/10' : 'bg-white border-gray-100'}`}
            >
                {/* Header Gradient */}
                <div className={`h-2 bg-gradient-to-r ${step.color} w-full`} />

                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${step.color} shadow-lg shadow-blue-500/20`}>
                            <step.icon size={32} className="text-white" />
                        </div>
                        <button
                            onClick={onComplete}
                            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/5 text-white/40' : 'hover:bg-black/5 text-black/40'}`}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <h2 className="text-2xl font-bold mb-3 tracking-tight">{step.title}</h2>
                    <p className={`text-lg leading-relaxed mb-8 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        {step.description}
                    </p>

                    {/* Gaze-Lock visual mock */}
                    {step.id === 'gaze_lock' && (
                        <div className={`mb-6 p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0.6] }}
                                transition={{ duration: 1.8, repeat: Infinity, repeatType: 'loop' }}
                                className="w-full max-w-sm mx-auto p-3 rounded-xl bg-white/6 backdrop-blur-sm"
                            >
                                <div className="flex flex-col gap-2">
                                    <motion.div className="self-start bg-white/10 text-sm px-3 py-2 rounded-lg max-w-[70%]"
                                        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
                                        Private message preview
                                    </motion.div>
                                    <motion.div className="self-end bg-white/20 text-sm px-3 py-2 rounded-lg max-w-[60%]"
                                        animate={{ opacity: [0.2, 0.9, 0.2] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.3 }}>
                                        You: Thanks — confirming.
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Interactive Demo Area */}
                    {step.interactive && (
                        <div className={`mb-8 p-10 rounded-2xl flex flex-col items-center justify-center gap-6 border-2 border-dashed ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            {step.interactive === 'pulse' && (
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsPulseActive(!isPulseActive)}
                                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${isPulseActive ? 'bg-red-500 shadow-red-500/40 rotate-12' : 'bg-indigo-500 shadow-indigo-500/30 font-bold'}`}
                                    >
                                        <Mic size={32} className="text-white" />
                                    </motion.button>

                                    <AnimatePresence>
                                        {isPulseActive && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} backdrop-blur-md`}
                                            >
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                >
                                                    <Fingerprint size={20} className="text-cyan-400" />
                                                </motion.div>
                                                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Verified Voice</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {step.interactive === 'shield' && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsShieldActive(true)}
                                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${isShieldActive ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'bg-gray-500 font-bold'}`}
                                >
                                    <motion.div
                                        animate={isShieldActive ? { rotate: 360 } : {}}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        onAnimationComplete={() => setTimeout(() => setIsShieldActive(false), 2000)}
                                    >
                                        <ShieldCheck size={40} className="text-white" />
                                    </motion.div>

                                    {isShieldActive && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 0.2, scale: 1.5 }}
                                            className="absolute inset-0 bg-green-400 rounded-full"
                                        />
                                    )}
                                </motion.button>
                            )}

                            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Try interacting now</p>
                        </div>
                    )}

                    {/* Footer / Controls */}
                    <div className="flex items-center justify-between mt-6">
                        <div className="flex gap-1.5">
                            {TOUR_STEPS.map((s, i) => (
                                <button
                                    key={i}
                                    aria-label={`Go to step ${i + 1}`}
                                    onClick={() => { setCurrentStep(i); setIsPulseActive(false); setIsShieldActive(false); }}
                                    className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none ${i === currentStep ? `w-8 bg-gradient-to-r ${s.color}` : 'w-2 bg-gray-300 dark:bg-white/10'}`}
                                />
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05, x: 5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={nextStep}
                            className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold bg-gradient-to-r ${step.color} text-white shadow-xl shadow-indigo-500/20`}
                        >
                            {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
                            <ArrowRight size={20} />
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}