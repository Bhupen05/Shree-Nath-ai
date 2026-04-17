const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

require('dotenv').config({ path: '.env', override: true });

const TEST_SERVER_PORT = process.env.TEST_SERVER_PORT || process.env.PORT || '5100';
const BASE_URL = `http://localhost:${TEST_SERVER_PORT}`;
const SERVER_START_TIMEOUT_MS = 30000;

let serverProcess = null;
let serverExited = false;
let serverExitCode = null;
let serverStartupLogs = '';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < SERVER_START_TIMEOUT_MS) {
    if (serverExited) {
      throw new Error(
        `Server exited before becoming ready (code: ${serverExitCode ?? 'unknown'}). ${serverStartupLogs}`
      );
    }

    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        return;
      }
    } catch (_error) {
      // Keep polling until timeout.
    }

    await delay(500);
  }

  throw new Error(`Server did not become ready in time. ${serverStartupLogs}`);
}

async function jsonRequest(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = { message: text };
    }
  }

  return { status: response.status, payload };
}

async function login(email, password) {
  const result = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  assert.equal(result.status, 200, `Login failed: ${JSON.stringify(result.payload)}`);
  return result.payload.token;
}

test.before(async () => {
  const env = {
    ...process.env,
    PORT: String(TEST_SERVER_PORT),
  };

  serverProcess = spawn('node', ['src/index.js'], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    serverStartupLogs += chunk.toString();
  });
  serverProcess.stderr.on('data', (chunk) => {
    serverStartupLogs += chunk.toString();
  });
  serverProcess.on('exit', (code) => {
    serverExited = true;
    serverExitCode = code;
  });

  await waitForServerReady();
});

test.after(async () => {
  if (!serverProcess) {
    return;
  }

  serverProcess.kill('SIGINT');
  await delay(700);
});

test('RBAC blocks VIEW_ONLY user from billing list endpoint', async () => {
  const userSuffix = Date.now();
  const email = `viewer.${userSuffix}@example.com`;
  const password = 'viewer12345';

  const registerResult = await jsonRequest('/api/auth/register', {
    method: 'POST',
    body: { name: 'Viewer User', email, password },
  });
  assert.equal(registerResult.status, 201, JSON.stringify(registerResult.payload));

  const token = await login(email, password);

  const billingResult = await jsonRequest('/api/billing/bills', {
    token,
  });
  assert.equal(billingResult.status, 403, JSON.stringify(billingResult.payload));
  assert.equal(billingResult.payload.code, 'INSUFFICIENT_PERMISSIONS');
});

test('billing confirmation updates stock ledger-backed quantity', async () => {
  const adminToken = await login(
    process.env.ADMIN_EMAIL || 'admin@local.test',
    process.env.ADMIN_PASSWORD || 'admin12345'
  );

  const suffix = Date.now();

  const room = await jsonRequest('/api/inventory/locations/rooms', {
    method: 'POST',
    token: adminToken,
    body: { name: `QA Room ${suffix}` },
  });
  assert.equal(room.status, 201, JSON.stringify(room.payload));

  const cabinet = await jsonRequest('/api/inventory/locations/cabinets', {
    method: 'POST',
    token: adminToken,
    body: { roomId: room.payload.room.id, name: `QA Cabinet ${suffix}` },
  });
  assert.equal(cabinet.status, 201, JSON.stringify(cabinet.payload));

  const section = await jsonRequest('/api/inventory/locations/sections', {
    method: 'POST',
    token: adminToken,
    body: { cabinetId: cabinet.payload.cabinet.id, name: `QA Section ${suffix}` },
  });
  assert.equal(section.status, 201, JSON.stringify(section.payload));

  const part = await jsonRequest('/api/inventory/parts', {
    method: 'POST',
    token: adminToken,
    body: {
      sku: `QA-SKU-${suffix}`,
      name: `QA Part ${suffix}`,
      sellingPrice: 120,
      costPrice: 80,
      reorderThreshold: 1,
      sectionId: section.payload.section.id,
    },
  });
  assert.equal(part.status, 201, JSON.stringify(part.payload));

  const stockSeed = await jsonRequest('/api/inventory/stock/adjustments', {
    method: 'POST',
    token: adminToken,
    body: {
      partId: part.payload.part.id,
      sectionId: section.payload.section.id,
      quantityDelta: 10,
      reason: 'test seed',
    },
  });
  assert.equal(stockSeed.status, 201, JSON.stringify(stockSeed.payload));

  const customer = await jsonRequest('/api/parties/customers', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `QA Customer ${suffix}`,
      email: `qa.customer.${suffix}@example.com`,
      phone: '9999999990',
      creditLimit: 10000,
    },
  });
  assert.equal(customer.status, 201, JSON.stringify(customer.payload));

  const bill = await jsonRequest('/api/billing/bills', {
    method: 'POST',
    token: adminToken,
    body: {
      billType: 'SALE',
      partyId: customer.payload.customer.id,
      items: [
        {
          partId: part.payload.part.id,
          quantity: 2,
          unitPrice: 100,
        },
      ],
    },
  });
  assert.equal(bill.status, 201, JSON.stringify(bill.payload));

  const confirm = await jsonRequest(`/api/billing/bills/${bill.payload.bill.id}/confirm`, {
    method: 'POST',
    token: adminToken,
  });
  assert.equal(confirm.status, 200, JSON.stringify(confirm.payload));

  const partDetail = await jsonRequest(`/api/inventory/parts/${part.payload.part.id}`, {
    token: adminToken,
  });
  assert.equal(partDetail.status, 200, JSON.stringify(partDetail.payload));
  assert.equal(partDetail.payload.part.current_stock, 8);
});

