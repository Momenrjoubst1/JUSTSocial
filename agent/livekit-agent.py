#!/usr/bin/env python3
"""
LiveKit AI Agent — SkillSwap Advanced Edition (Vision Enabled 👁️)
يدعم العربية، الرؤية الفورية، السمع، والنطق.
"""

import os
import asyncio
import logging
import sys
import aiohttp
import uuid
import json
import base64
import io
import struct
from dotenv import load_dotenv

# Load environment
load_dotenv(dotenv_path="../.env.local")
load_dotenv(dotenv_path="../.env")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ai-agent")

try:
    from livekit import rtc
    from livekit.agents import Agent, AgentSession, llm, voice, stt, tts, vad
    from livekit.plugins import deepgram, silero, openai, azure
    from livekit.api import AccessToken, VideoGrants
except ImportError as e:
    logger.error(f"❌ Missing dependencies: {e}")
    sys.exit(1)

# API Keys & Config
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
GROQ_API_KEY = os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

# Azure Config
AZURE_VISION_KEY = os.getenv("AZURE_VISION_KEY")
AZURE_VISION_ENDPOINT = os.getenv("AZURE_VISION_ENDPOINT")
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")

SYSTEM_PROMPT = """أنت "المدرب الذكي" في منصة SkillSwap.
قواعد صارمة:
- أجب بجملة واحدة فقط، لا تتجاوز 15 كلمة أبداً.
- تحدث بالعربية دائماً بأسلوب ودود ومرح.
- إذا وصلك تحديث بصري، علّق عليه بإيجاز فقط إذا سألك المستخدم.
- لا تكرر الترحيب ولا تعطِ قوائم أو شروحات طويلة.
- هدفك مساعدة المستخدم بتعلم مهارات جديدة."""

def generate_token(room_name: str) -> str:
    unique_id = uuid.uuid4().hex[:4]
    return (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(f"agent_{room_name}_{unique_id}")
        .with_name("المدرب الذكي")
        .with_grants(VideoGrants(room=room_name, room_join=True, can_publish=True, can_subscribe=True, can_publish_data=True))
        .to_jwt()
    )

async def analyze_image(http_session, image_bytes):
    """يرسل الصورة لـ Azure Vision لتحليلها"""
    if not AZURE_VISION_KEY:
        return None
    
    endpoint = AZURE_VISION_ENDPOINT.rstrip('/')
    url = f"{endpoint}/computervision/imageanalysis:analyze?api-version=2023-02-01-preview&features=caption,read,objects"
    
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_VISION_KEY,
        "Content-Type": "application/octet-stream"
    }
    
    try:
        async with http_session.post(url, headers=headers, data=image_bytes) as resp:
            if resp.status == 200:
                result = await resp.json()
                caption = result.get("captionResult", {}).get("text", "")
                return caption
            else:
                return None
    except Exception:
        return None


# ─── Azure TTS مباشر عبر HTTP (بدون البلاغن المعطّل) ────────────────────────
class AzureDirectTTS(tts.TTS):
    """Azure TTS adapter يستخدم HTTP مباشرة — يعمل خارج سياق LiveKit worker."""

    def __init__(self, *, speech_key: str, speech_region: str, voice: str = "ar-SA-ZariyahNeural",
                 sample_rate: int = 16000, http_session: aiohttp.ClientSession):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=sample_rate,
            num_channels=1,
        )
        self._speech_key = speech_key
        self._speech_region = speech_region
        self._voice = voice
        self._sample_rate = sample_rate
        self._http_session = http_session
        # خريطة sample_rate ← OutputFormat
        self._format_map = {
            16000: "raw-16khz-16bit-mono-pcm",
            24000: "raw-24khz-16bit-mono-pcm",
            48000: "raw-48khz-16bit-mono-pcm",
        }
        self._url = f"https://{speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"

    def synthesize(self, text: str, *, conn_options=None) -> "AzureDirectChunkedStream":
        from livekit.agents import APIConnectOptions
        return AzureDirectChunkedStream(
            tts_instance=self,
            input_text=text,
            conn_options=conn_options or APIConnectOptions(),
        )


