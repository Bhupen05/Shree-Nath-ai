# Phase 8: Voice AI Agent API Reference

## Complete API Documentation

### 1. Twilio Voice Service

#### Constructor
```javascript
const service = new TwilioVoiceService(accountSid, authToken, fromNumber);
```

#### Methods

##### makeCall(options)
Make an outbound call.

**Parameters:**
```javascript
{
  toNumber: '+1234567890',        // Required: E.164 format
  twiml: '<Response>...</Response>', // Optional: TwiML string
}
```

**Returns:**
```javascript
{
  success: true,
  callSid: 'CA1234567890',
  status: 'queued',
  toNumber: '+1234567890',
  fromNumber: '+1234567890',
  timestamp: Date
}
```

##### transferCall(options)
Transfer an active call to another number.

**Parameters:**
```javascript
{
  callSid: 'CA1234567890',    // Required
  toNumber: '+1234567890'     // Required
}
```

**Returns:**
```javascript
{
  success: true,
  callSid: 'CA1234567890',
  status: 'in-progress',
  timestamp: Date
}
```

##### startRecording(options)
Start recording a call.

**Parameters:**
```javascript
{
  callSid: 'CA1234567890',         // Required
  recordingChannels: 'both'        // Optional: 'mono'|'stereo'|'both'
}
```

**Returns:**
```javascript
{
  success: true,
  recordingSid: 'RE1234567890',
  recordingUrl: 'https://...',
  status: 'in-progress',
  timestamp: Date
}
```

##### getCall(callSid)
Fetch call details from Twilio.

**Parameters:**
```javascript
'CA1234567890' // Call SID
```

**Returns:**
```javascript
{
  success: true,
  call: {
    sid: 'CA1234567890',
    status: 'completed',
    from: '+1234567890',
    to: '+0987654321',
    duration: 45,
    startTime: Date,
    endTime: Date,
    price: '-0.05',
    priceUnit: 'USD',
    direction: 'outbound-api',
    answeredBy: 'human'
  },
  timestamp: Date
}
```

##### Static Methods

**isValidPhoneNumber(phoneNumber)**
```javascript
TwilioVoiceService.isValidPhoneNumber('+1234567890') // true
```

**formatPhoneNumber(phoneNumber)**
```javascript
TwilioVoiceService.formatPhoneNumber('2025551234') // '+12025551234'
```

### 2. Speech-to-Text Service

#### Constructor
```javascript
const service = new SpeechToTextService(apiKey, model = 'whisper-1');
```

#### Methods

##### transcribeAudio(options)
Transcribe audio from buffer, file, or URL.

**Parameters:**
```javascript
{
  audio: Buffer|'file.mp3'|'https://...',
  language: 'en',           // Optional
  prompt: 'context text'    // Optional
}
```

**Returns:**
```javascript
{
  success: true,
  text: 'I need ten units of part AB-123',
  language: 'en',
  duration: 15,
  confidence: 0.95,
  segments: [
    { id: 0, seek: 0, start: 0.0, end: 1.5, text: 'I', ... }
  ],
  provider: 'WHISPER',
  model: 'whisper-1',
  timestamp: Date,
  raw: { ... }
}
```

##### transcribeFromUrl(options)
Transcribe from audio URL.

**Parameters:**
```javascript
{
  audioUrl: 'https://...',
  language: 'en'
}
```

##### transcribeFromFile(options)
Transcribe from local file.

**Parameters:**
```javascript
{
  filePath: '/path/to/audio.mp3',
  language: 'en'
}
```

##### transcribeFromBuffer(audioBuffer, language)
Transcribe from audio buffer.

**Parameters:**
```javascript
SpeechToTextService.transcribeFromBuffer(buffer, 'en');
```

#### Static Methods

**getSupportedLanguages()**
```javascript
{
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  // ... 9+ more languages
}
```

**extractKeyPhrases(text)**
```javascript
SpeechToTextService.extractKeyPhrases("I need 10 units of part AB-123");
// Returns: [
//   { type: 'NUMBER', value: '10' },
//   { type: 'PART_ID', value: 'AB-123' }
// ]
```

**calculateConfidence(transcriptionData)**
```javascript
const confidence = SpeechToTextService.calculateConfidence(data);
// Returns: 0.95 (number between 0 and 1)
```

### 3. Voice Intent Service

#### Constructor
```javascript
const service = new VoiceIntentService(openaiApiKey);
```

#### Methods

##### classifyIntent(transcript)
Classify user intent from transcript.

**Parameters:**
```javascript
'I need ten units of part AB-123 for stock replenishment'
```

