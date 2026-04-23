import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Download,
  Plus,
  Globe,
  ArrowRight,
  ShieldCheck,
  Activity,
  Loader,
  X,
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import SuppliersTable from '../components/SuppliersTable'

// API Configuration
const API_BASE = 'http://localhost:5000/api'

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    console.error(`API call failed for ${endpoint}:`, err)
    throw err
  }
}

function getAuthToken() {
  return localStorage.getItem('auth_token')
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

// Add Supplier Modal Component
function AddSupplierModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    category: 'General',
    status: 'Active',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.email) {
      setSubmitError('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)

      const response = await apiCall('/suppliers/add', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      if (response) {
        onClose()
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to add supplier')
      console.error('Supplier creation error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl bg-background rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-lowest p-6">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Supplier Management</p>
                  <h2 className="text-2xl font-black tracking-tight text-on-surface">Add New Supplier</h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Supplier Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Titan Heavy Industries"
                      className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary appearance-none outline-none cursor-pointer"
                    >
                      <option>General</option>
                      <option>Electronics</option>
                      <option>Machinery</option>
                      <option>Raw Materials</option>
                      <option>Logistics</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Contact Person</label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      placeholder="e.g. John Smith"
                      className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary appearance-none outline-none cursor-pointer"
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>On Hold</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="contact@supplier.com"
                      className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Supplier physical address"
                    className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-outline-variant/10 bg-surface-container-lowest p-6">
                {submitError && (
                  <div className="mb-4 text-sm font-medium text-error bg-error/10 border border-error/20 rounded-lg p-3">
                    {submitError}
                  </div>
                )}
                <div className="flex items-center justify-end gap-4">
                  <button
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-lg bg-secondary-container/30 px-6 py-2.5 text-sm font-bold text-primary transition-all hover:bg-secondary-container/50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="rounded-lg bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader size={16} className="animate-spin" /> : null}
                    {isSubmitting ? 'Adding...' : 'Add Supplier'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default function Suppliers() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [stats, setStats] = useState({
    fleetSuppliers: 0,
    reliabilityIndex: 0,
    pendingAudits: 0,
  })
  const [suppliers, setSuppliers] = useState([])

  useEffect(() => {
    const loadSuppliersData = async () => {
      try {
        setIsLoading(true)
        const response = await apiCall('/suppliers/metrics')
        
        if (response.data) {
          const data = response.data
          setStats({
            fleetSuppliers: data.stats?.fleetSuppliers || 0,
            reliabilityIndex: data.stats?.reliabilityIndex || 0,
            pendingAudits: data.stats?.pendingAudits || 0,
          })
          setSuppliers(data.suppliers || [])
        }
      } catch (err) {
        console.error('Error loading suppliers data:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadSuppliersData()
    const interval = setInterval(loadSuppliersData, 60000) // Refresh every 60 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-end justify-between"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            <span className="h-0.5 w-8 bg-primary" />
            Inventory Logistics
          </div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface">Suppliers Directory</h1>
          <p className="text-sm text-on-surface-variant">Managing {suppliers.length} active global logistical partners for SIBMS.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-surface-container-high px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-surface-container-low">
            <Download size={18} />
            Export List
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-linear-to-b from-primary to-primary-container px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-primary/20"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl bg-error-container/10 border border-error/20 p-4 text-on-error-container">
          <p className="text-sm font-medium">Unable to load suppliers data. Showing cached data.</p>
        </div>
      )}

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-12 gap-6"
      >
        <motion.div
          variants={itemVariants}
          className="col-span-12 rounded-2xl border-b-4 border-primary/20 bg-white p-6 shadow-sm lg:col-span-4"
        >
          <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Core Fleet Suppliers
          </p>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black text-primary">
              {isLoading ? <Loader size={24} className="animate-spin" /> : stats.fleetSuppliers}
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/10 text-primary">
              <Globe size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="rounded bg-primary-container/10 px-1.5 py-0.5 font-bold text-primary">Engine & Powertrain</span>
            <span className="text-on-surface-variant">Primary focus</span>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-12 rounded-2xl border-b-4 border-secondary/20 bg-white p-6 shadow-sm lg:col-span-5"
        >
          <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Supply Reliability Index
          </p>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black text-secondary">
              {isLoading ? <Loader size={24} className="animate-spin" /> : `${(stats.reliabilityIndex).toFixed(1)}%`}
            </span>
            <div className="flex items-end gap-1 h-8">
              <div className="h-4 w-2 animate-pulse rounded-full bg-secondary/20" />
              <div className="h-6 w-2 animate-pulse rounded-full bg-secondary/40 delay-75" />
              <div className="h-8 w-2 animate-pulse rounded-full bg-secondary delay-150" />
              <div className="h-5 w-2 animate-pulse rounded-full bg-secondary/60 delay-100" />
            </div>
          </div>
          <p className="mt-4 text-[10px] font-medium text-on-surface-variant">
            +2.1% improvement from last quarter audit
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-12 relative overflow-hidden rounded-2xl bg-on-surface p-6 text-white shadow-lg lg:col-span-3"
        >
          <div className="relative z-10">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary-container">Pending Audits</p>
            <span className="text-4xl font-black">
              {isLoading ? <Loader size={24} className="animate-spin text-white" /> : String(stats.pendingAudits).padStart(2, '0')}
            </span>
            <p className="mt-4 text-[10px] font-medium leading-relaxed text-white/60">
              System requires quarterly review for Tier-1 electrical vendors.
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <ShieldCheck size={120} strokeWidth={1} />
          </div>
        </motion.div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="overflow-x-auto"
      >
        <SuppliersTable />
      </motion.div>

      {/* Bottom Panels */}
      <div className="grid grid-cols-12 gap-8 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="col-span-12 relative overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-high/20 p-8 group xl:col-span-8"
        >
          <div className="relative z-10 flex flex-col gap-6 md:flex-row">
            <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl shadow-2xl">
              <img
                src="https://picsum.photos/seed/warehouse/300/300"
                alt="Warehouse"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-3">
              <h4 className="text-xl font-black tracking-tight text-on-surface">Suppliers Optimization Audit</h4>
              <p className="max-w-lg text-sm leading-relaxed text-on-surface-variant">
                Our latest analytical report suggests consolidating Tier-3 electrical suppliers to reduce overhead by 12.4%. Tier-1
                partners are currently maintaining peak SLA compliance.
              </p>
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary transition-transform group-hover:translate-x-2">
                View Full Logistics Report
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="col-span-12 flex flex-col justify-between rounded-3xl bg-primary p-6 text-white xl:col-span-4"
        >
          <div className="space-y-4">
            <Activity size={32} className="opacity-50" />
            <h4 className="text-lg font-black leading-tight">Global Inventory Reach</h4>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                <span>Europe</span>
                <span>65%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1, delay: 1 }}
                  className="h-full bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                <span>APAC</span>
                <span>25%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '25%' }}
                  transition={{ duration: 1, delay: 1.2 }}
                  className="h-full bg-white"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add Supplier Modal */}
      <AddSupplierModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </div>
  )
}
