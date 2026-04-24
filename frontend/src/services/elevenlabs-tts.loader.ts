let elevenLabsTTSPromise: Promise<
  typeof import("@/services/elevenlabs-tts").elevenLabsTTS
> | null = null;

export function loadElevenLabsTTS() {
  if (!elevenLabsTTSPromise) {
    elevenLabsTTSPromise = import("@/services/elevenlabs-tts").then(
      ({ elevenLabsTTS }) => elevenLabsTTS
    );
  }

  return elevenLabsTTSPromise;
}
