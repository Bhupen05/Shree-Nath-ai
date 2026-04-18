import { motion as Motion } from 'motion/react'
import { Bell, Cloud, Database, Moon, Shield, Sun, Type, User } from 'lucide-react'

export default function Settings({
  profile,
  preferences,
  saving,
  message,
  error,
  onChangeDisplayName,
  onToggleAutoTax,
  onTogglePdfSignature,
  onToggleDark,
  onToggleHighContrast,
  onDecreaseFont,
  onIncreaseFont,
  onReset,
  onSave,
}) {
  return (
    <Motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mx-auto max-w-4xl space-y-12">
      <div className="flex flex-col gap-2">
        <div className="mb-2 inline-block w-fit rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary-container">
          System Preferences
        </div>
        <h2 className="text-4xl font-black leading-tight tracking-tighter text-on-surface md:text-6xl">Configurations.</h2>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="space-y-1">
          <SettingsNavLink icon={<User size={18} />} label="Profile" active />
          <SettingsNavLink icon={<Bell size={18} />} label="Notifications" />
          <SettingsNavLink icon={<Shield size={18} />} label="Security" />
          <SettingsNavLink icon={<Cloud size={18} />} label="Cloud Sync" />
          <SettingsNavLink icon={<Database size={18} />} label="Database" />
        </div>

        <div className="space-y-10 md:col-span-3">
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Station Identity</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Display Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(event) => onChangeDisplayName(event.target.value)}
                  className="w-full rounded-xl border border-outline-variant/10 bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Station ID</label>
                <div className="rounded-xl bg-surface-container px-4 py-3 text-sm font-bold text-primary">{profile.stationId}</div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
                <div className="rounded-xl bg-surface-container px-4 py-3 text-sm font-medium text-on-surface">{profile.email || 'Unknown'}</div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Regional Compliance</h3>
            <div className="space-y-4">
              <button type="button" onClick={onToggleAutoTax} className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/10 bg-white p-4 text-left shadow-sm">
                <div>
                  <p className="text-sm font-bold">Auto-Tax Calculation</p>
                  <p className="text-xs text-on-surface-variant/60">Apply 18% GST automatically to all line items</p>
                </div>
                <div className={`relative h-6 w-12 rounded-full p-1 ${preferences.autoTaxEnabled ? 'bg-primary' : 'bg-surface-container-high'}`}>
                  <div className={`h-4 w-4 rounded-full bg-white transition-all ${preferences.autoTaxEnabled ? 'translate-x-6' : ''}`} />
                </div>
              </button>

              <button type="button" onClick={onTogglePdfSignature} className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/10 bg-white p-4 text-left shadow-sm">
                <div>
                  <p className="text-sm font-bold">PDF Digital Signature</p>
                  <p className="text-xs text-on-surface-variant/60">Attach e-sign to generated invoices</p>
                </div>
                <div className={`relative h-6 w-12 rounded-full p-1 ${preferences.pdfSignatureEnabled ? 'bg-primary' : 'bg-surface-container-high'}`}>
                  <div className={`h-4 w-4 rounded-full bg-white transition-all ${preferences.pdfSignatureEnabled ? 'translate-x-6' : ''}`} />
                </div>
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Accessibility</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button type="button" onClick={onToggleDark} className="flex items-center justify-between rounded-2xl border border-outline-variant/10 bg-white p-4 text-left shadow-sm">
                <div>
                  <p className="text-sm font-bold">Dark Mode</p>
                  <p className="text-xs text-on-surface-variant/60">Apply low-light appearance</p>
                </div>
                {preferences.isDark ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-on-surface-variant" />}
              </button>

              <button type="button" onClick={onToggleHighContrast} className="flex items-center justify-between rounded-2xl border border-outline-variant/10 bg-white p-4 text-left shadow-sm">
                <div>
                  <p className="text-sm font-bold">High Contrast</p>
                  <p className="text-xs text-on-surface-variant/60">Increase text/background contrast</p>
                </div>
                <span className={`text-xs font-black uppercase ${preferences.isHighContrast ? 'text-primary' : 'text-on-surface-variant/60'}`}>{preferences.isHighContrast ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-outline-variant/10 bg-white p-4 shadow-sm">
              <div>
                <p className="text-sm font-bold">Base Font Size</p>
                <p className="text-xs text-on-surface-variant/60">Current: {preferences.fontSize}px</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onDecreaseFont} className="rounded-lg border border-outline-variant/20 p-2 hover:bg-surface-container">
                  <Type size={14} />
                </button>
                <button type="button" onClick={onIncreaseFont} className="rounded-lg border border-outline-variant/20 p-2 hover:bg-surface-container">
                  <Type size={18} />
                </button>
              </div>
            </div>
          </section>

          {message ? <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onReset} className="rounded-xl px-6 py-3 text-sm font-bold text-on-surface-variant transition-all hover:bg-surface-container-high">Revert Changes</button>
            <button type="button" disabled={saving} onClick={onSave} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </Motion.div>
  )
}

function SettingsNavLink({ icon, label, active = false }) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition-all ${
        active ? 'bg-white font-bold text-primary shadow-sm' : 'text-on-surface-variant/70 hover:bg-white hover:text-primary hover:shadow-sm'
      }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </div>
  )
}
