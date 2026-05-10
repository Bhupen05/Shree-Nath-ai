import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Inbox,
  Check,
  Truck,
  AlertCircle,
  Info,
  ArrowUpRight,
  ListFilter,
  Download,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  MapPin,
  Package,
  Map as MapIcon,
  Plus,
  CloudUpload,
  Database,
  PlusCircle,
  Search,
  Trash2,
  Calculator,
  ChevronDown,
  X,
  Loader,
} from 'lucide-react'
import { apiCall } from '../lib/apiClient'

const cn = (...classes) => classes.filter(Boolean).join(' ')

// Static state defaults (no hardcoded data)
const stats = []
const inventoryItems = []
const feedItems = []

// Components

function StatCard({ stat }) {
  const Icon = {
    inventory: Package,
    warning: AlertTriangle,
    pending: Clock,
    location: MapPin,
  }[stat.iconName] || TrendingUp

  const colorStyles = {
    normal: 'border-primary text-primary',
    critical: 'border-error text-error',
    secondary: 'border-secondary text-secondary',
    tertiary: 'border-tertiary text-tertiary',
  }[stat.type]

  return (
    <div
      className={`flex flex-col justify-between rounded-4xl border-b-[6px] bg-surface-container-lowest p-8 shadow-ambient transition-transform duration-300 hover:-translate-y-1 ${colorStyles}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`rounded-2xl p-4 ${stat.type === 'normal' ? 'bg-primary/5' : stat.type === 'critical' ? 'bg-error/5' : 'bg-surface-container'}`}
        >
          <Icon className="h-8 w-8" />
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant">
          {stat.label}
        </p>
        <h3
          className={`mt-2 text-4xl font-black tracking-tighter ${stat.type === 'critical' ? 'text-error' : 'text-on-surface'}`}
        >
          {stat.value}
        </h3>
      </div>

      <p className={`mt-4 flex items-center gap-2 text-[11px] font-bold ${stat.type === 'normal' ? 'text-primary' : 'text-on-surface-variant'}`}>
        {stat.type === 'normal' && <TrendingUp className="h-3.5 w-3.5" />}
        {stat.subValue}
      </p>
    </div>
  )
}

function InventoryTable({ items, isLoading }) {
  return (
    <div className="overflow-hidden rounded-[2.5rem] bg-surface-container-lowest shadow-ambient">
      <div className="flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-low/30 p-8">
        <h3 className="flex items-center gap-4 text-2xl font-black tracking-tight text-primary">
          <ListFilter className="h-6 w-6 text-primary/60" />
          Stock Inventory List
        </h3>
        <div className="flex gap-3">
          <button className="group flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-white px-6 py-3 text-xs font-black text-on-surface-variant transition-all hover:border-outline-variant hover:bg-surface-container">
            <Download className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
            EXPORT CSV
          </button>
          <button className="rounded-xl border border-outline-variant/30 bg-white px-6 py-3 text-xs font-black text-on-surface-variant transition-all hover:border-outline-variant hover:bg-surface-container">
            FILTERS
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 w-full">
            <Loader size={32} className="animate-spin text-primary" />
          </div>
        ) : items && items.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container-low/20">
                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant opacity-60">
                  Product Details
                </th>
                <th className="px-8 py-5 text-center text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant opacity-60">
                  Precise Location
                </th>
                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant opacity-60">
                  Stock Level
                </th>
                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant opacity-60">
                  Status
                </th>
                <th className="px-8 py-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {items.map((item) => (
                <tr key={item.id} className="group transition-colors hover:bg-surface-container-low/30">
                  <td className="px-8 py-7">
                    <div className="flex items-center gap-6">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 rounded-2xl bg-surface-container object-cover shadow-sm transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-base font-black tracking-tight text-on-surface">{item.name}</p>
                        <span className="mt-2 inline-block rounded-lg bg-primary-fixed bg-opacity-10 px-2.5 py-1 text-[10px] font-extrabold text-primary shadow-sm">
                          {item.sku}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex flex-col items-center">
                      <div className="inline-flex min-w-25 flex-col overflow-hidden rounded-xl shadow-sm">
                        <span className="border-b border-white/20 bg-secondary-container/50 px-4 py-2 text-[11px] font-black text-on-secondary-container">
                          {item.room}
                        </span>
                        <span className="bg-surface-container-highest px-4 py-2 text-[11px] font-black text-on-surface opacity-80">
                          {item.cabinet} / {item.section}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="min-w-50 px-8 py-7">
                    <div className="space-y-3">
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-black tracking-tighter text-on-surface">
                          {item.currentStock}
                          <span className="px-1 text-xs font-medium tracking-normal text-on-surface-variant opacity-50">
                            / {item.totalCapacity}
                          </span>
                        </span>
                        <span
                          className={`text-xs font-black ${
                            item.status === 'Critical'
                              ? 'text-error'
                              : item.status === 'Low Warning'
                                ? 'text-tertiary-container'
                                : 'text-primary'
                          }`}
                        >
                          {Math.round((item.currentStock / item.totalCapacity) * 100)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            item.status === 'Critical'
                              ? 'bg-error'
                              : item.status === 'Low Warning'
                                ? 'bg-tertiary-container'
                                : 'bg-primary'
                          }`}
                          style={{ width: `${(item.currentStock / item.totalCapacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <span
                      className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        item.status === 'Critical'
                          ? 'bg-error-container text-on-error-container'
                          : item.status === 'Low Warning'
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                            : 'bg-primary-fixed text-primary'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-7 text-right">
                    <button className="rounded-xl p-2 transition-all opacity-0 hover:bg-surface-container group-hover:opacity-100">
                      <ChevronRight className="h-5 w-5 text-outline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-40 w-full text-on-surface-variant">
            <p className="text-sm font-medium">No inventory items available</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center border-t border-outline-variant/10 bg-surface-container-low/20 p-6">
        <button className="text-sm font-black uppercase text-primary transition-all duration-300 hover:tracking-widest">
          View All Inventory Items
        </button>
      </div>
    </div>
  )
}

function InboundFeed({ items, isLoading }) {
  return (
    <div className="flex h-full flex-col rounded-[2.5rem] bg-surface-container-highest/50 p-8 shadow-ambient">
      <h3 className="mb-10 flex items-center gap-4 text-2xl font-black tracking-tight text-primary">
        <Inbox className="h-6 w-6 text-primary/60" />
        Stock Inbound Feed
      </h3>

      <div className="flex-1 space-y-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader size={24} className="animate-spin text-primary" />
          </div>
        ) : items.length > 0 ? (
          items.map((item, index) => (
          <div key={item.id} className="group relative pl-12">
            {/* Timeline Line */}
            {index !== items.length - 1 && (
              <div className="absolute -bottom-10 left-3.25 top-10 w-0.5 bg-outline-variant/20" />
            )}

            {/* Status Icon */}
            <div
              className={`absolute left-0 top-0 z-10 flex h-6.5 w-6.5 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-surface-container-highest transition-transform duration-300 group-hover:scale-110 ${
                item.type === 'Received'
                  ? 'bg-primary'
                  : item.type === 'In Transit'
                    ? 'bg-tertiary-container'
                    : 'bg-error'
              }`}
            >
              {item.type === 'Received' && <Check className="h-3.5 w-3.5" />}
              {item.type === 'In Transit' && <Truck className="h-3.5 w-3.5" />}
              {item.type === 'Discrepancy' && <AlertCircle className="h-3.5 w-3.5" />}
            </div>

            {/* Content Card */}
            <div
              className={`rounded-2xl border-l-4 bg-surface-container-lowest p-6 shadow-sm transition-all duration-300 hover:shadow-md ${
                item.type === 'Received'
                  ? 'border-primary'
                  : item.type === 'In Transit'
                    ? 'border-tertiary-container'
                    : 'border-error'
              }`}
            >
              <div className="flex items-start justify-between">
                <h4
                  className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                    item.type === 'Received'
                      ? 'text-primary'
                      : item.type === 'In Transit'
                        ? 'text-tertiary-container'
                        : 'text-error'
                  }`}
                >
                  STOCK {item.type.toUpperCase()}
                </h4>
                <span className="text-[10px] font-bold text-outline opacity-50">{item.timestamp}</span>
              </div>

              <p className="mt-3 tracking-tight text-on-surface text-base font-black">{item.title}</p>
              <p className="mt-1.5 text-[11px] font-medium italic text-on-surface-variant opacity-70">{item.details}</p>

              {item.user && (
                <div className="mt-5 flex items-center gap-3 border-t border-outline-variant/10 pt-4">
                  <img
                    src={item.user.avatar}
                    alt={item.user.name}
                    className="h-7 w-7 rounded-lg border border-surface-container object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[11px] font-black tracking-tight text-on-surface">{item.user.name}</span>
                </div>
              )}

              {item.po && (
                <div className="mt-4">
                  <span className="rounded-lg bg-secondary-container/50 px-3 py-1.5 text-[10px] font-black text-on-secondary-container shadow-sm">
                    {item.po}
                  </span>
                </div>
              )}

              {item.type === 'Discrepancy' && (
                <button className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-primary-container/10 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/10">
                  RECONCILE NOW
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))
        ) : (
          <div className="flex items-center justify-center h-40 text-on-surface-variant">
            <p className="text-sm font-medium">No inbound items</p>
          </div>
        )}
      </div>

      <div className="mt-12 flex items-start gap-4 rounded-3xl border border-primary-container/10 bg-primary-container/5 p-6">
        <div className="rounded-xl bg-primary/10 p-2">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.15em] text-primary">Warehouse Alert</p>
          <p className="text-[11px] font-medium leading-relaxed text-on-surface opacity-80">
            Room B1 scheduled for inventory audit at <span className="font-bold">16:00 PM</span> today. Please ensure all aisles are
            clear.
          </p>
        </div>
      </div>
    </div>
  )
}

