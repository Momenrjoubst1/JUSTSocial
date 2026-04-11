#!/usr/bin/env python3
"""
LiveKit AI Agent — Phi-4 Multimodal (Azure) + Deepgram STT + ElevenLabs TTS
وكيل ذكي يرى الفيديو ويتحدث العربية، مع تفعيل الرؤية والمقاطعة.

- المنصة: LiveKit Cloud
- STT: livekit-plugins-deepgram
- LLM + Vision: Phi-4-multimodal-instruct على Azure
- TTS: livekit-plugins-elevenlabs
- المقاطعة: مفعّلة (يصمت الوكيل عند كلام المستخدم)

متغيرات البيئة (.env):
  LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
  AZURE_ENDPOINT   (مثال: https://<resource>.services.ai.azure.com)
  AZURE_API_KEY
  AZURE_MODEL      (اختياري، الافتراضي: Phi-4-multimodal-instruct)
  DEEPGRAM_API_KEY
  ELEVEN_API_KEY
  ELEVEN_VOICE_ID  (اختياري)
  AGENT_NAME       (اختياري)

تشغيل: uv run livekit_agent_phi4.py download-files  ثم  uv run livekit_agent_phi4.py dev
"""

import asyncio
import base64
import logging
import os
from typing import Any, AsyncIterator

from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")
load_dotenv(dotenv_path="../.env")

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Environment ─────────────────────────────────────────────────────────────
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://localhost:7880")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "secret")
AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT", "").rstrip("/")  # e.g. https://<resource>.services.ai.azure.com
AZURE_API_KEY = os.getenv("AZURE_API_KEY", "")
AZURE_MODEL = os.getenv("AZURE_MODEL", "Phi-4-multimodal-instruct")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY", "")
AGENT_NAME = os.getenv("AGENT_NAME", "وكيل ذكي")

if not AZURE_ENDPOINT or not AZURE_API_KEY:
    logger.error("❌ AZURE_ENDPOINT و AZURE_API_KEY مطلوبان في .env")
    raise SystemExit(1)
if not DEEPGRAM_API_KEY:
    logger.error("❌ DEEPGRAM_API_KEY مطلوب في .env")
    raise SystemExit(1)
if not ELEVEN_API_KEY:
    logger.error("❌ ELEVEN_API_KEY مطلوب في .env")
    raise SystemExit(1)

# ─── System Prompt ───────────────────────────────────────────────────────────
SYSTEM_PROMPT = """أنت مساعد ذكي جداً يتحدث العربية بطلاقة.
- تستطيع وصف ما تراه في الفيديو (ملابس المستخدم، البيئة المحيطة، الإضاءة، التعبيرات) بأسلوب ممتع وودود.
- ردودك قصيرة ومناسبة للمحادثة الصوتية: جملة أو جملتين واضحتين.
- إذا رأيت شيئاً مميزاً في الصورة (لون قميص، خلفية، إيماءة) صِفه باختصار ومرح.
- كن طبيعياً ومشجعاً ولا تكرر وصفاً طويلاً إلا إذا سألك المستخدم.
- عند المقاطعة توقف فوراً ولا تكمل الجملة السابقة."""

# ─── LiveKit & Plugins ───────────────────────────────────────────────────────
from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, AgentServer, get_job_context, room_io
from livekit.agents.llm import ChatContext, ChatMessage, ImageContent, ChatChunk, ChoiceDelta
from livekit.plugins import deepgram, elevenlabs, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

# Encode video frame to data URL (for Azure)
try:
    from livekit.agents.utils.images import encode, EncodeOptions, ResizeOptions
    _HAS_IMAGE_ENCODE = True
except ImportError:
    _HAS_IMAGE_ENCODE = False


def _frame_to_data_url(frame: Any) -> str:
    """Convert a LiveKit VideoFrame to a base64 data URL."""
    if not _HAS_IMAGE_ENCODE:
        return ""
    try:
        opts = EncodeOptions(
            format="JPEG",
            resize_options=ResizeOptions(width=512, height=512, strategy="scale_aspect_fit"),
        )
        raw = encode(frame, opts)
        b64 = base64.b64encode(raw).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"
    except Exception as e:
        logger.warning("Failed to encode video frame: %s", e)
        return ""


