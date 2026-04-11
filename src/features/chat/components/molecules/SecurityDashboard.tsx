import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Key, Phone, Clipboard, Lock, AlertTriangle } from 'lucide-react';
import { useE2EE } from '@/features/chat/hooks/useE2EE';
import { useAuthContext } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface SecurityDashboardProps {
    className?: string;
    isDark?: boolean;
}

function hexFromBuffer(buf: ArrayBuffer) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ className = '', isDark = true }) => {
    const { keysReady, publicKey } = useE2EE();
    const { user, setUserMetadata } = useAuthContext() as any;

    const [fingerprint, setFingerprint] = useState<string | null>(null);
    const [panicPin, setPanicPin] = useState('');
    const [emergencyContact, setEmergencyContact] = useState<string | null>(user?.user_metadata?.emergency_contact || '');
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // compute fingerprint when publicKey changes
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!publicKey) {
                    setFingerprint(null);
                    return;
                }
                const enc = new TextEncoder().encode(publicKey);
                const hash = await window.crypto.subtle.digest('SHA-256', enc);
                const hex = hexFromBuffer(hash).toUpperCase();
                // group every 4 chars for readability
                const groups = hex.match(/.{1,4}/g) || [];
                const display = groups.join(':');
                if (mounted) setFingerprint(display);
            } catch (e) {
                if (mounted) setFingerprint(null);
            }
        })();
        return () => { mounted = false; };
    }, [publicKey]);

    const shieldColor = useMemo(() => {
        if (keysReady) return 'text-emerald-400';
        if (publicKey) return 'text-amber-400';
        return 'text-rose-400';
    }, [keysReady, publicKey]);

    const copyFingerprint = async () => {
        if (!fingerprint) return;
        try {
            await navigator.clipboard.writeText(fingerprint);
            setStatusMsg('Fingerprint copied');
            setTimeout(() => setStatusMsg(null), 1800);
        } catch (e) {
            setStatusMsg('Copy failed');
            setTimeout(() => setStatusMsg(null), 1800);
        }
    };

    const saveEmergencySettings = async () => {
        if (!user) return;
        setSaving(true);
        try {
            // Merge metadata safely
            const newMeta = { ...(user.user_metadata || {}), emergency_contact: emergencyContact };
            const { error } = await supabase.from('users').update({ user_metadata: newMeta }).eq('id', user.id);
            if (!error) {
                setStatusMsg('Emergency contact saved');
                // try to update context if provided
                if (setUserMetadata) setUserMetadata(newMeta);
            } else {
                setStatusMsg('Save failed');
            }
        } catch (e) {
            setStatusMsg('Save error');
        } finally {
            setSaving(false);
            setTimeout(() => setStatusMsg(null), 1600);
        }
    };

    const setPanic = async () => {
        if (!user || !panicPin) return setStatusMsg('Enter PIN');
        setSaving(true);
        try {
            // Store a hash of the panic PIN in user metadata (simple client-side hashing)
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(panicPin));
            const hashHex = hexFromBuffer(hashBuffer);
            const newMeta = { ...(user.user_metadata || {}), panic_pin_hash: hashHex };
            const { error } = await supabase.from('users').update({ user_metadata: newMeta }).eq('id', user.id);
            if (!error) {
                setStatusMsg('Panic PIN set');
                if (setUserMetadata) setUserMetadata(newMeta);
                setPanicPin('');
            } else {
                setStatusMsg('Failed to set PIN');
            }
        } catch (e) {
            setStatusMsg('Error saving PIN');
        } finally {
            setSaving(false);
            setTimeout(() => setStatusMsg(null), 1600);
        }
    };

    return (
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0f1115] border-white/8' : 'bg-white border-gray-100'} ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className={`p-3 rounded-xl ${isDark ? 'bg-white/3' : 'bg-black/3'}`}>
                        {keysReady ? (
                            <ShieldCheck size={22} className={`${shieldColor} animate-pulse`} />
                        ) : publicKey ? (
                            <Shield size={22} className={`${shieldColor}`} />
                        ) : (
                            <ShieldAlert size={22} className={`${shieldColor}`} />
                        )}
                    </motion.div>
                    <div>
                        <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Encryption Status</div>
                        <div className={`text-xs opacity-70 ${isDark ? 'text-white/60' : 'text-slate-700'}`}>
                            {keysReady ? 'Keys ready (end-to-end active)' : publicKey ? 'Public key present — unlock required' : 'No keys available'}
                        </div>
                    </div>
                </div>
                <div className="text-xs opacity-60">Dark Cyber • Pulse</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/6' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Key size={16} className="text-amber-400" />
                            <div className="text-sm font-semibold">Public Key Fingerprint</div>
                        </div>
                        <div className="text-xs opacity-60">verify manually</div>
                    </div>
                    <div className="mt-2 text-[12px] font-mono break-all text-left">
                        {fingerprint ? (
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-[12px] opacity-90">{fingerprint}</div>
                                <button onClick={copyFingerprint} className="ml-3 px-2 py-1 rounded-md bg-white/5 hover:bg-white/8 text-xs">
                                    <Clipboard size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="text-sm opacity-50">No fingerprint available</div>
                        )}
                    </div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/6' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Lock size={16} className="text-cyan-400" />
                        <div className="text-sm font-semibold">Panic PIN & Emergency Contact</div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <input
                            value={panicPin}
                            onChange={(e) => setPanicPin(e.target.value)}
                            placeholder="Enter new Panic PIN"
                            type="password"
                            className="px-3 py-2 rounded-md bg-transparent border border-white/6 text-sm"
                        />
                        <div className="flex gap-2">
                            <button onClick={setPanic} disabled={saving} className="px-3 py-2 rounded-md bg-rose-500 text-white text-sm">
                                Set PIN
                            </button>
                            <div className="text-xs opacity-60 self-center">(keeps a server-side hash)</div>
                        </div>

                        <hr className="my-2 opacity-5" />

                        <div className="text-xs opacity-70">Emergency Contact (user id)</div>
                        <input
                            value={emergencyContact || ''}
                            onChange={(e) => setEmergencyContact(e.target.value)}
                            placeholder="User ID or phone"
                            className="px-3 py-2 rounded-md bg-transparent border border-white/6 text-sm"
                        />
                        <div className="flex gap-2">
                            <button onClick={saveEmergencySettings} disabled={saving} className="px-3 py-2 rounded-md bg-amber-500 text-white text-sm">
                                Save Contact
                            </button>
                            {statusMsg && <div className="text-sm opacity-80 self-center">{statusMsg}</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Emergency quick actions */}
            <div className="mt-4 flex items-center gap-3">
                <button onClick={() => { window.dispatchEvent(new Event('e2ee-force-reinit')); setStatusMsg('Reinit triggered'); setTimeout(() => setStatusMsg(null), 1500); }} className="px-3 py-2 rounded-md bg-white/5">
                    <Shield size={14} className="mr-2" /> Force Re-init
                </button>
                <button onClick={() => { sessionStorage.setItem('panic_mode', 'true'); window.dispatchEvent(new Event('panic-mode-activated')); }} className="px-3 py-2 rounded-md bg-red-600 text-white">
                    <AlertTriangle size={14} className="mr-2" /> Trigger Panic
                </button>
            </div>
        </div>
    );
};

export default SecurityDashboard;
