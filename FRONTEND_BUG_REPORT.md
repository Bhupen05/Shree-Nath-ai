# Frontend Bug Report - SHREE-NATH ERP

**Date**: April 19, 2026
**Severity Levels**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 CRITICAL BUGS (Must Fix Before Production)

### 1. **AuthContext Provider Not Wrapping App**
**File**: `src/main.jsx`
**Severity**: 🔴 CRITICAL
**Impact**: App will crash with "useAuth must be used within an AuthProvider" error

**Problem**:
```jsx
// CURRENT (BROKEN):
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PAGES TRY TO USE:
import { useAuth } from '../context/AuthContext'
const { loginUser } = useAuth()  // ❌ FAILS - no provider
```

**Affected Components**:
- ❌ LoginPage.jsx (line 8)
- ❌ RegisterPage.jsx (line 8)

**Fix**: Wrap App with AuthProvider
```jsx
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
```

---

### 2. **Duplicate Authentication Logic**
**Files**: `src/App.jsx` vs `src/context/AuthContext.jsx`
**Severity**: 🔴 CRITICAL
**Impact**: Two competing auth systems, state inconsistency, authentication flow breaks

**Problem**:
```jsx
// App.jsx handles auth:
const [user, setUser] = useState(null)
const handleLogin = async () => { 
  const data = await login(credentials)
  saveToken(data.token)
  setUser(data.user)
}

// AuthContext also handles auth:
const [user, setUser] = useState(null)
const loginUser = useCallback(async (payload) => {
  const data = await login(payload)
  saveToken(data.token)
  setUser(data.user)
  return data
})

// Pages use AuthContext, but App doesn't
```

**Fix**:
1. Remove auth logic from App.jsx
2. Make App.jsx use AuthContext provider values
3. Keep AuthContext as single source of truth
4. Or keep only App.jsx auth logic and remove AuthContext

---

### 3. **Routing System Not Implemented**
**File**: `src/App.jsx`
**Severity**: 🔴 CRITICAL
**Impact**: LoginPage/RegisterPage/ProfilePage routing won't work, tab-based navigation only

**Problem**:
```jsx
// App.jsx uses tab-based navigation:
const [activeTab, setActiveTab] = useState('billing')
case 'billing': return <Billing />
case 'dashboard': return <Dashboard />

// But pages use React Router:
// LoginPage.jsx:
const navigate = useNavigate()
navigate('/dashboard')  // ❌ No router setup

// RegisterPage.jsx:
<Link to="/register">Create account</Link>  // ❌ No router
```

**Missing**: 
- No BrowserRouter in main.jsx
- No Routes setup
- No Route definitions

**Fix**: Implement React Router
```jsx
// main.jsx
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  </BrowserRouter>
)

// App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardLayout from './pages/DashboardLayout'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/*" element={<DashboardLayout />} />
    </Routes>
  )
}
```

---

## 🟠 HIGH PRIORITY BUGS

### 4. **Missing Error Handling in API Calls**
**Files**: Multiple component files
**Severity**: 🟠 HIGH
**Impact**: Network errors not properly handled, UI doesn't show errors

**Problem** (Example from Billing.jsx):
```jsx
useEffect(() => {
  const run = async () => {
    try {
      const [customerData, partData, billData] = await Promise.all([
        fetchCustomers(),
        fetchInventoryParts(),
        fetchBills(),
      ])
      // ✅ Good error handling
    } catch (loadError) {
      // ❌ Error set but no retry mechanism
      setError(loadError.message || 'Unable to load billing data')
    }
  }
}, [])
```

**Fix**: Add retry mechanism
```jsx
const [retryCount, setRetryCount] = useState(0)

const loadBillingData = async () => {
  try {
    // ... fetch logic
  } catch (loadError) {
    if (retryCount < 3) {
      setTimeout(() => setRetryCount(prev => prev + 1), 2000)
    } else {
      setError(loadError.message)
    }
  }
}

useEffect(() => {
  loadBillingData()
}, [retryCount])
```

---

### 5. **Offline Queue Not Flushing Automatically**
**File**: `src/offlineQueue.js`
**Severity**: 🟠 HIGH
**Impact**: Queued requests may not sync when connection restored

**Problem**:
```jsx
export async function flushOfflineQueue({ requestAdapter }) {
  const pending = getPendingRequests()
  
  // ❌ ISSUE: requestAdapter not connected to actual API requests
  // setupOfflineSync() is called but flushOfflineQueue needs proper adapter
}

// In App.jsx:
// No call to setupOfflineSync()
// No initialization of offline sync mechanism
```

**Fix**: Initialize offline sync properly
```jsx
// App.jsx or main.jsx
import { setupOfflineSync } from './offlineQueue'
import { request } from './auth' // or create adapter

useEffect(() => {
  const cleanup = setupOfflineSync({
    requestAdapter: async (path, options) => {
      return fetch(path, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          ...options.headers
        },
        ...options
      }).then(r => r.json())
    },
    onSynced: (result) => {
      console.log('Synced:', result)
    }
  })
  
  return cleanup
}, [])
```

---

### 6. **Missing Loading State in Components**
**Files**: `src/components/Customers.jsx`, `src/components/Inventory.jsx`
**Severity**: 🟠 HIGH
**Impact**: Users don't know data is loading, appears frozen

**Problem**:
```jsx
// Customers.jsx
const [customers, setCustomers] = useState([])
const [error, setError] = useState('')
const [message, setMessage] = useState('')
// ❌ NO LOADING STATE

useEffect(() => {
  const run = async () => {
    try {
      const data = await fetchCustomers()
      setCustomers(data.items || [])
    } catch (loadError) {
      setError(...)
    }
  }
  run()
})

// In JSX: No loading indicator shown
```

