import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY is missing');
    process.exit(1);
  }

  console.log('Testing OpenRouter connection...');
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3.5-haiku',
        messages: [{ role: 'user', content: 'Hello' }],
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'SkillSwap Test',
        },
      }
    );
    console.log('✅ Success! Response:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ Failure:', error.response?.data || error.message);
  }
}

testOpenRouter();
