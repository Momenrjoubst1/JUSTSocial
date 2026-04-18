#!/usr/bin/env python3
"""
LiveKit AI Agent — Lite Version (Voice Only)
نسخة خفيفة جداً للأجهزة المتوسطة - صوت فقط بدون رؤية لتقليل استهلاك المعالج.
"""

import os
import asyncio
import logging
import sys
import aiohttp
import uuid
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")
load_dotenv(dotenv_path="../.env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-agent-lite")

try:
    from livekit import rtc
    from livekit.agents import Agent, AgentSession, llm, voice, stt, tts, vad
    from livekit.plugins import silero, openai, azure, deepgram, elevenlabs
    from livekit.api import AccessToken, VideoGrants
except ImportError as e:
    logger.error(f"❌ Missing dependencies: {e}")
    sys.exit(1)

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
GROQ_API_KEY = os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")

# ─── Azure TTS مباشر عبر HTTP (خفيف وسريع) ────────────────────────
class AzureDirectTTS(tts.TTS):
    def __init__(self, *, speech_key: str, speech_region: str, voice: str = "ar-SA-ZariyahNeural", http_session):
        super().__init__(capabilities=tts.TTSCapabilities(streaming=False), sample_rate=16000, num_channels=1)
        self._speech_key = speech_key
        self._speech_region = speech_region
        self._voice = voice
        self._http_session = http_session
        self._url = f"https://{speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"

    def synthesize(self, text: str, *, conn_options=None) -> "AzureDirectChunkedStream":
        from livekit.agents import APIConnectOptions
        return AzureDirectChunkedStream(tts_instance=self, input_text=text, conn_options=conn_options or APIConnectOptions())

class AzureDirectChunkedStream(tts.ChunkedStream):
    def __init__(self, *, tts_instance: AzureDirectTTS, input_text: str, conn_options):
        super().__init__(tts=tts_instance, input_text=input_text, conn_options=conn_options)
        self._tts_instance = tts_instance

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        t = self._tts_instance
        ssml = f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ar-SA"><voice name="{t._voice}">{self._input_text}</voice></speak>'
        headers = {"Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "raw-16khz-16bit-mono-pcm", "Ocp-Apim-Subscription-Key": t._speech_key, "User-Agent": "SkillSwap-Lite"}
        output_emitter.initialize(request_id=str(uuid.uuid4())[:8], sample_rate=16000, num_channels=1, mime_type="audio/pcm")
        try:
            async with t._http_session.post(t._url, headers=headers, data=ssml.encode("utf-8"), timeout=15) as resp:
                async for chunk, _ in resp.content.iter_chunks():
                    output_emitter.push(chunk)
        except Exception as e: logger.error(f"TTS Error: {e}")

async def run_agent(room_name: str):
    async with aiohttp.ClientSession() as http_session:
        room = rtc.Room()
        # Use Groq's Whisper for ultra-fast and accurate Arabic Speech-to-Text
        stt_plug = openai.STT(
            base_url="https://api.groq.com/openai/v1",
            api_key=GROQ_API_KEY,
            model="whisper-large-v3",
            language="ar"
        )
        
        # Increase completion tokens so the Arabic response isn't cut off
        llm_plug = openai.LLM(
            base_url="https://api.groq.com/openai/v1", 
            api_key=GROQ_API_KEY, 
            model="llama-3.1-8b-instant", 
            max_completion_tokens=150
        )
        
        # Super natural TTS using ElevenLabs
        ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY")
        if ELEVEN_API_KEY:
            tts_plug = elevenlabs.TTS(
                api_key=ELEVEN_API_KEY,
                model="eleven_multilingual_v2",
                language="ar",
                http_session=http_session
            )
        else:
            tts_plug = AzureDirectTTS(speech_key=AZURE_SPEECH_KEY, speech_region=AZURE_SPEECH_REGION, http_session=http_session)

        vad_plug = silero.VAD.load()
        
        assistant = Agent(instructions="أنت مساعد ذكي ممتع. أجب برد كافي بالعربية (خالي من التكلف ومريح للاستماع).")
        session = AgentSession(stt=stt_plug, llm=llm_plug, tts=tts_plug, vad=vad_plug)

        try:
            token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET).with_identity("lite-agent").with_grants(VideoGrants(room=room_name, room_join=True)).to_jwt()
            await room.connect(LIVEKIT_URL, token)
            await session.start(room=room, agent=assistant)
            logger.info(f"🚀 LITE Agent started - Room: {room_name}")
            await session.generate_reply(instructions="قل: أهلاً بك، أنا النسخة الخفيفة، كيف أقدر أساعدك؟")
            while room.isconnected(): await asyncio.sleep(1)
        except Exception as e: logger.error(f"Error: {e}")
        finally:
            await room.disconnect()
            import gc
            gc.collect()
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    logger.info("Cleared PyTorch GPU cache to prevent memory leaks.")
            except ImportError:
                pass


if __name__ == "__main__":
    if len(sys.argv) > 1: asyncio.run(run_agent(sys.argv[1]))
    else: print("Please provide room name")
