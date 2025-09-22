const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testClaude() {
  try {
    console.log('Testing Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: 'Return this exact JSON: {"test": "success", "number": 123}'
      }]
    });

    console.log('Response:', response.content[0].text);

    // Try to parse it
    try {
      const json = JSON.parse(response.content[0].text);
      console.log('Parsed successfully:', json);
    } catch (e) {
      console.log('Failed to parse JSON:', e.message);
    }
  } catch (error) {
    console.error('Claude API error:', error.message);
  }
}

testClaude();