class AzureDirectChunkedStream(tts.ChunkedStream):
    """يولّد صوت من Azure TTS عبر HTTP POST."""

    def __init__(self, *, tts_instance: AzureDirectTTS, input_text: str, conn_options):
        super().__init__(tts=tts_instance, input_text=input_text, conn_options=conn_options)
        self._tts_instance = tts_instance

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        t = self._tts_instance
        output_format = t._format_map.get(t._sample_rate, "raw-16khz-16bit-mono-pcm")

        ssml = (
            f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ar-SA">'
            f'<voice name="{t._voice}">{self._input_text}</voice>'
            f'</speak>'
        )

        headers = {
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": output_format,
            "Ocp-Apim-Subscription-Key": t._speech_key,
            "User-Agent": "SkillSwap-Agent",
        }

        output_emitter.initialize(
            request_id=str(uuid.uuid4())[:8],
            sample_rate=t._sample_rate,
            num_channels=1,
            mime_type="audio/pcm",
        )

        try:
            async with t._http_session.post(
                t._url, headers=headers, data=ssml.encode("utf-8"),
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    logger.error(f"Azure TTS HTTP {resp.status}: {body[:200]}")
                    raise tts.APIConnectionError(f"Azure TTS HTTP {resp.status}")
                async for chunk, _ in resp.content.iter_chunks():
                    output_emitter.push(chunk)
        except aiohttp.ClientError as e:
            raise tts.APIConnectionError(str(e)) from e


# ─── Vision Loop ─────────────────────────────────────────────────────────────
async def vision_loop(room, session, http_session):
    """حلقة مراقبة الفيديو — تحدّث رسالة نظام واحدة فقط"""
    logger.info("👁️ Vision system activated (Single-Message Mode)")
    
    try:
        from livekit.agents.utils.images import encode, EncodeOptions, ResizeOptions
        from livekit.agents.llm import ChatMessage
    except ImportError:
        logger.error("❌ Missing livekit.agents.utils.images. Please update livekit-agents.")
        return

    latest_frame = [None]
    video_stream_obj = [None]
    read_task = [None]
    vision_msg_ref = [None]

    def _setup_stream():
        if video_stream_obj[0] is not None:
            return
        for participant in room.remote_participants.values():
            for track_pub in participant.track_publications.values():
                if track_pub.track and track_pub.track.kind == rtc.TrackKind.KIND_VIDEO and track_pub.subscribed:
                    logger.info(f"📹 Found video track, starting analysis...")
                    video_stream_obj[0] = rtc.VideoStream(track_pub.track)
                    async def read_frames():
                        try:
                            async for event in video_stream_obj[0]:
                                latest_frame[0] = event.frame
                        except Exception: pass
                    read_task[0] = asyncio.create_task(read_frames())
                    return

    while room.isconnected():
        _setup_stream()
        
        # إذا لم يتم العثور على كاميرا، ننتظر قليلاً ثم نحاول الإعداد مرة أخرى
        if video_stream_obj[0] is None:
            await asyncio.sleep(5)
            continue
        
        if latest_frame[0] is not None:
            opts = EncodeOptions(
                format="JPEG",
                resize_options=ResizeOptions(width=512, height=512, strategy="scale_aspect_fit"),
            )
            try:
                image_bytes = encode(latest_frame[0], opts)
                caption = await analyze_image(http_session, image_bytes)
                
                if caption:
                    logger.info(f"👁️ Vision update: {caption}")
                    new_content = f"[تحديث بصري من كاميرا المستخدم الآن: {caption}] استخدم هذه المعلومة بذكاء فقط إذا كان لها صلة بالنقاش أو سألك المستخدم عنها."
                    
                    if vision_msg_ref[0] is not None and vision_msg_ref[0] in session.history.messages:
                        vision_msg_ref[0].content = new_content
                    else:
                        msg = ChatMessage(role="system", content=new_content)
                        session.history.messages.append(msg)
                        vision_msg_ref[0] = msg

            except Exception as e:
                logger.error(f"Vision loop error: {e}")
        
        # التوقف لـ 15 ثانية بين كل صورة لتقليل استهلاك المعالج
        await asyncio.sleep(15)


# ─── Main Agent ──────────────────────────────────────────────────────────────
async def run_agent(room_name: str):
    async with aiohttp.ClientSession() as http_session:
        room = rtc.Room()
        
        # STT Configuration — Azure Speech
        if AZURE_SPEECH_KEY:
            stt_plug = azure.STT(speech_key=AZURE_SPEECH_KEY, speech_region=AZURE_SPEECH_REGION, language="ar-SA")
        elif DEEPGRAM_API_KEY:
            stt_plug = deepgram.STT(model="nova-2", language="ar", api_key=DEEPGRAM_API_KEY, http_session=http_session)
        else:
            stt_plug = openai.STT(http_session=http_session)
        
        # LLM Configuration — Groq (موديل سريع + ردود قصيرة)
        llm_plug = openai.LLM(
            base_url="https://api.groq.com/openai/v1",
            api_key=GROQ_API_KEY,
            model="llama-3.1-8b-instant",
            max_completion_tokens=60,
            temperature=0.6,
        )
        
        # TTS Configuration — Azure مباشر عبر HTTP
        tts_plug = AzureDirectTTS(
            speech_key=AZURE_SPEECH_KEY,
            speech_region=AZURE_SPEECH_REGION,
            voice="ar-SA-ZariyahNeural",
            sample_rate=24000,
            http_session=http_session,
        )

        # Build Session
        vad_plug = silero.VAD.load()
        assistant = Agent(instructions=SYSTEM_PROMPT)
        session = AgentSession(stt=stt_plug, llm=llm_plug, tts=tts_plug, vad=vad_plug)

        try:
            token = generate_token(room_name)
            await room.connect(LIVEKIT_URL, token)
            logger.info(f"✅ Agent joined room: {room_name}")
            
            await session.start(room=room, agent=assistant)
            
            # Start Vision
            asyncio.create_task(vision_loop(room, session, http_session))
            
            await session.generate_reply(instructions="قل: أهلاً! أنا المدرب الذكي، كيف أقدر أساعدك؟")
            
            while room.isconnected():
                await asyncio.sleep(1)
                
        except Exception as e:
            logger.error(f"❌ Error: {e}")
        finally:
            if room.isconnected(): await room.disconnect()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(run_agent(sys.argv[1]))
