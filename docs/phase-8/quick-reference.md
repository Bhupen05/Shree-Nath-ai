# Phase 8: Voice AI Agent - Quick Reference

## Quick Setup

### 1. Environment Variables
```env
# .env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1234567890
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o
```

### 2. Install Dependencies
```bash
npm install twilio openai axios form-data
```

### 3. Run Migration
```bash
psql -U user -d database < src/db/migrations/202604190004__voice_ai_agent.sql
```

### 4. Mount Routes
```javascript
const voiceRoutes = require('./modules/voice/routes/voice.routes');
app.use('/api/voice', voiceRoutes(pool, config));
```

## Common Code Snippets

### Make Outbound Call
```javascript
const TwilioVoiceService = require('./modules/voice/services/twilio-voice.service');
const service = new TwilioVoiceService(accountSid, authToken, fromNumber);

const result = await service.makeCall({
  toNumber: '+1234567890',
  twiml: '<Response><Say>Hello</Say></Response>'
});

console.log(result.callSid); // CA1234567890
```

### Transcribe Audio
```javascript
const SpeechToTextService = require('./modules/voice/services/speech-to-text.service');
const service = new SpeechToTextService(apiKey);

const result = await service.transcribeFromUrl({
  audioUrl: 'https://...',
  language: 'en'
});

console.log(result.text); // "I need ten units..."
console.log(result.confidence); // 0.95
```

### Classify Intent
```javascript
const VoiceIntentService = require('./modules/voice/services/voice-intent.service');
const service = new VoiceIntentService(apiKey);

const result = await service.classifyIntent("I need ten units of part AB-123");

console.log(result.intentType); // STOCK_CHECK
console.log(result.confidence); // 0.92
console.log(result.primaryEntity); // AB-123
```

### Generate Voice Response
```javascript
const VoiceResponseService = require('./modules/voice/services/voice-response.service');
const service = new VoiceResponseService(apiKey);

const result = await service.generateVoiceResponse({
  text: 'We have 15 units in stock',
  voice: 'nova',
  speed: 1.0
});

// Use result.audioBuffer to send to caller
```

### Check Guardrails
```javascript
const VoiceGuardrailsService = require('./modules/voice/services/voice-guardrails.service');
const service = new VoiceGuardrailsService(pool);

const violations = await service.checkTranscriptGuardrails(
  "User transcript",
  'INBOUND'
);

if (violations.length > 0) {
  console.log('Blocked:', violations[0].violationType);
}
```

## API Endpoints Quick Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/voice/inbound | - | Twilio webhook (inbound call) |
| POST | /api/voice/transcribe | - | Twilio webhook (transcription) |
| POST | /api/voice/call | ✓ | Make outbound call |
| GET | /api/voice/calls/:id | ✓ | Get call details |
| GET | /api/voice/history | ✓ | Get call history |
| GET | /api/voice/analytics | ✓ | Get analytics |

## Database Queries

### Get today's calls
```sql
SELECT * FROM voice_calls
WHERE DATE(started_at) = TODAY()
ORDER BY started_at DESC;
```

### Intent accuracy
```sql
SELECT intent_type, COUNT(*), ROUND(AVG(intent_confidence), 3)
FROM voice_intents
GROUP BY intent_type
ORDER BY COUNT(*) DESC;
```

### Guardrail violations
```sql
SELECT violation_type, severity, COUNT(*)
FROM voice_guardrail_violations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY violation_type, severity;
```

### Call quality
```sql
SELECT 
  DATE(started_at) as date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'COMPLETED') / COUNT(*), 2) as rate
FROM voice_calls
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at);
```

## Supported Intents

| Intent | Description |
|--------|-------------|
| PART_LOOKUP | Looking for product information |
| STOCK_CHECK | Checking inventory availability |
| PRICE_INQUIRY | Asking about pricing |
| ORDER_STATUS | Tracking existing order |
| PAYMENT_REMINDER | Payment related inquiry |
| DEMAND_LOG | Logging a product demand |
| GENERAL_INQUIRY | General questions |
| FEEDBACK | Providing feedback/review |
| COMPLAINT | Filing a complaint |
| NONE | Unclassified |

## Voice Options

| Voice | Gender | Style |
|-------|--------|-------|
| alloy | Neutral | Professional |
| echo | Male | Deep |
| fable | Male | Friendly |
| onyx | Male | Authoritative |
| nova | Female | Engaging |
| shimmer | Female | Soothing |

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request (invalid input) |
| 401 | Unauthorized (no auth token) |
| 403 | Forbidden (no permission) |
| 404 | Not found (call/resource) |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 503 | Service unavailable |

## Troubleshooting

### Recording not captured
- Verify Twilio webhook URL is correct
- Check call reached CONNECTED state
- Ensure RecordingUrl is accessible

### Transcription fails
- Check OpenAI API key is valid
- Verify audio file format (MP3, WAV, M4A)
- Confirm file size < 25MB

### Intent classification wrong
- Verify transcript quality
- Add more context to prompt
- Check intent thresholds

### Voice response too fast/slow
- Adjust speed parameter (0.25 to 4.0)
- Try different voice
- Add pauses in text

## Performance Tips

1. **Cache guardrails** in memory - don't query database each time
2. **Parallel processing** - transcribe while checking guardrails
3. **Use async/await** - don't block on long operations
4. **Queue analytics** - process metrics in background
5. **Batch database writes** - insert multiple records together

## Security Tips

1. **Never log API keys** - use environment variables
2. **Verify webhook signatures** - validate Twilio requests
3. **Encrypt recordings** - store securely
4. **Detect PII** - flag sensitive data automatically
5. **Rate limit** - prevent abuse
6. **Require auth** - protect endpoints

## Monitoring

### Key Metrics
- Call completion rate
- Intent classification accuracy
- Average response time
- Guardrail violation rate
- Transcription quality

### Alerts
- Call failure rate > 10%
- Intent confidence < 0.6
- Guardrail violations spike
- Transcription errors
- API errors

## Links

- [Twilio Docs](https://www.twilio.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [Express.js Guide](https://expressjs.com)

## Support Contacts

- **Twilio Support**: https://support.twilio.com
- **OpenAI Support**: https://help.openai.com
- **Development Team**: [your team email]
- **On-call**: [oncall info]

---

**Quick Ref Version:** 1.0  
**Last Updated:** April 19, 2026
