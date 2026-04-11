#!/usr/bin/env python3
"""Test Azure Speech Service connectivity"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")
load_dotenv(dotenv_path="../.env")

AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
AZURE_SPEECH_ENDPOINT = os.getenv("AZURE_SPEECH_ENDPOINT")

print(f"Key: {AZURE_SPEECH_KEY[:10]}..." if AZURE_SPEECH_KEY else "Key: NOT SET")
print(f"Region: {AZURE_SPEECH_REGION}")
print(f"Endpoint: {AZURE_SPEECH_ENDPOINT}")

# Test 1: DNS resolution
import socket
print("\n--- Test 1: DNS Resolution ---")
hostname = f"{AZURE_SPEECH_REGION}.stt.speech.microsoft.com"
try:
    ip = socket.gethostbyname(hostname)
    print(f"✅ DNS OK: {hostname} -> {ip}")
except socket.gaierror as e:
    print(f"❌ DNS FAILED: {hostname} -> {e}")

# Also test the TTS endpoint
hostname_tts = f"{AZURE_SPEECH_REGION}.tts.speech.microsoft.com"
try:
    ip = socket.gethostbyname(hostname_tts)
    print(f"✅ DNS OK: {hostname_tts} -> {ip}")
except socket.gaierror as e:
    print(f"❌ DNS FAILED: {hostname_tts} -> {e}")

# Test 2: HTTP connectivity to token endpoint
import urllib.request
print("\n--- Test 2: Token Endpoint ---")
token_url = f"https://{AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
try:
    req = urllib.request.Request(token_url, method="POST", data=b"")
    req.add_header("Ocp-Apim-Subscription-Key", AZURE_SPEECH_KEY)
    req.add_header("Content-Length", "0")
    with urllib.request.urlopen(req, timeout=10) as resp:
        token = resp.read().decode()
        print(f"✅ Token received! (length: {len(token)})")
except Exception as e:
    print(f"❌ Token FAILED: {e}")

# Test 3: Try Azure Speech SDK directly
print("\n--- Test 3: Azure Speech SDK ---")
try:
    import azure.cognitiveservices.speech as speechsdk
    config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    config.speech_recognition_language = "ar-SA"
    print(f"✅ SpeechConfig created successfully")
    print(f"   Region: {config.region}")
    print(f"   Language: {config.speech_recognition_language}")
    
    # Quick synthesis test (text to speech)
    config_tts = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    config_tts.speech_synthesis_voice_name = "ar-SA-ZariyahNeural"
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=config_tts, audio_config=None)
    result = synthesizer.speak_text_async("مرحبا").get()
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"✅ TTS works! Audio length: {len(result.audio_data)} bytes")
    elif result.reason == speechsdk.ResultReason.Canceled:
        details = result.cancellation_details
        print(f"❌ TTS Canceled: {details.reason}")
        print(f"   Error: {details.error_details}")
    else:
        print(f"⚠️ TTS result: {result.reason}")
except ImportError:
    print("❌ azure-cognitiveservices-speech not installed")
    print("   Run: pip install azure-cognitiveservices-speech")
except Exception as e:
    print(f"❌ SDK Error: {e}")

print("\n--- Done ---")