# ─── Azure Phi-4 Multimodal LLM (HTTP adapter — بدون SDK) ─────────────────────
import aiohttp as _aiohttp
import json as _json


def _chat_context_to_dict_messages(chat_ctx: ChatContext) -> list:
    """Convert LiveKit ChatContext to plain dict messages for HTTP API."""
    messages = []
    for msg in chat_ctx.messages:
        role = msg.role
        content = msg.content

        parts = content if isinstance(content, list) else [content]
        msg_content = []
        for part in parts:
            if isinstance(part, str):
                if part.strip():
                    msg_content.append({"type": "text", "text": part})
            elif hasattr(part, "image"):
                img = part.image
                if isinstance(img, str):
                    url = img
                else:
                    url = _frame_to_data_url(img)
                if url:
                    msg_content.append({"type": "image_url", "image_url": {"url": url}})
        if not msg_content:
            continue

        if role == "system":
            text = " ".join(p["text"] for p in msg_content if p.get("type") == "text").strip()
            if text:
                messages.append({"role": "system", "content": text})
        elif role == "user":
            if len(msg_content) == 1 and msg_content[0]["type"] == "text":
                messages.append({"role": "user", "content": msg_content[0]["text"]})
            else:
                messages.append({"role": "user", "content": msg_content})
        elif role == "assistant":
            text = " ".join(p.get("text", "") for p in msg_content if p.get("type") == "text").strip()
            if text:
                messages.append({"role": "assistant", "content": text})
    return messages


class AzurePhi4LLM:
    """LLM adapter: LiveKit chat context -> Azure Phi-4 multimodal (HTTP) -> stream of ChatChunk."""

    def __init__(
        self,
        endpoint: str,
        api_key: str,
        model: str = "Phi-4-multimodal-instruct",
        temperature: float = 0.7,
        max_tokens: int = 256,
    ):
        self._endpoint = endpoint.rstrip("/")
        self._api_key = api_key
        self._model = model
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._url = f"{self._endpoint}/models/chat/completions?api-version=2024-05-01-preview"

    def chat(
        self,
        *,
        chat_ctx: ChatContext,
        tools: list | None = None,
        **kwargs,
    ):
        """Return an async iterable that yields one ChatChunk with the full response."""
        return _AzurePhi4Stream(self, chat_ctx)


