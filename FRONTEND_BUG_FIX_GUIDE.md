# Frontend Bug Fix Implementation Guide

**Date**: April 19, 2026
**Priority**: 🔴 CRITICAL - 3 Critical Bugs to Fix

---

## 🔴 BUG #1: Fix AuthContext Not Wrapped

### Current Code (BROKEN)
**File**: `src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializePWA } from './pwa.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### Fixed Code
**File**: `src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { initializePWA } from './pwa.js'

// Initialize PWA on app startup
initializePWA().then((success) => {
  if (success) {
    console.log('[App] PWA initialized successfully');
  } else {
    console.warn('[App] PWA initialization completed with warnings');
  }
}).catch((err) => {
  console.error('[App] PWA initialization error:', err);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
```

### What Changed
- ✅ Added `AuthProvider` import
- ✅ Wrapped `App` with `AuthProvider`
- ✅ Maintains PWA initialization

### Test After Fix
```bash
npm run dev
# Should NOT see error: "useAuth must be used within an AuthProvider"
```

---

## 🔴 BUG #2: Fix Duplicate Auth Logic

### Solution: Keep AuthContext, Use in App.jsx

**Current Problem**: 
- App.jsx has its own auth logic
- AuthContext has separate auth logic
- LoginPage/RegisterPage use AuthContext
- App.jsx doesn't use AuthContext

### Option A: Use AuthContext Everywhere (RECOMMENDED)

**File**: `src/App.jsx`

```jsx
import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'  // ✅ NEW
import { useNavigate } from 'react-router-dom'  // ✅ NEW
// ... other imports

function App() {
  const navigate = useNavigate()
  const { user, ready, loginUser, logoutUser } = useAuth()  // ✅ NEW
  
  const [authError, setAuthError] = useState('')
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  // ... other state (settings, UI state)

  // ✅ Remove the old auth loading logic (it's now in AuthProvider)
  
  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthError('')

    try {
      await loginUser(credentials)
      navigate('/dashboard')  // Use router instead of tab
      setCredentials({ email: '', password: '' })
    } catch (error) {
      setAuthError(error.message || 'Unable to login')
    }
  }

  const handleLogout = async () => {
    logoutUser()
    navigate('/login')  // Use router
    setAuthError('')
  }

  // ✅ Remove if (!authReady) check - let router handle auth

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Connecting Session</p>
          <p className="mt-2 text-sm text-on-surface-variant">Checking authentication state with backend...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-3xl border border-outline-variant/10 bg-white p-8 shadow-xl">
          {/* ... login form */}
        </form>
      </div>
    )
  }

  return (
    <div className="main-layout">
      {/* Main app content when user is authenticated */}
      {/* Use routing or tab logic here */}
    </div>
  )
}

export default App
```

---

## 🔴 BUG #3: Implement React Router

### Step 1: Create Router Structure

**File**: `src/App.jsx`

```jsx
import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { Routes, Route, Navigate } from 'react-router-dom'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import ForbiddenPage from './pages/ForbiddenPage'
import DashboardLayout from './pages/DashboardLayout'

// Protected Route Component
const ProtectedRoute = ({ user, ready, children }) => {
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Public Route Component (redirects if already logged in)
const PublicRoute = ({ user, ready, children }) => {
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

function App() {
  const { user, ready } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute user={user} ready={ready}>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute user={user} ready={ready}>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user} ready={ready}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute user={user} ready={ready}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Error route */}
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Catch-all: redirect to dashboard or login */}
      <Route
        path="*"
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App
```

### Step 2: Add BrowserRouter to main.jsx

**File**: `src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'  // ✅ NEW
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { initializePWA } from './pwa.js'

