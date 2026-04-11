import os
import asyncio
from livekit.api import LiveKitAPI
from dotenv import load_dotenv
import sys

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv(dotenv_path="../.env.local")

async def test_keys():
    url = os.getenv("LIVEKIT_URL")
    key = os.getenv("LIVEKIT_API_KEY")
    secret = os.getenv("LIVEKIT_API_SECRET")
    
    print(f"Testing URL: {url}")
    print(f"Testing Key: {key}")
    
    api = LiveKitAPI(url, key, secret)
    try:
        print("Connecting and listing rooms...")
        rooms = await api.room.list_rooms()
        print(f"SUCCESS: LiveKit Keys are CORRECT! Rooms found: {len(rooms)}")
    except Exception as e:
        print(f"ERROR: LiveKit Keys FAILED: {str(e)}")
    finally:
        pass

if __name__ == "__main__":
    asyncio.run(test_keys())
