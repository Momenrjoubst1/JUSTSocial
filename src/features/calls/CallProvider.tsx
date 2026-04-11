import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthContext } from '@/context/AuthContext';
import { useSecurityContext } from '@/context/SecurityContext';
import { getGeoHash, encryptCallSignal, decryptCallSignal } from '@/features/chat/services/crypto';
import { CallData, CallState } from './types';
import { MULTIPATH_CONFIG, WATERMARK_CONFIG } from './services/webrtc-config';
import { useCallTimer } from './hooks/useCallTimer';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchIceServers(): Promise<RTCIceServer[]> {
    try {
        const res = await fetch(`${API_BASE}/api/ice-servers`);
        if (!res.ok) throw new Error('Failed to fetch ICE servers');
        const data = await res.json() as { iceServers: RTCIceServer[] };
        return data.iceServers;
    } catch {
        // Fallback to basic STUN
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
}

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

    const endCallUI = useCallback(() => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (callData.localStream) {
            callData.localStream.getTracks().forEach(t => t.stop());
        }
        
        stopTimer();

        if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
        if (watermarkIntervalRef.current) clearInterval(watermarkIntervalRef.current);
        
        if (localAudioCtxRef.current) localAudioCtxRef.current.close().catch(() => {});
        if (remoteAudioCtxRef.current) remoteAudioCtxRef.current.close().catch(() => {});
        if (splitterCtxRef.current) splitterCtxRef.current.close().catch(() => {});
        if (mergerCtxRef.current) mergerCtxRef.current.close().catch(() => {});
        
        if (watermarkedTrackRef.current) watermarkedTrackRef.current.stop();

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
    }, [callData.localStream, stopTimer]);

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
                if (pcRef.current || callData.status !== 'idle') {
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
    }, [user, callData.status, endCallUI, startTimer]);

    // Internal methods moved from useWebRTC
    const setupMultiPathSplitter = async (stream: MediaStream) => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            splitterCtxRef.current = audioCtx;

            const workletCode = `
            class SplitterProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.seq = 0;
                    this.blockCounter = 0;
                    this.buffer = new Float32Array(512);
                    this.bufferIdx = 0;
                    this.rmsHistory = 0.01;
                }
                process(inputs, outputs) {
                    const input = inputs[0];
                    const output = outputs[0];
                    if (!input || !input.length) return true;
                    
                    this.blockCounter++;
                    const isStreamB = (this.blockCounter % ${MULTIPATH_CONFIG.BLOCK_MODULO} === 0);
                    
                    let sumSq = 0;
                    for (let i = 0; i < input[0].length; ++i) {
                        sumSq += input[0][i] * input[0][i];
                    }
                    const rms = Math.sqrt(sumSq / input[0].length);
                    this.rmsHistory = this.rmsHistory * 0.9 + rms * 0.1;
                    
                    for (let ch = 0; ch < output.length; ++ch) {
                        for (let i = 0; i < output[ch].length; ++i) {
                            if (isStreamB) {
                                output[ch][i] = (Math.random() * 2 - 1) * this.rmsHistory;
                                if (ch === 0) {
                                    this.buffer[this.bufferIdx++] = input[0][i];
                                }
                            } else {
                                output[ch][i] = input[ch][i];
                            }
                        }
                    }
                    
                    if (isStreamB) {
                        this.port.postMessage({ seq: this.seq++, payload: new Float32Array(this.buffer.subarray(0, this.bufferIdx)) });
                        this.bufferIdx = 0;
                    }
                    
                    return true;
                }
            }
            registerProcessor('splitter-processor', SplitterProcessor);
            `;
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await audioCtx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);

            const source = audioCtx.createMediaStreamSource(stream);
            const splitterNode = new AudioWorkletNode(audioCtx, 'splitter-processor');
            const destination = audioCtx.createMediaStreamDestination();

            splitterNode.port.onmessage = (e) => {
                if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                    try {
                        dataChannelRef.current.send(JSON.stringify({ seq: e.data.seq, payload: Array.from(e.data.payload) }));
                    } catch (err) { }
                }
            };

            source.connect(splitterNode);
            splitterNode.connect(destination);
            return destination.stream;
        } catch (e) {
            console.error("MultiPath: Failed to setup splitter", e);
            return stream;
        }
    };

    const setupMultiPathMerger = async (stream: MediaStream) => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            mergerCtxRef.current = audioCtx;

            const workletCode = `
            class MergerProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.jitterBuffer = new Map();
                    this.expectedSeq = 0;
                    this.blockCounter = 0;
                    this.lossCount = 0;
                    
                    this.port.onmessage = (e) => {
                        this.jitterBuffer.set(e.data.seq, e.data.payload);
                    };
                }
                process(inputs, outputs) {
                    const input = inputs[0];
                    const output = outputs[0];
                    if (!input || !input.length) return true;
                    
                    this.blockCounter++;
                    const isStreamB = (this.blockCounter % ${MULTIPATH_CONFIG.BLOCK_MODULO} === 0);
                    let lost = false;
                    
                    for (let ch = 0; ch < output.length; ++ch) {
                        if (isStreamB) {
                            const bData = this.jitterBuffer.get(this.expectedSeq);
                            if (bData && bData.length === output[ch].length) {
                                for (let i = 0; i < output[ch].length; ++i) {
                                    output[ch][i] = bData[i];
                                }
                            } else {
                                lost = true;
                                for (let i = 0; i < output[ch].length; ++i) {
                                    output[ch][i] = 0;
                                }
                            }
                        } else {
                            for (let i = 0; i < output[ch].length; ++i) {
                                output[ch][i] = input[ch][i];
                            }
                        }
                    }
                    
                    if (isStreamB) {
                        this.jitterBuffer.delete(this.expectedSeq);
                        this.expectedSeq++;
                        if (lost) this.lossCount++;
                        else this.lossCount = 0;
                    }
                    
                    if (this.blockCounter % ${MULTIPATH_CONFIG.CHECK_INTERVAL} === 0) {
                        this.port.postMessage(this.lossCount > ${MULTIPATH_CONFIG.DEGRADED_THRESHOLD} ? 'degraded' : 'active');
                    }
                    
                    return true;
                }
            }
            registerProcessor('merger-processor', MergerProcessor);
            `;
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await audioCtx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);

            const source = audioCtx.createMediaStreamSource(stream);
            const mergerNode = new AudioWorkletNode(audioCtx, 'merger-processor');
            const destination = audioCtx.createMediaStreamDestination();

            mergerNode.port.onmessage = (e) => {
                setCallData(prev => ({ ...prev, multiPathState: e.data as CallData['multiPathState'] }));
            };

            const checkBinding = () => {
                if (dataChannelRef.current) {
                    dataChannelRef.current.onmessage = (e) => {
                        try {
                            const data = JSON.parse(e.data);
                            mergerNode.port.postMessage({ seq: data.seq, payload: new Float32Array(data.payload) });
                        } catch (err) { }
                    };
                    return true;
                }
                return false;
            };

            if (!checkBinding()) {
                const retryId = setInterval(() => {
                    if (checkBinding()) clearInterval(retryId);
                }, 1000);
            }

            source.connect(mergerNode);
            mergerNode.connect(destination);
            return destination.stream;
        } catch (e) {
            console.error("MultiPath: Failed to setup merger", e);
            return stream;
        }
    };

    const setupWatermarkInjector = async (stream: MediaStream, geoHash: string): Promise<MediaStream> => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            localAudioCtxRef.current = audioCtx;

            const workletCode = `
            class WatermarkProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.phase = 0;
                    this.freq = 0;
                    this.amplitude = ${WATERMARK_CONFIG.AMPLITUDE.BASE};
                    this.port.onmessage = (e) => {
                        if (e.data.freq !== undefined) this.freq = e.data.freq;
                        if (e.data.amplitude !== undefined) this.amplitude = e.data.amplitude;
                    };
                }
                process(inputs, outputs) {
                    const input = inputs[0];
                    const output = outputs[0];
                    if (!input || !input.length || !output || !output.length) return true;
                    
                    const increment = 2 * Math.PI * this.freq / sampleRate;

                    for (let channel = 0; channel < output.length; ++channel) {
                        const inputChannel = input[channel];
                        const outputChannel = output[channel];
                        if (!inputChannel || !outputChannel) continue;
                        for (let i = 0; i < outputChannel.length; ++i) {
                            if (this.freq > 0) {
                                this.phase += increment;
                                const watermark = Math.sin(this.phase) * this.amplitude; 
                                outputChannel[i] = inputChannel[i] + watermark;
                            } else {
                                outputChannel[i] = inputChannel[i];
                            }
                        }
                    }
                    return true;
                }
            }
            registerProcessor('watermark-processor', WatermarkProcessor);
            `;
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await audioCtx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);

            const source = audioCtx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(audioCtx, 'watermark-processor');
            const destination = audioCtx.createMediaStreamDestination();

            source.connect(workletNode);
            workletNode.connect(destination);

            if (watermarkIntervalRef.current) clearInterval(watermarkIntervalRef.current);
            watermarkIntervalRef.current = setInterval(async () => {
                const timestamp = Math.floor(Date.now() / 1000);
                const enc = new TextEncoder();
                const data = enc.encode(`${geoHash}-${timestamp}`);
                const hash = await window.crypto.subtle.digest('SHA-256', data);
                const view = new DataView(hash);
                const token = view.getUint32(0, true);
                const freq = WATERMARK_CONFIG.BASE_FREQ + (token % 5) * WATERMARK_CONFIG.FREQ_STEP;

                let amplitude = WATERMARK_CONFIG.AMPLITUDE.BASE;
                if (pcRef.current) {
                    try {
                        const stats = await pcRef.current.getStats();
                        let maxFractionLost = 0;
                        let rtt = 0;
                        stats.forEach(report => {
                            if (report.type === 'remote-inbound-rtp') {
                                if (report.fractionLost !== undefined && report.fractionLost > maxFractionLost) maxFractionLost = report.fractionLost;
                            }
                            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime !== undefined) rtt = report.currentRoundTripTime;
                        });

                        if (maxFractionLost > 0.05 || rtt > 0.3) amplitude = WATERMARK_CONFIG.AMPLITUDE.STRONG;
                        else if (maxFractionLost > 0.01 || rtt > 0.1) amplitude = WATERMARK_CONFIG.AMPLITUDE.MODERATE;
                    } catch (e) {}
                }

                workletNode.port.postMessage({ freq, amplitude });
            }, WATERMARK_CONFIG.INTERVAL);

            return destination.stream;
        } catch (e) {
            console.error("Failed to setup watermark injector", e);
            return stream;
        }
    };

    const setupWatermarkDetector = (stream: MediaStream) => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            remoteAudioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);

            if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
            verificationIntervalRef.current = setInterval(async () => {
                if (!geoHashRef.current) return;
                analyser.getFloatFrequencyData(dataArray);

                const timestamp = Math.floor(Date.now() / 1000);

                const checkTime = async (ts: number) => {
                    const enc = new TextEncoder();
                    const data = enc.encode(`${geoHashRef.current}-${ts}`);
                    const hash = await window.crypto.subtle.digest('SHA-256', data);
                    const view = new DataView(hash);
                    const token = view.getUint32(0, true);
                    const freq = WATERMARK_CONFIG.BASE_FREQ + (token % 5) * WATERMARK_CONFIG.FREQ_STEP;

                    const nyquist = audioCtx.sampleRate / 2;
                    const index = Math.round(freq / nyquist * bufferLength);
                    let maxDb = -1000;
                    for (let i = Math.max(0, index - 3); i <= Math.min(bufferLength - 1, index + 3); i++) {
                        if (dataArray[i] > maxDb) maxDb = dataArray[i];
                    }
                    return maxDb > -85;
                };

                const isValid = await checkTime(timestamp) || await checkTime(timestamp - 1) || await checkTime(timestamp + 1);
                setCallData(prev => ({ ...prev, isHumanVerified: isValid }));
            }, 1000);
        } catch (e) {
            console.error("Failed to setup watermark detector", e);
        }
    };

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

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            setCallData(prev => ({
                ...prev,
                status: 'calling',
                localStream: stream
            }));

            const iceServers = await fetchIceServers();
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
                    } catch (err) { }
                }
            };

            pc.ontrack = async (e) => {
                if (privateChatSecurity.multiPathEnabled) {
                    const mergedStream = await setupMultiPathMerger(e.streams[0]);
                    setCallData(prev => ({ ...prev, remoteStream: mergedStream }));
                    setupWatermarkDetector(mergedStream);
                } else {
                    setCallData(prev => ({ ...prev, remoteStream: e.streams[0] }));
                    setupWatermarkDetector(e.streams[0]);
                }
            };

            let outgoingStream: MediaStream;
            if (privateChatSecurity.multiPathEnabled) {
                const splitStream = await setupMultiPathSplitter(stream);
                outgoingStream = await setupWatermarkInjector(splitStream, geoHash);
            } else {
                outgoingStream = await setupWatermarkInjector(stream, geoHash);
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
            setCallData(prev => ({
                ...prev,
                status: 'geo_failed',
                geoFailMessage: 'Geometric security check failed'
            }));
            setTimeout(endCallUI, 3000);
        }
    };

    const acceptCall = async () => {
        const pId = callData.partnerId;
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

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setCallData(prev => ({ ...prev, localStream: stream, status: 'connected' }));

            const iceServers = await fetchIceServers();
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
                    } catch (err) { }
                }
            };

            pc.ontrack = async (e) => {
                if (privateChatSecurity.multiPathEnabled) {
                    const mergedStream = await setupMultiPathMerger(e.streams[0]);
                    setCallData(prev => ({ ...prev, remoteStream: mergedStream }));
                    setupWatermarkDetector(mergedStream);
                } else {
                    setCallData(prev => ({ ...prev, remoteStream: e.streams[0] }));
                    setupWatermarkDetector(e.streams[0]);
                }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            let outgoingStream: MediaStream;
            if (privateChatSecurity.multiPathEnabled) {
                const splitStream = await setupMultiPathSplitter(stream);
                outgoingStream = await setupWatermarkInjector(splitStream, geoHash);
            } else {
                outgoingStream = await setupWatermarkInjector(stream, geoHash);
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
                } catch (e) {}
            }
            pendingIceCandidatesRef.current = [];
        } catch (err) {
            endCallUI();
        }
    };

    const declineCall = useCallback(() => {
        if (callData.partnerId) sendSignal(callData.partnerId, 'end');
        endCallUI();
    }, [callData.partnerId, sendSignal, endCallUI]);

    const endCall = useCallback(() => {
        if (callData.partnerId) sendSignal(callData.partnerId, 'end');
        endCallUI();
    }, [callData.partnerId, sendSignal, endCallUI]);

    const toggleMuteLocal = useCallback(() => {
        if (callData.localStream) {
            const audioTrack = callData.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setCallData(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
                if (watermarkedTrackRef.current) watermarkedTrackRef.current.enabled = audioTrack.enabled;
            }
        }
    }, [callData.localStream]);

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