**Returns:**
```javascript
{
  success: true,
  transcript: 'I need ten units of part AB-123',
  intentType: 'STOCK_CHECK',
  confidence: 0.95,
  primaryEntity: 'AB-123',
  secondaryEntities: ['10', 'units'],
  reasoning: 'User is checking stock availability for a part',
  provider: 'GPT-4O',
  timestamp: Date,
  raw: { intent, confidence, ... }
}
```

##### extractEntities(transcript, intent)
Extract entities from transcript.

**Parameters:**
```javascript
const result = await service.extractEntities(
  'I need ten units of part AB-123',
  'STOCK_CHECK'
);
```

**Returns:**
```javascript
{
  success: true,
  transcript: 'I need ten units of part AB-123',
  entities: [
    { type: 'PART_NUMBER', value: 'AB-123' },
    { type: 'QUANTITY', value: '10' },
    { type: 'UNIT', value: 'units' }
  ],
  timestamp: Date
}
```

##### generateResponse(intent, entities, context)
Generate contextual response.

**Parameters:**
```javascript
await service.generateResponse(
  'STOCK_CHECK',
  [{ type: 'PART_NUMBER', value: 'AB-123' }],
  { quantity: 10, available: 15, location: 'Warehouse A' }
);
```

**Returns:**
```javascript
{
  success: true,
  responseText: 'We have 15 units of part AB-123 in stock at Warehouse A.',
  intent: 'STOCK_CHECK',
  timestamp: Date
}
```

#### Static Methods

**mapIntentType(rawIntent)**
```javascript
VoiceIntentService.mapIntentType('PART_LOOKUP')
// Returns: 'PART_LOOKUP'
```

**getIntentPriorities()**
```javascript
{
  'COMPLAINT': 'HIGH',
  'PAYMENT_REMINDER': 'MEDIUM',
  'STOCK_CHECK': 'LOW',
  // ...
}
```

### 4. Voice Response Service

#### Constructor
```javascript
const service = new VoiceResponseService(openaiApiKey);
```

#### Methods

##### generateVoiceResponse(options)
Generate voice audio from text.

**Parameters:**
```javascript
{
  text: 'We have 15 units in stock',
  voice: 'nova',              // alloy|echo|fable|onyx|nova|shimmer
  speed: 1.0                  // 0.25 to 4.0
}
```

**Returns:**
```javascript
{
  success: true,
  audioBuffer: Buffer,         // MP3 audio data
  voice: 'nova',
  speed: 1.0,
  mimeType: 'audio/mpeg',
  timestamp: Date
}
```

##### generateIntentResponse(options)
Generate response based on intent.

**Parameters:**
```javascript
{
  intent: 'STOCK_CHECK',
  data: { partName: 'AB-123', quantity: 15 },
  voice: 'nova'
}
```

##### createFallbackResponse(options)
Create error/fallback response.

**Parameters:**
```javascript
{
  reason: 'NO_INTENT',    // ERROR|NO_INTENT|NO_MATCH|SYSTEM_BUSY|TIMEOUT|ESCALATED
  voice: 'nova'
}
```

##### createHoldMessage(options)
Create hold/wait message.

**Parameters:**
```javascript
{
  message: 'Thank you for holding',
  voice: 'nova'
}
```

#### Static Methods

**isValidResponseText(text)**
```javascript
VoiceResponseService.isValidResponseText('Valid message')
// Returns: true|false
```

**estimateGenerationTime(text)**
```javascript
VoiceResponseService.estimateGenerationTime('We have 15 units in stock')
// Returns: 2 (seconds)
```

### 5. Voice Guardrails Service

#### Constructor
```javascript
const service = new VoiceGuardrailsService(pool);
```

#### Methods

##### checkTranscriptGuardrails(transcript, callType)
Check transcript against all active guardrails.

**Parameters:**
```javascript
{
  transcript: 'User transcript text',
  callType: 'INBOUND'  // INBOUND|OUTBOUND
}
```

**Returns:**
```javascript
[
  {
    guardrailId: 1,
    violationType: 'KEYWORD_BLOCK',
    violationText: 'flagged_word',
    severity: 'HIGH',
    actionRequired: 'BLOCK'
  }
]
```

##### checkSensitiveData(transcript)
Detect SSN, credit card, email, phone in transcript.

**Returns:**
```javascript
['SSN', 'CREDIT_CARD']  // Types of sensitive data found
```

##### checkAbusiveLanguage(transcript)
Detect inappropriate language.

**Returns:**
```javascript
['profanity1', 'slur2']  // Words found
```

