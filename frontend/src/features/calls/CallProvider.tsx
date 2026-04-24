import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthContext } from '@/context/AuthContext';
import { useSecurityContext } from '@/context/SecurityContext';
import { getGeoHash, encryptCallSignal, decryptCallSignal } from '@/features/chat/services/crypto';
import { CallData, CallState } from './types';
import { useCallTimer } from './hooks/useCallTimer';
import {
    fetchIceServers,
    setupMultiPathMerger,
    setupMultiPathSplitter,
    setupWatermarkDetector,
    setupWatermarkInjector,
} from './services/audio-pipeline';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface CallContextType {
    callData: CallData;
    startCall: (partnerId: string, partnerName: string, partnerAvatar: string) => Promise<void>;
    acceptCall: () => Promise<void>;
    declineCall: () => void;
    endCall: () => void;
    toggleMuteLocal: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
    const { user } = useAuthContext();
    const { privateChatSecurity } = useSecurityContext();
    const { duration, startTimer, stopTimer } = useCallTimer();

    const [callData, setCallData] = useState<CallData>({
        status: 'idle',
        partnerId: null,
        partnerName: null,
        partnerAvatar: null,
        isMuted: false,
        localStream: null,
        remoteStream: null,
        callDuration: 0,
        isGeoSecure: false,
        geoFailMessage: null,
        isHumanVerified: false,
        multiPathState: 'inactive'
    });

    useEffect(() => {
        setCallData(prev => ({ ...prev, callDuration: duration }));
    }, [duration]);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const partnerChannelRef = useRef<RealtimeChannel | null>(null);
    const geoHashRef = useRef<string | null>(null);
    const pendingOfferDataRef = useRef<string | null>(null);
    const pendingIceCandidatesRef = useRef<string[]>([]);

    const verificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const watermarkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const localAudioCtxRef = useRef<AudioContext | null>(null);
    const remoteAudioCtxRef = useRef<AudioContext | null>(null);
    const splitterCtxRef = useRef<AudioContext | null>(null);
    const mergerCtxRef = useRef<AudioContext | null>(null);
    const watermarkedTrackRef = useRef<MediaStreamTrack | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const blobUrlsRef = useRef<string[]>([]);
    const callStatusRef = useRef<CallData['status']>('idle');
    const partnerIdRef = useRef<string | null>(null);

    const audioPipelineDeps = {
        pcRef,
        dataChannelRef,
        blobUrlsRef,
        verificationIntervalRef,
        watermarkIntervalRef,
        localAudioCtxRef,
        remoteAudioCtxRef,
        splitterCtxRef,
        mergerCtxRef,
        watermarkedTrackRef,
        geoHashRef,
        setMultiPathState: (state: CallData['multiPathState']) => {
            setCallData(prev => ({ ...prev, multiPathState: state }));
        },
        setIsHumanVerified: (isHumanVerified: boolean) => {
            setCallData(prev => ({ ...prev, isHumanVerified }));
        },
    };

    // Sync localStreamRef with state every render to avoid stale closures
    useEffect(() => {
        if (callData.localStream) {
            localStreamRef.current = callData.localStream;
        }
    });

    // Keep callStatusRef in sync so signaling handler doesn't need callData.status in deps
    callStatusRef.current = callData.status;
    partnerIdRef.current = callData.partnerId;

    const endCallUI = useCallback(() => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        // Use ref to avoid stale closure when called from cleanup functions
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }

        // Revoke all Blob URLs to prevent memory leaks
        blobUrlsRef.current.forEach(url => {
            try { URL.revokeObjectURL(url); } catch { }
        });
        blobUrlsRef.current = [];

        stopTimer();

        if (verificationIntervalRef.current) {
            clearInterval(verificationIntervalRef.current);
            verificationIntervalRef.current = null;
        }
        if (watermarkIntervalRef.current) {
            clearInterval(watermarkIntervalRef.current);
            watermarkIntervalRef.current = null;
        }

        if (localAudioCtxRef.current) { localAudioCtxRef.current.close().catch(() => { }); localAudioCtxRef.current = null; }
        if (remoteAudioCtxRef.current) { remoteAudioCtxRef.current.close().catch(() => { }); remoteAudioCtxRef.current = null; }
        if (splitterCtxRef.current) { splitterCtxRef.current.close().catch(() => { }); splitterCtxRef.current = null; }
        if (mergerCtxRef.current) { mergerCtxRef.current.close().catch(() => { }); mergerCtxRef.current = null; }

        if (watermarkedTrackRef.current) { watermarkedTrackRef.current.stop(); watermarkedTrackRef.current = null; }

        geoHashRef.current = null;
        pendingOfferDataRef.current = null;
        pendingIceCandidatesRef.current = [];
        dataChannelRef.current = null;

        setCallData({
            status: 'idle',
            partnerId: null,
            partnerName: null,
            partnerAvatar: null,
            isMuted: false,
            localStream: null,
            remoteStream: null,
            callDuration: 0,
            isGeoSecure: false,
            geoFailMessage: null,
            isHumanVerified: false,
            multiPathState: 'inactive'
        });
    }, [stopTimer]);

    const sendSignal = useCallback(async (to: string, type: string, data?: string, extra?: Record<string, any>) => {
        if (!user) return;
        let pChannel = partnerChannelRef.current;
        if (!pChannel || pChannel.topic !== `call-user-${to}`) {
            pChannel = supabase.channel(`call-user-${to}`);
            partnerChannelRef.current = pChannel;
            await new Promise(r => pChannel!.subscribe((s) => { if (s === 'SUBSCRIBED') r(null); }));
        }

        const activeChannel = partnerChannelRef.current;
        if (!activeChannel) return;

        activeChannel.send({
            type: 'broadcast',
            event: 'call-signal',
            payload: { type, from: user.id, data, ...extra }
        });
    }, [user]);

    // Signaling Listener
    useEffect(() => {
        if (!user) return;

        const myChannel = supabase.channel(`call-user-${user.id}`);
        channelRef.current = myChannel;

        myChannel.on('broadcast', { event: 'call-signal' }, async ({ payload }) => {
            const { type, from, data, callerName, callerAvatar } = payload;

            if (type === 'offer') {
                if (pcRef.current || callStatusRef.current !== 'idle') {
                    const busyChannel = supabase.channel(`call-user-${from}`);
                    busyChannel.subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            busyChannel.send({ type: 'broadcast', event: 'call-signal', payload: { type: 'busy', from: user.id } });
                            supabase.removeChannel(busyChannel);
                        }
                    });
                    return;
                }

                pendingOfferDataRef.current = data;
                setCallData(prev => ({
                    ...prev,
                    status: 'ringing',
                    partnerId: from,
                    partnerName: callerName || 'User',
                    partnerAvatar: callerAvatar || ''
                }));
            } else if (type === 'answer') {
                if (pcRef.current && pcRef.current.signalingState !== 'stable' && geoHashRef.current) {
                    try {
                        const answer = await decryptCallSignal(data, geoHashRef.current);
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                        setCallData(prev => ({ ...prev, status: 'connected' }));
                        startTimer();
                    } catch (e) {
                        endCallUI();
                    }
                }
            } else if (type === 'ice-candidate') {
                try {
                    if (geoHashRef.current) {
                        const candidate = await decryptCallSignal(data, geoHashRef.current);
                        if (pcRef.current) {
                            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                    } else {
                        pendingIceCandidatesRef.current.push(data);
                    }
                } catch (e) {
                    console.error('Error adding encrypted ice candidate', e);
                }
            } else if (type === 'busy' || type === 'end') {
                endCallUI();
            }
        });

        myChannel.subscribe();
        return () => { supabase.removeChannel(myChannel); };
    }, [user, endCallUI, startTimer]);

    const setupMultiPathSplitterForCall = (stream: MediaStream) =>
        setupMultiPathSplitter(stream, audioPipelineDeps);

    const setupMultiPathMergerForCall = (stream: MediaStream) =>
        setupMultiPathMerger(stream, audioPipelineDeps);

    const setupWatermarkInjectorForCall = (stream: MediaStream, geoHash: string) =>
        setupWatermarkInjector(stream, geoHash, audioPipelineDeps);

    const setupWatermarkDetectorForCall = (stream: MediaStream) =>
        setupWatermarkDetector(stream, audioPipelineDeps);

    const startCall = async (partnerId: string, partnerName: string, partnerAvatar: string) => {
        if (!user) return;

        setCallData(prev => ({
            ...prev,
            status: 'checking_geo',
            partnerId,
            partnerName,
            partnerAvatar,
            isGeoSecure: false,
            geoFailMessage: null
        }));

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const geoHash = await getGeoHash();
            geoHashRef.current = geoHash;

            setCallData(prev => ({ ...prev, isGeoSecure: true }));

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCallData(prev => ({
                    ...prev,
                    status: 'geo_failed',
                    geoFailMessage: 'Audio capture is not available on this device'
                }));
                return;
            }

            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (err) {
                setCallData(prev => ({
                    ...prev,
                    status: 'geo_failed',
                    geoFailMessage: 'Failed to access microphone. Please grant permission and try again.'
                }));
                return;
            }

            setCallData(prev => ({
                ...prev,
                status: 'calling',
                localStream: stream
            }));

            const iceServers = await fetchIceServers(API_BASE);
            const pc = new RTCPeerConnection({ iceServers });
            pcRef.current = pc;

            dataChannelRef.current = pc.createDataChannel('multipath-data', { ordered: false, maxRetransmits: 0 });
            dataChannelRef.current.onopen = () => setCallData(prev => ({ ...prev, multiPathState: 'active' }));
            dataChannelRef.current.onclose = () => setCallData(prev => ({ ...prev, multiPathState: 'inactive' }));

            pc.onicecandidate = async (e) => {
                if (e.candidate && geoHashRef.current) {
                    try {
                        const encryptedCandidate = await encryptCallSignal(e.candidate, geoHashRef.current);
                        sendSignal(partnerId, 'ice-candidate', encryptedCandidate);
                    } catch (e) { console.warn("Cleaned up error:", e); }
                }
            };

            pc.ontrack = async (e) => {
                if (privateChatSecurity.multiPathEnabled) {
                    const mergedStream = await setupMultiPathMergerForCall(e.streams[0]);
                    setCallData(prev => ({ ...prev, remoteStream: mergedStream }));
                    setupWatermarkDetectorForCall(mergedStream);
                } else {
                    setCallData(prev => ({ ...prev, remoteStream: e.streams[0] }));
                    setupWatermarkDetectorForCall(e.streams[0]);
                }
            };

            let outgoingStream: MediaStream;
            if (privateChatSecurity.multiPathEnabled) {
                const splitStream = await setupMultiPathSplitterForCall(stream);
                outgoingStream = await setupWatermarkInjectorForCall(splitStream, geoHash);
            } else {
                outgoingStream = await setupWatermarkInjectorForCall(stream, geoHash);
            }
            watermarkedTrackRef.current = outgoingStream.getAudioTracks()[0] || null;
            outgoingStream.getTracks().forEach(track => pc.addTrack(track, outgoingStream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const encryptedOffer = await encryptCallSignal(offer, geoHashRef.current);

            sendSignal(partnerId, 'offer', encryptedOffer, {
                callerName: user.user_metadata?.full_name || user.email,
                callerAvatar: user.user_metadata?.avatar_url || ''
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred while starting the call';
            setCallData(prev => ({
                ...prev,
                status: 'geo_failed',
                geoFailMessage: message
            }));
            setTimeout(endCallUI, 3000);
        }
    };

    const acceptCall = async () => {
        const pId = partnerIdRef.current;
        if (!pId) return;

        setCallData(prev => ({ ...prev, status: 'checking_geo', isGeoSecure: false, geoFailMessage: null }));

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const geoHash = await getGeoHash();
            geoHashRef.current = geoHash;

            let offer;
            try {
                if (!pendingOfferDataRef.current) throw new Error("No pending offer");
                offer = await decryptCallSignal(pendingOfferDataRef.current, geoHash);
            } catch (e) {
                setCallData(prev => ({ ...prev, status: 'geo_failed', geoFailMessage: 'Security verification failed' }));
                sendSignal(pId, 'end');
                setTimeout(endCallUI, 3000);
                return;
            }

            setCallData(prev => ({ ...prev, isGeoSecure: true }));

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCallData(prev => ({
                    ...prev,
                    status: 'geo_failed',
                    geoFailMessage: 'Audio capture is not available on this device'
                }));
                sendSignal(pId, 'end');
                setTimeout(endCallUI, 3000);
                return;
            }

            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (err) {
                setCallData(prev => ({
                    ...prev,
                    status: 'geo_failed',
                    geoFailMessage: 'Failed to access microphone. Please grant permission and try again.'
                }));
                sendSignal(pId, 'end');
                setTimeout(endCallUI, 3000);
                return;
            }
            setCallData(prev => ({ ...prev, localStream: stream, status: 'connected' }));

            const iceServers = await fetchIceServers(API_BASE);
            const pc = new RTCPeerConnection({ iceServers });
            pcRef.current = pc;

            pc.ondatachannel = (e) => {
                if (e.channel.label === 'multipath-data') {
                    dataChannelRef.current = e.channel;
                    dataChannelRef.current.onopen = () => setCallData(prev => ({ ...prev, multiPathState: 'active' }));
                    dataChannelRef.current.onclose = () => setCallData(prev => ({ ...prev, multiPathState: 'inactive' }));
                }
            };

            pc.onicecandidate = async (e) => {
                if (e.candidate && geoHashRef.current) {
                    try {
                        const encryptedCandidate = await encryptCallSignal(e.candidate, geoHashRef.current);
                        sendSignal(pId, 'ice-candidate', encryptedCandidate);
                    } catch (e) { console.warn("Cleaned up error:", e); }
                }
            };

            pc.ontrack = async (e) => {
                if (privateChatSecurity.multiPathEnabled) {
                    const mergedStream = await setupMultiPathMergerForCall(e.streams[0]);
                    setCallData(prev => ({ ...prev, remoteStream: mergedStream }));
                    setupWatermarkDetectorForCall(mergedStream);
                } else {
                    setCallData(prev => ({ ...prev, remoteStream: e.streams[0] }));
                    setupWatermarkDetectorForCall(e.streams[0]);
                }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            let outgoingStream: MediaStream;
            if (privateChatSecurity.multiPathEnabled) {
                const splitStream = await setupMultiPathSplitterForCall(stream);
                outgoingStream = await setupWatermarkInjectorForCall(splitStream, geoHash);
            } else {
                outgoingStream = await setupWatermarkInjectorForCall(stream, geoHash);
            }
            watermarkedTrackRef.current = outgoingStream.getAudioTracks()[0] || null;
            outgoingStream.getTracks().forEach(track => pc.addTrack(track, outgoingStream));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            const encryptedAnswer = await encryptCallSignal(answer, geoHash);
            sendSignal(pId, 'answer', encryptedAnswer);
            startTimer();

            for (const encCand of pendingIceCandidatesRef.current) {
                try {
                    const cand = await decryptCallSignal(encCand, geoHash);
                    if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) { console.warn("Cleaned up error:", e); }
            }
            pendingIceCandidatesRef.current = [];
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to accept the call';
            setCallData(prev => ({
                ...prev,
                status: 'geo_failed',
                geoFailMessage: message
            }));
            endCallUI();
        }
    };

    const declineCall = useCallback(() => {
        const pid = partnerIdRef.current;
        if (pid) sendSignal(pid, 'end');
        endCallUI();
    }, [sendSignal, endCallUI]);

    const endCall = useCallback(() => {
        const pid = partnerIdRef.current;
        if (pid) sendSignal(pid, 'end');
        endCallUI();
    }, [sendSignal, endCallUI]);

    const toggleMuteLocal = useCallback(() => {
        const stream = localStreamRef.current;
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setCallData(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
                if (watermarkedTrackRef.current) watermarkedTrackRef.current.enabled = audioTrack.enabled;
            }
        }
    }, []);

    return (
        <CallContext.Provider value={{
            callData,
            startCall,
            acceptCall,
            declineCall,
            endCall,
            toggleMuteLocal
        }}>
            {children}
        </CallContext.Provider>
    );
}

export function useCallContext() {
    const context = useContext(CallContext);
    if (!context) throw new Error("useCallContext must be used within CallProvider");
    return context;
}
