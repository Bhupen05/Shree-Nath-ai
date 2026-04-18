import { useState } from 'react'
import { AnimatePresence, motion as Motion } from 'motion/react'
import { AlertCircle, ArrowUpDown, Filter, MoreVertical, Plus, Search } from 'lucide-react'
import { useEffect } from 'react'
import { createPart, createStockAdjustment, fetchInventoryParts } from '../auth'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [newPart, setNewPart] = useState({
    sku: '',
    name: '',
    description: '',
    costPrice: '',
    sellingPrice: '',
    reorderThreshold: '',
  })
  const [adjustment, setAdjustment] = useState({
    partId: '',
    quantityDelta: '',
    reason: '',
  })

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const data = await fetchInventoryParts()
        if (!cancelled) {
          setItems(data.items || [])
          setError('')
          setMessage('')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load inventory parts')
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  const loadParts = async () => {
    setError('')
    try {
      const data = await fetchInventoryParts()
      setItems(data.items || [])
      setMessage('Parts synced from backend')
    } catch (loadError) {
      setError(loadError.message || 'Unable to load inventory parts')
    }
  }

  const handleCreatePart = async () => {
    setError('')
    setMessage('')

    try {
      await createPart({
        sku: newPart.sku,
        name: newPart.name,
        description: newPart.description,
        costPrice: Number(newPart.costPrice || 0),
        sellingPrice: Number(newPart.sellingPrice || 0),
        reorderThreshold: Number(newPart.reorderThreshold || 0),
      })

      setNewPart({
        sku: '',
        name: '',
        description: '',
        costPrice: '',
        sellingPrice: '',
        reorderThreshold: '',
      })
      setMessage('New inventory part created successfully')
      await loadParts()
    } catch (createError) {
      setError(createError.message || 'Unable to create part')
    }
  }

  const handleStockAdjustment = async () => {
    setError('')
    setMessage('')

    if (!adjustment.partId) {
      setError('Select a part for stock adjustment')
      return
    }

    try {
      await createStockAdjustment({
        partId: Number(adjustment.partId),
        quantityDelta: Number(adjustment.quantityDelta),
        reason: adjustment.reason,
      })
      setAdjustment({ partId: '', quantityDelta: '', reason: '' })
      setMessage('Stock adjustment recorded successfully')
      await loadParts()
    } catch (adjustError) {
      setError(adjustError.message || 'Unable to record stock adjustment')
    }
  }

  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <Motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <div className="mb-2 inline-block w-fit rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary-container">
            Central Registry
          </div>
          <h2 className="text-4xl font-black leading-tight tracking-tighter text-on-surface md:text-6xl">Inventory Flow.</h2>
        </div>
        <button onClick={loadParts} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95">
          <Plus size={20} />
          Refresh Parts
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{message}</p> : null}

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-outline-variant/10 bg-white p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Add Inventory Part</p>
          <input value={newPart.sku} onChange={(event) => setNewPart((prev) => ({ ...prev, sku: event.target.value }))} placeholder="SKU" className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          <input value={newPart.name} onChange={(event) => setNewPart((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name" className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          <input value={newPart.description} onChange={(event) => setNewPart((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={newPart.costPrice} onChange={(event) => setNewPart((prev) => ({ ...prev, costPrice: event.target.value }))} placeholder="Cost" className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            <input type="number" value={newPart.sellingPrice} onChange={(event) => setNewPart((prev) => ({ ...prev, sellingPrice: event.target.value }))} placeholder="Sell" className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            <input type="number" value={newPart.reorderThreshold} onChange={(event) => setNewPart((prev) => ({ ...prev, reorderThreshold: event.target.value }))} placeholder="Reorder" className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <button onClick={handleCreatePart} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Create Part</button>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Stock Adjustment</p>
          <select value={adjustment.partId} onChange={(event) => setAdjustment((prev) => ({ ...prev, partId: event.target.value }))} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
            <option value="">Select part</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>
            ))}
          </select>
          <input type="number" value={adjustment.quantityDelta} onChange={(event) => setAdjustment((prev) => ({ ...prev, quantityDelta: event.target.value }))} placeholder="Quantity delta (+/-)" className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          <input value={adjustment.reason} onChange={(event) => setAdjustment((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Reason" className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
          <button onClick={handleStockAdjustment} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Apply Adjustment</button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant/40" size={20} />
          <input
            type="text"
            placeholder="Search parts, SKU or specifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-outline-variant/10 bg-white py-4 pr-4 pl-12 text-sm font-medium shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
          />
        </div>
        <button className="rounded-2xl border border-outline-variant/10 bg-white p-4 text-on-surface-variant shadow-sm transition-all hover:text-primary">
          <Filter size={20} />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50">
                <th className="px-6 py-5">Item Specification</th>
                <th className="px-6 py-5">SKU / ID</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">
                  <div className="flex cursor-pointer items-center gap-1">
                    Stock Level <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-5 text-right">Unit Price</th>
                <th className="w-16 px-6 py-5" />
              </tr>
            </thead>
            <tbody className="text-sm">
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <Motion.tr key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group border-b border-outline-variant/5 transition-colors hover:bg-surface-dim/20">
                    <td className="px-6 py-6">
                      <div className="font-bold text-on-surface">{item.name}</div>
                    </td>
                    <td className="px-6 py-6">
                      <code className="rounded bg-surface-container px-2 py-1 text-xs font-bold text-primary">{item.sku}</code>
                    </td>
                    <td className="px-6 py-6 font-medium text-on-surface-variant/70">{item.description || 'General'}</td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{item.current_stock} Units</span>
                        {item.low_stock && (
                          <div className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase text-red-500">
                            <AlertCircle size={10} /> REORDER
                          </div>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-surface-container">
                        <div className={`h-full rounded-full ${item.low_stock ? 'bg-red-500' : 'bg-secondary'}`} style={{ width: `${Math.min(100, Math.max(0, Number(item.current_stock || 0)))}%` }} />
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right font-black text-on-surface">Rs {Number(item.selling_price || 0).toLocaleString()}</td>
                    <td className="px-6 py-6 text-center">
                      <button className="text-on-surface-variant/40 transition-colors hover:text-primary">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </Motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </Motion.div>
  )
}
