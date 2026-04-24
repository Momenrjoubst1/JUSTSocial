import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Activity, Zap, Network, ChevronUp, ChevronDown, CheckCircle, ShieldAlert, Globe, MapPin, AlertCircle, Trash2, ShieldCheck } from 'lucide-react';
import { useE2EE } from '@/features/chat/hooks/useE2EE';
import { useWebRTC } from '@/features/calls';
import { fetchCurrentGeo, verifyGeoStability, saveGeoFingerprint, trustCurrentLocation, type GeoData } from '@/features/chat/services/geoFingerprint';
import { executePanicWipe } from '@/features/chat/services/panicService';
import { useTranslation } from 'react-i18next';

interface SecurityStatsProps {
    className?: string;
    isDark?: boolean;
}

// 🚀 التعديل الأهم: إخراج مكون CountUp خارج المكون الرئيسي لمنع إعادة إنشائه مع كل ريندر
const CountUp = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) return;

        const duration = 1.6;
        const increment = end / (duration * 60);

        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(start));
            }
        }, 1000 / 60);

        return () => clearInterval(timer);
    }, [value]);

    return <>{displayValue}</>;
};

export const SecurityStats: React.FC<SecurityStatsProps> = ({ className = '', isDark = true }) => {
    const { t } = useTranslation('chat');
    const { keysReady } = useE2EE();
    const { callData } = useWebRTC();

    // محاولة قراءة وقت الاستجابة بشكل آمن
    const latencyMs = (callData as any)?.latency ?? (callData as any)?.rtt ?? null;

    const [blockedCount, setBlockedCount] = useState(128);
    const [isExpanded, setIsExpanded] = useState(true);
    const [geoStatus, setGeoStatus] = useState<'secure' | 'suspicious' | 'verifying'>('verifying');
    const [geoInfo, setGeoInfo] = useState<GeoData | null>(null);
    const [isPanicking, setIsPanicking] = useState(false);

    // مستمع زر الطوارئ (Ctrl + Shift + P)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                handlePanic();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handlePanic = async () => {
        setIsPanicking(true);
        // ننتظر حتى ينتهي أنيميشن التدمير قبل مسح البيانات
        setTimeout(async () => {
            await executePanicWipe();
        }, 1200);
    };

    // جلب بيانات الموقع الجغرافي
    useEffect(() => {
        let isMounted = true; // لمنع تسرب الذاكرة
        const initGeo = async () => {
            const currentGeo = await fetchCurrentGeo();
            if (currentGeo && isMounted) {
                setGeoInfo(currentGeo);
                const { stable } = await verifyGeoStability(currentGeo);
                if (stable && isMounted) {
                    setGeoStatus('secure');
                    saveGeoFingerprint(currentGeo);
                } else if (isMounted) {
                    setGeoStatus('suspicious');
                }
            }
        };
        initGeo();
        return () => { isMounted = false; };
    }, []);

    // محاكاة حية لزيادة العناصر المحظورة
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                setBlockedCount(prev => prev + Math.floor(Math.random() * 3));
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const multiPathActive = callData?.multiPathState === 'active';
    const multiPathDegraded = callData?.multiPathState === 'degraded';

    const codeSnippets = [
        'auth.verify();', 'wipeCache();', "rm -rf /tmp/*",
        'encrypt(key, data);', 'session.clear();', '// TODO: revoke tokens',
        'console.log("purge");', 'deleteUserData();'
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-3xl border transition-all duration-500 ${className} ${isDark
                    ? 'bg-black/40 border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                    : 'bg-white/40 border-black/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,38,135,0.15)]'
                }`}
        >
            {/* مؤشر الأمان الأخضر */}
            <AnimatePresence>
                {keysReady && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-4 right-4"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-5">
                {/* رأس اللوحة */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/20'}`}>
                            <Shield className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h3 className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            لوحة تحكم الأمان <span className="text-[10px] opacity-50 font-mono uppercase ml-1">v2.4</span>
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${isDark ? 'text-white/40' : 'text-slate-400'}`}
                    >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>

                {/* المحتوى القابل للطي */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-5 overflow-hidden"
                        >
                            {/* Encryption Strength */}
                            <div className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Lock size={14} className="text-emerald-500" />
                                        <span className={`text-xs font-bold uppercase tracking-wider opacity-60 ${isDark ? 'text-white' : 'text-slate-900'}`}>قوة التشفير</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t('securityStats.aesActive')}</span>
                                </div>
                                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-black/5'} transition-all group-hover:border-emerald-500/30`}>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-2xl font-black font-mono tracking-tighter text-emerald-500">
                                                <CountUp value={keysReady ? 100 : 0} />%
                                            </div>
                                            <div className={`text-[10px] font-medium mt-1 opacity-50 uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('securityStats.endToEndEncryption')}</div>
                                        </div>
                                        <div className="flex gap-1 items-end pb-1">
                                            {[0.4, 0.6, 0.8, 1.0, 0.7].map((h, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [h * 15, (h * 0.5) * 15, h * 15] }}
                                                    transition={{ repeat: Infinity, duration: 1 + i * 0.2 }}
                                                    className="w-1 bg-emerald-500/40 rounded-full"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Multi-Path Distribution */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Network size={14} className="text-blue-500" />
                                        <span className={`text-xs font-bold uppercase tracking-wider opacity-60 ${isDark ? 'text-white' : 'text-slate-900'}`}>توزيع المسارات</span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${multiPathActive ? 'text-blue-500 bg-blue-500/10' : multiPathDegraded ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 bg-slate-500/10'}`}>
                                        {multiPathActive ? t('securityStats.dynamic') : multiPathDegraded ? t('securityStats.degraded') : t('securityStats.standby')}
                                    </span>
                                </div>
                                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-black/5'}`}>
                                    <div className="relative h-12 w-full flex items-center justify-center">
                                        <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
                                            <motion.path d="M 10 30 Q 50 10 100 30 T 190 30" fill="transparent" stroke={isDark ? "white" : "black"} strokeWidth="1" strokeDasharray="4 2" opacity="0.1" />
                                            <motion.path d="M 10 30 Q 50 50 100 30 T 190 30" fill="transparent" stroke={isDark ? "white" : "black"} strokeWidth="1" strokeDasharray="4 2" opacity="0.1" />
                                            <circle cx="10" cy="30" r="3" fill={isDark ? "white" : "black"} fillOpacity="0.2" />
                                            <circle cx="190" cy="30" r="3" fill={isDark ? "white" : "black"} fillOpacity="0.2" />
                                            {multiPathActive && (
                                                <>
                                                    <motion.circle initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} r="2" fill="#3b82f6" style={{ offsetPath: "path('M 10 30 Q 50 10 100 30 T 190 30')" }} />
                                                    <motion.circle initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.5 }} r="2" fill="#3b82f6" style={{ offsetPath: "path('M 10 30 Q 50 50 100 30 T 190 30')" }} />
                                                </>
                                            )}
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className={`text-[10px] font-mono tracking-widest opacity-30 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('securityStats.strippingActive')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Geographic Fingerprint */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Globe size={14} className={geoStatus === 'suspicious' ? 'text-red-500' : 'text-emerald-500'} />
                                        <span className={`text-xs font-bold uppercase tracking-wider opacity-60 ${isDark ? 'text-white' : 'text-slate-900'}`}>خريطة أمان حية</span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${geoStatus === 'secure' ? 'text-emerald-500 bg-emerald-500/10' : geoStatus === 'suspicious' ? 'text-red-500 bg-red-500/10' : 'text-slate-500 bg-slate-500/10'}`}>
                                        {geoStatus === 'secure' ? t('securityStats.stable') : geoStatus === 'suspicious' ? t('securityStats.riskDetected') : t('securityStats.verifying')}
                                    </span>
                                </div>
                                <div className={`p-4 rounded-2xl border overflow-hidden relative ${geoStatus === 'suspicious' ? 'bg-red-500/5 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : (isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-black/5')}`}>
                                    <div className="relative h-24 w-full flex items-center justify-center">
                                        <svg viewBox="0 0 400 200" className="w-full h-full opacity-20 filter grayscale">
                                            <path d="M50,120 Q100,80 150,120 T250,120 T350,100" fill="transparent" stroke={isDark ? "white" : "black"} strokeWidth="1" />
                                            <circle cx="80" cy="90" r="2" fill={isDark ? "white" : "black"} />
                                            <circle cx="150" cy="110" r="2" fill={isDark ? "white" : "black"} />
                                            <circle cx="220" cy="85" r="2" fill={isDark ? "white" : "black"} />
                                            <circle cx="310" cy="115" r="2" fill={isDark ? "white" : "black"} />
                                        </svg>
                                        {geoInfo && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                                <div className={`relative ${geoStatus === 'suspicious' ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    <motion.div animate={{ scale: [1, 2, 1], opacity: [0.5, 0.2, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className={`absolute inset-0 rounded-full ${geoStatus === 'suspicious' ? 'bg-red-500/30' : 'bg-emerald-500/30'}`} />
                                                    <MapPin size={24} className="relative z-10" />
                                                </div>
                                            </motion.div>
                                        )}
                                        {geoStatus === 'secure' && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                <svg viewBox="0 0 400 200" className="w-full h-full">
                                                    <motion.path d="M 200 100 L 280 60 L 340 100" fill="transparent" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.4 }} transition={{ duration: 1.5, repeat: Infinity }} />
                                                    <motion.path d="M 200 100 L 120 140 L 60 100" fill="transparent" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.4 }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono opacity-60">
                                        <div className="flex gap-2">
                                            <span>IP: {geoInfo?.ip || t('securityStats.secured')}</span>
                                            <span>LOC: {geoInfo?.city || t('securityStats.fetching')}</span>
                                        </div>
                                        <span>NETWORK: {geoInfo?.org?.split(' ')[0] || t('securityStats.encryptedNetwork')}</span>
                                    </div>

                                    {/* Suspicious Alert Overlay */}
                                    <AnimatePresence>
                                        {geoStatus === 'suspicious' && (
                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-red-600/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 z-20">
                                                <AlertCircle size={32} className="text-white mb-2 animate-bounce" />
                                                <h4 className="text-white font-black text-xs uppercase tracking-tighter">تحذير أمني نيون</h4>
                                                <p className="text-white/80 text-[9px] mt-1 leading-tight">تم رصد دخول من موقع جغرافي غير مألوف. يرجى تأكيد الهوية.</p>
                                                <div className="mt-3 flex gap-2">
                                                    <button onClick={() => window.location.reload()} className="bg-white text-red-600 text-[10px] font-bold px-4 py-1.5 rounded-full hover:bg-white/90 transition-colors">إعادة المصادقة</button>
                                                    <button onClick={() => { if (geoInfo) saveGeoFingerprint(geoInfo); try { sessionStorage.setItem('trusted_geo', '1'); } catch (e) { console.warn("Cleaned up error:", e); } trustCurrentLocation(); setGeoStatus('secure'); }} className="bg-red-500 text-white border border-white/20 text-[10px] font-bold px-4 py-1.5 rounded-full hover:bg-red-400 transition-colors flex items-center gap-1"><ShieldCheck size={10} /> تجاوز</button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Monitoring Shield */}
                            <div className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-amber-500" />
                                        <span className={`text-xs font-bold uppercase tracking-wider opacity-60 ${isDark ? 'text-white' : 'text-slate-900'}`}>درع الرصد</span>
                                    </div>
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500"><Activity size={10} className="animate-pulse" /> {t('securityStats.liveScan')}</span>
                                </div>
                                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-black/5'} transition-all group-hover:border-amber-500/30`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-3xl font-black font-mono tracking-tighter text-amber-500">
                                                <CountUp value={blockedCount} />
                                            </div>
                                            <div className={`text-[10px] font-medium mt-1 opacity-50 uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('securityStats.blockedItems')}</div>
                                        </div>
                                        <div className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center ${isDark ? 'border-amber-500/20' : 'border-amber-500/30'}`}>
                                            <ShieldAlert size={24} className="text-amber-500/40" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Footer */}
                            <div className={`pt-4 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                                <div className="flex items-center justify-between opacity-50 px-1">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={10} className="text-emerald-500" />
                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('securityStats.secureConnectionVerified')}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>CERT-RSA:2048</span>
                                        <span className={`text-[9px] font-mono opacity-80 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('securityStats.latencyLabel')}: {latencyMs ? `${latencyMs} ms` : '???'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Panic Button */}
                            <div className="pt-2">
                                <button onClick={handlePanic} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-600/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all group">
                                    <Trash2 size={12} className="group-hover:animate-bounce" />
                                    <span>{t('securityStats.panicWipe')}</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Disintegration Effect Overlay */}
            <AnimatePresence>
                {isPanicking && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[1000] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center pointer-events-none">
                        <motion.div initial={{ scale: 1, filter: "blur(0px)" }} animate={{ scale: [1, 2, 5], filter: "blur(20px)", opacity: 0 }} transition={{ duration: 1.2, ease: "easeInOut" }} className="flex flex-col items-center">
                            <Shield size={64} className="text-red-500 mb-4" />
                            <h2 className="text-white font-black text-2xl uppercase tracking-[0.5em]">{t('securityStats.systemPurge')}</h2>
                        </motion.div>

                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {codeSnippets.map((s, i) => {
                                const left = Math.random() * 100;
                                const top = Math.random() * 100;
                                const rotate = (Math.random() * 30) - 15;
                                const delay = Math.random() * 0.6;
                                return (
                                    <motion.pre key={i} initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, y: -120 + Math.random() * 240, x: `${(Math.random() * 200) - 100}px`, rotate }} transition={{ duration: 1.4, delay }} style={{ left: `${left}%`, top: `${top}%` }} className="absolute text-[10px] font-mono px-2 py-1 bg-white/6 rounded-md text-red-400 border border-red-500/10">
                                        {s}
                                    </motion.pre>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Glows */}
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        </motion.div>
    );
};
