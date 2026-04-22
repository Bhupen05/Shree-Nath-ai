# Phase 8: Voice AI Agent System

## Overview

Phase 8 implements a comprehensive voice AI agent system that enables:
- Inbound/outbound voice calling via Twilio
- Automatic speech-to-text using OpenAI Whisper
- Intent classification using GPT-4o
- Natural voice responses using text-to-speech
- Safety guardrails and compliance checks

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                   Voice Call Flow                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. INBOUND CALL                                         │
│     └─ Twilio receives call                             │
│     └─ VoiceController.handleInboundCall()             │
│     └─ Log call to database                            │
│     └─ Start recording                                 │
│     └─ Return greeting TwiML                           │
│                                                          │
│  2. SPEECH TO TEXT                                      │
│     └─ VoiceController.handleTranscription()           │
│     └─ SpeechToTextService.transcribeAudio()           │
│     └─ OpenAI Whisper API processes audio             │
│     └─ Store transcript with confidence score         │
│                                                          │
│  3. INTENT CLASSIFICATION                               │
│     └─ VoiceIntentService.classifyIntent()             │
│     └─ GPT-4o analyzes transcript                      │
│     └─ Extract intent type and entities               │
│     └─ Store intent with confidence score             │
│                                                          │
│  4. GUARDRAIL CHECK                                     │
│     └─ VoiceGuardrailsService.checkTranscriptGuardrails()│
│     └─ Check keywords, patterns, abuse                │
│     └─ Record violations if detected                  │
│     └─ Block or escalate as needed                    │
│                                                          │
│  5. RESPONSE GENERATION                                 │
│     └─ VoiceIntentService.generateResponse()           │
│     └─ GPT-4o creates contextual response             │
│     └─ VoiceResponseService.generateVoiceResponse()   │
│     └─ Text-to-speech creates audio response         │
│                                                          │
│  6. RESPONSE DELIVERY                                   │
│     └─ Store response in database                      │
│     └─ Send TwiML with voice response to caller       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

#### Core Tables

1. **voice_calls** - Call log and metadata
   - Call SID, from/to numbers, caller info
   - Status tracking (INITIATED, RINGING, CONNECTED, etc)
   - Recording URLs and metadata
   - Duration and timing information

2. **voice_transcriptions** - Speech-to-text results
   - Raw transcript text
   - Confidence scores (0.00 - 1.00)
   - Provider info (Whisper, Google, etc)
   - Language and processing metadata

3. **voice_intents** - Intent classification
   - Intent type and confidence
   - Primary/secondary entities
   - Classification model and version
   - Processing time metrics

4. **voice_entities** - Extracted data
   - Entity type (PART_NAME, QUANTITY, PRICE, etc)
   - Matched record IDs (parts, parties, bills)
   - Entity confidence scores

5. **voice_responses** - Generated responses
   - Response type (VOICE, SMS, EMAIL, etc)
   - Response text and audio
   - Template usage tracking
   - Delivery confirmation

6. **voice_guardrails** - Safety rules
   - Keyword blocking lists
   - Regex pattern blocks
   - Rate limiting rules
   - Caller blocking rules

7. **voice_guardrail_violations** - Violation tracking
   - Violation type and severity
   - Action taken (BLOCKED, FLAGGED, ESCALATED)
   - Timestamp and call reference

#### Analytical Views

- **v_voice_call_summary** - Call with transcript and intent
- **v_voice_intent_accuracy** - Intent classification metrics
- **v_voice_violations_summary** - Guardrail violation stats
- **v_voice_call_quality** - Daily quality metrics

## Service Classes

### 1. TwilioVoiceService

Manages Twilio API interactions:

```javascript
// Make outbound call
const result = await twilioService.makeCall({
  toNumber: '+1234567890',
  twiml: twimlString
});

// Transfer call
const transfer = await twilioService.transferCall({
  callSid: 'CA1234567890',
  toNumber: '+1234567890'
});

// Start/stop recording
const recording = await twilioService.startRecording({
  callSid: 'CA1234567890',
  recordingChannels: 'both'
});

// Get call details
const call = await twilioService.getCall('CA1234567890');
```

**Key Features:**
- Phone number validation and formatting
- TwiML generation for IVR flows
- Call transfer and routing
- Recording management
- Account balance checking

### 2. SpeechToTextService

Converts audio to text using OpenAI Whisper:

```javascript
// Transcribe from URL
const result = await sttService.transcribeFromUrl({
  audioUrl: 'https://...',
  language: 'en'
});

// Transcribe from file
const result = await sttService.transcribeFromFile({
  filePath: '/path/to/audio.mp3',
  language: 'en'
});

// Transcribe from buffer
const result = await sttService.transcribeFromBuffer(audioBuffer, 'en');
```

