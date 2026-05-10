// Shared API Client — used by all pages
export const API_BASE = 'http://localhost:5000/api'

export function getAuthToken() {
  return localStorage.getItem('auth_token')
}

export async function apiCall(endpoint, options = {}) {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    // Token expired or invalid — clear and redirect
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `API error: ${response.status}`)
  }

  return response.json()
}
