import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ OPENROUTER_API_KEY found:', OPENROUTER_API_KEY.substring(0, 10) + '...');

async function testOpenRouter() {
  try {
    console.log('\n🔍 Testing OpenRouter API...\n');

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from OpenRouter!" in one sentence.'
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'JUST Social AI Test',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ OpenRouter API Response:');
    console.log('Model:', response.data.model);
    console.log('Message:', response.data.choices[0].message.content);
    console.log('\n✅ API Key is working correctly!\n');

  } catch (error) {
    console.error('❌ OpenRouter API Error:');
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

testOpenRouter();