test('E2E flow register -> login -> bill -> payment', async () => {
  const adminToken = await login(
    process.env.ADMIN_EMAIL || 'admin@local.test',
    process.env.ADMIN_PASSWORD || 'admin12345'
  );

  const suffix = Date.now() + 1000;
  const userEmail = `e2e.user.${suffix}@example.com`;
  const userPassword = 'e2euser123';

  const registerResult = await jsonRequest('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'E2E User',
      email: userEmail,
      password: userPassword,
    },
  });
  assert.equal(registerResult.status, 201, JSON.stringify(registerResult.payload));

  const userToken = await login(userEmail, userPassword);
  assert.ok(userToken);

  const room = await jsonRequest('/api/inventory/locations/rooms', {
    method: 'POST',
    token: adminToken,
    body: { name: `E2E Room ${suffix}` },
  });
  assert.equal(room.status, 201, JSON.stringify(room.payload));

  const cabinet = await jsonRequest('/api/inventory/locations/cabinets', {
    method: 'POST',
    token: adminToken,
    body: { roomId: room.payload.room.id, name: `E2E Cabinet ${suffix}` },
  });
  assert.equal(cabinet.status, 201, JSON.stringify(cabinet.payload));

  const section = await jsonRequest('/api/inventory/locations/sections', {
    method: 'POST',
    token: adminToken,
    body: { cabinetId: cabinet.payload.cabinet.id, name: `E2E Section ${suffix}` },
  });
  assert.equal(section.status, 201, JSON.stringify(section.payload));

  const part = await jsonRequest('/api/inventory/parts', {
    method: 'POST',
    token: adminToken,
    body: {
      sku: `E2E-SKU-${suffix}`,
      name: `E2E Part ${suffix}`,
      sellingPrice: 150,
      costPrice: 90,
      reorderThreshold: 1,
      sectionId: section.payload.section.id,
    },
  });
  assert.equal(part.status, 201, JSON.stringify(part.payload));

  const seedStock = await jsonRequest('/api/inventory/stock/adjustments', {
    method: 'POST',
    token: adminToken,
    body: {
      partId: part.payload.part.id,
      sectionId: section.payload.section.id,
      quantityDelta: 5,
      reason: 'e2e seed',
    },
  });
  assert.equal(seedStock.status, 201, JSON.stringify(seedStock.payload));

  const customer = await jsonRequest('/api/parties/customers', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `E2E Customer ${suffix}`,
      email: `e2e.customer.${suffix}@example.com`,
      phone: '9999999988',
      creditLimit: 5000,
    },
  });
  assert.equal(customer.status, 201, JSON.stringify(customer.payload));

  const bill = await jsonRequest('/api/billing/bills', {
    method: 'POST',
    token: adminToken,
    body: {
      billType: 'SALE',
      partyId: customer.payload.customer.id,
      items: [
        {
          partId: part.payload.part.id,
          quantity: 1,
          unitPrice: 300,
        },
      ],
    },
  });
  assert.equal(bill.status, 201, JSON.stringify(bill.payload));

  const confirm = await jsonRequest(`/api/billing/bills/${bill.payload.bill.id}/confirm`, {
    method: 'POST',
    token: adminToken,
  });
  assert.equal(confirm.status, 200, JSON.stringify(confirm.payload));

  const payment = await jsonRequest(`/api/billing/bills/${bill.payload.bill.id}/payments`, {
    method: 'POST',
    token: adminToken,
    body: {
      amount: 300,
      paymentMode: 'CASH',
      referenceNumber: `E2E-${suffix}`,
    },
  });
  assert.equal(payment.status, 201, JSON.stringify(payment.payload));
  assert.equal(payment.payload.bill.status, 'PAID');
});
