import os
import asyncio
import argparse
from typing import Optional, AsyncGenerator

from dotenv import load_dotenv
from openai import AsyncOpenAI, APIError, RateLimitError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

# Load environment variables from .env file
load_dotenv()

# Configuration
GITHUB_MODELS_TOKEN = os.getenv("GITHUB_MODELS_TOKEN")
BASE_URL = os.getenv("BASE_URL", "https://models.inference.ai.azure.com")
DEFAULT_MODEL = os.getenv("MODEL_NAME", "Phi-4")

if not GITHUB_MODELS_TOKEN:
    print("Error: GITHUB_MODELS_TOKEN not found in environment variables.")
    print("Please check your .env file or environment settings.")
    exit(1)

# Initialize Async OpenAI Client
client = AsyncOpenAI(
    base_url=BASE_URL,
    api_key=GITHUB_MODELS_TOKEN,
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((RateLimitError, APIError)),
    reraise=True
)
async def get_chat_completion(
    message: str, 
    model: str = DEFAULT_MODEL, 
    stream: bool = False
) -> Optional[str | AsyncGenerator[str, None]]:
    """
    Sends a message to the GitHub Models API and returns the response.
    Includes retry logic for rate limits and API errors.
    """
    try:
        response = await client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": message,
                }
            ],
            model=model,
            stream=stream,
        )

        if stream:
            return response
        
        return response.choices[0].message.content

    except RateLimitError:
        print("\n[Error] Rate limit exceeded. Retrying...")
        raise
    except APIError as e:
        print(f"\n[Error] API Error: {e.message}")
        raise
    except Exception as e:
        print(f"\n[Error] An unexpected error occurred: {e}")
        return None

async def main():
    # Setup CLI arguments
    parser = argparse.ArgumentParser(description="Call Microsoft Phi-4 via GitHub Models API")
    parser.add_argument("message", nargs="?", default="Explain quantum computing in one sentence.", help="The message to send to the model")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model to use (default: {DEFAULT_MODEL})")
    parser.add_argument("--stream", action="store_true", help="Enable streaming output")
    
    args = parser.parse_args()

    print(f"--- Sending request to {args.model} ---")
    print(f"Message: {args.message}\n")

    if args.stream:
        print("Response: ", end="", flush=True)
        stream_resp = await get_chat_completion(args.message, model=args.model, stream=True)
        if stream_resp:
            async for chunk in stream_resp:
                if chunk.choices and chunk.choices[0].delta.content:
                    print(chunk.choices[0].delta.content, end="", flush=True)
            print()
    else:
        response = await get_chat_completion(args.message, model=args.model)
        if response:
            print(f"Response: {response}")
        else:
            print("Failed to get a response.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExiting...")
    except Exception as e:
        print(f"\nCritical Error: {e}")