**Fix**: Add loading state
```jsx
const [customers, setCustomers] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  const run = async () => {
    setLoading(true)
    try {
      const data = await fetchCustomers()
      setCustomers(data.items || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }
  run()
}, [])

// In JSX:
{loading && <p>Loading customers...</p>}
{error && <p className="error">{error}</p>}
{!loading && <CustomersList data={customers} />}
```

---

## 🟡 MEDIUM PRIORITY BUGS

### 7. **Missing Dependency Arrays in useEffect**
**File**: `src/App.jsx`
**Severity**: 🟡 MEDIUM
**Impact**: Potential infinite loops or missed updates

**Problem**:
```jsx
// Line 101 - useEffect for loading settings
useEffect(() => {
  // ... loadSettings()
  loadSettings()
  return () => {
    cancelled = true
  }
}, [user])  // ✅ Good - depends on user

// But other effects might be missing dependencies
```

**Audit needed** for all useEffect hooks to ensure proper dependency arrays.

---

### 8. **No Form Validation Feedback**
**File**: `src/components/Inventory.jsx`
**Severity**: 🟡 MEDIUM
**Impact**: Users can submit invalid forms, confusing errors

**Problem**:
```jsx
const handleCreatePart = async () => {
  setError('')
  setMessage('')

  try {
    // No validation before API call
    await createPart({
      sku: newPart.sku,
      name: newPart.name,
      // ... other fields
    })
  } catch (loadError) {
    setError(loadError.message)
  }
}

// No field-level validation
// No required field checks
```

**Fix**: Add validation
```jsx
const validate = () => {
  const errors = {}
  
  if (!newPart.sku?.trim()) errors.sku = 'SKU required'
  if (!newPart.name?.trim()) errors.name = 'Name required'
  if (!newPart.costPrice || parseFloat(newPart.costPrice) <= 0) {
    errors.costPrice = 'Cost must be > 0'
  }
  
  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors)
    return false
  }
  return true
}

const handleCreatePart = async () => {
  if (!validate()) return
  // ... proceed with API call
}
```

---

### 9. **Global Error Handler Missing**
**File**: `src/App.jsx` and `src/main.jsx`
**Severity**: 🟡 MEDIUM
**Impact**: Unhandled errors appear in console, not shown to user

**Problem**:
```jsx
// No global error boundary
// No unhandled promise rejection handler
// No error.status 401 handling for automatic logout
```

**Fix**: Add error handling
```jsx
// main.jsx
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason)
  // Show user-friendly error
})

// Or add Error Boundary component
export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false)
  
  React.useEffect(() => {
    const handleError = (event) => {
      console.error('Error:', event.error)
      setHasError(true)
    }
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])
  
  if (hasError) {
    return <div>Something went wrong. Please refresh.</div>
  }
  
  return children
}
```

---

### 10. **API Response Null Safety Issues**
**File**: `src/components/Dashboard.jsx`
**Severity**: 🟡 MEDIUM
**Impact**: Potential null reference errors

**Problem**:
```jsx
const KPIItem = ({ icon, label, value }) => {
  return (
    <div className="kpi-card">
      {icon}  // ✅ OK
      <p>{label}</p>
      <p>{value}</p>  // ✅ OK
    </div>
  )
}

// In render:
<KPIItem icon={<TrendingUp size={20} />} 
         label="Users" 
         value={loading ? '...' : String(kpis?.users_count ?? 0)} />

// Issue: If kpis is null and API fails, display might be confusing
```

---

## 🟢 LOW PRIORITY (Nice to Have)

### 11. **Missing TypeScript/PropTypes**
**Severity**: 🟢 LOW
**Impact**: No type checking, potential runtime errors

**Suggestion**: Add PropTypes or TypeScript for better type safety

---

## Summary of Required Fixes

| Priority | Issue | Fix Effort | Impact |
|----------|-------|-----------|--------|
| 🔴 CRITICAL | AuthContext not wrapped | 15 min | App crashes |
| 🔴 CRITICAL | Duplicate auth logic | 30 min | State mess |
| 🔴 CRITICAL | No routing setup | 45 min | Navigation broken |
| 🟠 HIGH | Offline sync not initialized | 20 min | Data loss |
| 🟠 HIGH | Missing loading states | 60 min | Poor UX |
| 🟠 HIGH | No error retry logic | 30 min | Failed requests |
| 🟡 MEDIUM | Form validation | 40 min | Bad data |
| 🟡 MEDIUM | Global error handler | 20 min | Poor debugging |
| 🟡 MEDIUM | useEffect deps | 30 min | Race conditions |
| 🟢 LOW | Type safety | 60 min | Better DX |

---

## Recommended Fix Order

1. **First** (Day 1): Fix critical bugs #1-3 (1-2 hours)
2. **Second** (Day 1): Fix high priority #4-6 (2-3 hours)
3. **Third** (Day 2): Fix medium priority #7-10 (2-3 hours)
4. **Fourth** (Day 2): Add tests to prevent regression

---

## Testing After Fixes

```bash
# After fixes, run:
npm run build  # Should have no errors
npm run lint   # Should have no warnings
npm run dev    # Should start without errors

# Manual testing:
1. Access http://localhost:5173
2. Register new user
3. Login with credentials
4. Navigate through all tabs
5. Go offline (DevTools Network > Offline)
6. Create a bill (should queue)
7. Go online (DevTools Network > Online)
8. Verify bill was synced
```

---

**Generated**: April 19, 2026
**Status**: 10 Bugs Found - 3 Critical, 3 High, 3 Medium, 1 Low

