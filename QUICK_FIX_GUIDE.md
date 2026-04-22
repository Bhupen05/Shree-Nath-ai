# Quick Fix Guide - Priority Order

## 🔴 CRITICAL (Fix First - 1 hour)

### Fix #1: Catch-All Route Infinite Loop
**File:** `src/App.jsx`  
**Change lines 105-108 from:**
```jsx
<Route
  path="*"
  element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
/>
```

**To:**
```jsx
<Route
  path="*"
  element={
    !ready ? null : user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
  }
/>
```

**OR better - import and use LoadingScreen:**
```jsx
<Route
  path="*"
  element={
    !ready ? (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6 text-on-surface">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Connecting Session</p>
          <p className="mt-2 text-sm text-on-surface-variant">Checking authentication state with backend...</p>
        </div>
      </div>
    ) : user ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>
```

---

### Fix #2: Initialize Offline Sync
**File:** `src/App.jsx`  
**Change lines 56-63 from:**
```jsx
useEffect(() => {
  if (user) {
    console.log('[App] User authenticated, offline sync ready')
  }
}, [user])
```

**To:**
```jsx
import { setupOfflineSync } from './offlineQueue'
import { replayQueuedRequest } from './auth'

// Inside App component:
useEffect(() => {
  if (user && ready) {
    console.log('[App] User authenticated, initializing offline sync')
    
    const cleanup = setupOfflineSync({
      requestAdapter: replayQueuedRequest,
      onSynced: (result) => {
        console.log('[App] Offline queue synced:', result)
      },
    })

    return cleanup
  }
}, [user, ready])
```

---

### Fix #3: useCallback Dependencies (AuthContext)
**File:** `src/context/AuthContext.jsx`  
**Lines 35-39 and 41-45**

**Add dependencies to useCallback:**
```jsx
// Import auth functions at top
import { clearToken, getProfile, getToken, hasPermission, login, register, saveToken } from '../auth'

// Then useCallback becomes (keeping [] is OK since these are module functions):
const loginUser = useCallback(async (payload) => {
  const data = await login(payload)
  saveToken(data.token)
  setUser(data.user)
  return data
}, [])

const registerUser = useCallback(async (payload) => {
  const data = await register(payload)
  saveToken(data.token)
  setUser(data.user)
  return data
}, [])
```

---

### Fix #4: Add Permission Checking to ProtectedRoute
**File:** `src/App.jsx`  
**Update ProtectedRoute component (lines 13-32):**

```jsx
function ProtectedRoute({ user, ready, requiredPermission, children }) {
  // Get can function from context if needed
  // For now, just check user exists
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6 text-on-surface">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Connecting Session</p>
          <p className="mt-2 text-sm text-on-surface-variant">Checking authentication state with backend...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // TODO: Add permission check when implemented
  // if (requiredPermission && !can(requiredPermission)) {
  //   return <Navigate to="/forbidden" replace />
  // }

  return children
}
```

---

## 🟠 HIGH PRIORITY (Fix Second - 1-2 hours)

### Fix #5: DashboardLayout Race Condition
**File:** `src/pages/DashboardLayout.jsx`  
**Lines 61-98**

Capture `user` reference inside async function:
```jsx
useEffect(() => {
  if (!user) {
    setDisplayName('Admin Operator')
    setStationId('STATION_04_IND_BENGALURU')
    return
  }

  let cancelled = false
  const loadSettings = async () => {
    try {
      const data = await getSettings()
      
      if (cancelled) {
        return
      }

      const settings = data.settings || {}
      // Use 'user' as captured at effect start time
      const displayNameValue = settings.display_name || user?.name || 'Admin Operator'
      const stationIdValue = settings.station_id || 'STATION_04_IND_BENGALURU'
      
      setDisplayName(displayNameValue)
      setStationId(stationIdValue)
      setIsDark(Boolean(settings.is_dark))
      setIsHighContrast(Boolean(settings.is_high_contrast))
      setFontSize(Number(settings.font_size || 16))
      setAutoTaxEnabled(Boolean(settings.auto_tax_enabled ?? true))
      setPdfSignatureEnabled(Boolean(settings.pdf_signature_enabled))
      setSettingsError('')
    } catch (error) {
      if (!cancelled) {
        setSettingsError(error.message || 'Unable to load settings')
      }
    }
  }

  loadSettings()

  return () => {
    cancelled = true
  }
}, [user])
```

---

### Fix #6: Extract Duplicate Loading UI
**File:** `src/App.jsx`  
**Create a reusable LoadingScreen:**

Instead of repeating the same HTML, extract to a variable or component:
```jsx
const LOADING_SCREEN = (
  <div className="flex min-h-screen items-center justify-center bg-surface p-6 text-on-surface">
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">Connecting Session</p>
      <p className="mt-2 text-sm text-on-surface-variant">Checking authentication state with backend...</p>
    </div>
  </div>
)

// Then use in both:
function ProtectedRoute({ user, ready, children }) {
  if (!ready) return LOADING_SCREEN
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ user, ready, children }) {
  if (!ready) return LOADING_SCREEN
  if (user) return <Navigate to="/dashboard" replace />
  return children
}
```

