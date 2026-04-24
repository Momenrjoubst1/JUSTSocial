import React, { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Phone, ShieldCheck, MapPinOff, ShieldAlert, AlertTriangle, Network, Fingerprint, Shield } from 'lucide-react';
import { CallData } from '../types';
const SecurityStats = lazy(() => import('@/features/chat/components/security/SecurityStats').then(m => ({ default: m.SecurityStats })));
import { Avatar } from '@/components/ui/core';
import { MicButton } from './MicButton';

interface CallOverlayProps {
    callData: CallData;
    onAccept: () => void;
    onDecline: () => void;
    onEnd: () => void;
    onToggleMute: () => void;
    isDark: boolean;
}

export function CallOverlay({ callData, onAccept, onDecline, onEnd, onToggleMute, isDark }: CallOverlayProps) {
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [showSecurityStats, setShowSecurityStats] = React.useState(false);

    React.useEffect(() => {
        if (audioRef.current && callData.remoteStream) {
            audioRef.current.srcObject = callData.remoteStream;
        }
    }, [callData.remoteStream]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (callData.status === 'idle') return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                className="absolute inset-0 z-[1000] flex flex-col backdrop-blur-3xl overflow-hidden"
                style={{
                    background: isDark
                        ? 'radial-gradient(circle at 50% 10%, rgba(20,20,30,0.95), rgba(0,0,0,0.98))'
                        : 'radial-gradient(circle at 50% 10%, rgba(240,240,250,0.95), rgba(255,255,255,0.98))'
                }}
            >
                <audio ref={audioRef} autoPlay playsInline />

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <motion.div
                        animate={{ scale: [1, 2, 2.5], opacity: [0.5, 0.1, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                        className={`w-64 h-64 rounded-full ${isDark ? 'bg-primary/20' : 'bg-primary/20'} absolute -top-32 -left-32`}
                    />
                    <motion.div
                        animate={{ scale: [1, 1.8, 2], opacity: [0.3, 0.1, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                        className={`w-64 h-64 rounded-full ${isDark ? 'bg-primary/30' : 'bg-primary/30'} absolute -top-32 -left-32`}
                    />
                </div>

                <div className="flex-1 flex flex-col items-center pt-24 z-10">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative mb-6">
                        <div className={`w-36 h-36 rounded-full border-4 shadow-2xl flex items-center justify-center ${isDark ? 'border-primary/50 shadow-primary/20 bg-black/20' : 'border-primary/50 shadow-primary/30 bg-white/20'}`}>
                            <Avatar src={callData.partnerAvatar} name={callData.partnerName} size={140} />
                        </div>
                        {callData.isGeoSecure && (
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="absolute bottom-0 right-2 bg-green-500 rounded-full p-2 border-4 border-black shadow-lg"
                            >
                                <ShieldCheck size={20} className="text-white" />
                            </motion.div>
                        )}
                        {callData.status === 'geo_failed' && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute bottom-0 right-2 bg-red-500 rounded-full p-2 border-4 border-black shadow-lg">
                                <ShieldAlert size={20} className="text-white" />
                            </motion.div>
                        )}
                    </motion.div>

                    <h2 className="text-3xl font-bold tracking-tight mb-2">
                        {callData.partnerName || 'Unknown Contact'}
                    </h2>

                    {callData.status === 'connected' && (
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-lg font-mono opacity-80 mb-2">{formatDuration(callData.callDuration)}</span>
                            <div className={`mt-2 px-4 py-2 rounded-full flex items-center gap-2 border transition-colors duration-500 ${callData.isHumanVerified ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
                                {callData.isHumanVerified ? (
                                    <>
                                        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="flex items-center gap-1.5">
                                            <Mic size={18} />
                                            <Fingerprint size={16} className="opacity-70" />
                                        </motion.div>
                                        <span className="text-sm font-bold">Verified Human Voice ✨</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={18} />
                                        <span className="text-sm font-bold text-red-500">Alert: Voice identity not verified!</span>
                                    </>
                                )}
                            </div>

                            {callData.multiPathState !== undefined && callData.multiPathState !== 'inactive' && (
                                <motion.div animate={{ opacity: 1, scale: 1 }} className={`mb-4 px-3 py-1.5 rounded-full flex items-center gap-2 border ${callData.multiPathState === 'active' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                                    <Network size={14} className={callData.multiPathState === 'active' ? 'animate-pulse' : ''} />
                                    <span className="text-xs font-bold font-mono">
                                        {callData.multiPathState === 'active' ? 'Multi-Path Active 🔒' : 'Multi-Path Degraded ⚠️'}
                                    </span>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {callData.status === 'geo_failed' ? (
                        <div className="mt-4 max-w-sm text-center">
                            <div className="flex items-center justify-center gap-2 text-red-500 font-bold mb-2">
                                <MapPinOff size={24} />
                                <span>Security Check Failed</span>
                            </div>
                            <p className="text-sm font-medium text-red-500/80 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">
                                {callData.geoFailMessage || 'Geometric security check failed'}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm font-medium opacity-60 uppercase tracking-widest mt-2 flex items-center gap-2">
                            {callData.status === 'checking_geo' && 'Verifying security range...'}
                            {callData.status === 'calling' && 'Calling...'}
                            {callData.status === 'ringing' && 'Incoming Call...'}
                        </p>
                    )}

                    {callData.status === 'connected' && (
                        <motion.button
                            onClick={() => setShowSecurityStats(!showSecurityStats)}
                            className={`mt-6 px-4 py-2 rounded-2xl flex items-center gap-2 border transition-all ${
                                showSecurityStats ? 'bg-emerald-500 text-white shadow-lg' : `backdrop-blur-xl ${isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'}`
                            }`}
                        >
                            <Shield size={16} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">لوحة الأمان</span>
                        </motion.button>
                    )}

                    <AnimatePresence>
                        {showSecurityStats && callData.status === 'connected' && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mt-8 w-full max-w-sm px-6">
                                <Suspense fallback={<div className="animate-pulse bg-white/5 rounded-3xl h-64 w-full" />}>
                                    <SecurityStats isDark={isDark} />
                                </Suspense>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="pb-16 px-10 flex justify-center gap-10 z-10">
                    {callData.status !== 'geo_failed' && (
                        callData.status === 'ringing' ? (
                            <>
                                <motion.button onClick={onDecline} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-red-500/30 shadow-lg"><PhoneOff size={28} /></motion.button>
                                <motion.button onClick={onAccept} className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-emerald-500/30 shadow-lg animate-bounce"><Phone size={28} /></motion.button>
                            </>
                        ) : (
                            <>
                                <MicButton isMuted={callData.isMuted} onToggle={onToggleMute} isDark={isDark} />
                                <motion.button onClick={onEnd} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-red-500/30 shadow-lg"><PhoneOff size={28} /></motion.button>
                            </>
                        )
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