**Output:**
```javascript
{
  success: true,
  text: "I need ten units of part AB-123",
  confidence: 0.95,
  language: 'en',
  duration: 15,
  provider: 'WHISPER'
}
```

### 3. VoiceIntentService

Classifies intents using GPT-4o:

```javascript
// Classify intent
const result = await intentService.classifyIntent(
  "I need ten units of part AB-123"
);

// Generate response
const response = await intentService.generateResponse(
  'STOCK_CHECK',
  [{ type: 'PART_NUMBER', value: 'AB-123' }],
  { quantity: 10, available: 15 }
);
```

**Supported Intents:**
- PART_LOOKUP - Product information
- STOCK_CHECK - Inventory queries
- PRICE_INQUIRY - Pricing questions
- ORDER_STATUS - Order tracking
- PAYMENT_REMINDER - Payment inquiries
- DEMAND_LOG - Logging demands
- GENERAL_INQUIRY - General questions
- FEEDBACK - Customer feedback
- COMPLAINT - Issues/complaints
- NONE - Unclassified

### 4. VoiceResponseService

Generates voice responses via text-to-speech:

```javascript
// Generate voice response
const result = await responseService.generateVoiceResponse({
  text: "We have 15 units in stock",
  voice: 'nova',
  speed: 1.0
});

// Generate intent-based response
const result = await responseService.generateIntentResponse({
  intent: 'STOCK_CHECK',
  data: { partName: 'AB-123', quantity: 15 },
  voice: 'nova'
});
```

**Available Voices:**
- alloy (NEUTRAL) - Clear and professional
- echo (MALE) - Deep and resonant
- fable (MALE) - Warm and friendly
- onyx (MALE) - Rich and authoritative
- nova (FEMALE) - Bright and engaging
- shimmer (FEMALE) - Soft and soothing

### 5. VoiceGuardrailsService

Implements safety and compliance:

```javascript
// Check transcript against guardrails
const violations = await guardrailsService.checkTranscriptGuardrails(
  transcript,
  'INBOUND'
);

// Check for sensitive data
const sensitiveData = guardrailsService.checkSensitiveData(transcript);

// Check for abusive language
const abuse = guardrailsService.checkAbusiveLanguage(transcript);

// Check for fraud patterns
const fraud = await guardrailsService.checkFraudPattern(
  phoneNumber,
  60 // time window in minutes
);
```

**Guardrail Types:**
- KEYWORD_BLOCK - Blocked words
- PATTERN_BLOCK - Regex patterns
- RATE_LIMIT - Call frequency limits
- CALLER_BLOCK - Blacklisted numbers
- TIME_BASED - Restricted hours

## API Endpoints

### Public Endpoints (Twilio Webhooks)

#### POST /api/voice/inbound
Handle inbound call - Twilio webhook
```
Body: Twilio call parameters (From, To, CallSid, etc)
Response: TwiML XML
```

#### POST /api/voice/transcribe
Process transcription - Twilio webhook
```
Body: Twilio recording data
Response: { success, transcript, intent, response }
```

### Protected Endpoints (Require Authentication)

#### POST /api/voice/call
Make outbound call
```json
{
  "toNumber": "+1234567890",
  "message": "Hello, this is an automated call",
  "voice": "nova"
}
```

Response:
```json
{
  "success": true,
  "callId": 123,
  "callSid": "CA1234567890",
  "status": "INITIATED"
}
```

#### GET /api/voice/calls/:callId
Get call details
```
Response: {
  id, from_number, to_number, call_type, status,
  transcript_text, transcript_confidence,
  intent_type, intent_confidence, ...
}
```

#### GET /api/voice/history
Get call history
```
Query: limit=50, offset=0
Response: { calls: [...], count: 50 }
```

#### GET /api/voice/analytics
Get voice analytics
```
Query: days=7
Response: {
  analytics: [{
    call_date,
    total_calls,
    completed_calls,
    completion_rate,
    unique_intents,
    avg_intent_confidence
  }, ...]
}
```

## Configuration

### Environment Variables

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1234567890

# OpenAI Configuration
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o

# Whisper Configuration
WHISPER_MODEL=whisper-1
WHISPER_LANGUAGE=en

