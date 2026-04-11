#!/usr/bin/env python3
"""Test Azure Phi-4 Multimodal connectivity"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")
load_dotenv(dotenv_path="../.env")

AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT", "").rstrip("/")
AZURE_API_KEY = os.getenv("AZURE_API_KEY", "")
AZURE_MODEL = os.getenv("AZURE_MODEL", "Phi-4-multimodal-instruct")

print(f"Endpoint: {AZURE_ENDPOINT}")
print(f"Key: {AZURE_API_KEY[:15]}...")
print(f"Model: {AZURE_MODEL}")

# Test 1: Direct HTTP request to the endpoint
print("\n--- Test 1: Direct HTTP Request ---")
import urllib.request, json

url = f"{AZURE_ENDPOINT}/models/chat/completions?api-version=2024-05-01-preview"
payload = json.dumps({
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say hello in Arabic, one sentence only."}
    ],
    "model": AZURE_MODEL,
    "max_tokens": 50,
    "temperature": 0.7
}).encode("utf-8")

headers = {
    "Content-Type": "application/json",
    "api-key": AZURE_API_KEY
}

try:
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        text = result["choices"][0]["message"]["content"]
        print(f"✅ Phi-4 responded: {text}")
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="replace")
    print(f"❌ HTTP {e.code}: {body[:500]}")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: Azure AI Inference SDK
print("\n--- Test 2: Azure AI Inference SDK ---")
try:
    from azure.ai.inference import ChatCompletionsClient
    from azure.core.credentials import AzureKeyCredential
    from azure.ai.inference.models import SystemMessage, UserMessage

    client = ChatCompletionsClient(
        endpoint=AZURE_ENDPOINT,
        credential=AzureKeyCredential(AZURE_API_KEY),
        model=AZURE_MODEL,
    )
    response = client.complete(
        messages=[
            SystemMessage("You are a helpful assistant."),
            UserMessage(content="Say hi in Arabic, one short sentence."),
        ],
        temperature=0.7,
        max_tokens=50,
    )
    text = response.choices[0].message.content
    print(f"✅ SDK response: {text}")
except ImportError:
    print("❌ azure-ai-inference not installed. Run: pip install azure-ai-inference")
except Exception as e:
    print(f"❌ SDK Error: {e}")

print("\n--- Done ---")
