import { useEffect, useRef } from "react";

export type UseMicPcmStreamProps = {
  enabled: boolean; // aiActive && connected
  stream: MediaStream | null;
  sendData: (msg: any) => void;
  sampleRate?: number; // default 16000
  chunkMs?: number; // default 40ms
};

// Helper: Convert Float32Array [-1,1] to Int16 PCM
function floatTo16PCM(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

export function useMicPcmStream({ enabled, stream, sendData, sampleRate = 16000, chunkMs = 40 }: UseMicPcmStreamProps) {
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled || !stream) {
      cleanupRef.current();
      return;
    }

    let stopped = false;
    let audioCtx: AudioContext;
    let workletNode: AudioWorkletNode;
    let source: MediaStreamAudioSourceNode;

    (async () => {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
      audioCtxRef.current = audioCtx;
      // Inline worklet code
      const workletCode = `
        class PCMWorklet extends AudioWorkletProcessor {
          constructor() {
            super();
            this._buffer = [];
            this._bufferSize = Math.round(sampleRate * chunkMs / 1000);
          }
          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;
            for (let i = 0; i < input[0].length; i++) {
              this._buffer.push(input[0][i]);
              if (this._buffer.length >= this._bufferSize) {
                this.port.postMessage(this._buffer.slice(0, this._bufferSize));
                this._buffer = this._buffer.slice(this._bufferSize);
              }
            }
            return true;
          }
        }
        registerProcessor('pcm-worklet', PCMWorklet);
      `;
      const blob = new Blob([
        `const sampleRate = ${sampleRate}; const chunkMs = ${chunkMs};\n` + workletCode
      ], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      source = audioCtx.createMediaStreamSource(stream);
      workletNode = new AudioWorkletNode(audioCtx, 'pcm-worklet');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e) => {
        if (stopped) return;
        const floatChunk = new Float32Array(e.data);
        const int16Chunk = floatTo16PCM(floatChunk);
        sendData({
          type: 'audio_chunk',
          pcm: Array.from(int16Chunk),
          sampleRate,
        });
      };

      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);
      sendData({ type: 'audio_start', sampleRate });
    })();

    cleanupRef.current = () => {
      stopped = true;
      try {
        sendData({ type: 'audio_end' });
      } catch {}
      try { workletNodeRef.current?.disconnect(); } catch {}
      try { audioCtxRef.current?.close(); } catch {}
      workletNodeRef.current = null;
      audioCtxRef.current = null;
    };

    return cleanupRef.current;
  }, [enabled, stream, sendData, sampleRate, chunkMs]);
}
