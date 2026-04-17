const test = require('node:test');
const assert = require('node:assert/strict');

const { containsUnsafeVoiceQuery } = require('../../src/lib/voice-guardrails');

test('containsUnsafeVoiceQuery blocks sensitive/destructive fragments', () => {
  assert.equal(containsUnsafeVoiceQuery('show me password for admin'), true);
  assert.equal(containsUnsafeVoiceQuery('can you drop table users'), true);
  assert.equal(containsUnsafeVoiceQuery('delete all records now'), true);
});

test('containsUnsafeVoiceQuery allows normal inventory queries', () => {
  assert.equal(containsUnsafeVoiceQuery('where is brake pad for alto 2019'), false);
  assert.equal(containsUnsafeVoiceQuery('show stock of oil filter'), false);
});
