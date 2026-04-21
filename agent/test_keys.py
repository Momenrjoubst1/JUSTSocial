#!/usr/bin/env python3
"""
Quick test script to verify all API keys are working
سكريبت سريع للتحقق من جميع المفاتيح
"""

import os
import sys
from dotenv import load_dotenv

# Load environment
load_dotenv(dotenv_path="../.env.local")
load_dotenv(dotenv_path="../.env")

def test_livekit():
    """Test LiveKit credentials"""
    print("\n🔵 Testing LiveKit...")
    
    url = os.getenv('LIVEKIT_URL')
    key = os.getenv('LIVEKIT_API_KEY')
    secret = os.getenv('LIVEKIT_API_SECRET')
    
    if not url:
        print("❌ LIVEKIT_URL is missing")
        return False
    if not key:
        print("❌ LIVEKIT_API_KEY is missing")
        return False
    if not secret:
        print("❌ LIVEKIT_API_SECRET is missing")
        return False
    
    print(f"✅ LiveKit URL: {url}")
    print(f"✅ API Key: {key[:10]}...")
    print(f"✅ API Secret: {secret[:10]}...")
    
    # Test token generation
    try:
        from livekit.api import AccessToken, VideoGrants
        token = (
            AccessToken(key, secret)
            .with_identity("test-agent")
            .with_grants(VideoGrants(room="test-room", room_join=True))
            .to_jwt()
        )
        print(f"✅ Token generation successful: {token[:20]}...")
        return True
    except Exception as e:
        print(f"❌ Token generation failed: {e}")
        return False

def test_openrouter():
    """Test OpenRouter API"""
    print("\n🤖 Testing OpenRouter...")
    
    api_key = os.getenv('OPENROUTER_API_KEY')
    model = os.getenv('GLM_MODEL', 'meta-llama/llama-3.3-70b-instruct')
    
    if not api_key:
        print("❌ OPENROUTER_API_KEY is missing")
        return False
    
    print(f"✅ API Key: {api_key[:15]}...")
    print(f"✅ Model: {model}")
    
    # Test API connection
    try:
        import requests
        response = requests.get(
            'https://openrouter.ai/api/v1/models',
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=10
        )
        
        if response.status_code == 200:
            models = response.json().get('data', [])
            print(f"✅ API connection successful!")
            print(f"✅ Available models: {len(models)}")
            
            # Check if selected model exists
            model_ids = [m['id'] for m in models]
            if model in model_ids:
                print(f"✅ Selected model '{model}' is available")
            else:
                print(f"⚠️  Selected model '{model}' not found in available models")
                print(f"   Available similar models:")
                for m in models:
                    if 'llama' in m['id'].lower():
                        print(f"   - {m['id']}")
            return True
        else:
            print(f"❌ API connection failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def test_azure_speech():
    """Test Azure Speech credentials"""
    print("\n🎤 Testing Azure Speech...")
    
    key = os.getenv('AZURE_SPEECH_KEY')
    region = os.getenv('AZURE_SPEECH_REGION')
    
    if not key:
        print("❌ AZURE_SPEECH_KEY is missing")
        return False
    if not region:
        print("❌ AZURE_SPEECH_REGION is missing")
        return False
    
    print(f"✅ Speech Key: {key[:10]}...")
    print(f"✅ Region: {region}")
    
    # Test connection
    try:
        import requests
        url = f'https://{region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken'
        headers = {'Ocp-Apim-Subscription-Key': key}
        response = requests.post(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("✅ Azure Speech credentials are valid!")
            print(f"✅ Token received: {response.text[:20]}...")
            return True
        else:
            print(f"❌ Azure Speech credentials invalid: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Azure Speech test failed: {e}")
        return False

def test_dependencies():
    """Test if all required packages are installed"""
    print("\n📦 Testing Dependencies...")
    
    required = [
        'livekit',
        'livekit.agents',
        'livekit.plugins.azure',
        'livekit.plugins.openai',
        'livekit.plugins.silero',
        'dotenv',
    ]
    
    all_ok = True
    for package in required:
        try:
            # Use importlib for proper module importing
            import importlib
            importlib.import_module(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - NOT INSTALLED")
            all_ok = False
    
    return all_ok

def main():
    print("=" * 60)
    print("🧪 AI Agent Keys Test")
    print("=" * 60)
    
    results = {
        'Dependencies': test_dependencies(),
        'LiveKit': test_livekit(),
        'OpenRouter': test_openrouter(),
        'Azure Speech': test_azure_speech(),
    }
    
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    for name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name:20} {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All tests passed! Agent is ready to run.")
        print("\nNext steps:")
        print("1. Run: python agent/livekit_text_agent.py test-room")
        print("2. Or start from frontend: npm run dev")
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        print("\nCommon fixes:")
        print("1. Check .env.local file exists")
        print("2. Verify all API keys are correct")
        print("3. Install missing packages: pip install -r agent/requirements.txt")
    print("=" * 60)
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