function WarehouseMap({ rooms, isLoading }) {
  return (
    <div className="flex h-full flex-col rounded-[2.5rem] bg-surface-container-lowest p-10 shadow-ambient">
      <div className="mb-8 flex items-start justify-between">
        <h3 className="flex items-center gap-4 text-2xl font-black tracking-tight text-primary">
          <MapIcon className="h-6 w-6 text-primary/60" />
          Warehouse Floor Map
        </h3>
        <span className="text-[11px] font-black uppercase tracking-wider text-outline opacity-60">Last Mapping Sync: just now</span>
      </div>

      <div className="group relative w-full flex-1 overflow-hidden rounded-4xl border border-outline-variant/10 bg-surface-container-low shadow-inner">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader size={32} className="animate-spin text-primary" />
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-3 p-6">
            {rooms.map((room, idx) => (
              <div key={room.id} className="flex flex-col items-center justify-center rounded-2xl border-2 border-primary-fixed bg-white p-3 transition-transform duration-300 hover:scale-[1.03] shadow-sm">
                <span className="text-[11px] font-black text-on-surface-variant opacity-70">{room.name}</span>
                <div className="mt-2 h-1.5 w-full rounded-full bg-primary shadow-sm" style={{ width: `${room.capacity}%` }} />
                <span className="text-[9px] text-on-surface-variant mt-1">{room.capacity}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-variant">
            <p className="text-sm font-medium">No warehouse data available</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex gap-6">
          {[
            { color: 'bg-primary', label: 'Optimal' },
            { color: 'bg-tertiary-container', label: 'Low' },
            { color: 'bg-error', label: 'Critical' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2.5">
              <span className={`h-3 w-3 rounded-full shadow-sm ${l.color}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-80">{l.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-primary/40">
          <Info className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

// Add Stock Modal Component
function AddStockModal({ isOpen, onClose, onSuccess }) {
  const [batch, setBatch] = useState({
    supplierId: '',
    billNumber: '',
    receiptDate: new Date().toISOString().split('T')[0],
    products: [
      {
        id: crypto.randomUUID(),
        sku: 'BRK-PAD-X202',
        name: 'Ceramic Brake Pads v4',
        quantity: 120,
        costPerUnit: 42.50,
        location: { room: 'RM-04', cabinet: 'CAB-B', section: 'SEC-12' },
      },
    ],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const addRow = () => {
    setBatch((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: crypto.randomUUID(),
          sku: '',
          name: 'Search by SKU or Tag',
          quantity: 0,
          costPerUnit: 0,
          location: { room: 'Room', cabinet: 'Cab', section: 'Sec' },
        },
      ],
    }))
  }

  const removeRow = (id) => {
    setBatch((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }))
  }

  const updateProduct = (id, updates) => {
    setBatch((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))
  }

  const totalBatchValue = batch.products.reduce((acc, p) => acc + p.quantity * p.costPerUnit, 0)
  const totalItems = batch.products.reduce((acc, p) => acc + p.quantity, 0)

  const handleSubmit = async () => {
    if (!batch.supplierId || !batch.billNumber || !batch.receiptDate || batch.products.length === 0) {
      setSubmitError('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)
      
      const payload = {
        supplierId: parseInt(batch.supplierId),
        billNumber: batch.billNumber,
        receiptDate: batch.receiptDate,
        items: batch.products.map(p => ({
          partId: parseInt(p.sku.split('-')[0]) || 1,
          quantity: p.quantity,
          costPerUnit: p.costPerUnit,
          location: `${p.location.room}/${p.location.cabinet}/${p.location.section}`,
        }))
      }

      const response = await apiCall('/inventory/add-stock', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (response) {
        onClose()
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to save stock entry')
      console.error('Stock entry error:', err)
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="w-full max-w-6xl bg-background rounded-2xl shadow-2xl">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-lowest p-6">
                <div>
                  <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
                    <span className="w-4 h-px bg-primary" />
                    Incoming Logistics
                  </div>
                  <h2 className="text-2xl font-black text-on-surface tracking-tighter">Add New Stock Entry</h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                <div className="p-6 grid grid-cols-12 gap-6">
                  {/* Left Column: Supplier & Bill */}
                  <section className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-ambient border border-surface-container-high/50">
                      <div className="flex items-center gap-2 mb-8">
                        <Truck className="text-primary" size={20} />
                        <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Supplier Information</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                            Select Supplier
                          </label>
                          <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={16} />
                            <input
                              type="text"
                              placeholder="Search by name or ID..."
                              className="w-full pl-10 pr-4 py-3 bg-surface-container-low rounded-xl border-none ring-1 ring-outline-variant/20 focus:ring-primary/50 transition-all text-sm font-medium outline-none"
                              value={batch.supplierId}
                              onChange={(e) => setBatch((prev) => ({ ...prev, supplierId: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                            Supplier Bill Number
                          </label>
                          <input
                            type="text"
                            placeholder="INV-2024-XXXX"
                            className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none ring-1 ring-outline-variant/20 focus:ring-primary/50 transition-all text-sm font-mono outline-none"
                            value={batch.billNumber}
                            onChange={(e) => setBatch((prev) => ({ ...prev, billNumber: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                            Receipt Date
                          </label>
                          <input
                            type="date"
                            className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none ring-1 ring-outline-variant/20 focus:ring-primary/50 transition-all text-sm outline-none"
                            value={batch.receiptDate}
                            onChange={(e) => setBatch((prev) => ({ ...prev, receiptDate: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* File Upload Area */}
                    <div className="relative group overflow-hidden bg-surface-container-low/30 p-8 rounded-2xl border-2 border-dashed border-outline-variant/40 hover:border-primary/40 transition-all cursor-pointer">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                          <CloudUpload className="text-primary" size={24} />
                        </div>
                        <h4 className="text-sm font-black text-on-surface uppercase tracking-widest mb-1">Attach Physical Bill</h4>
                        <p className="text-[11px] text-on-surface-variant font-medium mb-6">PDF, PNG, or JPG (Max 10MB)</p>
                        <button className="px-6 py-2.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
                          Select File
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Right Column: Product Table */}
                  <section className="col-span-12 lg:col-span-8">
                    <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border border-surface-container-high/50 overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-surface-container-low flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Database className="text-primary" size={20} />
                          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Product & Precision Mapping</h3>
                        </div>
                        <button
                          onClick={addRow}
                          className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest hover:opacity-70 active:scale-95 transition-all"
                        >
                          <PlusCircle size={16} /> Add Row
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low/30">
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-none">Product SKU / Name</th>
                              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-none w-24">Qty</th>
                              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-none w-32">Cost/Unit</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-none">Location (R-C-S)</th>
                              <th className="px-4 py-4 w-12 border-none" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            <AnimatePresence>
                              {batch.products.map((product) => (
                                <motion.tr
                                  key={product.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="group hover:bg-surface-container-low/20 transition-colors"
                                >
                                  <td className="px-6 py-5">
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-primary focus:ring-0 outline-none placeholder:text-on-surface-variant"
                                        value={product.sku}
                                        placeholder="Select Product..."
                                        onChange={(e) => updateProduct(product.id, { sku: e.target.value })}
                                      />
                                      <div className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">{product.name}</div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-5">
                                    <input
                                      type="number"
                                      className="w-full bg-surface-container-low border-none rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/30 outline-none"
                                      value={product.quantity || ''}
                                      placeholder="0"
                                      onChange={(e) => updateProduct(product.id, { quantity: parseInt(e.target.value) || 0 })}
                                    />
                                  </td>
                                  <td className="px-4 py-5">
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-on-surface-variant">$</span>
                                      <input
                                        type="number"
                                        className="w-full bg-surface-container-low border-none rounded-lg pl-6 pr-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary/30 outline-none"
                                        value={product.costPerUnit || ''}
                                        placeholder="0.00"
                                        onChange={(e) => updateProduct(product.id, { costPerUnit: parseFloat(e.target.value) || 0 })}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <select className="w-full bg-surface-container-low border-none rounded-lg pl-3 pr-2 py-2 text-[10px] font-black uppercase appearance-none focus:ring-2 focus:ring-primary/30 outline-none">
                                          <option>{product.location.room}</option>
                                        </select>
                                      </div>
                                      <span className="text-on-surface-variant font-bold">/</span>
                                      <div className="flex-1">
                                        <select className="w-full bg-surface-container-low border-none rounded-lg pl-3 pr-2 py-2 text-[10px] font-black uppercase appearance-none focus:ring-2 focus:ring-primary/30 outline-none">
                                          <option>{product.location.cabinet}</option>
                                        </select>
                                      </div>
                                      <span className="text-on-surface-variant font-bold">/</span>
                                      <div className="flex-1">
                                        <select className="w-full bg-surface-container-low border-none rounded-lg pl-3 pr-2 py-2 text-[10px] font-black uppercase appearance-none focus:ring-2 focus:ring-primary/30 outline-none">
                                          <option>{product.location.section}</option>
                                        </select>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-5 text-right">
                                    <button
                                      onClick={() => removeRow(product.id)}
                                      className="text-on-surface-variant hover:text-error transition-all hover:scale-110 active:scale-95"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </td>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </tbody>
                        </table>
                        {batch.products.length === 0 && (
                          <div className="p-10 text-center text-on-surface-variant italic text-sm">No products added. Click "Add Row" to begin.</div>
                        )}
                      </div>
                    </div>

                    {/* Summary Banner */}
                    <motion.div className="mt-6 bg-primary rounded-2xl p-8 flex flex-col sm:flex-row justify-between items-center gap-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                      <div className="relative z-10 w-full sm:w-auto text-center sm:text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-2">Total Batch Value</p>
                        <h3 className="text-5xl font-black tracking-tighter leading-none">
                          ${totalBatchValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                      </div>

                      <div className="relative z-10 text-right flex flex-col items-center sm:items-end w-full sm:w-auto">
                        <div className="flex items-center gap-6 mb-4">
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Total Items</p>
                            <p className="text-2xl font-black tracking-tighter">{totalItems.toLocaleString()} Units</p>
                          </div>
                          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md">
                            <Calculator size={28} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                          <div className="relative flex h-2 w-2">
                            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Awaiting Verification</span>
                        </div>
                      </div>
                    </motion.div>
                  </section>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 border-t border-outline-variant/10 bg-surface-container-lowest p-6">
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
                    {isSubmitting ? 'Saving...' : 'Save Inventory'}
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

// Main Page Component
export default function Inventory() {
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageStats, setPageStats] = useState(stats)
  const [pageInventoryItems, setPageInventoryItems] = useState(inventoryItems)
  const [pageFeedItems, setPageFeedItems] = useState([])
  const [warehouseRooms, setWarehouseRooms] = useState([])

  useEffect(() => {
    const loadInventoryData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch inventory metrics
        const response = await apiCall('/inventory/metrics')

        if (response.data) {
          const data = response.data

          // Update stats
          if (data.stats) {
            setPageStats([
              {
                label: 'Total SKUs',
                value: String(data.stats.totalSKUs),
                subValue: '+12.5% from last month',
                type: 'normal',
                iconName: 'inventory',
              },
              {
                label: 'Critical Stock',
                value: String(data.stats.criticalStock),
                subValue: 'Immediate reorder needed',
                type: 'critical',
                iconName: 'warning',
              },
              {
                label: 'In Transit',
                value: String(data.stats.inTransit),
                subValue: 'Arriving this week',
                type: 'secondary',
                iconName: 'pending',
              },
              {
                label: 'Warehouse Utilization',
                value: `${data.stats.warehouseUtilization}%`,
                subValue: `${(data.stats.warehouseUtilization * 36.5).toFixed(0)} / 3,650 capacity`,
                type: 'tertiary',
                iconName: 'location',
              },
            ])
          }

          // Update inventory items
          if (data.inventoryItems && Array.isArray(data.inventoryItems)) {
            setPageInventoryItems(
              data.inventoryItems.map((item) => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                image: `https://picsum.photos/seed/${item.sku}/200/200`,
                room: item.location ? item.location.split('/')[0] : 'Warehouse',
                cabinet: item.location ? item.location.split('/')[1] : 'N/A',
                section: item.location ? item.location.split('/')[2] : 'N/A',
                currentStock: item.stock,
                totalCapacity: item.stock * 2,
                status: item.status === 'CRITICAL' ? 'Critical' : item.status === 'LOW' ? 'Low Warning' : 'Optimal',
              }))
            )
          }

          // Update warehouse rooms
          if (data.warehouseMap && Array.isArray(data.warehouseMap)) {
            setWarehouseRooms(data.warehouseMap)
          }

          // Update inbound feed
          if (data.inboundFeed && Array.isArray(data.inboundFeed)) {
            setPageFeedItems(
              data.inboundFeed.map((item, idx) => ({
                id: item.id,
                type: idx === 0 ? 'Received' : idx === 1 ? 'In Transit' : 'Discrepancy',
                title: item.title,
                details: item.sub,
                timestamp: item.time,
                user: {
                  name: 'System',
                  avatar: `https://picsum.photos/seed/user${idx}/100/100`,
                },
                po: `PO #${item.id}`,
              }))
            )
          }
        }
      } catch (err) {
        console.error('Inventory data load error:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadInventoryData()
    // Refresh data every 60 seconds
    const interval = setInterval(loadInventoryData, 60000)
    return () => clearInterval(interval)
  }, [])
  return (
    <div className="space-y-12 p-12">
      {/* Page Header */}
      <section className="flex items-end justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-5xl font-black tracking-tighter text-primary">Inventory Stock</h2>
          <p className="mt-3 text-lg font-medium text-on-surface-variant opacity-60">
            Real-time status of parts archive and warehouse capacity.
          </p>
        </motion.div>

        <motion.button
          onClick={() => setIsStockModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-4 rounded-3xl bg-linear-to-b from-primary to-primary-container px-10 py-5 text-sm font-black text-white shadow-xl shadow-primary/20 transition-all tracking-tight"
        >
          <Plus className="h-5 w-5 stroke-[2.5px]" />
          ADD NEW STOCK
        </motion.button>
      </section>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-error/10 border border-error/20 rounded-lg p-4 text-sm font-medium text-error"
        >
          Unable to load inventory data. Showing cached information. {error}
        </motion.div>
      )}

      {/* KPI Grid */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center h-40">
            <Loader size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          pageStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <StatCard stat={stat} />
            </motion.div>
          ))
        )}
      </section>

      {/* Main Content Grid */}
      <section className="grid grid-cols-12 gap-10">
        {/* Left Column */}
        <div className="col-span-12 space-y-10 xl:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <InventoryTable items={pageInventoryItems} isLoading={isLoading} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <WarehouseMap rooms={warehouseRooms} isLoading={isLoading} />
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 h-full xl:col-span-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="h-full"
          >
            <InboundFeed items={pageFeedItems} isLoading={isLoading} />
          </motion.div>
        </div>
      </section>

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSuccess={() => {
          // Refresh inventory data
          window.location.reload()
        }}
      />
    </div>
  )
}