class _AzurePhi4Stream:
    """Async iterator that calls Azure Phi-4 via HTTP once and yields a single ChatChunk."""

    def __init__(self, llm: AzurePhi4LLM, chat_ctx: ChatContext):
        self._llm = llm
        self._chat_ctx = chat_ctx
        self._consumed = False

    def __aiter__(self) -> AsyncIterator[ChatChunk]:
        return self

    async def __anext__(self) -> ChatChunk:
        if self._consumed:
            raise StopAsyncIteration
        self._consumed = True
        try:
            messages = _chat_context_to_dict_messages(self._chat_ctx)
            if not messages:
                return ChatChunk(
                    id="",
                    delta=ChoiceDelta(role="assistant", content="عذراً، لا أستطيع معالجة هذا الطلب.", tool_calls=[]),
                    usage=None,
                )

            payload = _json.dumps({
                "messages": messages,
                "model": self._llm._model,
                "temperature": self._llm._temperature,
                "max_tokens": self._llm._max_tokens,
            })

            headers = {
                "Content-Type": "application/json",
                "api-key": self._llm._api_key,
            }

            async with _aiohttp.ClientSession() as session:
                async with session.post(
                    self._llm._url,
                    data=payload,
                    headers=headers,
                    timeout=_aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status != 200:
                        body = await resp.text()
                        logger.error("Phi-4 HTTP %d: %s", resp.status, body[:300])
                        return ChatChunk(
                            id="err",
                            delta=ChoiceDelta(role="assistant", content="عذراً، حدث خطأ في الاتصال بالنموذج.", tool_calls=[]),
                            usage=None,
                        )
                    result = await resp.json()

            text = (
                (result["choices"][0]["message"]["content"] or "").strip()
                if result.get("choices")
                else ""
            )
            if not text:
                text = "عذراً، لم أستطع توليد رد."
            return ChatChunk(
                id=result.get("id", "phi4"),
                delta=ChoiceDelta(role="assistant", content=text, tool_calls=[]),
                usage=None,
            )
        except Exception as e:
            logger.exception("Azure Phi-4 error: %s", e)
            return ChatChunk(
                id="err",
                delta=ChoiceDelta(
                    role="assistant",
                    content="عذراً، حدث خطأ في المعالجة. حاول مرة أخرى.",
                    tool_calls=[],
                ),
                usage=None,
            )


# ─── Agent with Vision (video frame injection) ─────────────────────────────────
class VisionAssistant(Agent):
    """وكيل يرى فيديو المستخدم ويضيف آخر إطار عند كل دور مستخدم."""

    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self._latest_frame = None
        self._video_stream = None
        self._tasks: list[asyncio.Task] = []

    async def on_enter(self) -> None:
        room = get_job_context().room
        for participant in room.remote_participants.values():
            for pub in participant.track_publications.values():
                if pub.track and pub.track.kind == rtc.TrackKind.KIND_VIDEO:
                    self._create_video_stream(pub.track)
                    break
            break

        @room.on("track_subscribed")
        def _on_track_subscribed(
            track: rtc.Track,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ) -> None:
            if track.kind == rtc.TrackKind.KIND_VIDEO:
                self._create_video_stream(track)

    def _create_video_stream(self, track: rtc.Track) -> None:
        if self._video_stream is not None:
            self._video_stream.close()
        self._video_stream = rtc.VideoStream(track)

        async def read_frames() -> None:
            async for event in self._video_stream:
                self._latest_frame = event.frame

        t = asyncio.create_task(read_frames())
        t.add_done_callback(lambda _: self._tasks.remove(t) if t in self._tasks else None)
        self._tasks.append(t)

    async def on_user_turn_completed(
        self,
        turn_ctx: ChatContext,
        new_message: ChatMessage,
    ) -> None:
        """إضافة آخر إطار فيديو إلى رسالة المستخدم قبل إرسالها للـ LLM."""
        if self._latest_frame is not None:
            if not isinstance(new_message.content, list):
                new_message.content = [new_message.content] if new_message.content else []
            new_message.content.append(ImageContent(image=self._latest_frame))
            self._latest_frame = None


# ─── Server & entrypoint ──────────────────────────────────────────────────────
server = AgentServer()

@server.rtc_session(agent_name="phi4-vision-agent")
async def phi4_agent(ctx: agents.JobContext) -> None:
    await ctx.connect()

    llm = AzurePhi4LLM(
        endpoint=AZURE_ENDPOINT,
        api_key=AZURE_API_KEY,
        model=AZURE_MODEL,
        temperature=0.7,
        max_tokens=256,
    )

    session = AgentSession(
        stt=deepgram.STT(
            model="nova-2",
            language="ar",
            api_key=DEEPGRAM_API_KEY,
        ),
        llm=llm,
        tts=elevenlabs.TTS(
            voice_id=os.getenv("ELEVEN_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"),
            model="eleven_multilingual_v2",
            api_key=ELEVEN_API_KEY,
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    # تفعيل المقاطعة: الوكيل يصمت عندما يتكلم المستخدم (السلوك الافتراضي)
    await session.start(
        room=ctx.room,
        agent=VisionAssistant(),
        room_options=room_io.RoomOptions(),
    )

    await session.generate_reply(
        instructions="رحب بالمستخدم بالعربية وقل أنك مستعد لمساعدته ووصف ما تراه إن أرسل الفيديو.",
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
