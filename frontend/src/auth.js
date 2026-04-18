import { enqueueOfflineRequest } from './offlineQueue'

const TOKEN_KEY = 'auth_token'
export const API_BASE_URL = ''

const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/password-reset/request',
  '/api/auth/password-reset/confirm',
  '/api/health',
])

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function hasPermission(grantedPermissions, requiredPermission) {
  if (!Array.isArray(grantedPermissions)) {
    return false
  }

  if (
    grantedPermissions.includes('*') ||
    grantedPermissions.includes(requiredPermission)
  ) {
    return true
  }

  const scope = requiredPermission.split(':')[0]
  return grantedPermissions.includes(`${scope}:*`)
}

async function request(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const isMutation = !['GET', 'HEAD'].includes(method)
  const token = getToken()

  if (!token && !PUBLIC_API_PATHS.has(path)) {
    const error = new Error('Session expired. Please sign in again.')
    error.status = 401
    error.code = 'AUTH_REQUIRED'
    throw error
  }

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  if (!navigator.onLine && isMutation) {
    enqueueOfflineRequest({
      path,
      method,
      headers,
      body: options.body,
    })

    return {
      message: 'You are offline. Request queued and will sync automatically when online.',
      queued: true,
      offline: true,
    }
  }

  const response = await fetch(path, {
    headers,
    ...options,
  }).catch((error) => {
    if (isMutation) {
      enqueueOfflineRequest({
        path,
        method,
        headers,
        body: options.body,
      })

      return {
        ok: true,
        status: 202,
        text: async () => JSON.stringify({
          message: 'Network unavailable. Request queued for reconnect sync.',
          queued: true,
          offline: true,
        }),
      }
    }

    throw error
  })

  const bodyText = await response.text()
  let payload = null

  if (bodyText) {
    try {
      payload = JSON.parse(bodyText)
    } catch {
      payload = { message: bodyText }
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
    }

    const error = new Error(payload?.message || 'Request failed')
    error.status = response.status
    error.code = payload?.code
    throw error
  }

  return payload
}

export function replayQueuedRequest(path, options = {}) {
  return request(path, { ...options, _replay: true })
}

export function register(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function login(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getProfile() {
  return request('/api/auth/me')
}

export function logout() {
  return request('/api/auth/logout', {
    method: 'POST',
  })
}

export function fetchDashboardKpis() {
  return request('/api/dashboard/kpis')
}

export function fetchInventoryParts() {
  return request('/api/inventory/parts')
}

export function fetchBills() {
  return request('/api/billing/bills')
}

export function fetchCustomers() {
  return request('/api/parties/customers')
}

export function createCustomer(payload) {
  return request('/api/parties/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCustomer(id, payload) {
  return request(`/api/parties/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteCustomer(id) {
  return request(`/api/parties/customers/${id}`, {
    method: 'DELETE',
  })
}

export function fetchSuppliers() {
  return request('/api/parties/suppliers')
}

export function createSupplier(payload) {
  return request('/api/parties/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSupplier(id, payload) {
  return request(`/api/parties/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteSupplier(id) {
  return request(`/api/parties/suppliers/${id}`, {
    method: 'DELETE',
  })
}

export function createBill(payload) {
  return request('/api/billing/bills', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getBillDetail(id) {
  return request(`/api/billing/bills/${id}`)
}

export function confirmBill(id) {
  return request(`/api/billing/bills/${id}/confirm`, {
    method: 'POST',
  })
}

export function cancelBill(id) {
  return request(`/api/billing/bills/${id}/cancel`, {
    method: 'POST',
  })
}

export function addBillPayment(id, payload) {
  return request(`/api/billing/bills/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createPart(payload) {
  return request('/api/inventory/parts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updatePart(id, payload) {
  return request(`/api/inventory/parts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function createStockAdjustment(payload) {
  return request('/api/inventory/stock/adjustments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createStockTransfer(payload) {
  return request('/api/inventory/stock/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchLocationTree() {
  return request('/api/inventory/locations/tree')
}

export function queryVoiceAgent(payload) {
  return request('/api/ai/voice/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getSettings() {
  return request('/api/settings')
}

export function updateSettings(payload) {
  return request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function downloadInvoicePdf(id) {
  const token = getToken()
  if (!token) {
    const error = new Error('Session expired. Please sign in again.')
    error.status = 401
    throw error
  }

  const response = await fetch(`/api/billing/bills/${id}/invoice`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
    }
    const bodyText = await response.text()
    throw new Error(bodyText || 'Unable to download invoice')
  }

  return response.blob()
}

// ============================================================================
// Employee Management API Helpers
// ============================================================================

export function fetchEmployees() {
  return request('/api/employees')
}

export function getEmployee(id) {
  return request(`/api/employees/${id}`)
}

export function createEmployee(payload) {
  return request('/api/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateEmployee(id, payload) {
  return request(`/api/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function assignEmployeeRole(employeeId, roleId) {
  return request(`/api/employees/${employeeId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roleId }),
  })
}

export function removeEmployeeRole(employeeId, roleId) {
  return request(`/api/employees/${employeeId}/roles/${roleId}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// Activity & Audit Logging API Helpers
// ============================================================================

export function fetchActivityLogs(limit = 50, offset = 0) {
  return request(`/api/activity-logs?limit=${limit}&offset=${offset}`)
}

export function fetchActivityLogsByEmployee(employeeId, limit = 50, offset = 0) {
  return request(`/api/activity-logs?employeeId=${employeeId}&limit=${limit}&offset=${offset}`)
}

// ============================================================================
// Demand Logging API Helpers
// ============================================================================

export function fetchDemandLogs(limit = 50, offset = 0) {
  return request(`/api/demand-logs?limit=${limit}&offset=${offset}`)
}

export function fetchDemandLogsByStatus(fulfilled, limit = 50, offset = 0) {
  return request(`/api/demand-logs?fulfilled=${fulfilled}&limit=${limit}&offset=${offset}`)
}

export function createDemandLog(payload) {
  return request('/api/demand-logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ============================================================================
// Stock Management API Helpers
// ============================================================================

export function createStockEntry(payload) {
  return request('/api/stock/entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchStockEntries(limit = 100) {
  return request(`/api/stock/entries?limit=${limit}`)
}

export function fetchStockEntriesByPart(partId, limit = 100) {
  return request(`/api/stock/entries?partId=${partId}&limit=${limit}`)
}

export function fetchStockLogs(limit = 100) {
  return request(`/api/stock/logs?limit=${limit}`)
}

export function fetchStockLogsByPart(partId, limit = 100) {
  return request(`/api/stock/logs?partId=${partId}&limit=${limit}`)
}
