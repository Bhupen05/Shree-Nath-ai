const test = require('node:test');
const assert = require('node:assert/strict');

const { hasPermission } = require('../../src/lib/permission');

test('hasPermission supports exact permission', () => {
  assert.equal(hasPermission(['billing:read'], 'billing:read'), true);
  assert.equal(hasPermission(['billing:read'], 'billing:write'), false);
});

test('hasPermission supports scope wildcard', () => {
  assert.equal(hasPermission(['inventory:*'], 'inventory:write'), true);
  assert.equal(hasPermission(['inventory:*'], 'inventory:read'), true);
  assert.equal(hasPermission(['inventory:*'], 'billing:read'), false);
});

test('hasPermission supports global wildcard', () => {
  assert.equal(hasPermission(['*'], 'billing:write'), true);
  assert.equal(hasPermission(['*'], 'customers:read'), true);
});

test('hasPermission handles invalid permissions payload', () => {
  assert.equal(hasPermission(null, 'billing:read'), false);
  assert.equal(hasPermission(undefined, 'billing:read'), false);
});
