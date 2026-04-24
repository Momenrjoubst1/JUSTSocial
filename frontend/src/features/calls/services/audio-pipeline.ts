import type { MutableRefObject } from "react";
import { MULTIPATH_CONFIG, WATERMARK_CONFIG } from "./webrtc-config";
import type { CallData } from "../types";

type CallTimerState = CallData["multiPathState"];

export interface CallAudioPipelineDeps {
  pcRef: MutableRefObject<RTCPeerConnection | null>;
  dataChannelRef: MutableRefObject<RTCDataChannel | null>;
  blobUrlsRef: MutableRefObject<string[]>;
  verificationIntervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  watermarkIntervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  localAudioCtxRef: MutableRefObject<AudioContext | null>;
  remoteAudioCtxRef: MutableRefObject<AudioContext | null>;
  splitterCtxRef: MutableRefObject<AudioContext | null>;
  mergerCtxRef: MutableRefObject<AudioContext | null>;
  watermarkedTrackRef: MutableRefObject<MediaStreamTrack | null>;
  geoHashRef: MutableRefObject<string | null>;
  setMultiPathState: (state: CallTimerState) => void;
  setIsHumanVerified: (isValid: boolean) => void;
}

export async function fetchIceServers(apiBase: string): Promise<RTCIceServer[]> {
  try {
    const res = await fetch(`${apiBase}/api/ice-servers`);
    if (!res.ok) throw new Error("Failed to fetch ICE servers");
    const data = (await res.json()) as { iceServers: RTCIceServer[] };
    return data.iceServers;
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

export async function setupMultiPathSplitter(
  stream: MediaStream,
  deps: CallAudioPipelineDeps,
): Promise<MediaStream> {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    deps.splitterCtxRef.current = audioCtx;

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

    const blob = new Blob([workletCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    deps.blobUrlsRef.current.push(url);

    try {
      await audioCtx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
      deps.blobUrlsRef.current = deps.blobUrlsRef.current.filter((item) => item !== url);
    }

    const source = audioCtx.createMediaStreamSource(stream);
    const splitterNode = new AudioWorkletNode(audioCtx, "splitter-processor");
    const destination = audioCtx.createMediaStreamDestination();

    splitterNode.port.onmessage = (event) => {
      if (deps.dataChannelRef.current && deps.dataChannelRef.current.readyState === "open") {
        try {
          deps.dataChannelRef.current.send(
            JSON.stringify({ seq: event.data.seq, payload: Array.from(event.data.payload) }),
          );
        } catch (error) {
          console.warn("Cleaned up error:", error);
        }
      }
    };

    source.connect(splitterNode);
    splitterNode.connect(destination);
    return destination.stream;
  } catch (error) {
    console.error("MultiPath: Failed to setup splitter", error);
    return stream;
  }
}

export async function setupMultiPathMerger(
  stream: MediaStream,
  deps: CallAudioPipelineDeps,
): Promise<MediaStream> {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    deps.mergerCtxRef.current = audioCtx;

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

    const blob = new Blob([workletCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    deps.blobUrlsRef.current.push(url);

    try {
      await audioCtx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
      deps.blobUrlsRef.current = deps.blobUrlsRef.current.filter((item) => item !== url);
    }

    const source = audioCtx.createMediaStreamSource(stream);
    const mergerNode = new AudioWorkletNode(audioCtx, "merger-processor");
    const destination = audioCtx.createMediaStreamDestination();

    mergerNode.port.onmessage = (event) => {
      deps.setMultiPathState(event.data as CallTimerState);
    };

    const bindDataChannel = () => {
      if (!deps.dataChannelRef.current) {
        return false;
      }

      deps.dataChannelRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          mergerNode.port.postMessage({
            seq: data.seq,
            payload: new Float32Array(data.payload),
          });
        } catch (error) {
          console.warn("Cleaned up error:", error);
        }
      };

      return true;
    };

    if (!bindDataChannel()) {
      const retryId = setInterval(() => {
        if (bindDataChannel()) {
          clearInterval(retryId);
        }
      }, 1000);
    }

    source.connect(mergerNode);
    mergerNode.connect(destination);
    return destination.stream;
  } catch (error) {
    console.error("MultiPath: Failed to setup merger", error);
    return stream;
  }
}

export async function setupWatermarkInjector(
  stream: MediaStream,
  geoHash: string,
  deps: CallAudioPipelineDeps,
): Promise<MediaStream> {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    deps.localAudioCtxRef.current = audioCtx;

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

    const blob = new Blob([workletCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    deps.blobUrlsRef.current.push(url);

    try {
      await audioCtx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
      deps.blobUrlsRef.current = deps.blobUrlsRef.current.filter((item) => item !== url);
    }

    const source = audioCtx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioCtx, "watermark-processor");
    const destination = audioCtx.createMediaStreamDestination();

    source.connect(workletNode);
    workletNode.connect(destination);

    if (deps.watermarkIntervalRef.current) {
      clearInterval(deps.watermarkIntervalRef.current);
    }

    deps.watermarkIntervalRef.current = setInterval(async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const enc = new TextEncoder();
      const data = enc.encode(`${geoHash}-${timestamp}`);
      const hash = await window.crypto.subtle.digest("SHA-256", data);
      const view = new DataView(hash);
      const token = view.getUint32(0, true);
      const freq = WATERMARK_CONFIG.BASE_FREQ + (token % 5) * WATERMARK_CONFIG.FREQ_STEP;

      let amplitude = WATERMARK_CONFIG.AMPLITUDE.BASE;
      if (deps.pcRef.current) {
        try {
          const stats = await deps.pcRef.current.getStats();
          let maxFractionLost = 0;
          let rtt = 0;

          stats.forEach((report) => {
            if (report.type === "remote-inbound-rtp") {
              if (report.fractionLost !== undefined && report.fractionLost > maxFractionLost) {
                maxFractionLost = report.fractionLost;
              }
            }
            if (report.type === "candidate-pair" && report.state === "succeeded" && report.currentRoundTripTime !== undefined) {
              rtt = report.currentRoundTripTime;
            }
          });

          if (maxFractionLost > 0.05 || rtt > 0.3) amplitude = WATERMARK_CONFIG.AMPLITUDE.STRONG;
          else if (maxFractionLost > 0.01 || rtt > 0.1) amplitude = WATERMARK_CONFIG.AMPLITUDE.MODERATE;
        } catch (error) {
          console.warn("Cleaned up error:", error);
        }
      }

      workletNode.port.postMessage({ freq, amplitude });
    }, WATERMARK_CONFIG.INTERVAL);

    return destination.stream;
  } catch (error) {
    console.error("Failed to setup watermark injector", error);
    return stream;
  }
}

export function setupWatermarkDetector(stream: MediaStream, deps: CallAudioPipelineDeps) {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    deps.remoteAudioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    if (deps.verificationIntervalRef.current) {
      clearInterval(deps.verificationIntervalRef.current);
    }

    deps.verificationIntervalRef.current = setInterval(async () => {
      if (!deps.geoHashRef.current) return;
      analyser.getFloatFrequencyData(dataArray);

      const timestamp = Math.floor(Date.now() / 1000);
      const checkTime = async (ts: number) => {
        const enc = new TextEncoder();
        const data = enc.encode(`${deps.geoHashRef.current}-${ts}`);
        const hash = await window.crypto.subtle.digest("SHA-256", data);
        const view = new DataView(hash);
        const token = view.getUint32(0, true);
        const freq = WATERMARK_CONFIG.BASE_FREQ + (token % 5) * WATERMARK_CONFIG.FREQ_STEP;

        const nyquist = audioCtx.sampleRate / 2;
        const index = Math.round((freq / nyquist) * bufferLength);
        let maxDb = -1000;

        for (let i = Math.max(0, index - 3); i <= Math.min(bufferLength - 1, index + 3); i++) {
          if (dataArray[i] > maxDb) maxDb = dataArray[i];
        }

        return maxDb > -85;
      };

      const isValid =
        (await checkTime(timestamp)) ||
        (await checkTime(timestamp - 1)) ||
        (await checkTime(timestamp + 1));
      deps.setIsHumanVerified(isValid);
    }, 1000);
  } catch (error) {
    console.error("Failed to setup watermark detector", error);
  }
}
