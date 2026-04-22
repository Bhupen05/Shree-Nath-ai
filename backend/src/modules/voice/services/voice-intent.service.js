/**
 * Voice Intent Classification Service
 * Classifies transcribed text to intents using GPT-4o
 */

const axios = require('axios');

class VoiceIntentService {
  constructor(openaiApiKey) {
    this.apiKey = openaiApiKey;
    this.baseURL = 'https://api.openai.com/v1';
    this.model = 'gpt-4o';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Classify intent from transcript
   * @param {string} transcript - Transcript text
   * @returns {Object} Intent classification result
   */
  async classifyIntent(transcript) {
    try {
      const systemPrompt = `You are an intelligent voice assistant for a stock management system. 
Analyze the user's statement and classify it into one of these intents:
- PART_LOOKUP: User is looking for information about a specific part
- STOCK_CHECK: User wants to know stock availability or quantity
- PRICE_INQUIRY: User is asking about pricing
- ORDER_STATUS: User wants to know about an existing order
- PAYMENT_REMINDER: User is inquiring about payments
- DEMAND_LOG: User wants to log a demand or inquiry
- GENERAL_INQUIRY: General questions about products or services
- FEEDBACK: User is providing feedback or complaint
- NONE: Unclear intent

Respond with JSON containing:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.95,
  "primary_entity": "extracted main entity",
  "secondary_entities": ["entity1", "entity2"],
  "reasoning": "brief explanation"
}`;

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this user statement and classify the intent: "${transcript}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.data.choices[0].message.content;
      const result = this.parseJsonResponse(content);

      return {
        success: true,
        provider: 'GPT-4O',
        transcript,
        intentType: result.intent || 'NONE',
        confidence: result.confidence || 0.5,
        primaryEntity: result.primary_entity || null,
        secondaryEntities: result.secondary_entities || [],
        reasoning: result.reasoning || '',
        timestamp: new Date(),
        raw: result
      };
    } catch (error) {
      return {
        success: false,
        provider: 'GPT-4O',
        error: error.message,
        transcript,
        timestamp: new Date()
      };
    }
  }

  /**
   * Extract entities from transcript
   * @param {string} transcript - Transcript text
   * @param {string} intent - Intent type for context
   */
  async extractEntities(transcript, intent = '') {
    try {
      const systemPrompt = `You are an entity extraction specialist for a stock management system.
Extract all entities from the user's statement. Return as JSON:
{
  "entities": [
    {"type": "PART_NAME|PART_NUMBER|QUANTITY|PRICE|LOCATION|PARTY_NAME", "value": "..."},
    ...
  ]
}`;

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Extract entities from: "${transcript}"${intent ? ` (Intent: ${intent})` : ''}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.data.choices[0].message.content;
      const result = this.parseJsonResponse(content);

      return {
        success: true,
        transcript,
        entities: result.entities || [],
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        entities: []
      };
    }
  }

  /**
   * Generate appropriate response
   * @param {string} intent - Intent type
   * @param {Array} entities - Extracted entities
   * @param {Object} context - Context data (stock, pricing, etc)
   */
  async generateResponse(intent, entities = [], context = {}) {
    try {
      let promptContext = `You are a helpful voice assistant for a stock management system.
Generate a natural, concise voice response (max 2 sentences) for the user.
Intent: ${intent}
Context: ${JSON.stringify(context)}`;

      if (entities.length > 0) {
        promptContext += `\nExtracted entities: ${JSON.stringify(entities)}`;
      }

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: promptContext
          },
          {
            role: 'user',
            content: `Generate a voice response for intent: ${intent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const text = response.data.choices[0].message.content;

      return {
        success: true,
        responseText: text,
        intent,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseText: 'I apologize, I had trouble processing your request. Please try again.'
      };
    }
  }

  /**
   * Determine if intent requires escalation
   * @param {string} intent - Intent type
   * @param {number} confidence - Confidence score
   */
  shouldEscalate(intent, confidence = 1.0) {
    const needsHuman = ['COMPLAINT', 'FEEDBACK', 'ESCALATE'];
    const lowConfidenceThreshold = 0.6;

    if (needsHuman.includes(intent)) {
      return true;
    }

    if (confidence < lowConfidenceThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Parse JSON from model response
   * @private
   */
  parseJsonResponse(content) {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Map intent to database intent type
   * @param {string} rawIntent - Raw intent from model
   */
  static mapIntentType(rawIntent) {
    const intentMap = {
      'PART_LOOKUP': 'PART_LOOKUP',
      'STOCK_CHECK': 'STOCK_CHECK',
      'PRICE_INQUIRY': 'PRICE_INQUIRY',
      'ORDER_STATUS': 'ORDER_STATUS',
      'PAYMENT_REMINDER': 'PAYMENT_REMINDER',
      'DEMAND_LOG': 'DEMAND_LOG',
      'GENERAL_INQUIRY': 'GENERAL_INQUIRY',
      'FEEDBACK': 'FEEDBACK',
      'COMPLAINT': 'COMPLAINT',
      'NONE': 'NONE',
      'INVALID': 'INVALID'
    };

    return intentMap[rawIntent?.toUpperCase()] || 'NONE';
  }

  /**
   * Get intent priorities (for escalation routing)
   */
  static getIntentPriorities() {
    return {
      'COMPLAINT': 'HIGH',
      'PAYMENT_REMINDER': 'MEDIUM',
      'FEEDBACK': 'MEDIUM',
      'STOCK_CHECK': 'LOW',
      'PRICE_INQUIRY': 'LOW',
      'PART_LOOKUP': 'LOW',
      'GENERAL_INQUIRY': 'LOW',
      'DEMAND_LOG': 'LOW',
      'NONE': 'LOW'
    };
  }
}

module.exports = VoiceIntentService;