# Voice Configuration
VOICE_DEFAULT_VOICE=nova
VOICE_DEFAULT_SPEED=1.0
VOICE_MAX_RECORDING_SECONDS=3600
```

### Application Configuration

```javascript
const voiceConfig = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o'
  },
  voice: {
    defaultVoice: process.env.VOICE_DEFAULT_VOICE || 'nova',
    defaultSpeed: 1.0,
    maxRecordingSeconds: 3600
  }
};
```

## Implementation Steps

1. **Database Migration**
   - Run Phase 8 migration: `202604190004__voice_ai_agent.sql`
   - Creates 9 tables, 4 views, and helper functions

2. **Service Installation**
   - Install Twilio SDK: `npm install twilio`
   - Install OpenAI SDK: `npm install openai`
   - Services handle API communications

3. **Route Configuration**
   - Mount voice routes in main app
   - Configure Twilio webhooks to point to `/api/voice/inbound` and `/api/voice/transcribe`

4. **Guardrail Setup**
   - Add guardrails to database
   - Configure keywords, patterns, and rules
   - Set up violation handling

5. **Testing**
   - Simulate inbound calls with Twilio webhooks
   - Test intent classification with various inputs
   - Verify guardrail enforcement

## Guardrail Examples

### Keyword Blocking
```sql
INSERT INTO voice_guardrails (guardrail_type, keyword_list, action)
VALUES ('KEYWORD_BLOCK', 
  '{"bomb", "attack", "threat"}', 
  'BLOCK');
```

### Pattern Blocking
```sql
INSERT INTO voice_guardrails (guardrail_type, pattern, action)
VALUES ('PATTERN_BLOCK',
  '\d{3}-\d{2}-\d{4}', -- SSN pattern
  'ALERT');
```

### Caller Blocking
```sql
INSERT INTO voice_guardrails (guardrail_type, pattern, action)
VALUES ('CALLER_BLOCK',
  '+1234567890',
  'BLOCK');
```

## Troubleshooting

### Common Issues

1. **Recording not captured**
   - Check Twilio webhook configuration
   - Verify RecordingUrl is accessible
   - Ensure call reaches CONNECTED state

2. **Transcription fails**
   - Verify OpenAI API key
   - Check audio file format (MP3, WAV, M4A)
   - Ensure audio file size < 25MB

3. **Intent classification inaccurate**
   - Add more context to intent prompt
   - Review training examples
   - Check transcript quality

4. **Voice response too fast/slow**
   - Adjust speech speed (0.25 to 4.0)
   - Use different voice for clarity
   - Add pauses in text

## Monitoring & Analytics

### Key Metrics

- **Call Completion Rate** - % of calls completed successfully
- **Intent Confidence** - Average confidence of intent classification
- **Transcription Quality** - % of high-confidence transcriptions (>0.8)
- **Response Time** - Time from call start to response
- **Violation Rate** - % of calls blocked by guardrails

### Queries

```sql
-- Daily call stats
SELECT DATE(started_at), COUNT(*), 
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed
FROM voice_calls
GROUP BY DATE(started_at);

-- Intent accuracy
SELECT intent_type, COUNT(*),
  ROUND(AVG(intent_confidence), 3) as avg_confidence
FROM voice_intents
GROUP BY intent_type;

-- Violations by type
SELECT violation_type, severity, COUNT(*)
FROM voice_guardrail_violations
GROUP BY violation_type, severity;
```

## Security Considerations

1. **PII Protection**
   - Automatically detect and flag SSN, credit card, etc
   - Don't store unencrypted sensitive data
   - Implement automatic redaction

2. **Call Recording Privacy**
   - Get explicit consent before recording
   - Store recordings securely (encrypted)
   - Implement automatic deletion policy

3. **Rate Limiting**
   - Limit calls per phone number
   - Implement cool-down periods
   - Alert on suspicious patterns

4. **Authentication**
   - Verify caller identity for sensitive operations
   - Use account security questions
   - Implement call-back verification

## Performance Optimization

1. **Parallel Processing**
   - Process transcription while checking guardrails
   - Classify intent while extracting entities

2. **Caching**
   - Cache guardrails in memory
   - Cache intent classification results
   - Cache voice templates

3. **Async Operations**
   - Queue long-running operations
   - Process analytics in background
   - Store recordings asynchronously

## Future Enhancements

1. **Multi-language Support** - Support for Hindi, Spanish, etc
2. **Sentiment Analysis** - Detect customer mood/satisfaction
3. **Real-time Transfer** - Agent handoff with context
4. **Callback Automation** - Schedule callbacks for later
5. **Call Masking** - Hide real numbers for privacy
6. **Voice Biometrics** - Speaker identification

## References

- [Twilio Documentation](https://www.twilio.com/docs)
- [OpenAI Whisper](https://openai.com/research/whisper)
- [GPT-4o Models](https://platform.openai.com/docs/models)
- [Text-to-Speech Guide](https://platform.openai.com/docs/guides/text-to-speech)
