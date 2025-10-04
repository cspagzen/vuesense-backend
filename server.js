/**
 * VueSense Backend Server - Production Version
 * Handles AI chat with complete 7-volume knowledge base
 */

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - UPDATED CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://www.alignvue.com', 'https://alignvue.com'],
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not set in environment variables');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Load Complete Knowledge Base - NOW WITH 7 VOLUMES
let COMPLETE_KNOWLEDGE_BASE = '';
try {
  // Load all 7 volumes from files
  const vol1 = fs.readFileSync(path.join(__dirname, 'kb-vol1-core.txt'), 'utf8');
  const vol2 = fs.readFileSync(path.join(__dirname, 'kb-vol2-strategic.txt'), 'utf8');
  const vol3 = fs.readFileSync(path.join(__dirname, 'kb-vol3-analysis.txt'), 'utf8');
  const vol4 = fs.readFileSync(path.join(__dirname, 'kb-vol4-reference.txt'), 'utf8');
  const vol5 = fs.readFileSync(path.join(__dirname, 'kb-vol5-userguide.txt'), 'utf8');
  const vol6 = fs.readFileSync(path.join(__dirname, 'kb-vol6-whatif.txt'), 'utf8');
  const vol7 = fs.readFileSync(path.join(__dirname, 'kb-vol7-prompts.txt'), 'utf8');
  
  COMPLETE_KNOWLEDGE_BASE = `
# VUESENSE AI - COMPLETE KNOWLEDGE BASE (7 VOLUMES)

${vol1}

${vol2}

${vol3}

${vol4}

${vol5}

${vol6}

${vol7}
`;
  
  console.log('✅ Knowledge Base loaded successfully (7 volumes)');
  console.log(`📚 Total KB size: ${(COMPLETE_KNOWLEDGE_BASE.length / 1024).toFixed(2)} KB`);
  console.log(`📖 Volumes loaded: Core, Strategic, Analysis, Reference, User Guide, What-If, Prompts`);
} catch (error) {
  console.error('ERROR loading knowledge base:', error);
  // Fallback to minimal KB if files not found
  COMPLETE_KNOWLEDGE_BASE = `
You are VueSense AI, a portfolio management assistant.
Answer questions using specific team and initiative names.
Never give generic advice.`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'VueSense AI Backend is running',
    timestamp: new Date().toISOString(),
    kbLoaded: COMPLETE_KNOWLEDGE_BASE.length > 1000,
    kbSize: `${(COMPLETE_KNOWLEDGE_BASE.length / 1024).toFixed(2)} KB`,
    volumes: 7
  });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Messages array is required' 
      });
    }
    
    // Extract current portfolio data from the frontend's system message
    let portfolioData = '';
    const systemMessageFromFrontend = messages.find(m => m.role === 'system');
    if (systemMessageFromFrontend && systemMessageFromFrontend.content.includes('CURRENT PORTFOLIO DATA:')) {
      const dataMatch = systemMessageFromFrontend.content.match(/CURRENT PORTFOLIO DATA:([\s\S]*)$/);
      if (dataMatch) {
        portfolioData = dataMatch[1].trim();
      }
    }
    
    // Build enriched system message with complete knowledge base
    const systemMessage = `${COMPLETE_KNOWLEDGE_BASE}

==== CURRENT PORTFOLIO DATA ====
${portfolioData}

==== CRITICAL INSTRUCTIONS ====

**Knowledge Base Usage:**
- You have access to the COMPLETE 7-volume knowledge base above - use ALL of it
- Apply EXACT formulas from Volume 1 for calculations
- Use frameworks from Volume 2 for strategic questions
- Apply patterns from Volume 3 for analysis
- Follow quality standards from Volume 4
- Answer "how to" questions using Volume 5
- Use Volume 6 for ALL "What if" scenario analysis - report BOTH slot AND row changes
- Use Volume 7 to recognize flexible prompt variations

**Data Validation (CRITICAL):**
- BEFORE analyzing ANY query, verify all initiatives and teams exist in the portfolio data
- Check boardData.initiatives first, then boardData.bullpen/pipeline
- If entity NOT found, say so immediately and suggest actual alternatives
- NEVER make up initiatives, teams, or data
- NEVER proceed with fictional analysis

**Response Quality:**
- ALWAYS reference specific team names and initiative names from the portfolio data
- NEVER give generic responses - be specific and actionable
- Default to conversational tone (3-5 sentences), not structured bullet points
- Only use structured format if user asks for "detailed analysis" or "breakdown"
- End responses with engagement hook: "Want the details?" or "Should I show the math?"
- Lead with the answer, then offer details if needed

**What-If Scenarios:**
- Report ONLY relevant initiatives (directly displaced, row changes, Mendoza crossings)
- For moves: Show OLD slot/row → NEW slot/row for every affected initiative
- Highlight Mendoza Line crossings prominently (these are CRITICAL)
- Recalculate risk scores, efficiency, and delivery confidence after any change
- Give clear recommendations, not just analysis

**Formatting Rules:**
- When using numbered lists, use proper sequential numbering: 1, 2, 3 (NOT 1., 1., 1.)
- Numbered lists are fine and encouraged for step-by-step instructions or multiple points
- Use bullet points (•) for non-sequential items
- Keep responses conversational and human-readable

==== RESPONSE FORMAT ====
For team questions: List specific teams with their health status and issues
For initiative questions: List specific initiatives with assigned teams
For "how to" questions: Provide step-by-step instructions from Volume 5
For calculations: Show the exact formula and calculation steps
For "What if" scenarios: Use Volume 6 framework - report slot AND row changes for ALL relevant initiatives`;
    
    // Build messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: systemMessage },
      ...messages.filter(m => m.role !== 'system')
    ];
    
    // Call OpenAI
    console.log(`📤 Sending request to OpenAI (${openaiMessages.length} messages)`);
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: parseFloat(process.env.TEMPERATURE) || 0.3,
      max_tokens: parseInt(process.env.MAX_TOKENS) || 2000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
    
    console.log(`✅ OpenAI response received (${completion.usage.total_tokens} tokens)`);
    
    // Return response
    res.json({
      response: completion.choices[0].message.content,
      usage: {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      },
      model: completion.model,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /api/chat:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait and try again.' 
      });
    }
    
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid API key. Please check server configuration.' 
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 VueSense Backend running on port ${PORT}`);
  console.log(`📚 Knowledge Base: ${COMPLETE_KNOWLEDGE_BASE.length > 1000 ? 'Loaded (7 volumes)' : 'Using fallback'}`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'MISSING!'}`);
  console.log(`🤖 Model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
});