// Initialize PWA on app startup
initializePWA().then((success) => {
  if (success) {
    console.log('[App] PWA initialized successfully')
  } else {
    console.warn('[App] PWA initialization completed with warnings')
  }
}).catch((err) => {
  console.error('[App] PWA initialization error:', err)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>  {/* ✅ NEW */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>  {/* ✅ NEW */}
  </StrictMode>,
)
```

### Step 3: Create DashboardLayout Component

**File**: `src/pages/DashboardLayout.jsx`

```jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
// ... other imports

import Dashboard from '../components/Dashboard'
import Billing from '../components/Billing'
import Inventory from '../components/Inventory'
import Customers from '../components/Customers'
import Settings from '../components/Settings'
import AIAgent from '../components/AIAgent'
import EmployeePage from './modules/EmployeePage'
import ActivityLogsPage from './modules/ActivityLogsPage'
import DemandLogsPage from './modules/DemandLogsPage'
import ReportsPage from './modules/ReportsPage'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { user, logoutUser } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // ... other state (settings, UI state)

  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'billing':
        return <Billing autoTaxEnabled={autoTaxEnabled} />
      case 'inventory':
        return <Inventory />
      case 'customers':
        return <Customers />
      case 'settings':
        return <Settings {...settingsProps} />
      case 'ai':
        return <AIAgent />
      case 'employees':
        return <EmployeePage onBack={() => setActiveTab('dashboard')} />
      case 'activity':
        return <ActivityLogsPage onBack={() => setActiveTab('dashboard')} />
      case 'demand':
        return <DemandLogsPage onBack={() => setActiveTab('dashboard')} />
      case 'reports':
        return <ReportsPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="main-layout">
      {/* Navigation tabs */}
      <nav className="tabs">
        <button onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button onClick={() => setActiveTab('billing')}>Billing</button>
        <button onClick={() => setActiveTab('inventory')}>Inventory</button>
        <button onClick={() => setActiveTab('customers')}>Customers</button>
        <button onClick={() => setActiveTab('settings')}>Settings</button>
        <button onClick={() => setActiveTab('ai')}>AI Agent</button>
        
        {/* User menu */}
        <button onClick={handleLogout}>Logout ({user?.name})</button>
      </nav>

      {/* Content area */}
      <main className="content">
        {renderContent()}
      </main>
    </div>
  )
}
```

### Step 4: Update LoginPage to Use Router

**File**: `src/pages/LoginPage.jsx`

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const { loginUser } = useAuth()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validate = () => {
    const nextErrors = {}

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await loginUser(form)
      navigate('/dashboard')  // ✅ Router navigation
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Welcome Back</p>
      <h1>Login</h1>
      <p className="sub">Use your credentials to continue.</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, email: e.target.value }))
              setFieldErrors((prev) => ({ ...prev, email: '' }))
            }}
            required
          />
          {fieldErrors.email && <small className="error">{fieldErrors.email}</small>}
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, password: e.target.value }))
              setFieldErrors((prev) => ({ ...prev, password: '' }))
            }}
            required
          />
          {fieldErrors.password && <small className="error">{fieldErrors.password}</small>}
        </label>

        {error && <p className="error-box">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="switch-auth">
        New here? <a href="/register">Create account</a>
      </p>
    </section>
  )
}

export default LoginPage
```

### Step 5: Update RegisterPage Similarly

**File**: `src/pages/RegisterPage.jsx` - Follow same pattern as LoginPage

---

## Testing the Fixes

### 1. Test AuthContext Wrapping
```bash
npm run dev
# Should NOT show: "useAuth must be used within an AuthProvider"
```

### 2. Test Authentication Flow
```
1. Go to http://localhost:5173/login
2. Enter test credentials
3. Should navigate to /dashboard
4. Click Logout
5. Should redirect to /login
```

### 3. Test Register Flow
```
1. Go to http://localhost:5173/register
2. Fill in registration form
3. Submit
4. Should navigate to /dashboard
```

### 4. Test Protected Routes
```
1. Clear localStorage (DevTools > Storage)
2. Go to http://localhost:5173/dashboard
3. Should redirect to /login
```

---

## Verify No Errors After Fix

```bash
# 1. Check for build errors
npm run build
# Should complete with no errors

# 2. Check for lint errors
npm run lint
# Should show no warnings about useAuth

# 3. Check console in browser
npm run dev
# F12 > Console
# Should have no red errors
```

---

## Summary of Changes

| File | Change | Type |
|------|--------|------|
| main.jsx | Add AuthProvider wrapper | Fix |
| main.jsx | Add BrowserRouter wrapper | Fix |
| App.jsx | Use useAuth hook | Fix |
| App.jsx | Implement Routes | Fix |
| App.jsx | Remove duplicate auth logic | Fix |
| DashboardLayout.jsx | Create new file | New |
| LoginPage.jsx | Update to use router | Fix |
| RegisterPage.jsx | Update to use router | Fix |

---

**Implementation Time**: ~2-3 hours
**Testing Time**: ~30 minutes
**Total**: ~3-3.5 hours