---

### Fix #7: Fix Default State Initialization
**File:** `src/pages/DashboardLayout.jsx`  
**Lines 39-56**

Change from:
```jsx
const [displayName, setDisplayName] = useState('Admin Operator')
const [stationId, setStationId] = useState('STATION_04_IND_BENGALURU')
```

To:
```jsx
const [displayName, setDisplayName] = useState('')  // Will be populated by useEffect
const [stationId, setStationId] = useState('')
```

Then in the JSX, show default if empty:
```jsx
<p className="text-xs font-bold">{displayName || 'Admin Operator'}</p>
<p className="text-[10px] text-on-surface-variant">{stationId || 'STATION_04_IND_BENGALURU'}</p>
```

---

## 🟡 MEDIUM PRIORITY (Fix Third - 1-2 hours)

### Fix #8: Add Settings Persistence for Each Change
**File:** `src/pages/DashboardLayout.jsx`  
**Update toggle handlers:**

```jsx
const handleToggleDark = async () => {
  const newValue = !isDark
  setIsDark(newValue)
  
  try {
    await updateSettings({ isDark: newValue })
    setSettingsError('')
  } catch (error) {
    setIsDark(!newValue)  // Revert
    setSettingsError('Failed to update dark mode')
  }
}

const handleToggleHighContrast = async () => {
  const newValue = !isHighContrast
  setIsHighContrast(newValue)
  
  try {
    await updateSettings({ isHighContrast: newValue })
    setSettingsError('')
  } catch (error) {
    setIsHighContrast(!newValue)  // Revert
    setSettingsError('Failed to update contrast')
  }
}
```

Then update the JSX to use these handlers:
```jsx
<button onClick={handleToggleDark} className="...">
  {isDark ? <Sun size={18} /> : <Moon size={18} />}
</button>

<button onClick={handleToggleHighContrast} className="...">
  <Eye size={18} />
</button>
```

---

### Fix #9: Add Debouncing to Font Size Controls
**File:** `src/pages/DashboardLayout.jsx`  
**Update font size handlers:**

```jsx
import { useCallback } from 'react'

// Add debounced update function
const [fontSizeChangeTimeout, setFontSizeChangeTimeout] = useState(null)

const handleFontSizeChange = (newSize) => {
  setFontSize(newSize)
  
  // Clear previous timeout
  if (fontSizeChangeTimeout) {
    clearTimeout(fontSizeChangeTimeout)
  }
  
  // Set new timeout to save after user stops adjusting
  const timeout = setTimeout(() => {
    updateSettings({ fontSize: newSize }).catch(() => {
      setSettingsError('Failed to save font size')
    })
  }, 500)  // Save 500ms after user stops clicking
  
  setFontSizeChangeTimeout(timeout)
}
```

---

### Fix #10: Add Error Boundary
**File:** `src/pages/DashboardLayout.jsx`  
**Top of component, wrap renderContent:**

```jsx
import { useState } from 'react'

// Add error boundary state
const [renderError, setRenderError] = useState(null)

// Error fallback UI
const renderContentWithErrorBoundary = () => {
  try {
    if (renderError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-error">Something went wrong</h2>
          <p className="text-sm text-on-surface-variant mt-2">{renderError.message}</p>
          <button 
            onClick={() => setRenderError(null)}
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
          >
            Try Again
          </button>
        </div>
      )
    }
    return renderContent()
  } catch (error) {
    setRenderError(error)
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-error">Component Error</h2>
        <p className="text-sm text-on-surface-variant mt-2">{error.message}</p>
        <button 
          onClick={() => setRenderError(null)}
          className="mt-4 px-4 py-2 bg-primary text-white rounded"
        >
          Retry
        </button>
      </div>
    )
  }
}

// In JSX:
<div className="mx-auto max-w-7xl">{renderContentWithErrorBoundary()}</div>
```

---

## Estimated Total Fix Time

| Priority | Count | Time | Total |
|----------|-------|------|-------|
| Critical | 4 | 15-20 min each | 1 hour |
| High | 3 | 15-25 min each | 1-1.5 hours |
| Medium | 3 | 15-30 min each | 1-1.5 hours |
| **Total** | **10** | - | **3-4 hours** |

## Testing After Fixes

1. ✅ Build passes: `npm run build`
2. ✅ App starts: `npm run dev`
3. ✅ Login flow works
4. ✅ Navigation works
5. ✅ Offline mode works
6. ✅ Settings save correctly
7. ✅ No console errors
8. ✅ No infinite redirects
9. ✅ Theme toggles persist
10. ✅ Font size changes work