##### recordViolation(callId, guardrailId, violation)
Record guardrail violation.

**Parameters:**
```javascript
{
  callId: 123,
  guardrailId: 5,
  violation: { violationType, violationText, severity, actionRequired }
}
```

##### getGuardrailStats(days)
Get violation statistics.

**Parameters:**
```javascript
7  // Number of days to analyze
```

**Returns:**
```javascript
{
  success: true,
  stats: [
    {
      violation_type: 'KEYWORD_BLOCK',
      severity: 'HIGH',
      violation_count: 5,
      affected_calls: 5,
      latest_violation: Date
    }
  ]
}
```

##### checkFraudPattern(phoneNumber, timeWindowMinutes)
Detect suspicious call patterns.

**Parameters:**
```javascript
{
  phoneNumber: '+1234567890',
  timeWindowMinutes: 60
}
```

**Returns:**
```javascript
{
  callCount: 15,
  isSuspicious: true,
  threshold: 10
}
```

## Database Functions

### log_voice_call
```sql
SELECT * FROM log_voice_call(
  'INBOUND',                    -- p_call_type
  '+1234567890',               -- p_from_number
  '+0987654321',               -- p_to_number
  'John Doe',                  -- p_caller_name
  'CA1234567890',              -- p_twilio_call_sid
  1                            -- p_created_by (user_id)
);
```

### update_call_status
```sql
CALL update_call_status(
  123,                         -- p_call_id
  'COMPLETED',                 -- p_status
  'normal_hangup'              -- p_reason
);
```

### record_voice_transcription
```sql
SELECT * FROM record_voice_transcription(
  123,                         -- p_call_id
  'Transcript text',           -- p_transcript_text
  0.95,                        -- p_confidence
  'WHISPER'                    -- p_provider
);
```

## Error Handling

### Common Error Responses

```javascript
// Transcription failure
{
  success: false,
  error: 'Failed to transcribe audio',
  errorCode: 400,
  provider: 'WHISPER'
}

// API key invalid
{
  success: false,
  error: 'Invalid API key',
  errorCode: 401
}

// Invalid phone number
{
  success: false,
  error: 'Invalid phone number format'
}

// Guardrail violation
{
  success: true,
  blocked: true,
  reason: 'KEYWORD_BLOCK'
}
```

## Request/Response Examples

### Example 1: Inbound Call Flow

**1. Twilio Webhook to /api/voice/inbound**
```
POST /api/voice/inbound
Body: {
  From: '+1234567890',
  To: '+0987654321',
  CallSid: 'CA1234567890',
  AccountSid: 'AC1234567890'
}

Response: (TwiML XML)
```

**2. Transcription Webhook to /api/voice/transcribe**
```
POST /api/voice/transcribe
Body: {
  CallSid: 'CA1234567890',
  RecordingUrl: 'https://...',
  CallDuration: '45'
}

Response: {
  success: true,
  callId: 123,
  transcript: 'I need ten units of part AB-123',
  intent: 'STOCK_CHECK',
  response: 'We have 15 units in stock'
}
```

### Example 2: Outbound Call

**Request**
```
POST /api/voice/call
Header: Authorization: Bearer <token>
Body: {
  toNumber: '+1234567890',
  message: 'Your part has arrived',
  voice: 'nova'
}

Response: {
  success: true,
  callId: 124,
  callSid: 'CA1234567891',
  status: 'initiated'
}
```

### Example 3: Call Details

**Request**
```
GET /api/voice/calls/123
Header: Authorization: Bearer <token>

Response: {
  success: true,
  call: {
    id: 123,
    from_number: '+1234567890',
    to_number: '+0987654321',
    call_type: 'INBOUND',
    status: 'COMPLETED',
    duration_seconds: 45,
    transcript_text: 'I need ten units of part AB-123',
    transcript_confidence: 0.95,
    intent_type: 'STOCK_CHECK',
    intent_confidence: 0.92,
    created_at: '2026-04-19T10:30:00Z'
  }
}
```

## Rate Limits & Quotas

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/voice/call | 100 | per hour |
| GET /api/voice/calls | 1000 | per hour |
| Whisper API | 500K | per minute |
| GPT-4o API | 500K | tokens per minute |
| TTS API | 30,000 | requests per minute |

## Timeouts

| Operation | Timeout |
|-----------|---------|
| Transcription | 60 seconds |
| Intent Classification | 30 seconds |
| Voice Generation | 30 seconds |
| Call Connection | 120 seconds |
| Recording Start | 5 seconds |

---

**Version:** 1.0  
**Last Updated:** April 19, 2026  
**Status:** Production Ready
