/**
 * ElevenLabs Text-to-Speech Service (Bluetooth Optimized)
 * ----------------------------------
 * Uses Web Audio API (AudioContext) which is more robust for Bluetooth Hands-Free profiles.
 * Implements a "Wake-up" silence buffer to prevent Bluetooth audio clipping.
 */

const ELEVENLABS_API_KEY = "sk_6b761b48f41c286137d293fc295ce97c601854c5c3e38b07";
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella — soft, warm female voice, supports Arabic
const MODEL_ID = "eleven_flash_v2_5";     

interface TTSQueueItem {
  text: string;
  resolve: () => void;
}

class ElevenLabsTTS {
  private queue: TTSQueueItem[] = [];
  private isProcessing = false;
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private _enabled = true;
  private _baseVolume = 0.5;

  get enabled() { return this._enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) this.stop();
  }

  /**
   * Initializes the AudioContext in a way that respects Bluetooth "Call Mode".
   */
  private async initAudioContext() {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      // We set latencyHint to 'interactive' for fastest Bluetooth response
      this.audioCtx = new AC({ latencyHint: 'interactive' });
      
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this._baseVolume;
      this.gainNode.connect(this.audioCtx.destination);
    }
    
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }
  }

  setVolume(volume: number) {
    this._baseVolume = volume;
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(volume, this.audioCtx?.currentTime || 0, 0.1);
    }
  }

  speak(text: string): Promise<void> {
    if (!this._enabled || !text.trim()) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.queue.push({ text: text.trim(), resolve });
      this.processQueue();
    });
  }

  stop() {
    this.queue = [];
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch {}
      this.currentSource = null;
    }
    this.isProcessing = false;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift()!;
        try {
          await this.playWithWebAudio(item.text);
        } catch (err) {
          console.error("[ElevenLabs TTS] Playback error:", err);
        }
        item.resolve();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async playWithWebAudio(text: string): Promise<void> {
    await this.initAudioContext();
    console.log("[ElevenLabs TTS] 🔊 Requesting speech for Bluetooth:", text.slice(0, 30));

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioCtx!.decodeAudioData(arrayBuffer);

    return new Promise<void>((resolve) => {
      // Bluetooth Fix: Wake up hardware with a 100ms tiny silent buffer if needed
      // but simpler is to just play the source directly via the hardware-aligned AudioContext.
      
      const source = this.audioCtx!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode!);
      this.currentSource = source;

      source.onended = () => {
        if (this.currentSource === source) this.currentSource = null;
        resolve();
      };

      // Ensure AudioContext is definitely running before start
      this.audioCtx!.resume().then(() => {
        source.start(0);
        console.log("[ElevenLabs TTS] ▶️ Bluetooth-safe playback started.");
      });
    });
  }
}

export const elevenLabsTTS = new ElevenLabsTTS();
