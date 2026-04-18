import { useEffect, useState } from 'react'
import {
  Bell,
  Bot,
  Eye,
  LayoutDashboard,
  Moon,
  Package,
  ReceiptIndianRupee,
  Search,
  Settings as SettingsIcon,
  Sun,
  Type,
  UserCircle,
  Users,
  Activity,
  ListChecks,
  UserPlus,
  FileText,
} from 'lucide-react'
import { motion as Motion } from 'motion/react'
import { clearToken, getProfile, getSettings, getToken, login, logout, saveToken, updateSettings } from './auth'
import AIAgent from './components/AIAgent'
import Billing from './components/Billing'
import Customers from './components/Customers'
import Dashboard from './components/Dashboard'
import Inventory from './components/Inventory'
import Settings from './components/Settings'
import EmployeePage from './pages/modules/EmployeePage'
import ActivityLogsPage from './pages/modules/ActivityLogsPage'
import DemandLogsPage from './pages/modules/DemandLogsPage'
import ReportsPage from './pages/modules/ReportsPage'

function App() {
  const [authReady, setAuthReady] = useState(false)
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [isDark, setIsDark] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [displayName, setDisplayName] = useState('Admin Operator')
  const [stationId, setStationId] = useState('STATION_04_IND_BENGALURU')
  const [autoTaxEnabled, setAutoTaxEnabled] = useState(true)
  const [pdfSignatureEnabled, setPdfSignatureEnabled] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [activeTab, setActiveTab] = useState('billing')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineQueueSize, setOfflineQueueSize] = useState(0)

  useEffect(() => {
    const loadProfile = async () => {
      const token = getToken()
      if (!token) {
        setAuthReady(true)
        return
      }

      try {
        const data = await getProfile()
        setUser(data.user)
      } catch {
        clearToken()
        setUser(null)
      } finally {
        setAuthReady(true)
      }
    }

    loadProfile()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', isHighContrast)
  }, [isHighContrast])

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`)
  }, [fontSize])

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false
    const loadSettings = async () => {
      try {
        const data = await getSettings()
        const settings = data.settings || {}

        if (cancelled) {
          return
        }

        setDisplayName(settings.display_name || user.name || 'Admin Operator')
        setStationId(settings.station_id || 'STATION_04_IND_BENGALURU')
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

  // Track online/offline status and offline queue
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('[App] Device is online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('[App] Device is offline')
    }

    const handleOfflineQueueSynced = (event) => {
      const { detail } = event
      console.log('[App] Offline queue synced:', detail)
      setOfflineQueueSize(detail.remaining)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offlineQueueSynced', handleOfflineQueueSynced)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offlineQueueSynced', handleOfflineQueueSynced)
    }
  }, [])

  const saveSettings = async () => {
    setSettingsSaving(true)
    setSettingsError('')
    setSettingsMessage('')

    try {
      const data = await updateSettings({
        displayName,
        fontSize,
        isHighContrast,
        isDark,
        autoTaxEnabled,
        pdfSignatureEnabled,
      })

      const settings = data.settings || {}
      setDisplayName(settings.display_name || displayName)
      setStationId(settings.station_id || stationId)
      setSettingsMessage('Settings saved successfully')
    } catch (error) {
      setSettingsError(error.message || 'Unable to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  const resetSettingsView = () => {
    setIsDark(false)
    setIsHighContrast(false)
    setFontSize(16)
    setAutoTaxEnabled(true)
    setPdfSignatureEnabled(false)
    setSettingsMessage('Unsaved changes reset')
    setSettingsError('')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'inventory':
        return <Inventory />
      case 'billing':
        return <Billing autoTaxEnabled={autoTaxEnabled} />
      case 'customers':
        return <Customers />
      case 'employees':
        return <EmployeePage onBack={() => setActiveTab('dashboard')} isLoading={false} />
      case 'activity':
        return <ActivityLogsPage onBack={() => setActiveTab('dashboard')} />
      case 'demand':
        return <DemandLogsPage onBack={() => setActiveTab('dashboard')} />
      case 'reports':
        return <ReportsPage />
      case 'ai':
        return <AIAgent />
      case 'settings':
        return (
          <Settings
            profile={{
              displayName,
              stationId,
              email: user?.email || '',
            }}
            preferences={{
              autoTaxEnabled,
              pdfSignatureEnabled,
              isDark,
              isHighContrast,
              fontSize,
            }}
            saving={settingsSaving}
            message={settingsMessage}
            error={settingsError}
            onChangeDisplayName={setDisplayName}
            onToggleAutoTax={() => setAutoTaxEnabled((prev) => !prev)}
            onTogglePdfSignature={() => setPdfSignatureEnabled((prev) => !prev)}
            onToggleDark={() => setIsDark((prev) => !prev)}
            onToggleHighContrast={() => setIsHighContrast((prev) => !prev)}
            onDecreaseFont={() => setFontSize((prev) => Math.max(12, prev - 1))}
            onIncreaseFont={() => setFontSize((prev) => Math.min(24, prev + 1))}
            onReset={resetSettingsView}
            onSave={saveSettings}
          />
        )
      default:
        return <Billing autoTaxEnabled={autoTaxEnabled} />
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthError('')

    try {
      const data = await login(credentials)
      saveToken(data.token)
      setUser(data.user)
      setCredentials({ email: '', password: '' })
    } catch (error) {
      setAuthError(error.message || 'Unable to login')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Ignore network/logout audit failures and clear local session.
    } finally {
      clearToken()
      setUser(null)
      setAuthError('')
      setSettingsMessage('')
      setSettingsError('')
    }
  }

  if (!authReady) {
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-3xl border border-outline-variant/10 bg-white p-8 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Backend Connected</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-on-surface">Sign in to continue</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Use your backend account to load live dashboard, inventory, billing, and customer data.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Email</label>
              <input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(event) => setCredentials((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-xl border border-outline-variant/20 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Password</label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-xl border border-outline-variant/20 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
          </div>

          {authError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{authError}</p> : null}

          <button type="submit" className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:opacity-90">
            Sign In
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface transition-colors duration-300">
      <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col gap-2 bg-surface-container-low p-6 shadow-xl shadow-blue-900/5 dark:bg-slate-900 dark:shadow-none">
        <div className="mb-8 p-4">
          <h1 className="text-2xl font-black tracking-tighter text-on-surface">SERENE.</h1>
          <div className="mt-1 h-1 w-12 rounded-full bg-primary" />
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Package size={20} />} label="Inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <SidebarItem icon={<ReceiptIndianRupee size={20} />} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <SidebarItem icon={<Users size={20} />} label="Customers" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
          <div className="my-2 border-t border-outline-variant/10" />
          <SidebarItem icon={<UserPlus size={20} />} label="Employees" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
          <SidebarItem icon={<Activity size={20} />} label="Activity" active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
          <SidebarItem icon={<ListChecks size={20} />} label="Demand" active={activeTab === 'demand'} onClick={() => setActiveTab('demand')} />
          <SidebarItem icon={<FileText size={20} />} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <div className="my-2 border-t border-outline-variant/10" />
          <SidebarItem icon={<Bot size={20} />} label="AI Agent" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
          <SidebarItem icon={<SettingsIcon size={20} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="mt-auto rounded-xl bg-surface-container-highest p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-white">
              <UserCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold">{displayName}</p>
              <p className="text-[10px] text-on-surface-variant">{stationId}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/10 bg-surface/80 px-8 backdrop-blur-md">
          <div className="flex w-96 items-center gap-4 rounded-lg bg-surface-container-low px-4 py-2">
            <Search size={18} className="text-on-surface-variant/50" />
            <input type="text" placeholder="Search invoices or orders..." className="w-full border-none bg-transparent text-sm outline-none placeholder:text-on-surface-variant/40" />
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-4 flex items-center gap-1 rounded-full border border-outline-variant/5 bg-white p-1 shadow-sm">
              <button onClick={() => setIsDark(!isDark)} className="rounded-full p-2 transition-colors hover:bg-surface-container" title="Toggle Dark Mode">
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => setIsHighContrast(!isHighContrast)}
                className={`rounded-full p-2 transition-colors hover:bg-surface-container ${isHighContrast ? 'text-primary' : ''}`}
                title="Toggle High Contrast"
              >
                <Eye size={18} />
              </button>
              <div className="ml-1 flex items-center gap-1 border-l border-outline-variant/20 px-2">
                <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="p-1 transition-colors hover:text-primary">
                  <Type size={14} />
                </button>
                <span className="w-4 text-center text-[10px] font-bold">{fontSize}</span>
                <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} className="p-1 transition-colors hover:text-primary">
                  <Type size={18} />
                </button>
              </div>
            </div>
            <button className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low">
              <Bell size={20} />
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              <UserCircle size={20} />
            </button>
          </div>
        </header>

        {!isOnline && (
          <div className="flex items-center justify-between border-b-2 border-warning bg-warning/10 px-8 py-3 text-warning">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-warning" />
              <span className="font-semibold">You are currently offline</span>
              {offlineQueueSize > 0 && (
                <span className="ml-2 text-xs text-warning/80">({offlineQueueSize} pending actions)</span>
              )}
            </div>
            <span className="text-xs text-warning/70">Your changes will sync when you're back online</span>
          </div>
        )}

        <div className="p-8 pb-16">
          <div className="mx-auto max-w-7xl">{renderContent()}</div>
        </div>
      </main>

      <Motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setActiveTab('ai')}
        className="group fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary text-white shadow-2xl shadow-primary/40"
      >
        <div className="absolute inset-0 scale-0 rounded-full bg-white/20 transition-transform duration-500 group-hover:scale-100" />
        <Bot size={28} className="relative z-10" />
      </Motion.button>
    </div>
  )
}

function SidebarItem({ icon, label, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-4 py-3.5 transition-all duration-300
        ${active ? 'border-l-4 border-primary bg-white font-bold text-primary shadow-sm' : 'text-on-surface-variant/70 hover:bg-white hover:text-primary hover:shadow-sm'}`}
    >
      <span className={`${active ? 'text-primary' : 'transition-colors group-hover:text-primary'}`}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  )
}

export default App
