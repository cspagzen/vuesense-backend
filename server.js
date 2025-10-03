const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'VueSense AI Backend is running',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request format. Messages array is required.' 
      });
    }

    const openaiMessages = [
      {
        role: 'system',
        content: context || 'You are VueSense AI, a helpful assistant for a product management application.'
      },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    const usage = completion.usage;

    res.json({
      success: true,
      response,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid API key.' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded.' 
      });
    }
    
    res.status(500).json({ 
      error: 'An error occurred.',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});