/**
 * Voice Guardrails Service
 * Implements safety and compliance checks for voice calls
 */

class VoiceGuardrailsService {
  constructor(pool) {
    this.pool = pool;
    this.guardrailCache = new Map();
    this.loadGuardrails();
  }

  /**
   * Load active guardrails from database
   */
  async loadGuardrails() {
    try {
      const result = await this.pool.query(`
        SELECT id, guardrail_type, pattern, keyword_list, action, description
        FROM voice_guardrails
        WHERE is_active = TRUE
      `);

      this.guardrailCache.clear();
      for (const row of result.rows) {
        this.guardrailCache.set(row.id, row);
      }
    } catch (error) {
      console.error('Failed to load guardrails:', error);
    }
  }

  /**
   * Check transcript against guardrails
   * @param {string} transcript - Transcript text
   * @param {string} callType - INBOUND or OUTBOUND
   * @returns {Array} Violations found
   */
  async checkTranscriptGuardrails(transcript, callType = 'INBOUND') {
    const violations = [];

    for (const [guardrailId, guardrail] of this.guardrailCache.entries()) {
      const violation = this.checkGuardrail(transcript, guardrail);
      
      if (violation) {
        violations.push({
          guardrailId,
          violationType: guardrail.guardrail_type,
          violationText: violation.text,
          severity: violation.severity,
          actionRequired: guardrail.action
        });
      }
    }

    return violations;
  }

  /**
   * Check single guardrail
   * @private
   */
  checkGuardrail(transcript, guardrail) {
    const transcriptLower = transcript.toLowerCase();

    switch (guardrail.guardrail_type) {
      case 'KEYWORD_BLOCK':
        return this.checkKeywordBlock(transcriptLower, guardrail);
      case 'PATTERN_BLOCK':
        return this.checkPatternBlock(transcript, guardrail);
      case 'RATE_LIMIT':
        return this.checkRateLimit(guardrail);
      case 'CALLER_BLOCK':
        return this.checkCallerBlock(guardrail);
      default:
        return null;
    }
  }

  /**
   * Check keyword blocking
   * @private
   */
  checkKeywordBlock(transcriptLower, guardrail) {
    if (!guardrail.keyword_list || guardrail.keyword_list.length === 0) {
      return null;
    }

    for (const keyword of guardrail.keyword_list) {
      if (transcriptLower.includes(keyword.toLowerCase())) {
        return {
          text: keyword,
          severity: 'HIGH',
          blocked: true
        };
      }
    }

    return null;
  }

  /**
   * Check regex pattern blocking
   * @private
   */
  checkPatternBlock(transcript, guardrail) {
    if (!guardrail.pattern) {
      return null;
    }

    try {
      const regex = new RegExp(guardrail.pattern, 'gi');
      const match = regex.exec(transcript);

      if (match) {
        return {
          text: match[0],
          severity: 'MEDIUM',
          blocked: false
        };
      }
    } catch (error) {
      console.error('Invalid guardrail pattern:', guardrail.pattern);
    }

    return null;
  }

  /**
   * Check rate limiting
   * @private
   */
  checkRateLimit(guardrail) {
    // Implement rate limiting logic
    return null;
  }

  /**
   * Check caller blacklist
   * @private
   */
  checkCallerBlock(guardrail) {
    // Implement caller blocking logic
    return null;
  }

  /**
   * Check if transcript contains sensitive information
   * @param {string} transcript - Transcript text
   */
  checkSensitiveData(transcript) {
    const sensitivePatterns = {
      'SSN': /\b\d{3}-\d{2}-\d{4}\b/,
      'CREDIT_CARD': /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
      'EMAIL': /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      'PHONE': /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
      'BANK_ACCOUNT': /\b\d{8,17}\b/
    };

    const found = [];
    for (const [type, pattern] of Object.entries(sensitivePatterns)) {
      if (pattern.test(transcript)) {
        found.push(type);
      }
    }

    return found;
  }

  /**
   * Check transcript for abusive language
   * @param {string} transcript - Transcript text
   */
  checkAbusiveLanguage(transcript) {
    // List of inappropriate words (simplified)
    const abusiveWords = [
      'profanity1', 'profanity2', 'slur1', 'slur2'
      // Extend based on your requirements
    ];

    const transcriptLower = transcript.toLowerCase();
    const found = [];

    for (const word of abusiveWords) {
      if (transcriptLower.includes(word)) {
        found.push(word);
      }
    }

    return found;
  }

  /**
   * Record guardrail violation
   * @param {integer} callId - Call ID
   * @param {integer} guardrailId - Guardrail ID
   * @param {Object} violation - Violation details
   */
  async recordViolation(callId, guardrailId, violation) {
    try {
      const result = await this.pool.query(`
        INSERT INTO voice_guardrail_violations (
          call_id, guardrail_id, violation_type, violation_text,
          severity, action_taken
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
      `, [
        callId,
        guardrailId,
        violation.violationType,
        violation.violationText,
        violation.severity,
        violation.actionRequired
      ]);

      return {
        success: true,
        violationId: result.rows[0].id,
        recordedAt: result.rows[0].created_at
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get guardrail statistics
   */
  async getGuardrailStats(days = 7) {
    try {
      const result = await this.pool.query(`
        SELECT
          vgv.violation_type,
          vgv.severity,
          COUNT(*) as violation_count,
          COUNT(DISTINCT vgv.call_id) as affected_calls,
          MAX(vgv.blocked_at) as latest_violation
        FROM voice_guardrail_violations vgv
        WHERE vgv.created_at > NOW() - INTERVAL '1 day' * $1
        GROUP BY vgv.violation_type, vgv.severity
        ORDER BY violation_count DESC
      `, [days]);

      return {
        success: true,
        stats: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check call pattern for fraud detection
   * @param {string} phoneNumber - Phone number
   * @param {integer} timeWindowMinutes - Time window to check
   */
  async checkFraudPattern(phoneNumber, timeWindowMinutes = 60) {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as call_count
        FROM voice_calls
        WHERE (from_number = $1 OR to_number = $1)
          AND started_at > NOW() - INTERVAL '1 minute' * $2
          AND status = 'COMPLETED'
      `, [phoneNumber, timeWindowMinutes]);

      const callCount = result.rows[0].call_count;
      const threshold = 10; // Threshold for suspicious activity

      return {
        callCount,
        isSuspicious: callCount > threshold,
        threshold
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = VoiceGuardrailsService;
