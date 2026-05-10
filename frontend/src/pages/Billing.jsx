import { useState, useMemo, useEffect } from 'react'
import {
  Receipt,
  PlusCircle,
  Search,
  Bell,
  Settings,
  Filter,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Wallet,
  UserSearch,
  Trash2,
  Info,
  FileText,
  X,
  ListFilter,
  ShieldCheck,
  UploadCloud,
  Loader,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

import { apiCall } from '../lib/apiClient'

// Will be fetched from API
const BILLING_DATA = []
const CASH_FLOW_DATA = []

// Components

const StatusChip = ({ status }) => {
  const styles = {
    Confirmed: 'bg-primary-container/10 text-primary-container',
    Overdue: 'bg-error-container text-on-error-container',
    Paid: 'bg-primary text-on-primary shadow-sm',
    Draft: 'bg-outline-variant/30 text-on-surface-variant',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${styles[status]}`}>
      {status}
    </span>
  )
}

// Create Purchase Bill Modal Component
function CreatePurchaseBillModal({ isOpen, onClose, onSuccess }) {
  const [supplierId, setSupplierId] = useState('1')
  const [billRef, setBillRef] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState([
    { id: '1', name: 'Hydraulic Pressure Valve - XV90', sku: 'PV-90234-B', quantity: 12, unitPrice: 125.00 },
    { id: '2', name: 'Industrial Gasket Sealant (Bulk)', sku: 'GS-7712-L', quantity: 50, unitPrice: 18.50 },
  ])
  const [shipping, setShipping] = useState(45.00)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
  const tax = subtotal * 0.1
  const grandTotal = subtotal + tax + shipping

  const handleUpdateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleSubmit = async () => {
    if (!supplierId || !billRef || !purchaseDate || items.length === 0) {
      setSubmitError('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)

      const payload = {
        partyId: parseInt(supplierId),
        billType: 'PURCHASE',
        partyType: 'SUPPLIER',
        billNumber: billRef,
        billDate: purchaseDate,
        tax: tax,
        discount: 0,
        items: items.map(item => ({
          partId: parseInt(item.id) || 1,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
        }))
      }

      const response = await apiCall('/billing/bills', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (response) {
        onClose()
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to create bill')
      console.error('Bill creation error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
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
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Inventory Management</p>
                  <h2 className="text-2xl font-black tracking-tight text-on-surface">Create Purchase Bill</h2>
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
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-12 gap-8">
                    {/* Left Column: Form Details */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                      {/* Billing Header Card */}
                      <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-outline uppercase tracking-wider">Supplier Name</label>
                            <select
                              value={supplierId}
                              onChange={(e) => setSupplierId(e.target.value)}
                              className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary appearance-none outline-none cursor-pointer"
                            >
                              <option value="">Select a supplier</option>
                              <option value="1">Titan Heavy Ind.</option>
                              <option value="2">Apex Global Logistics</option>
                              <option value="3">Precision Steel Components</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-outline uppercase tracking-wider">Purchase Date</label>
                            <input
                              type="date"
                              value={purchaseDate}
                              onChange={(e) => setPurchaseDate(e.target.value)}
                              className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-outline uppercase tracking-wider">Bill Reference Number</label>
                            <input
                              type="text"
                              placeholder="e.g. PB-2023-001"
                              value={billRef}
                              onChange={(e) => setBillRef(e.target.value)}
                              className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-outline uppercase tracking-wider">Warehouse Location</label>
                            <select className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary appearance-none outline-none cursor-pointer">
                              <option>Central Distribution (A1)</option>
                              <option>West Coast Annex</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Line Items Table */}
                      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
                        <div className="p-6 bg-surface-container-low/50 flex justify-between items-center">
                          <h3 className="font-bold text-on-surface flex items-center gap-2">
                            <ListFilter className="w-5 h-5 text-primary" />
                            Order Particulars
                          </h3>
                          <button
                            className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                            onClick={() => {
                              const newItem = {
                                id: Date.now().toString(),
                                name: 'New Part Name',
                                sku: 'SKU-00000',
                                quantity: 1,
                                unitPrice: 0,
                              }
                              setItems([...items, newItem])
                            }}
                          >
                            <PlusCircle className="w-4 h-4" />
                            Add New Item
                          </button>
                        </div>

                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low/30 text-outline text-[10px] font-black uppercase tracking-widest">
                              <th className="px-6 py-4">Item Details & SKU</th>
                              <th className="px-6 py-4">Quantity</th>
                              <th className="px-6 py-4">Unit Price</th>
                              <th className="px-6 py-4 text-right">Total</th>
                              <th className="px-6 py-4 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            <AnimatePresence mode="popLayout">
                              {items.map((item) => (
                                <motion.tr
                                  key={item.id}
                                  layout
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="group hover:bg-surface-container-low/20 transition-colors"
                                >
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <input
                                        className="font-bold text-on-surface bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                                        value={item.name}
                                        onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                      />
                                      <span className="text-[10px] uppercase font-bold tracking-wider bg-secondary-container text-primary px-2 py-0.5 rounded inline-block w-fit mt-1">
                                        SKU: {item.sku}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <input
                                      type="number"
                                      className="w-20 bg-surface-container-low border-none rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-outline text-xs">$</span>
                                      <input
                                        type="number"
                                        className="w-28 bg-surface-container-low border-none rounded p-2 pl-5 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        value={item.unitPrice}
                                        onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-right font-bold text-on-surface">
                                    ${(item.quantity * item.unitPrice).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="px-6 py-5">
                                    <button
                                      onClick={() => removeItem(item.id)}
                                      className="text-outline hover:text-error transition-colors p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right Column: Summary & Notes */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                      <div className="bg-primary text-white p-8 rounded-xl shadow-2xl space-y-6">
                        <h3 className="text-xl font-bold border-b border-white/20 pb-4">Bill Summary</h3>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="opacity-70 font-medium">Subtotal</span>
                            <span className="font-semibold">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-sm opacity-70 font-medium">Shipping & Logistics</span>
                              <span className="text-[10px] opacity-50 uppercase tracking-tighter">Standard Freight</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 text-xs">$</span>
                              <input
                                type="number"
                                className="w-24 bg-white/10 border-none rounded p-1.5 pl-5 text-right text-sm text-white focus:ring-1 focus:ring-primary-container outline-none"
                                value={shipping}
                                onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-sm opacity-70 font-medium">Tax (VAT 10%)</span>
                              <span className="text-[10px] opacity-50 uppercase tracking-tighter">Calculated Automatically</span>
                            </div>
                            <span className="font-semibold">${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-white/20 flex justify-between items-end">
                          <div>
                            <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Grand Total Amount</p>
                            <p className="text-4xl font-black tracking-tighter">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          </div>
                          <ShieldCheck className="w-10 h-10 opacity-20" />
                        </div>

                        <div className="bg-white/5 p-4 rounded-lg space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Payment Terms</label>
                          <div className="flex gap-2">
                            <button className="flex-1 py-2 rounded bg-white text-primary text-xs font-bold">Net 30</button>
                            <button className="flex-1 py-2 rounded border border-white/30 text-white text-xs font-bold hover:bg-white/10 transition-colors">Net 60</button>
                            <button className="flex-1 py-2 rounded border border-white/30 text-white text-xs font-bold hover:bg-white/10 transition-colors">COD</button>
                          </div>
                        </div>
                      </div>

                      {/* Remarks Card */}
                      <div className="bg-surface-container-high p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                          <FileText className="w-5 h-5" />
                          <h4 className="font-bold text-sm">Remarks & Internal Notes</h4>
                        </div>
                        <textarea
                          className="w-full bg-white/50 border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary h-24 italic outline-none resize-none"
                          placeholder="Add internal notes about this purchase..."
                        ></textarea>

                        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-dashed border-outline-variant group cursor-pointer hover:border-primary transition-colors">
                          <UploadCloud className="w-6 h-6 text-outline group-hover:text-primary transition-colors" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface">Attach Digital Invoice</span>
                            <span className="text-[10px] text-outline">PDF, JPG, PNG up to 5MB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    Save as Draft
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-lg bg-linear-to-b from-primary to-primary-container px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader size={16} className="animate-spin" /> : <FileText size={18} />}
                    {isSubmitting ? 'Creating...' : 'Confirm & Create Bill'}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Create Bill Modal Component
function CreateBillModal({ isOpen, onClose }) {
  const [lineItems, setLineItems] = useState([
    {
      id: '1',
      description: 'Oil Filter High-Performance - OF-882',
      sku: 'OF-882',
      stock: 142,
      qty: 5,
      unitPrice: 24.5,
    },
  ])
  const [discount, setDiscount] = useState(0)
  const [paymentReceived, setPaymentReceived] = useState(true)

  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice, 0)
  }, [lineItems])

  const tax = useMemo(() => subtotal * 0.18, [subtotal])
  const total = useMemo(() => subtotal + tax - discount, [subtotal, tax, discount])

  const addRow = () => {
    setLineItems([
      ...lineItems,
      {
        id: Math.random().toString(36).substr(2, 9),
        description: '',
        sku: '',
        stock: 0,
        qty: 0,
        unitPrice: 0,
      },
    ])
  }

  const removeRow = (id) => {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  const updateRow = (id, updates) => {
    setLineItems(lineItems.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="w-full max-w-6xl bg-background rounded-2xl shadow-2xl">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-lowest p-6">
                <h2 className="text-2xl font-black tracking-tight text-on-surface">Create Sales Bill</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                <div className="space-y-6 p-6">
                  {/* Customer Details */}
                  <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-2">
                      <span className="h-4 w-1 rounded-full bg-primary" />
                      <h3 className="font-bold tracking-tight text-on-surface">Customer Details</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                          Select Customer
                        </label>
                        <div className="relative">
                          <UserSearch
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-outline"
                            size={18}
                          />
                          <input
                            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 pl-10 text-sm outline-none transition-all focus:border-primary/50 focus:ring-0"
                            placeholder="Search by name or phone..."
                            type="text"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                          Bill Date
                        </label>
                        <input
                          className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-0"
                          type="date"
                          defaultValue="2024-04-21"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                          Due Date
                        </label>
                        <input
                          className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-0"
                          type="date"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                          Ref Number
                        </label>
                        <input
                          className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-0"
                          placeholder="e.g. PO-8821"
                          type="text"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Line Items Table */}
                  <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-1 rounded-full bg-primary" />
                        <h3 className="font-bold tracking-tight text-on-surface">Line Items</h3>
                      </div>
                      <button
                        onClick={addRow}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary-fixed"
                      >
                        <PlusCircle size={14} />
                        Add Row
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-outline-variant/20">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="bg-surface-container-low">
                            <th className="whitespace-nowrap px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              Item Description / SKU
                            </th>
                            <th className="w-24 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              Qty
                            </th>
                            <th className="w-40 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              Unit Price
                            </th>
                            <th className="w-40 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              Subtotal
                            </th>
                            <th className="w-12 px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          <AnimatePresence initial={false}>
                            {lineItems.map((item) => (
                              <motion.tr
                                key={item.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`transition-colors ${
                                  item.description === ''
                                    ? 'bg-surface/30'
                                    : 'hover:bg-surface-container-low/20'
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="relative">
                                    <input
                                      className="w-full border-none bg-transparent p-0 text-sm font-medium outline-none placeholder:italic placeholder:text-on-surface-variant/50 focus:ring-0"
                                      type="text"
                                      placeholder="Search product..."
                                      value={item.description}
                                      onChange={(e) =>
                                        updateRow(item.id, { description: e.target.value })
                                      }
                                    />
                                    {item.sku && (
                                      <div className="mt-1 flex gap-2">
                                        <span className="rounded bg-secondary-fixed px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-on-secondary-fixed">
                                          SKU: {item.sku}
                                        </span>
                                        <span className="rounded bg-surface-container-highest px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-on-surface-variant">
                                          Stock: {item.stock} Units
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <input
                                    className="w-full rounded-lg border-none bg-surface-container-low px-2 py-1.5 text-center text-sm outline-none"
                                    type="number"
                                    value={item.qty || ''}
                                    onChange={(e) =>
                                      updateRow(item.id, { qty: Number(e.target.value) })
                                    }
                                  />
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-on-surface-variant">$</span>
                                    <input
                                      className="w-full border-none bg-transparent p-0 text-sm font-medium outline-none focus:ring-0"
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice || ''}
                                      onChange={(e) =>
                                        updateRow(item.id, { unitPrice: Number(e.target.value) })
                                      }
                                    />
                                  </div>
                                </td>
                                <td className="p-4 text-right">
                                  <span
                                    className={`text-sm font-bold ${
                                      item.qty * item.unitPrice > 0
                                        ? 'text-on-surface'
                                        : 'opacity-30 text-on-surface-variant'
                                    }`}
                                  >
                                    $ {(item.qty * item.unitPrice).toFixed(2)}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => removeRow(item.id)}
                                    className="text-outline transition-colors hover:text-error"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Payment & Summary */}
                  <div className="grid grid-cols-12 gap-6">
                    {/* Left - Payment Info */}
                    <section className="col-span-12 rounded-xl bg-surface-container-lowest p-6 shadow-sm md:col-span-8">
                      <div className="mb-6 flex items-center gap-2">
                        <span className="h-4 w-1 rounded-full bg-primary" />
                        <h3 className="font-bold tracking-tight text-on-surface">Payment & Information</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between rounded-xl bg-surface p-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-on-surface">Payment Received</span>
                              <span className="text-[10px] text-on-surface-variant">Mark as paid immediately</span>
                            </div>
                            <button
                              onClick={() => setPaymentReceived(!paymentReceived)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                paymentReceived ? 'bg-primary' : 'bg-surface-container-highest'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  paymentReceived ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                              Payment Method
                            </label>
                            <select className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-0">
                              <option>Cash</option>
                              <option selected>Card (Stripe Connector)</option>
                              <option>UPI / Bank Transfer</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                            Internal Notes
                          </label>
                          <textarea
                            className="min-h-30 w-full resize-none rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-0"
                            placeholder="Mention shipping details or special requests..."
                          />
                        </div>
                      </div>
                    </section>

                    {/* Right - Bill Summary */}
                    <section className="relative col-span-12 flex min-h-75 flex-col justify-between overflow-hidden rounded-xl bg-primary p-6 text-white shadow-xl md:col-span-4">
                      <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
                      <div className="relative z-10">
                        <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-200/60">
                          Bill Summary
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-100/70">Subtotal</span>
                            <span className="font-medium">$ {subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-100/70">Tax (GST 18%)</span>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                                Auto-calc
                              </span>
                              <span className="font-medium">$ {tax.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-100/70">Discount</span>
                            <div className="flex items-center gap-1 border-b border-white/20 pb-0.5">
                              <span className="text-xs">$</span>
                              <input
                                className="w-12 border-none bg-transparent p-0 text-right text-sm outline-none focus:ring-0"
                                type="number"
                                value={discount || ''}
                                onChange={(e) => setDiscount(Number(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="relative z-10 border-t border-white/10 pt-8 mt-8">
                        <div className="flex items-end justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-blue-200/50">
                            Total Amount
                          </span>
                          <span className="text-3xl font-black tracking-tighter">$ {total.toFixed(2)}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 border-t border-outline-variant/10 bg-surface-container-lowest p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info className="text-outline" size={20} />
                    <p className="text-xs font-medium text-on-surface-variant">
                      Inventory will be automatically updated upon confirmation.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={onClose}
                      className="rounded-lg bg-secondary-container/30 px-6 py-2.5 text-sm font-bold text-primary transition-all hover:bg-secondary-container/50"
                    >
                      Save as Draft
                    </button>
                    <button className="flex items-center gap-2 rounded-lg bg-linear-to-b from-primary to-primary-container px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                      <FileText size={18} />
                      Confirm & Generate PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default function Billing() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalReceivables: 0,
    overdueAmount: 0,
    netCashFlow: 0,
    overdueCount: 0,
  })
  const [salesBills, setSalesBills] = useState([])
  const [purchaseBills, setPurchaseBills] = useState([])

  useEffect(() => {
    const loadBillingData = async () => {
      try {
        setIsLoading(true)
        const response = await apiCall('/billing/metrics')
        
        if (response.data) {
          const data = response.data
          setStats({
            totalReceivables: data.stats?.totalReceivables || 0,
            overdueAmount: data.stats?.overdueAmount || 0,
            netCashFlow: data.stats?.netCashFlow || 0,
            overdueCount: data.stats?.overdueCount || 0,
          })
          setSalesBills(data.salesBills || [])
          setPurchaseBills(data.purchaseBills || [])
        }
      } catch (err) {
        console.error('Error loading billing data:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadBillingData()
    const interval = setInterval(loadBillingData, 60000) // Refresh every 60 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-on-surface">Billing Overview</h2>
          <p className="text-on-surface-variant font-medium">Manage invoices, receivables, and payment tracking.</p>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center bg-surface-container px-4 py-2 rounded-full ring-1 ring-outline-variant/10 focus-within:ring-primary/20 transition-all">
            <Search className="w-4 h-4 text-on-surface-variant mr-3" />
            <input
              type="text"
              placeholder="Search bills, REF, or parties..."
              className="bg-transparent border-none focus:ring-0 text-sm text-on-surface w-64 placeholder:text-on-surface-variant/50"
            />
          </div>
          <button className="p-2.5 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full ring-2 ring-background" />
          </button>
          <button className="p-2.5 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {error && (
        <div className="rounded-2xl bg-error-container/10 border border-error/20 p-4 text-on-error-container">
          <p className="text-sm font-medium">Unable to load billing data. Showing cached data.</p>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm relative overflow-hidden group border-b-4 border-primary/20"
        >
          <div className="absolute top-4 right-4 text-primary opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet className="h-12 w-12" />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Receivables</p>
          <h3 className="text-3xl font-black text-on-surface">
            {isLoading ? <Loader size={24} className="animate-spin" /> : `$${stats.totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </h3>
          <div className="mt-4 flex items-center text-xs font-bold text-primary">
            <TrendingUp className="mr-1.5 h-4 w-4" />
            <span>+12.5% from last month</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm relative overflow-hidden group border-b-4 border-error/20"
        >
          <div className="absolute top-4 right-4 text-error opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="h-12 w-12" />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Overdue Amount</p>
          <h3 className="text-3xl font-black text-on-surface">
            {isLoading ? <Loader size={24} className="animate-spin" /> : `$${stats.overdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </h3>
          <div className="mt-4 flex items-center text-xs font-bold text-error">
            <AlertCircle className="mr-1.5 h-4 w-4" />
            <span>{stats.overdueCount} items require attention</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 flex flex-col justify-between overflow-hidden rounded-2xl bg-primary p-6 text-on-primary shadow-xl shadow-primary/20 relative"
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-on-primary/60">Net Cash Flow</p>
                <h3 className="text-3xl font-black">
                  {isLoading ? <Loader size={24} className="animate-spin" /> : `$${stats.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </h3>
              </div>
              <div className="rounded-full bg-on-primary/10 px-3 py-1 text-[10px] font-bold">LIVE METRIC</div>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex items-end space-x-1.5 px-1 h-16">
            {[40, 60, 45, 80, 95, 70, 90].map((val, i) => (
              <div
                key={i}
                style={{ height: `${val}%` }}
                className={`flex-1 rounded-t-lg transition-all duration-500 ${
                  i === CASH_FLOW_DATA.length - 1 ? 'bg-on-primary' : 'bg-on-primary/20'
                }`}
              />
            ))}
          </div>

          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-primary-container blur-3xl opacity-20" />
        </motion.div>
      </section>

      {/* Action Row */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex space-x-3">
          <button className="flex items-center rounded-xl bg-surface-container-high px-4 py-2.5 text-sm font-bold text-on-surface shadow-sm ring-1 ring-black/5 transition-colors hover:bg-surface-container">
            <Filter className="mr-2 h-4 w-4 text-on-surface-variant" />
            Filter
          </button>
          <button className="flex items-center rounded-xl bg-surface-container-high px-4 py-2.5 text-sm font-bold text-on-surface shadow-sm ring-1 ring-black/5 transition-colors hover:bg-surface-container">
            <Download className="mr-2 h-4 w-4 text-on-surface-variant" />
            Export
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="rounded-xl bg-secondary-container px-6 py-2.5 text-sm font-bold text-on-secondary-container shadow-sm ring-1 ring-secondary-container/50 transition-all hover:brightness-105"
          >
            Create Purchase Bill
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:brightness-110"
          >
            Create Sales Bill
          </button>
        </div>
      </section>

      {/* Data Table */}
      <section className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest shadow-xl shadow-black/5">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 w-full">
              <Loader size={32} className="animate-spin text-primary" />
            </div>
          ) : salesBills.length > 0 || purchaseBills.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/30">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                    REF
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                    Party / Entity
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                    Status
                  </th>
                  <th className="px-6 py-4 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5 text-sm">
                {[...salesBills, ...purchaseBills].map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-container-low/20 group">
                    <td className="px-6 py-5">
                      <span className="rounded-lg bg-primary/5 px-2.5 py-1 font-mono text-[11px] font-bold text-primary">
                        {row.billNumber}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-[11px] font-black text-on-surface-variant ring-1 ring-outline-variant/10">
                          {(row.party || 'NA').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="leading-tight font-bold text-on-surface">{row.party || 'Unknown'}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-on-surface-variant">{row.items ? `${row.items} items` : 'Entity'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-on-surface-variant">{row.date}</td>
                    <td className="px-6 py-5 text-right font-black text-on-surface">{row.amount}</td>
                    <td className="px-6 py-5">
                      <StatusChip status={row.status?.charAt(0) + row.status?.slice(1).toLowerCase()} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="rounded-lg p-1 transition-opacity opacity-40 hover:bg-surface-container hover:opacity-100">
                        <MoreVertical className="h-4 w-4 text-on-surface-variant" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-64 w-full text-on-surface-variant">
              <p className="text-sm font-medium">No billing data available</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && (salesBills.length > 0 || purchaseBills.length > 0) && (
          <div className="flex items-center justify-between border-t border-outline-variant/5 bg-surface-container-low/10 px-6 py-5">
            <p className="text-xs font-bold text-on-surface-variant">Showing {(salesBills.length + purchaseBills.length)} of {(salesBills.length + purchaseBills.length)} results</p>
            <div className="flex items-center space-x-1">
              <button className="rounded-xl p-2 text-on-surface-variant transition-all hover:bg-surface-container">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex space-x-1 px-1">
                <button className="h-8 w-8 rounded-lg bg-primary text-xs font-black text-on-primary shadow-md shadow-primary/20 transition-all">
                  1
                </button>
              </div>
              <button className="rounded-xl p-2 text-on-surface-variant transition-all hover:bg-surface-container">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Create Bill Modal */}
      <CreateBillModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Create Purchase Bill Modal */}
      <CreatePurchaseBillModal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} />
    </div>
  )
}    