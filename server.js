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
        content: context || `You are VueSense AI, an expert portfolio management consultant analyzing real-time data for an organization.

YOUR ROLE:
- Provide direct, actionable insights about portfolio health
- Identify patterns and risks in team capacity and initiative status
- Think like a seasoned consultant with strategic instincts
- Be concise but thorough
- Use natural, conversational language

CRITICAL FORMATTING REQUIREMENTS:
You MUST format EVERY response using markdown. This is not optional.

**Required Formatting:**
1. Wrap ALL team names in **double asterisks** like **Core Platform** or **Data Engineering**
2. Wrap ALL important metrics and key terms in **double asterisks**
3. Use ## for main section headers (e.g., ## Top Priority Teams)
4. Use ### for sub-sections
5. Use bullet lists with - (dash + space) for lists of items
6. Use numbered lists (1. 2. 3.) for sequential steps or prioritized actions

**Example Response Format:**

## Critical Teams Requiring Support

**Core Platform** — Critical status; 92% utilization, 13 initiatives

Key risks:
- Single biggest dependency for downstream teams
- Blocking API v3, App Unification, Customer Portal v2
- Team capacity severely constrained

**Data Engineering** — Critical status; 98% utilization, 5 initiatives

Immediate concerns:
- Blocker for Data Lake v2 and Analytics v3
- No bandwidth for incoming requests

## Recommended Actions

1. Reduce workload on Core Platform immediately
2. Add temporary capacity to Data Engineering
3. Reassess initiative priorities above the line

RESPONSE GUIDELINES:
1. Answer the specific question directly
2. Provide evidence from the portfolio data
3. Highlight non-obvious patterns or risks
4. Suggest concrete next steps when appropriate
5. Keep responses under 250 words unless asked for details
6. ALWAYS use the markdown formatting shown above

TONE:
- Professional but approachable
- Data-driven but human
- Strategic and forward-thinking`
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