import { ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Generates a police-siren-style alarm using the Web Audio API.
 * Oscillates between two frequencies to create an authentic warning sound.
 */
function playBanAlarm() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();

    // Main siren oscillator
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, ctx.currentTime);

    // LFO to sweep the frequency up and down (siren effect)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(2, ctx.currentTime); // 2 Hz sweep

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(300, ctx.currentTime); // sweep range ±300 Hz

    // Overall volume envelope
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.3);

    // Connect: LFO → lfoGain → osc.frequency
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Connect: osc → masterGain → output
    osc.connect(masterGain);
    masterGain.connect(ctx.destination);

    lfo.start(ctx.currentTime);
    osc.start(ctx.currentTime);

    return { ctx, osc, lfo, masterGain };
}

export default function BannedPage() {
    const audioRef = useRef<{
        ctx: AudioContext;
        osc: OscillatorNode;
        lfo: OscillatorNode;
        masterGain: GainNode;
    } | null>(null);

    useEffect(() => {
        // Start the alarm sound
        const audio = playBanAlarm();
        audioRef.current = audio;

        // Auto-stop the alarm after 6 seconds (to avoid being annoying)
        const stopTimer = setTimeout(() => {
            if (audioRef.current) {
                const { ctx, masterGain } = audioRef.current;
                masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
                setTimeout(() => {
                    audioRef.current?.osc.stop();
                    audioRef.current?.lfo.stop();
                    audioRef.current?.ctx.close();
                    audioRef.current = null;
                }, 1200);
            }
        }, 6000);

        // Handle browser autoplay policy: resume audio on any user interaction
        const handleInteraction = () => {
            if (audioRef.current && audioRef.current.ctx.state === 'suspended') {
                audioRef.current.ctx.resume();
            }
        };
        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);

        return () => {
            clearTimeout(stopTimer);
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            if (audioRef.current) {
                audioRef.current.osc.stop();
                audioRef.current.lfo.stop();
                audioRef.current.ctx.close();
                audioRef.current = null;
            }
        };
    }, []);

    const location = useLocation();

    // Function to translate or clean backend moderation reasons to clean English
    const getEnglishReason = (rawReason: string) => {
        if (!rawReason) return "Violation of Community Standards";

        // Check for common patterns
        if (rawReason.includes("test_auto_moderation")) return "Security Testing / Manual Ban";
        if (rawReason.includes("مسيئة") || rawReason.includes("بذيئة")) return "Inappropriate / Offensive Language";
        if (rawReason.includes("روابط")) return "Phishing or Suspicious Link Sharing";
        if (rawReason.includes("شخصية")) return "Sharing Personal Information";

        // Remove prefix if exists
        return rawReason.replace("Text Auto-moderation: ", "").trim();
    };

    const displayReason = getEnglishReason(location.state?.reason);

    return (
        <div
            className="banned-bg-animation fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 text-center selection:bg-red-500/30"
        >
            {/* Flashing red border glow */}
            <div
                className="banned-box-animation flex flex-col items-center justify-center max-w-2xl border p-8 md:p-12 rounded-3xl"
            >
                {/* Animated warning icon */}
                <div
                    className="banned-icon-box-animation p-4 rounded-full mb-6"
                >
                    <ShieldAlert
                        className="banned-icon-animation w-16 h-16"
                        strokeWidth={1.5}
                    />
                </div>

                {/* ⚠ WARNING label */}
                <div
                    className="banned-label-animation flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.25em] uppercase"
                >
                    ⚠ Security Violation Detected
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">
                    <span className="text-red-500">Access Denied.</span>
                </h1>

                <p className="text-zinc-300 text-lg md:text-xl leading-relaxed mb-8 max-w-lg font-medium">
                    This device has been{" "}
                    <span className="text-red-400 font-bold">permanently banned</span> from
                    our platform due to:
                    <br />
                    <span className="text-white bg-red-500/20 px-3 py-1 rounded-lg mt-2 inline-block border border-red-500/30">
                        {displayReason}
                    </span>
                </p>

                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl w-full">
                    <p className="text-zinc-500 text-sm md:text-base mb-0">
                        🔒 Our system has recorded your{" "}
                        <span className="text-zinc-300">Hardware ID</span> and{" "}
                        <span className="text-zinc-300">IP address</span>. Any attempt to
                        bypass this ban will be automatically blocked.
                    </p>
                </div>

            </div>
        </div>
    );
}
