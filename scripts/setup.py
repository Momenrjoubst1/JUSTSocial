#!/usr/bin/env python3
"""
Quick Setup Script for SkillSwap LiveKit Migration
This script helps you set up the environment variables
"""

import os
import sys

def main():
    print("=" * 80)
    print("🚀 SkillSwap LiveKit Migration Setup")
    print("=" * 80)
    print()
    
    env_local_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
    env_example_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.example")
    
    # Check if .env.local exists
    if os.path.exists(env_local_path):
        print("✅ .env.local already exists!")
        print("   Edit it manually if needed.")
        print()
        sys.exit(0)
    
    # Copy .env.example to .env.local
    print("📋 Creating .env.local from template...")
    try:
        with open(env_example_path, "r") as f:
            template = f.read()
        
        with open(env_local_path, "w") as f:
            f.write(template)
        
        print("✅ Created .env.local")
    except FileNotFoundError:
        print(f"❌ {env_example_path} not found!")
        sys.exit(1)
    
    print()
    print("=" * 80)
    print("📝 Next Steps:")
    print("=" * 80)
    print()
    print("1. Get LiveKit Credentials:")
    print("   - Visit: https://cloud.livekit.io/dashboard")
    print("   - Create a project or use existing")
    print("   - Go to Settings > API Keys")
    print("   - Copy API Key, API Secret, and Server URL")
    print()
    print("2. Get Groq API Key:")
    print("   - Visit: https://console.groq.com/keys")
    print("   - Create an API key")
    print()
    print("3. Get Supabase Keys:")
    print("   - Visit: https://supabase.com/dashboard")
    print("   - Go to Project Settings > API")
    print("   - Copy URL and anon key")
    print()
    print("4. Edit .env.local:")
    print(f"   - Open: {env_local_path}")
    print("   - Fill in all the values")
    print()
    print("5. Install Dependencies:")
    print("   - Run: npm install")
    print()
    print("6. Start Development:")
    print("   - Run: npm run dev")
    print("   - Frontend: http://localhost:5173")
    print("   - Backend: http://localhost:3001")
    print()
    print("=" * 80)
    print("📚 For more details, see LIVEKIT_MIGRATION_GUIDE.md")
    print("=" * 80)

if __name__ == "__main__":
    main()
