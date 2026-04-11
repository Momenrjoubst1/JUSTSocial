import os
import asyncio
from livekit import rtc
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")

async def test_token():
    url = os.getenv("LIVEKIT_URL")
    token = "eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6InJvb21fOWY1M2I4NWIifSwiaXNzIjoiQVBJTTZNUTg3VVBHNUNnIiwiZXhwIjoxNzcyODY3MTI0LCJuYmYiOjAsInN1YiI6InRlc3Rfbm9kZV9pZGVudGl0eSJ9.ZS5LoOkJ4CvIAQ-zMp-VyhJawIbxCVEAu7aQkOPEiUk"
    
    room = rtc.Room()
    try:
        print(f"Connecting to {url} with Node token for existing room...")
        await room.connect(url, token)
        print("SUCCESS: Connected!")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await room.disconnect()

if __name__ == "__main__":
    asyncio.run(test_token())
