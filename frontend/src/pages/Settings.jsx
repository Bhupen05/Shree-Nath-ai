import { useState, useEffect } from 'react'
import {
  Bell,
  Info,
  User,
  Sliders,
  BellRing,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  MessageSquare,
  Smartphone,
  Search,
  Loader,
  CheckCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { apiCall } from '../lib/apiClient'

// Sub-components
const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-4 transition-all duration-300 rounded-xl group ${
      active
        ? 'bg-surface text-primary font-bold border-l-4 border-primary shadow-sm'
        : 'text-on-surface-variant font-medium hover:bg-surface-container-high'
    }`}
  >
    <Icon size={18} className={`${active ? 'text-primary' : 'text-on-surface-variant group-hover:translate-x-0.5 transition-transform'}`} />
    <span>{label}</span>
  </button>
)

const ConfigRow = ({ label, value }) => (
  <div className="flex justify-between items-center bg-surface p-3.5 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-outline-variant/10">
    <span className="text-sm font-bold text-on-surface">{label}</span>
    <span className="text-[10px] font-mono bg-surface-container-high text-primary px-2.5 py-1.5 rounded-lg font-bold tracking-tight">{value}</span>
  </div>
)

const ToggleRow = ({ icon: Icon, title, desc, color, bgColor, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container-low rounded-xl transition-colors group border border-outline-variant/10">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 ${bgColor} flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-sm font-bold text-on-surface leading-tight">{title}</p>
        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{desc}</p>
      </div>
    </div>
    <button onClick={() => onChange(!checked)} className="relative inline-flex items-center cursor-pointer">
      <div className={`w-11 h-6 rounded-full transition-colors duration-200 outline-none ${checked ? 'bg-primary' : 'bg-outline-variant/50'}`}>
        <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform duration-200 shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  </div>
)

const SecurityStatusRow = ({ label, status, active = false }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
    active ? 'bg-primary/10 border-primary/20' : 'bg-surface-container/50 border-outline-variant/10'
  }`}>
    <span className="text-sm font-medium text-on-surface">{label}</span>
    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${
      active ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'
    }`}>
      {status}
    </span>
  </div>
)

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Profile')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [whatsappAlerts, setWhatsappAlerts] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [autoTax, setAutoTax] = useState(true)
  const [pdfSignature, setPdfSignature] = useState(false)
  const [stationId, setStationId] = useState('')

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiCall('/settings')
      if (response.settings) {
        const s = response.settings
        setDisplayName(s.display_name || user?.name || '')
        setStationId(s.station_id || '')
        setIsDark(s.is_dark || false)
        setAutoTax(s.auto_tax_enabled !== false)
        setPdfSignature(s.pdf_signature_enabled || false)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      await apiCall('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: displayName || undefined,
          isDark,
          autoTaxEnabled: autoTax,
          pdfSignatureEnabled: pdfSignature,
        }),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const avatarSeed = encodeURIComponent(user?.name || 'default')

  return (
    <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-8 h-20 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex items-center gap-4 bg-surface-container-high/40 px-4 py-2.5 rounded-full flex-1 max-w-md transition-all focus-within:bg-surface-container-high/70 focus-within:shadow-sm">
          <Search size={18} className="text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search settings..."
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-on-surface-variant/50 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-6 ml-8">
          <div className="flex items-center gap-4">
            <button className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-background" />
            </button>
            <button className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-colors">
              <Info size={20} />
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold leading-none text-on-surface">{user?.name || 'User'}</p>
              <p className="text-[10px] text-on-surface-variant font-medium mt-1 uppercase tracking-widest">{user?.role || 'Staff'}</p>
            </div>
            <img
              src={`https://picsum.photos/seed/${avatarSeed}/128/128`}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-primary object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <section className="p-8 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h1 className="text-5xl font-black tracking-tighter text-on-surface mb-3">Settings & Configuration</h1>
            <p className="text-on-surface-variant max-w-2xl font-medium">
              Manage your account, configure system settings, notification preferences, and security protocols.
            </p>
          </motion.div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 rounded-xl bg-error/10 border border-error/20 p-4 text-sm font-medium text-error">{error}</div>
          )}

          {/* Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Tab Navigation */}
            <nav className="lg:col-span-3 flex flex-col gap-2">
              <TabButton active={activeTab === 'Profile'} onClick={() => setActiveTab('Profile')} icon={User} label="Profile" />
              <TabButton active={activeTab === 'Configuration'} onClick={() => setActiveTab('Configuration')} icon={Sliders} label="Configuration" />
              <TabButton active={activeTab === 'Notifications'} onClick={() => setActiveTab('Notifications')} icon={BellRing} label="Notifications" />
              <TabButton active={activeTab === 'Security'} onClick={() => setActiveTab('Security')} icon={ShieldCheck} label="Security" />
            </nav>

            {/* Content Grid */}
            <div className="lg:col-span-9 grid grid-cols-1 lg:grid-cols-6 gap-6">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full flex items-center justify-center h-64">
                    <Loader size={32} className="animate-spin text-primary" />
                  </motion.div>
                ) : activeTab === 'Profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="col-span-full grid grid-cols-1 lg:grid-cols-6 gap-6"
                  >
                    {/* Profile Form */}
                    <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-8 shadow-ambient border border-outline-variant/10">
                      <h3 className="text-lg font-black mb-8 text-on-surface tracking-tight">Administrative Profile</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Display Name</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your display name"
                            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 text-sm font-medium outline-none transition-all hover:bg-surface-container-low/80"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Operational ID</label>
                          <input
                            type="text"
                            value={stationId}
                            disabled
                            className="w-full border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 text-sm font-medium outline-none transition-all bg-surface-container-high/40 text-on-surface-variant/60 cursor-not-allowed font-mono"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Email Address</label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full border-none rounded-xl px-4 py-3 text-sm font-medium outline-none bg-surface-container-high/40 text-on-surface-variant/60 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Config */}
                    <div className="lg:col-span-2 bg-primary/10 border border-primary/20 rounded-2xl p-7 flex flex-col justify-between overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/20 transition-colors" />
                      <div className="relative z-10">
                        <h3 className="text-lg font-black mb-1 text-primary tracking-tight">Configuration</h3>
                        <p className="text-xs text-secondary mb-6 font-medium">Regional & Logistics Settings</p>
                        <div className="space-y-4">
                          <ConfigRow label="Currency" value="USD ($)" />
                          <ConfigRow label="Tax Rate" value="8.5% VAT" />
                          <ConfigRow label="Timezone" value="GMT-5" />
                        </div>
                      </div>
                      <button className="mt-8 text-primary font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all relative z-10">
                        Manage Full System <ArrowRight size={16} />
                      </button>
                    </div>

                    {/* Communication Channels */}
                    <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-8 shadow-ambient border border-outline-variant/10">
                      <div className="flex items-center gap-3 mb-8">
                        <BellRing className="text-secondary" size={20} />
                        <h3 className="text-lg font-black text-on-surface tracking-tight">Communication Channels</h3>
                      </div>
                      <div className="space-y-5">
                        <ToggleRow
                          icon={MessageSquare}
                          title="WhatsApp Alerts"
                          desc="Direct logistics updates"
                          color="text-[#25D366]"
                          bgColor="bg-[#25D366]/10"
                          checked={whatsappAlerts}
                          onChange={setWhatsappAlerts}
                        />
                        <ToggleRow
                          icon={Smartphone}
                          title="SMS Notifications"
                          desc="Critical system failures"
                          color="text-primary"
                          bgColor="bg-primary/10"
                          checked={smsNotifications}
                          onChange={setSmsNotifications}
                        />
                      </div>
                    </div>

                    {/* Security Protocols */}
                    <div className="lg:col-span-3 bg-primary text-white rounded-2xl p-8 relative overflow-hidden group shadow-lg shadow-primary/20">
                      <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary-container/30 rounded-full blur-3xl group-hover:opacity-50 transition-opacity" />
                      <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-8">
                          <ShieldCheck size={24} />
                          <h3 className="text-lg font-black">Security Protocols</h3>
                        </div>
                        <div className="space-y-4 flex-1">
                          <SecurityStatusRow label="Two-Factor Authentication" status="Active" active />
                          <SecurityStatusRow label="IP Restricted Access" status="Disabled" />
                        </div>
                        <div className="mt-8 flex items-center gap-4">
                          <button className="flex-1 bg-white text-primary py-3 rounded-xl font-bold text-sm hover:bg-surface-container-low transition-colors shadow-lg active:scale-95 duration-200">
                            Reset Password
                          </button>
                          <button className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors border border-white/10">
                            <RotateCcw size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!isLoading && activeTab === 'Configuration' && (
                  <motion.div
                    key="configuration"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="col-span-full bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/10"
                  >
                    <h3 className="text-lg font-black mb-8 text-on-surface tracking-tight">System Configuration</h3>
                    <div className="space-y-6 max-w-lg">
                      <ToggleRow
                        icon={Sliders}
                        title="Auto Tax Calculation"
                        desc="Automatically apply tax to new bills"
                        color="text-primary"
                        bgColor="bg-primary/10"
                        checked={autoTax}
                        onChange={setAutoTax}
                      />
                      <ToggleRow
                        icon={ShieldCheck}
                        title="PDF Signature Required"
                        desc="Require digital signature on PDF exports"
                        color="text-secondary"
                        bgColor="bg-secondary/10"
                        checked={pdfSignature}
                        onChange={setPdfSignature}
                      />
                    </div>
                  </motion.div>
                )}

                {!isLoading && activeTab !== 'Profile' && activeTab !== 'Configuration' && (
                  <motion.div
                    key="coming-soon"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full h-96 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-on-surface-variant"
                  >
                    <Sliders size={48} className="mb-4 opacity-20" />
                    <h3 className="text-xl font-black mb-1 text-on-surface">{activeTab} Interface</h3>
                    <p className="text-sm">Extended configuration module pending initialization.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Footer */}
              <div className="lg:col-span-6 mt-4 flex items-center justify-end gap-5 p-6 bg-surface-container-high/40 rounded-2xl border border-outline-variant/10 backdrop-blur-sm">
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <CheckCircle size={16} /> Settings saved successfully!
                  </div>
                )}
                <button
                  onClick={loadSettings}
                  disabled={isLoading || isSaving}
                  className="px-8 py-3 text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors active:scale-95"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="bg-linear-to-b from-primary to-primary-container px-12 py-3 text-white font-bold text-sm rounded-xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all hover:shadow-primary/30 disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving ? <Loader size={14} className="animate-spin" /> : null}
                  {isSaving ? 'Saving...' : 'Save System State'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
