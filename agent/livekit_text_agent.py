#!/usr/bin/env python3
import asyncio
import json
import logging
import os
from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli, AgentSession, Agent, room_io
from livekit.plugins import openai as lk_openai
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")
load_dotenv(dotenv_path="../.env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("just-social-agent")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GAMMA_MODEL = os.getenv("GAMMA_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

SYSTEM_PROMPT = "أنت مساعد ذكي تتحدث العربية. ردودك قصيرة جداً ومفيدة."

async def entrypoint(ctx: JobContext):
    logger.info(f"🚀 Connecting to room: {ctx.room.name}")
    await ctx.connect()
    
    # We use a simple latching mechanism for the human participant
    target_identity = None

    llm = lk_openai.LLM(
        model=GAMMA_MODEL,
        api_key=OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )

    async def process_text(text: str):
        logger.info(f"🧠 Processing: {text}")
        chat_ctx = lk_openai.ChatContext().append(role="system", text=SYSTEM_PROMPT).append(role="user", text=text)
        stream = llm.chat(chat_ctx)
        
        full_text = ""
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_text += content
        
        if full_text:
            logger.info(f"🤖 Replying: {full_text}")
            await ctx.room.local_participant.publish_data(
                json.dumps({"type": "user_msg", "text": full_text, "done": True}).encode("utf-8"),
                reliable=True
            )

    @ctx.room.on("data_received")
    def on_data(dp: rtc.DataPacket):
        nonlocal target_identity
        try:
            # Latch on first talker
            if not target_identity and dp.participant:
                target_identity = dp.participant.identity
                logger.info(f"🎯 Target set to: {target_identity}")

            if dp.participant and dp.participant.identity == target_identity:
                data = json.loads(dp.data.decode("utf-8"))
                if data.get("type") == "ai_prompt":
                    prompt = data.get("text")
                    if prompt:
                        asyncio.create_task(process_text(prompt))
        except Exception as e:
            logger.error(f"Error: {e}")

    logger.info("✅ Agent Ready. Waiting for data...")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="phi4-vision-agent"))
